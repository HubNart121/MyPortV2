-- Keep the local PostgreSQL schema aligned with the complete JSON backup (v5).
ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS risk_category TEXT;

CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  port_type TEXT NOT NULL DEFAULT 'Private',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for cash_transactions" ON public.cash_transactions;
CREATE POLICY "Enable all access for cash_transactions" ON public.cash_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_date
  ON public.cash_transactions(transaction_date DESC, created_at DESC);
