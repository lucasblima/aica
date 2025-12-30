-- Migration: WhatsApp Messages - Core table for Evolution API integration
-- Issue #12: WhatsApp Integration via Evolution API
--
-- This migration creates the main table for storing WhatsApp messages
-- with support for different message types (text, audio, image, document)

-- ============================================================================
-- TABLE: whatsapp_messages
-- ============================================================================
-- Primary table for all incoming/outgoing WhatsApp messages

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference (owner of the WhatsApp connection)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Evolution API identifiers
  instance_name TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,  -- Evolution API message ID

  -- Contact information
  remote_jid TEXT NOT NULL,  -- WhatsApp ID (5521965564006@s.whatsapp.net)
  contact_name TEXT,  -- Push name from WhatsApp
  contact_phone TEXT NOT NULL,  -- Normalized phone (5521965564006)

  -- Message direction and type
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document', 'sticker', 'location', 'contact', 'reaction')),

  -- Content fields
  content_text TEXT,  -- Text content or caption
  content_transcription TEXT,  -- Audio transcription via Gemini
  content_ocr TEXT,  -- Image OCR text via Gemini

  -- Media information
  media_url TEXT,  -- Supabase Storage URL
  media_mimetype TEXT,
  media_filename TEXT,
  media_size_bytes INTEGER,
  media_duration_seconds INTEGER,  -- For audio/video

  -- AI Analysis
  sentiment_score DECIMAL(4,3) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_label TEXT CHECK (sentiment_label IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
  detected_intent TEXT,  -- e.g., 'question', 'complaint', 'gratitude', 'request', 'information'
  detected_topics TEXT[],  -- Array of topics/tags

  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  processing_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Timestamps
  message_timestamp TIMESTAMPTZ NOT NULL,  -- Original WhatsApp timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Soft delete for LGPD compliance
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_timestamp
  ON whatsapp_messages(user_id, message_timestamp DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_contact
  ON whatsapp_messages(user_id, contact_phone, message_timestamp DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance
  ON whatsapp_messages(instance_name, message_timestamp DESC);

-- Processing queue
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processing
  ON whatsapp_messages(processing_status, created_at)
  WHERE processing_status IN ('pending', 'processing');

-- Search by content
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_content_gin
  ON whatsapp_messages USING gin(to_tsvector('portuguese', COALESCE(content_text, '') || ' ' || COALESCE(content_transcription, '')));

-- Direction and type filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction_type
  ON whatsapp_messages(user_id, direction, message_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own whatsapp messages"
  ON whatsapp_messages
  FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Users can soft-delete their own messages (LGPD right to erasure)
CREATE POLICY "Users can delete own whatsapp messages"
  ON whatsapp_messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND deleted_at IS NOT NULL
    AND deletion_reason IS NOT NULL
  );

-- Service role bypasses RLS for webhook processing

-- ============================================================================
-- TABLE: whatsapp_conversations
-- ============================================================================
-- Aggregated view of conversations per contact

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,

  -- Conversation stats
  total_messages INTEGER DEFAULT 0,
  messages_incoming INTEGER DEFAULT 0,
  messages_outgoing INTEGER DEFAULT 0,

  -- Sentiment tracking
  average_sentiment DECIMAL(4,3),
  last_sentiment_label TEXT,

  -- Timestamps
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_incoming_at TIMESTAMPTZ,
  last_outgoing_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint
  CONSTRAINT unique_user_contact UNIQUE(user_id, contact_phone)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user
  ON whatsapp_conversations(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_sentiment
  ON whatsapp_conversations(user_id, average_sentiment);

-- RLS
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON whatsapp_conversations
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTION: Update conversation stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whatsapp_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO whatsapp_conversations (
    user_id,
    contact_phone,
    contact_name,
    total_messages,
    messages_incoming,
    messages_outgoing,
    average_sentiment,
    last_sentiment_label,
    first_message_at,
    last_message_at,
    last_incoming_at,
    last_outgoing_at
  )
  VALUES (
    NEW.user_id,
    NEW.contact_phone,
    NEW.contact_name,
    1,
    CASE WHEN NEW.direction = 'incoming' THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 'outgoing' THEN 1 ELSE 0 END,
    NEW.sentiment_score,
    NEW.sentiment_label,
    NEW.message_timestamp,
    NEW.message_timestamp,
    CASE WHEN NEW.direction = 'incoming' THEN NEW.message_timestamp ELSE NULL END,
    CASE WHEN NEW.direction = 'outgoing' THEN NEW.message_timestamp ELSE NULL END
  )
  ON CONFLICT (user_id, contact_phone) DO UPDATE SET
    contact_name = COALESCE(NEW.contact_name, whatsapp_conversations.contact_name),
    total_messages = whatsapp_conversations.total_messages + 1,
    messages_incoming = whatsapp_conversations.messages_incoming + CASE WHEN NEW.direction = 'incoming' THEN 1 ELSE 0 END,
    messages_outgoing = whatsapp_conversations.messages_outgoing + CASE WHEN NEW.direction = 'outgoing' THEN 1 ELSE 0 END,
    average_sentiment = CASE
      WHEN NEW.sentiment_score IS NOT NULL THEN
        (COALESCE(whatsapp_conversations.average_sentiment, 0) * whatsapp_conversations.total_messages + NEW.sentiment_score) / (whatsapp_conversations.total_messages + 1)
      ELSE whatsapp_conversations.average_sentiment
    END,
    last_sentiment_label = COALESCE(NEW.sentiment_label, whatsapp_conversations.last_sentiment_label),
    last_message_at = NEW.message_timestamp,
    last_incoming_at = CASE WHEN NEW.direction = 'incoming' THEN NEW.message_timestamp ELSE whatsapp_conversations.last_incoming_at END,
    last_outgoing_at = CASE WHEN NEW.direction = 'outgoing' THEN NEW.message_timestamp ELSE whatsapp_conversations.last_outgoing_at END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_stats ON whatsapp_messages;
CREATE TRIGGER trigger_update_conversation_stats
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION update_whatsapp_conversation_stats();

-- ============================================================================
-- FUNCTION: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whatsapp_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER trigger_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_messages_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_messages IS 'Stores all WhatsApp messages received/sent via Evolution API integration';
COMMENT ON TABLE whatsapp_conversations IS 'Aggregated conversation stats per contact for quick access';

COMMENT ON COLUMN whatsapp_messages.message_id IS 'Unique message ID from Evolution API for deduplication';
COMMENT ON COLUMN whatsapp_messages.remote_jid IS 'Full WhatsApp JID (phone@s.whatsapp.net or group@g.us)';
COMMENT ON COLUMN whatsapp_messages.content_transcription IS 'Audio transcription generated by Gemini API';
COMMENT ON COLUMN whatsapp_messages.content_ocr IS 'Text extracted from images via Gemini Vision OCR';
COMMENT ON COLUMN whatsapp_messages.processing_status IS 'Status of AI processing pipeline (sentiment, transcription, etc)';
