-- Migration: WhatsApp Media Storage Bucket
-- Issue #12: WhatsApp Integration via Evolution API
--
-- This migration creates the Storage bucket for WhatsApp media files
-- with appropriate security policies and retention settings

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

-- Create the whatsapp-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  false,  -- Private bucket
  52428800,  -- 50MB max file size
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    -- Audio
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/opus',
    'audio/aac',
    'audio/wav',
    -- Video
    'video/mp4',
    'video/3gpp',
    'video/webm',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Policy: Users can view their own media files
CREATE POLICY "Users can view own whatsapp media"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Service role can upload (for webhook processing)
-- Note: Service role bypasses RLS by default

-- Policy: Users can delete their own media (LGPD)
CREATE POLICY "Users can delete own whatsapp media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- TABLE: whatsapp_media_metadata
-- ============================================================================
-- Additional metadata for media files stored in the bucket

CREATE TABLE IF NOT EXISTS whatsapp_media_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,

  -- Storage info
  storage_path TEXT NOT NULL UNIQUE,  -- Path in bucket: {user_id}/{date}/{filename}
  original_url TEXT,  -- Original Evolution API media URL (temporary)

  -- File info
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT,  -- SHA-256 for deduplication

  -- Media type specific
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video', 'document', 'sticker')),
  duration_seconds INTEGER,  -- For audio/video
  dimensions JSONB,  -- For images/video: {"width": 1920, "height": 1080}

  -- Processing
  transcription TEXT,  -- Audio transcription
  ocr_text TEXT,  -- Image OCR result
  thumbnail_path TEXT,  -- Path to thumbnail if generated
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  processing_error TEXT,

  -- Retention
  retention_days INTEGER DEFAULT 30,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_metadata_user
  ON whatsapp_media_metadata(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_metadata_message
  ON whatsapp_media_metadata(message_id);

CREATE INDEX IF NOT EXISTS idx_media_metadata_processing
  ON whatsapp_media_metadata(processing_status, created_at)
  WHERE processing_status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_media_metadata_expiration
  ON whatsapp_media_metadata(expires_at)
  WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_metadata_hash
  ON whatsapp_media_metadata(file_hash)
  WHERE file_hash IS NOT NULL;

-- RLS
ALTER TABLE whatsapp_media_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media metadata"
  ON whatsapp_media_metadata
  FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- ============================================================================
-- FUNCTION: Generate storage path
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_whatsapp_media_path(
  p_user_id UUID,
  p_filename TEXT,
  p_media_type TEXT
)
RETURNS TEXT AS $$
DECLARE
  date_folder TEXT;
  safe_filename TEXT;
  unique_id TEXT;
BEGIN
  -- Date folder format: YYYY/MM/DD
  date_folder := to_char(now(), 'YYYY/MM/DD');

  -- Sanitize filename
  safe_filename := regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');

  -- Generate unique ID
  unique_id := substr(gen_random_uuid()::text, 1, 8);

  -- Return path: {user_id}/{media_type}/{date}/{unique_id}_{filename}
  RETURN format('%s/%s/%s/%s_%s',
    p_user_id,
    p_media_type,
    date_folder,
    unique_id,
    safe_filename
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Set media expiration
-- ============================================================================

CREATE OR REPLACE FUNCTION set_media_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.retention_days IS NOT NULL AND NEW.retention_days > 0 THEN
    NEW.expires_at := NEW.created_at + (NEW.retention_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_media_expiration ON whatsapp_media_metadata;
CREATE TRIGGER trigger_set_media_expiration
  BEFORE INSERT ON whatsapp_media_metadata
  FOR EACH ROW
  EXECUTE FUNCTION set_media_expiration();

-- ============================================================================
-- FUNCTION: Cleanup expired media
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_whatsapp_media()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  media_record RECORD;
BEGIN
  FOR media_record IN
    SELECT id, storage_path, thumbnail_path
    FROM whatsapp_media_metadata
    WHERE expires_at IS NOT NULL
      AND expires_at < now()
      AND deleted_at IS NULL
    LIMIT 100
  LOOP
    -- Mark as deleted (actual file deletion should be done by Edge Function)
    UPDATE whatsapp_media_metadata
    SET deleted_at = now(), updated_at = now()
    WHERE id = media_record.id;

    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON JOB: Cleanup expired media
-- ============================================================================

SELECT cron.schedule(
  'cleanup-expired-whatsapp-media',
  '0 4 * * *',  -- Daily at 4 AM
  $$SELECT cleanup_expired_whatsapp_media()$$
);

-- ============================================================================
-- VIEW: Media statistics per user
-- ============================================================================

CREATE OR REPLACE VIEW whatsapp_media_stats AS
SELECT
  user_id,
  media_type,
  COUNT(*) as file_count,
  SUM(file_size_bytes) as total_bytes,
  AVG(file_size_bytes) as avg_file_size,
  COUNT(*) FILTER (WHERE processing_status = 'completed') as processed_count,
  COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
  MIN(created_at) as first_upload,
  MAX(created_at) as last_upload
FROM whatsapp_media_metadata
WHERE deleted_at IS NULL
GROUP BY user_id, media_type;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_media_metadata IS 'Metadata for WhatsApp media files stored in Supabase Storage';
COMMENT ON FUNCTION generate_whatsapp_media_path IS 'Generates unique storage path for WhatsApp media files';
COMMENT ON FUNCTION cleanup_expired_whatsapp_media IS 'Marks expired media files as deleted based on retention policy';
COMMENT ON VIEW whatsapp_media_stats IS 'Aggregated statistics of WhatsApp media per user';
