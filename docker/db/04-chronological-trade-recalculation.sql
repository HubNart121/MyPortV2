-- Recalculate moving-average cost and realized profit in transaction-date order.
-- Buys on the same date are processed before sells.
CREATE OR REPLACE FUNCTION public.recalculate_stock_trade_history(target_stock_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  event_row RECORD;
  held_shares NUMERIC := 0;
  held_cost NUMERIC := 0;
  average_cost NUMERIC := 0;
BEGIN
  FOR event_row IN
    SELECT *
    FROM (
      SELECT
        'BUY'::TEXT AS event_type,
        br.buy_date AS event_date,
        0 AS event_order,
        br.created_at,
        br.id AS event_id,
        br.shares,
        br.price,
        COALESCE(br.buy_fee, 0) AS fee,
        NULL::UUID AS trade_id
      FROM public.buy_rounds br
      WHERE br.stock_id = target_stock_id

      UNION ALL

      SELECT
        'SELL'::TEXT AS event_type,
        rt.sell_date AS event_date,
        1 AS event_order,
        rt.created_at,
        rt.id AS event_id,
        rt.shares,
        rt.sell_price AS price,
        COALESCE(rt.sell_fee, 0) AS fee,
        rt.id AS trade_id
      FROM public.realized_trades rt
      WHERE rt.stock_id = target_stock_id
    ) events
    ORDER BY event_date, event_order, created_at, event_id
  LOOP
    IF event_row.shares <= 0 OR event_row.price <= 0 THEN
      RAISE EXCEPTION 'จำนวนหุ้นและราคาต้องมากกว่า 0';
    END IF;

    IF event_row.event_type = 'BUY' THEN
      held_cost := held_cost + (event_row.price * event_row.shares) + event_row.fee;
      held_shares := held_shares + event_row.shares;
      CONTINUE;
    END IF;

    IF event_row.shares > held_shares THEN
      RAISE EXCEPTION
        'ขายเกินจำนวนหุ้นที่ถือ ณ วันที่ % (ถือ %, ต้องการขาย %)',
        event_row.event_date,
        held_shares,
        event_row.shares;
    END IF;

    average_cost := CASE
      WHEN held_shares > 0 THEN held_cost / held_shares
      ELSE 0
    END;

    UPDATE public.realized_trades
       SET avg_cost_at_sell = average_cost,
           profit = (event_row.price * event_row.shares)
                    - event_row.fee
                    - (average_cost * event_row.shares)
     WHERE id = event_row.trade_id;

    held_cost := held_cost - (average_cost * event_row.shares);
    held_shares := held_shares - event_row.shares;

    IF ABS(held_shares) < 0.0000001 THEN
      held_shares := 0;
      held_cost := 0;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_stock_trade_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  previous_stock_id UUID;
  current_stock_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    previous_stock_id := OLD.stock_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    current_stock_id := NEW.stock_id;
  END IF;

  IF previous_stock_id IS NOT NULL THEN
    PERFORM public.recalculate_stock_trade_history(previous_stock_id);
  END IF;
  IF current_stock_id IS NOT NULL AND current_stock_id IS DISTINCT FROM previous_stock_id THEN
    PERFORM public.recalculate_stock_trade_history(current_stock_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_trade_history_after_buy_change ON public.buy_rounds;
DROP TRIGGER IF EXISTS recalculate_trade_history_after_sell_change ON public.realized_trades;

-- Recalculate existing records before enabling automatic triggers.
DO $$
DECLARE
  stock_row RECORD;
BEGIN
  FOR stock_row IN SELECT id FROM public.stocks LOOP
    PERFORM public.recalculate_stock_trade_history(stock_row.id);
  END LOOP;
END;
$$;

CREATE TRIGGER recalculate_trade_history_after_buy_change
AFTER INSERT OR UPDATE OR DELETE ON public.buy_rounds
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_stock_trade_history();

CREATE TRIGGER recalculate_trade_history_after_sell_change
AFTER INSERT OR UPDATE OR DELETE ON public.realized_trades
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_stock_trade_history();

CREATE INDEX IF NOT EXISTS idx_buy_rounds_stock_date
  ON public.buy_rounds(stock_id, buy_date, created_at);

CREATE INDEX IF NOT EXISTS idx_realized_trades_stock_date
  ON public.realized_trades(stock_id, sell_date, created_at);
