-- =============================================================================
-- WhatsApp File Import Infrastructure
--
-- Enables user-driven import of WhatsApp chat exports (.txt/.zip).
-- Privacy-first: raw text NEVER stored in whatsapp_messages, only via
-- File Search V2 (user-consented RAG).
--
-- Tables: whatsapp_file_imports (new)
-- Columns: source, dedup_hash, import_id on whatsapp_messages
-- Bucket: whatsapp-exports (private, user-scoped)
-- =============================================================================

-- ============================================================================
-- TABLE: whatsapp_file_imports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_file_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  original_filename TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  storage_path TEXT,
  file_hash TEXT NOT NULL,

  -- Parse results
  export_format TEXT CHECK (export_format IN ('android', 'ios', 'unknown')),
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'parsing', 'extracting_intents', 'indexing_rag', 'completed', 'failed')),
  processing_error TEXT,

  -- Stats
  total_messages_parsed INTEGER DEFAULT 0,
  messages_imported INTEGER DEFAULT 0,
  messages_deduplicated INTEGER DEFAULT 0,
  contacts_resolved INTEGER DEFAULT 0,

  -- Date range of exported conversation
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  participants TEXT[] DEFAULT '{}',
  is_group_export BOOLEAN DEFAULT false,

  -- File Search V2 (RAG)
  file_search_store_id TEXT,
  file_search_document_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_file_imports_user
  ON whatsapp_file_imports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_file_imports_hash
  ON whatsapp_file_imports(user_id, file_hash);

CREATE INDEX IF NOT EXISTS idx_whatsapp_file_imports_status
  ON whatsapp_file_imports(processing_status)
  WHERE processing_status NOT IN ('completed', 'failed');

-- RLS
ALTER TABLE whatsapp_file_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own imports"
  ON whatsapp_file_imports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own imports"
  ON whatsapp_file_imports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own imports"
  ON whatsapp_file_imports FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own imports"
  ON whatsapp_file_imports FOR DELETE
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_file_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_whatsapp_file_imports_updated_at ON whatsapp_file_imports;
CREATE TRIGGER trigger_whatsapp_file_imports_updated_at
  BEFORE UPDATE ON whatsapp_file_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_file_imports_updated_at();

-- ============================================================================
-- ALTER whatsapp_messages: add source, dedup_hash, import_id
-- ============================================================================

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'webhook'
    CHECK (source IN ('webhook', 'file_import', 'chatbot')),
  ADD COLUMN IF NOT EXISTS dedup_hash TEXT,
  ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES whatsapp_file_imports(id) ON DELETE SET NULL;

-- Unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_dedup
  ON whatsapp_messages(user_id, dedup_hash)
  WHERE dedup_hash IS NOT NULL;

-- Index for querying messages by import
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_import
  ON whatsapp_messages(import_id)
  WHERE import_id IS NOT NULL;

-- ============================================================================
-- STORAGE BUCKET: whatsapp-exports
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-exports',
  'whatsapp-exports',
  false,
  104857600,  -- 100MB
  ARRAY['text/plain', 'application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: user-scoped upload/read/delete
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'whatsapp-exports'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can read own exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'whatsapp-exports'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can delete own exports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'whatsapp-exports'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ============================================================================
-- RPC: Get import history for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_whatsapp_import_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  original_filename TEXT,
  file_size_bytes INTEGER,
  export_format TEXT,
  processing_status TEXT,
  processing_error TEXT,
  total_messages_parsed INTEGER,
  messages_imported INTEGER,
  messages_deduplicated INTEGER,
  contacts_resolved INTEGER,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  participants TEXT[],
  is_group_export BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wfi.id,
    wfi.original_filename,
    wfi.file_size_bytes,
    wfi.export_format,
    wfi.processing_status,
    wfi.processing_error,
    wfi.total_messages_parsed,
    wfi.messages_imported,
    wfi.messages_deduplicated,
    wfi.contacts_resolved,
    wfi.date_range_start,
    wfi.date_range_end,
    wfi.participants,
    wfi.is_group_export,
    wfi.created_at
  FROM public.whatsapp_file_imports wfi
  WHERE wfi.user_id = p_user_id
  ORDER BY wfi.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_whatsapp_import_history(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_file_imports IS 'Tracks user-uploaded WhatsApp chat export files and their processing status';
COMMENT ON COLUMN whatsapp_file_imports.file_hash IS 'SHA-256 hash of the file content for deduplication';
COMMENT ON COLUMN whatsapp_file_imports.file_search_store_id IS 'Google File Search V2 store ID for RAG queries';
COMMENT ON COLUMN whatsapp_messages.source IS 'Origin of the message: webhook (Evolution API), file_import (user upload), chatbot (bot)';
COMMENT ON COLUMN whatsapp_messages.dedup_hash IS 'SHA-256 hash for deduplication: contactId+timestamp+sender+first50chars';
COMMENT ON COLUMN whatsapp_messages.import_id IS 'Reference to the file import that created this message';
