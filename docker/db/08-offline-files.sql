-- Metadata used by files stored in the local Docker upload volume.
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS storage_kind TEXT NOT NULL DEFAULT 'link',
  ADD COLUMN IF NOT EXISTS stored_name TEXT,
  ADD COLUMN IF NOT EXISTS original_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT;

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_storage_kind_check;
ALTER TABLE public.files
  ADD CONSTRAINT files_storage_kind_check
  CHECK (storage_kind IN ('link', 'local'));

CREATE UNIQUE INDEX IF NOT EXISTS files_stored_name_unique
  ON public.files(stored_name)
  WHERE stored_name IS NOT NULL;
