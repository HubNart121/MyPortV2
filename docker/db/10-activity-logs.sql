CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'import', 'clear', 'restore')),
  category TEXT NOT NULL CHECK (category IN ('stock', 'buy_round', 'sell', 'dividend', 'cash', 'file', 'information', 'system')),
  target_label TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for activity_logs" ON public.activity_logs;
CREATE POLICY "Enable all access for activity_logs" ON public.activity_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_category
  ON public.activity_logs(action, category);
