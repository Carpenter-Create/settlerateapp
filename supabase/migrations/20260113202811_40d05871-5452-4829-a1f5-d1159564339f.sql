-- ============================================================================
-- SHAREABLE PDF EXPORTS - Tables, Storage, and RLS
-- ============================================================================

-- Create storage bucket for exports (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exports', 'exports', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EXPORT_FILES TABLE
-- Stores generated PDF file metadata
-- ============================================================================
CREATE TABLE public.export_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('scenario', 'comparison')),
  entity_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  export_version TEXT NOT NULL DEFAULT '1',
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_export_files_owner ON public.export_files(owner_user_id);
CREATE INDEX idx_export_files_entity ON public.export_files(entity_type, entity_id);
CREATE UNIQUE INDEX idx_export_files_entity_version ON public.export_files(entity_type, entity_id, export_version);

-- Enable RLS
ALTER TABLE public.export_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for export_files
CREATE POLICY "export_files_select_own"
  ON public.export_files
  FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "export_files_insert_own"
  ON public.export_files
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "export_files_delete_own"
  ON public.export_files
  FOR DELETE
  USING (auth.uid() = owner_user_id);

-- ============================================================================
-- EXPORT_SHARES TABLE
-- Represents share links with access control
-- ============================================================================
CREATE TABLE public.export_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_file_id UUID NOT NULL REFERENCES public.export_files(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view')),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient token lookups
CREATE INDEX idx_export_shares_token ON public.export_shares(token);
CREATE INDEX idx_export_shares_file ON public.export_shares(export_file_id);

-- Enable RLS
ALTER TABLE public.export_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for export_shares
-- Users can only manage shares for their own export files
CREATE POLICY "export_shares_select_own"
  ON public.export_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.export_files ef
      WHERE ef.id = export_shares.export_file_id
      AND ef.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "export_shares_insert_own"
  ON public.export_shares
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND EXISTS (
      SELECT 1 FROM public.export_files ef
      WHERE ef.id = export_shares.export_file_id
      AND ef.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "export_shares_update_own"
  ON public.export_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.export_files ef
      WHERE ef.id = export_shares.export_file_id
      AND ef.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "export_shares_delete_own"
  ON public.export_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.export_files ef
      WHERE ef.id = export_shares.export_file_id
      AND ef.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- STORAGE POLICIES FOR EXPORTS BUCKET
-- ============================================================================

-- Owner can upload their own export files
CREATE POLICY "exports_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can read their own export files
CREATE POLICY "exports_select_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can delete their own export files
CREATE POLICY "exports_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );