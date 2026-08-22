-- A symbol may exist once in each port, but not twice in the same port.
ALTER TABLE public.stocks
  DROP CONSTRAINT IF EXISTS stocks_symbol_key;

CREATE UNIQUE INDEX IF NOT EXISTS stocks_symbol_port_type_key
  ON public.stocks (UPPER(symbol), port_type);
