-- =========================================================
-- SettleRate: Canonical PDF Export Foundation (Supabase SQL)
-- - Single source of truth for scenario/comparison exports
-- - Owner-only access via RLS
-- - Optional share foundation (disabled by default)
-- =========================================================

-- 1) Enum types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_kind') THEN
    CREATE TYPE public.export_kind AS ENUM ('scenario', 'comparison');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status') THEN
    CREATE TYPE public.export_status AS ENUM ('queued', 'rendering', 'ready', 'failed');
  END IF;
END $$;

-- 2) Canonical exports table (one row per generated PDF file)
CREATE TABLE IF NOT EXISTS public.pdf_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ownership (always the authenticated app user)
  user_id uuid NOT NULL,
  -- What this export represents
  kind public.export_kind NOT NULL,
  source_id uuid NOT NULL,
  -- Storage location: "exports/<user_id>/<id>.pdf" (recommended convention)
  storage_bucket text NOT NULL DEFAULT 'exports',
  storage_path text NOT NULL,
  -- Lifecycle
  status public.export_status NOT NULL DEFAULT 'queued',
  error_message text NULL,
  -- Optional integrity / caching
  content_sha256 text NULL,
  bytes integer NULL,
  -- Share foundation (DISABLED by default)
  share_enabled boolean NOT NULL DEFAULT false,
  share_token text NULL UNIQUE,
  share_expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Token length constraint
  CONSTRAINT pdf_exports_share_token_length CHECK (share_token IS NULL OR length(share_token) >= 32)
);

-- 3) Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_pdf_exports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pdf_exports_updated_at ON public.pdf_exports;
CREATE TRIGGER trg_pdf_exports_updated_at
BEFORE UPDATE ON public.pdf_exports
FOR EACH ROW EXECUTE FUNCTION public.set_pdf_exports_updated_at();

-- 4) Uniqueness: keep only one "ready" export per source
CREATE UNIQUE INDEX IF NOT EXISTS pdf_exports_unique_ready_per_source
ON public.pdf_exports (kind, source_id, user_id)
WHERE status = 'ready';

CREATE INDEX IF NOT EXISTS pdf_exports_user_id_idx ON public.pdf_exports (user_id);
CREATE INDEX IF NOT EXISTS pdf_exports_source_idx ON public.pdf_exports (kind, source_id);

-- 5) Source ownership guard function
CREATE OR REPLACE FUNCTION public.assert_export_source_owned_by_user(
  p_kind public.export_kind, 
  p_source_id uuid, 
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF p_kind = 'scenario' THEN
    SELECT true INTO ok
    FROM public.scenarios s
    WHERE s.id = p_source_id
      AND s.user_id = p_user_id
    LIMIT 1;
  ELSIF p_kind = 'comparison' THEN
    SELECT true INTO ok
    FROM public.saved_comparisons c
    WHERE c.id = p_source_id
      AND c.user_id = p_user_id
    LIMIT 1;
  END IF;
  RETURN COALESCE(ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_export_source_owned_by_user(public.export_kind, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.assert_export_source_owned_by_user(public.export_kind, uuid, uuid) TO authenticated;

-- 6) RLS on pdf_exports
ALTER TABLE public.pdf_exports ENABLE ROW LEVEL SECURITY;

-- Read: only owner
DROP POLICY IF EXISTS "pdf_exports_select_own" ON public.pdf_exports;
CREATE POLICY "pdf_exports_select_own"
ON public.pdf_exports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Insert: only owner + must own the underlying source
DROP POLICY IF EXISTS "pdf_exports_insert_own" ON public.pdf_exports;
CREATE POLICY "pdf_exports_insert_own"
ON public.pdf_exports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.assert_export_source_owned_by_user(kind, source_id, user_id)
);

-- Update: only owner (and still must own source)
DROP POLICY IF EXISTS "pdf_exports_update_own" ON public.pdf_exports;
CREATE POLICY "pdf_exports_update_own"
ON public.pdf_exports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.assert_export_source_owned_by_user(kind, source_id, user_id)
);

-- Delete: only owner
DROP POLICY IF EXISTS "pdf_exports_delete_own" ON public.pdf_exports;
CREATE POLICY "pdf_exports_delete_own"
ON public.pdf_exports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7) Storage RLS policies for the "exports" bucket
-- Path convention: exports/<user_id>/<export_id>.pdf

-- SELECT: only owner can read objects in their user folder
DROP POLICY IF EXISTS "exports_bucket_read_own_folder" ON storage.objects;
CREATE POLICY "exports_bucket_read_own_folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- INSERT: only owner can upload into their user folder
DROP POLICY IF EXISTS "exports_bucket_insert_own_folder" ON storage.objects;
CREATE POLICY "exports_bucket_insert_own_folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- UPDATE: only owner can update objects in their folder
DROP POLICY IF EXISTS "exports_bucket_update_own_folder" ON storage.objects;
CREATE POLICY "exports_bucket_update_own_folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exports'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'exports'
  AND split_part(name, '/', 1) = auth.uid()::text
);