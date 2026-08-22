-- Add explicit transaction fees and include them in moving-average cost/profit.
ALTER TABLE public.buy_rounds
  ADD COLUMN IF NOT EXISTS buy_fee NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.realized_trades
  ADD COLUMN IF NOT EXISTS sell_fee NUMERIC NOT NULL DEFAULT 0;

UPDATE public.buy_rounds
SET buy_fee = 0
WHERE buy_fee IS NULL;

UPDATE public.realized_trades
SET sell_fee = 0
WHERE sell_fee IS NULL;

ALTER TABLE public.buy_rounds
  DROP CONSTRAINT IF EXISTS buy_rounds_buy_fee_nonnegative;
ALTER TABLE public.buy_rounds
  ADD CONSTRAINT buy_rounds_buy_fee_nonnegative CHECK (buy_fee >= 0);

ALTER TABLE public.realized_trades
  DROP CONSTRAINT IF EXISTS realized_trades_sell_fee_nonnegative;
ALTER TABLE public.realized_trades
  ADD CONSTRAINT realized_trades_sell_fee_nonnegative CHECK (sell_fee >= 0);

\ir 04-chronological-trade-recalculation.sql
