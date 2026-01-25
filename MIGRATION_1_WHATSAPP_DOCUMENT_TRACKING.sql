-- ============================================================================
-- MIGRATION: WhatsApp Document Input Infrastructure
-- Date: 2026-01-22
-- Issue: #118 - WhatsApp Input de Documentos (Fase 1: Infraestrutura)
-- Author: Backend Architect Supabase Agent
--
-- PURPOSE:
-- 1. Create storage bucket `whatsapp-documents` for WhatsApp media files
-- 2. Create table `whatsapp_media_tracking` for tracking document processing
-- 3. Update `whatsapp_pending_actions` to support document processing actions
-- 4. Add RLS policies for security
-- 5. Create performance indexes
--
-- DEPENDENCIES:
-- - whatsapp_pending_actions table (from 20260114000004_whatsapp_pending_actions.sql)
-- - processed_documents table (from 20260112000001_create_document_processing.sql)
-- - auth.users table
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE STORAGE BUCKET FOR WHATSAPP DOCUMENTS
-- ============================================================================

-- Create bucket for WhatsApp-sourced documents with appropriate limits and MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-documents',
  'whatsapp-documents',
  false,  -- Private bucket (users only see their own files)
  26214400,  -- 25MB max file size (25 * 1024 * 1024 bytes)
  ARRAY[
    -- PDF documents
    'application/pdf',
    -- Microsoft Office (Word, PowerPoint)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  -- .docx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',  -- .pptx
    -- Images (for OCR processing)
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- PART 2: CREATE RLS POLICIES FOR STORAGE BUCKET
-- ============================================================================

-- Policy: Users can SELECT (view) their own WhatsApp documents
-- Path pattern: {user_id}/{timestamp}_{original_filename}
CREATE POLICY "Users can view own whatsapp documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'whatsapp-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Authenticated users can INSERT (upload) to their own folder
CREATE POLICY "Users can upload own whatsapp documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'whatsapp-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can UPDATE their own WhatsApp documents
CREATE POLICY "Users can update own whatsapp documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'whatsapp-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'whatsapp-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can DELETE their own WhatsApp documents (LGPD compliance)
CREATE POLICY "Users can delete own whatsapp documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'whatsapp-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- PART 3: UPDATE WHATSAPP_PENDING_ACTIONS CONSTRAINT
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.whatsapp_pending_actions
DROP CONSTRAINT IF EXISTS whatsapp_pending_actions_action_type_check;

-- Add new constraint with document-related action types
ALTER TABLE public.whatsapp_pending_actions
ADD CONSTRAINT whatsapp_pending_actions_action_type_check
CHECK (action_type IN (
  'register_organization',   -- Register organization from document
  'update_organization',     -- Update existing organization
  'create_task',             -- Create task from message
  'schedule_reminder',       -- Schedule reminder
  'process_document',        -- NEW: Process document via File Pipeline
  'link_document'            -- NEW: Link processed document to entity
));

-- ============================================================================
-- PART 4: CREATE WHATSAPP_MEDIA_TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_media_tracking (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and conversation context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,  -- WhatsApp message ID (from Evolution API)
  instance_name TEXT NOT NULL,  -- Evolution instance name (e.g., aica_<user_id>)

  -- Media information from WhatsApp
  media_type TEXT NOT NULL  -- Type: document, image, audio, video
    CHECK (media_type IN ('document', 'image', 'audio', 'video')),
  mime_type TEXT,  -- MIME type of the file
  original_filename TEXT,  -- Original filename from WhatsApp
  file_size_bytes INTEGER,  -- File size in bytes

  -- Storage tracking
  storage_path TEXT,  -- Path in whatsapp-documents bucket after upload

  -- Processing status tracking
  download_status TEXT DEFAULT 'pending'  -- Status: pending, downloading, completed, failed
    CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
  processing_status TEXT DEFAULT 'pending'  -- Status: pending, processing, completed, failed
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),

  -- Reference to processed document (after successful processing)
  processed_document_id UUID REFERENCES public.processed_documents(id) ON DELETE SET NULL,

  -- Error tracking
  error_message TEXT,  -- Error details if download or processing fails

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- When media was received
  downloaded_at TIMESTAMPTZ,  -- When download completed
  processed_at TIMESTAMPTZ,  -- When processing completed

  -- Deduplication constraint: one tracking record per user+message
  CONSTRAINT unique_user_message UNIQUE (user_id, message_id)
);

-- ============================================================================
-- PART 5: CREATE INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Index: Find media by user (most common query)
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_user
  ON public.whatsapp_media_tracking(user_id);

-- Index: Find media by status (for processing queue)
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_status
  ON public.whatsapp_media_tracking(download_status, processing_status);

-- Index: Find recent media (descending created_at)
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_created
  ON public.whatsapp_media_tracking(created_at DESC);

-- Index: Find media by processed document (for backtracking)
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_processed_doc
  ON public.whatsapp_media_tracking(processed_document_id)
  WHERE processed_document_id IS NOT NULL;

-- ============================================================================
-- PART 6: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.whatsapp_media_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: CREATE RLS POLICIES FOR WHATSAPP_MEDIA_TRACKING
-- ============================================================================

-- Policy: Users can view their own media tracking records
CREATE POLICY "Users can view own media tracking"
  ON public.whatsapp_media_tracking
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own media tracking records
CREATE POLICY "Users can insert own media tracking"
  ON public.whatsapp_media_tracking
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own media tracking records
CREATE POLICY "Users can update own media tracking"
  ON public.whatsapp_media_tracking
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own media tracking records (LGPD compliance)
CREATE POLICY "Users can delete own media tracking"
  ON public.whatsapp_media_tracking
  FOR DELETE
  USING (user_id = auth.uid());

-- Policy: Service role can manage all media tracking (for webhook processing)
CREATE POLICY "Service role can manage media tracking"
  ON public.whatsapp_media_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 8: CREATE TRIGGER FOR AUTO-UPDATE updated_at
-- ============================================================================

-- Trigger function: Update updated_at timestamp (not applicable - no updated_at column)
-- Note: whatsapp_media_tracking uses created_at, downloaded_at, processed_at for timeline tracking

-- ============================================================================
-- PART 9: ADD TABLE AND COLUMN COMMENTS
-- ============================================================================

COMMENT ON TABLE public.whatsapp_media_tracking IS
  'Tracks media files received via WhatsApp for download and processing pipeline integration';

COMMENT ON COLUMN public.whatsapp_media_tracking.id IS
  'Unique tracking identifier';

COMMENT ON COLUMN public.whatsapp_media_tracking.user_id IS
  'User who received the media via WhatsApp';

COMMENT ON COLUMN public.whatsapp_media_tracking.message_id IS
  'WhatsApp message ID from Evolution API for deduplication';

COMMENT ON COLUMN public.whatsapp_media_tracking.instance_name IS
  'Evolution instance that received the media (e.g., aica_<user_id>)';

COMMENT ON COLUMN public.whatsapp_media_tracking.media_type IS
  'Type of media: document, image, audio, or video';

COMMENT ON COLUMN public.whatsapp_media_tracking.storage_path IS
  'Path in whatsapp-documents bucket after successful upload';

COMMENT ON COLUMN public.whatsapp_media_tracking.download_status IS
  'Status of downloading media from Evolution API to Storage';

COMMENT ON COLUMN public.whatsapp_media_tracking.processing_status IS
  'Status of document processing via File Pipeline (process-document Edge Function)';

COMMENT ON COLUMN public.whatsapp_media_tracking.processed_document_id IS
  'Reference to processed_documents table after successful processing';

COMMENT ON COLUMN public.whatsapp_media_tracking.error_message IS
  'Error details if download or processing fails';

COMMENT ON COLUMN public.whatsapp_media_tracking.created_at IS
  'When the media was received via WhatsApp webhook';

COMMENT ON COLUMN public.whatsapp_media_tracking.downloaded_at IS
  'When the media was successfully downloaded to Storage';

COMMENT ON COLUMN public.whatsapp_media_tracking.processed_at IS
  'When document processing completed (success or failure)';

-- ============================================================================
-- PART 10: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Generate storage path for WhatsApp documents
-- Pattern: {user_id}/{timestamp}_{original_filename}
CREATE OR REPLACE FUNCTION public.generate_whatsapp_document_path(
  p_user_id UUID,
  p_filename TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  safe_filename TEXT;
  timestamp_prefix TEXT;
BEGIN
  -- Sanitize filename (remove special characters, keep alphanumeric and dots)
  safe_filename := regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');

  -- Generate timestamp prefix (format: YYYYMMDD_HHMMSS)
  timestamp_prefix := to_char(NOW(), 'YYYYMMDD_HH24MISS');

  -- Return path: {user_id}/{timestamp}_{filename}
  RETURN format('%s/%s_%s', p_user_id, timestamp_prefix, safe_filename);
END;
$$;

COMMENT ON FUNCTION public.generate_whatsapp_document_path IS
  'Generates unique storage path for WhatsApp documents: {user_id}/{timestamp}_{filename}';

-- Function: Get pending media for processing (queue)
CREATE OR REPLACE FUNCTION public.get_pending_whatsapp_media(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  message_id TEXT,
  instance_name TEXT,
  media_type TEXT,
  mime_type TEXT,
  original_filename TEXT,
  storage_path TEXT,
  download_status TEXT,
  processing_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    id,
    user_id,
    message_id,
    instance_name,
    media_type,
    mime_type,
    original_filename,
    storage_path,
    download_status,
    processing_status,
    created_at
  FROM public.whatsapp_media_tracking
  WHERE processing_status = 'pending'
    AND download_status = 'completed'
  ORDER BY created_at ASC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_pending_whatsapp_media IS
  'Retrieves media files ready for processing (downloaded but not yet processed)';

-- ============================================================================
-- PART 11: VERIFICATION AND LOGGING
-- ============================================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  table_exists BOOLEAN;
  constraint_updated BOOLEAN;
  policies_count INTEGER;
BEGIN
  -- Check if bucket was created
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'whatsapp-documents'
  ) INTO bucket_exists;

  -- Check if table was created
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'whatsapp_media_tracking'
  ) INTO table_exists;

  -- Check if constraint was updated
  SELECT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'whatsapp_pending_actions'
      AND constraint_name = 'whatsapp_pending_actions_action_type_check'
  ) INTO constraint_updated;

  -- Count RLS policies on whatsapp_media_tracking
  SELECT COUNT(*)::INTEGER INTO policies_count
  FROM pg_policies
  WHERE tablename = 'whatsapp_media_tracking';

  -- Count Storage policies for whatsapp-documents bucket
  DECLARE
    storage_policies_count INTEGER;
  BEGIN
    SELECT COUNT(*)::INTEGER INTO storage_policies_count
    FROM pg_policies
    WHERE tablename = 'objects'
      AND policyname LIKE '%whatsapp documents%';

    -- Log results
    RAISE NOTICE '=== WhatsApp Document Input Infrastructure Migration ===';
    RAISE NOTICE 'Storage bucket created: %', bucket_exists;
    RAISE NOTICE 'whatsapp_media_tracking table created: %', table_exists;
    RAISE NOTICE 'whatsapp_pending_actions constraint updated: %', constraint_updated;
    RAISE NOTICE 'RLS policies created (table): %', policies_count;
    RAISE NOTICE 'RLS policies created (storage): %', storage_policies_count;

    IF bucket_exists AND table_exists AND constraint_updated AND policies_count >= 4 AND storage_policies_count >= 4 THEN
      RAISE NOTICE '✅ Fase 1: Infraestrutura completed successfully!';
      RAISE NOTICE '';
      RAISE NOTICE 'Next steps (Fase 2):';
      RAISE NOTICE '1. Create supabase/functions/_shared/whatsapp-media-handler.ts';
      RAISE NOTICE '2. Create supabase/functions/_shared/whatsapp-document-processor.ts';
      RAISE NOTICE '3. Modify webhook-evolution to handle media messages';
    ELSE
      RAISE WARNING '⚠️ Some components may not have been created. Check logs above.';
      RAISE WARNING 'Expected: bucket=true, table=true, constraint=true, policies>=4, storage_policies>=4';
      RAISE WARNING 'Got: bucket=%, table=%, constraint=%, policies=%, storage_policies=%',
        bucket_exists, table_exists, constraint_updated, policies_count, storage_policies_count;
    END IF;
  END;
END $$;
