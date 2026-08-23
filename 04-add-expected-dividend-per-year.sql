ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS expected_dividend_per_year NUMERIC DEFAULT 0;
