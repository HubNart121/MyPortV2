-- Keep stock status aligned with the actual remaining shares.
-- Zero remaining shares => Sold Off. Buying again => Hold.
CREATE OR REPLACE FUNCTION public.sync_stock_status_from_holdings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_stock_id UUID;
  bought_shares NUMERIC;
  sold_shares NUMERIC;
  current_status TEXT;
  next_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_stock_id := OLD.stock_id;
  ELSE
    target_stock_id := NEW.stock_id;
  END IF;

  SELECT COALESCE(SUM(shares), 0)
    INTO bought_shares
    FROM public.buy_rounds
   WHERE stock_id = target_stock_id;

  SELECT COALESCE(SUM(shares), 0)
    INTO sold_shares
    FROM public.realized_trades
   WHERE stock_id = target_stock_id;

  SELECT status
    INTO current_status
    FROM public.stocks
   WHERE id = target_stock_id;

  next_status := CASE
    WHEN GREATEST(bought_shares - sold_shares, 0) <= 0 THEN 'Sold Off'
    WHEN current_status = 'Sold Off' THEN 'Hold'
    ELSE current_status
  END;

  UPDATE public.stocks
     SET status = next_status
   WHERE id = target_stock_id
     AND status IS DISTINCT FROM next_status;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_stock_status_after_buy_round_change ON public.buy_rounds;
CREATE TRIGGER sync_stock_status_after_buy_round_change
AFTER INSERT OR UPDATE OR DELETE ON public.buy_rounds
FOR EACH ROW
EXECUTE FUNCTION public.sync_stock_status_from_holdings();

DROP TRIGGER IF EXISTS sync_stock_status_after_realized_trade_change ON public.realized_trades;
CREATE TRIGGER sync_stock_status_after_realized_trade_change
AFTER INSERT OR UPDATE OR DELETE ON public.realized_trades
FOR EACH ROW
EXECUTE FUNCTION public.sync_stock_status_from_holdings();

-- Bring existing records into the same rule immediately.
WITH balances AS (
  SELECT
    s.id,
    GREATEST(
      COALESCE((SELECT SUM(br.shares) FROM public.buy_rounds br WHERE br.stock_id = s.id), 0)
      - COALESCE((SELECT SUM(rt.shares) FROM public.realized_trades rt WHERE rt.stock_id = s.id), 0),
      0
    ) AS remaining_shares
  FROM public.stocks s
),
resolved AS (
  SELECT
    s.id,
    CASE
      WHEN b.remaining_shares <= 0 THEN 'Sold Off'
      WHEN s.status = 'Sold Off' THEN 'Hold'
      ELSE s.status
    END AS next_status
  FROM public.stocks s
  JOIN balances b ON b.id = s.id
)
UPDATE public.stocks s
   SET status = r.next_status
  FROM resolved r
 WHERE s.id = r.id
   AND s.status IS DISTINCT FROM r.next_status;
