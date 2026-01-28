-- Migration: Add document processing fields to whatsapp_messages
-- Enables WhatsApp RAG functionality (Issue #118)

-- Add fields for document processing tracking
ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('text', 'image', 'audio', 'video', 'document')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS document_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gemini_file_name TEXT,
ADD COLUMN IF NOT EXISTS file_search_document_id UUID REFERENCES file_search_documents(id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_media_type
  ON whatsapp_messages(media_type)
  WHERE media_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_unprocessed
  ON whatsapp_messages(document_processed)
  WHERE document_processed = FALSE AND media_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_file_search
  ON whatsapp_messages(file_search_document_id)
  WHERE file_search_document_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN whatsapp_messages.media_type IS 'Type of media attachment (text, image, audio, video, document)';
COMMENT ON COLUMN whatsapp_messages.media_url IS 'Evolution API URL for media download';
COMMENT ON COLUMN whatsapp_messages.document_processed IS 'Whether document has been processed for File Search indexing';
COMMENT ON COLUMN whatsapp_messages.gemini_file_name IS 'Gemini Files API file name (files/xxx) for indexed documents';
COMMENT ON COLUMN whatsapp_messages.file_search_document_id IS 'Reference to file_search_documents table for vector search';
