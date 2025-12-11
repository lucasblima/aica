-- Migration: Create message_embeddings table for WhatsApp message RAG
-- This table stores embeddings of messages received via Evolution API
-- with sentiment analysis and metadata for RAG operations

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE: message_embeddings
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Instance and contact information
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,  -- WhatsApp phone of contact (stored without @s.whatsapp.net)

  -- Message content and embedding
  message_text TEXT NOT NULL,
  embedding vector(768) NOT NULL,  -- text-embedding-004 (Google) - 768 dimensions

  -- Sentiment analysis result
  sentiment JSONB,  -- {score: -1 to 1, label: "positive|neutral|negative", triggers: [...], summary: "..."}

  -- Timestamps
  message_date TIMESTAMPTZ NOT NULL,  -- When the message was received on WhatsApp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user queries with date filtering
CREATE INDEX IF NOT EXISTS idx_message_embeddings_user_date
  ON message_embeddings(user_id, message_date DESC);

-- Vector similarity search index (ivfflat for better performance)
CREATE INDEX IF NOT EXISTS idx_message_embeddings_embedding
  ON message_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Index for instance-based queries
CREATE INDEX IF NOT EXISTS idx_message_embeddings_instance
  ON message_embeddings(instance_name);

-- Index for contact queries
CREATE INDEX IF NOT EXISTS idx_message_embeddings_remote_jid
  ON message_embeddings(user_id, remote_jid);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own embeddings
CREATE POLICY "Users can view own message embeddings"
  ON message_embeddings
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Service role can do everything (for webhook handler)
-- Note: This is implicit - service role bypasses RLS

-- ============================================================================
-- ADD COLUMN TO memories TABLE
-- ============================================================================

-- Add reference to message_embeddings in memories table
ALTER TABLE memories ADD COLUMN IF NOT EXISTS message_embedding_id UUID
  REFERENCES message_embeddings(id) ON DELETE SET NULL;

-- Index for memory-embedding relationship
CREATE INDEX IF NOT EXISTS idx_memories_embedding
  ON memories(message_embedding_id);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

-- Create or replace trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_message_embeddings_updated_at_trigger ON message_embeddings;

CREATE TRIGGER update_message_embeddings_updated_at_trigger
  BEFORE UPDATE ON message_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_message_embeddings_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE message_embeddings IS 'Stores embeddings of WhatsApp messages for RAG (Retrieval-Augmented Generation) operations';
COMMENT ON COLUMN message_embeddings.id IS 'Unique identifier';
COMMENT ON COLUMN message_embeddings.user_id IS 'Reference to auth.users - the user who received the message';
COMMENT ON COLUMN message_embeddings.instance_name IS 'Evolution API instance name';
COMMENT ON COLUMN message_embeddings.remote_jid IS 'WhatsApp phone number of the message sender (without @s.whatsapp.net suffix)';
COMMENT ON COLUMN message_embeddings.message_text IS 'Original message text';
COMMENT ON COLUMN message_embeddings.embedding IS 'Vector embedding for semantic search (768 dimensions from text-embedding-004)';
COMMENT ON COLUMN message_embeddings.sentiment IS 'JSON object with sentiment analysis: {score: -1..1, label: positive|neutral|negative, triggers: [...], summary: "..."}';
COMMENT ON COLUMN message_embeddings.message_date IS 'Timestamp when message was received on WhatsApp';
