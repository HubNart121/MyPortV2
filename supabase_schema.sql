-- 1. Create stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT,
  sector TEXT,
  status TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  port_type TEXT NOT NULL DEFAULT 'Private',
  dividend_per_share NUMERIC DEFAULT 0,
  target_price NUMERIC DEFAULT 0,
  note TEXT
);

-- 2. Create buy_rounds table
CREATE TABLE IF NOT EXISTS buy_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  buy_date DATE NOT NULL,
  price NUMERIC NOT NULL,
  shares NUMERIC NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE buy_rounds ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allowing public access for simplification - adjust per your needed security level)
-- Policy for stocks
CREATE POLICY "Enable all access for stocks" ON stocks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for buy_rounds
CREATE POLICY "Enable all access for buy_rounds" ON buy_rounds
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Create realized_trades table
CREATE TABLE IF NOT EXISTS realized_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  sell_date DATE NOT NULL,
  shares NUMERIC NOT NULL,
  sell_price NUMERIC NOT NULL,
  avg_cost_at_sell NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  port_type TEXT NOT NULL
);

ALTER TABLE realized_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for realized_trades" ON realized_trades
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_realized_trades_stock_id ON realized_trades(stock_id);

-- 7. Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  detail TEXT,
  link TEXT
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for files" ON files
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. Create informations table
CREATE TABLE IF NOT EXISTS informations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  link TEXT,
  detail TEXT
);

ALTER TABLE informations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for informations" ON informations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Create auth_config table for simple authentication
CREATE TABLE IF NOT EXISTS auth_config (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one record exists
  username TEXT NOT NULL DEFAULT 'admin',
  password TEXT NOT NULL DEFAULT 'admin',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE auth_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for auth_config" ON auth_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed initial admin user if not exists
INSERT INTO auth_config (id, username, password) 
VALUES (1, 'admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- 10. Create login_logs table
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  username TEXT,
  ip_address TEXT,
  device TEXT,
  device_type TEXT,
  status TEXT CHECK (status IN ('Success', 'Failed'))
);

ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for login_logs" ON login_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at DESC);

-- 11. Create dividend_payments table
CREATE TABLE IF NOT EXISTS dividend_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  pay_date DATE NOT NULL,
  dividend_per_share NUMERIC NOT NULL,
  shares_held NUMERIC NOT NULL,
  tax_pct NUMERIC NOT NULL DEFAULT 10,
  gross_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL
);

ALTER TABLE dividend_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for dividend_payments" ON dividend_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_dividend_payments_stock_id ON dividend_payments(stock_id);
