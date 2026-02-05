-- =============================================================================
-- Migration: WhatsApp Intent Privacy-First Storage
-- Issue #91: Transform from raw message storage to extracted intent storage
-- Compliance: WhatsApp Terms (no raw message storage) + LGPD data minimization
-- =============================================================================
--
-- CRITICAL CHANGES:
-- 1. REMOVE content_text column (violates WhatsApp ToS)
-- 2. ADD intent_* columns for semantic search and timeline display
-- 3. ENABLE pgvector for embeddings-based search
-- 4. UPDATE contact_network to store intent previews instead of raw text
--
-- MIGRATION PATH:
-- - Existing messages: Keep processed data, drop content_text
-- - New messages: Webhook immediately extracts intent, never stores raw text
--
-- =============================================================================

-- =============================================================================
-- PART 1: ENABLE PGVECTOR EXTENSION
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

COMMENT ON EXTENSION vector IS 'Vector similarity search for semantic message retrieval (Issue #91)';

DO $$ BEGIN
  RAISE NOTICE '✅ pgvector extension enabled';
END $$;

-- =============================================================================
-- PART 2: CREATE ENUMS FOR INTENT CLASSIFICATION
-- =============================================================================

-- Intent categories for message classification
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_intent_category') THEN
    CREATE TYPE whatsapp_intent_category AS ENUM (
      'question',      -- User asking for information
      'response',      -- User providing answer or feedback
      'scheduling',    -- Time-related requests (meeting, reminder)
      'document',      -- Sharing files or requesting documents
      'audio',         -- Voice messages or audio-specific content
      'social',        -- Greetings, casual conversation
      'request',       -- Action requests (do something, send something)
      'update',        -- Status updates or notifications
      'media'          -- Image, video, sticker sharing
    );
    RAISE NOTICE '✅ Created enum whatsapp_intent_category';
  ELSE
    RAISE NOTICE '⏩ Enum whatsapp_intent_category already exists';
  END IF;
END $$;

-- Sentiment classification for prioritization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_intent_sentiment') THEN
    CREATE TYPE whatsapp_intent_sentiment AS ENUM (
      'positive',
      'neutral',
      'negative',
      'urgent'
    );
    RAISE NOTICE '✅ Created enum whatsapp_intent_sentiment';
  ELSE
    RAISE NOTICE '⏩ Enum whatsapp_intent_sentiment already exists';
  END IF;
END $$;

COMMENT ON TYPE whatsapp_intent_category IS 'Classification of message intent for semantic search (Issue #91)';
COMMENT ON TYPE whatsapp_intent_sentiment IS 'Sentiment classification for message prioritization';

-- =============================================================================
-- PART 3: ALTER whatsapp_messages TABLE
-- =============================================================================

DO $$
DECLARE
  _col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '>>> Transforming whatsapp_messages to privacy-first intent storage...';

  -- Step 1: DROP content_text column (CRITICAL: Violates WhatsApp ToS)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'content_text'
  ) INTO _col_exists;

  IF _col_exists THEN
    ALTER TABLE whatsapp_messages DROP COLUMN content_text;
    RAISE NOTICE '✅ Dropped content_text column (privacy compliance)';
  ELSE
    RAISE NOTICE '⏩ Column content_text already removed';
  END IF;

  -- Step 2: ADD intent columns
  ALTER TABLE whatsapp_messages
    ADD COLUMN IF NOT EXISTS intent_summary TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS intent_category whatsapp_intent_category,
    ADD COLUMN IF NOT EXISTS intent_sentiment whatsapp_intent_sentiment DEFAULT 'neutral',
    ADD COLUMN IF NOT EXISTS intent_urgency SMALLINT DEFAULT 1 CHECK (intent_urgency BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS intent_topic VARCHAR(50),
    ADD COLUMN IF NOT EXISTS intent_action_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS intent_mentioned_date DATE,
    ADD COLUMN IF NOT EXISTS intent_mentioned_time TIME,
    ADD COLUMN IF NOT EXISTS intent_media_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS intent_confidence DECIMAL(3,2) CHECK (intent_confidence BETWEEN 0 AND 1),
    ADD COLUMN IF NOT EXISTS intent_embedding vector(768);

  RAISE NOTICE '✅ Added intent_* columns';

  -- Step 3: Ensure processing_status exists (may have been added in previous migration)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'processing_status'
  ) INTO _col_exists;

  IF NOT _col_exists THEN
    ALTER TABLE whatsapp_messages
      ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending'
      CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));
    RAISE NOTICE '✅ Added processing_status column';
  ELSE
    RAISE NOTICE '⏩ Column processing_status already exists';
  END IF;

END $$;

-- Add column comments for documentation
COMMENT ON COLUMN whatsapp_messages.intent_summary IS 'Human-readable summary of message intent (safe for display, no raw content)';
COMMENT ON COLUMN whatsapp_messages.intent_category IS 'Classification of message type for filtering and organization';
COMMENT ON COLUMN whatsapp_messages.intent_sentiment IS 'Sentiment analysis for prioritization (urgent messages flagged)';
COMMENT ON COLUMN whatsapp_messages.intent_urgency IS 'Urgency score 1-5 (5=highest priority, requires immediate action)';
COMMENT ON COLUMN whatsapp_messages.intent_topic IS 'Main topic/theme of message (e.g., work, family, finance)';
COMMENT ON COLUMN whatsapp_messages.intent_action_required IS 'Boolean flag if message requires user action/response';
COMMENT ON COLUMN whatsapp_messages.intent_mentioned_date IS 'Extracted date from message (for scheduling intents)';
COMMENT ON COLUMN whatsapp_messages.intent_mentioned_time IS 'Extracted time from message (for scheduling intents)';
COMMENT ON COLUMN whatsapp_messages.intent_media_type IS 'Type of media if present (audio, image, video, document)';
COMMENT ON COLUMN whatsapp_messages.intent_confidence IS 'AI confidence score for intent extraction (0.0-1.0)';
COMMENT ON COLUMN whatsapp_messages.intent_embedding IS 'Gemini embedding vector (768 dimensions) for semantic search';
COMMENT ON COLUMN whatsapp_messages.processing_status IS 'Status of intent extraction pipeline (pending → processing → completed)';

-- =============================================================================
-- PART 4: ALTER contact_network TABLE
-- =============================================================================

DO $$
DECLARE
  _col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '>>> Updating contact_network to use intent previews...';

  -- Step 1: DROP last_message_preview and last_message_direction (from previous migration)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_network'
      AND column_name = 'last_message_preview'
  ) INTO _col_exists;

  IF _col_exists THEN
    ALTER TABLE contact_network DROP COLUMN last_message_preview;
    RAISE NOTICE '✅ Dropped last_message_preview column';
  ELSE
    RAISE NOTICE '⏩ Column last_message_preview already removed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_network'
      AND column_name = 'last_message_direction'
  ) INTO _col_exists;

  IF _col_exists THEN
    ALTER TABLE contact_network DROP COLUMN last_message_direction;
    RAISE NOTICE '✅ Dropped last_message_direction column';
  ELSE
    RAISE NOTICE '⏩ Column last_message_direction already removed';
  END IF;

  -- Step 2: ADD intent-based preview columns
  ALTER TABLE contact_network
    ADD COLUMN IF NOT EXISTS last_intent_preview TEXT,
    ADD COLUMN IF NOT EXISTS last_intent_category whatsapp_intent_category,
    ADD COLUMN IF NOT EXISTS last_intent_sentiment whatsapp_intent_sentiment,
    ADD COLUMN IF NOT EXISTS last_intent_urgency SMALLINT CHECK (last_intent_urgency BETWEEN 1 AND 5);

  RAISE NOTICE '✅ Added last_intent_* columns';

END $$;

COMMENT ON COLUMN contact_network.last_intent_preview IS 'Intent summary of last message (safe for display, replaces raw text preview)';
COMMENT ON COLUMN contact_network.last_intent_category IS 'Category of last message for UI context';
COMMENT ON COLUMN contact_network.last_intent_sentiment IS 'Sentiment of last message for visual indicators';
COMMENT ON COLUMN contact_network.last_intent_urgency IS 'Urgency of last message (1-5, affects notification priority)';

-- =============================================================================
-- PART 5: CREATE INDEXES FOR INTENT SEARCH
-- =============================================================================

-- Vector similarity search index (IVFFlat for semantic search)
-- lists=100 is optimal for datasets with 10k-100k messages
DROP INDEX IF EXISTS idx_whatsapp_messages_intent_embedding;
CREATE INDEX idx_whatsapp_messages_intent_embedding
  ON whatsapp_messages
  USING ivfflat (intent_embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE intent_embedding IS NOT NULL;

COMMENT ON INDEX idx_whatsapp_messages_intent_embedding IS 'Vector similarity search for semantic message retrieval (IVFFlat, cosine distance)';

-- Composite index for filtering by intent attributes
DROP INDEX IF EXISTS idx_whatsapp_messages_intent_filter;
CREATE INDEX idx_whatsapp_messages_intent_filter
  ON whatsapp_messages(user_id, intent_category, intent_urgency DESC, created_at DESC)
  WHERE processing_status = 'completed';

COMMENT ON INDEX idx_whatsapp_messages_intent_filter IS 'Efficient filtering by user, category, urgency, and time';

-- Index for action-required messages (task management use case)
DROP INDEX IF EXISTS idx_whatsapp_messages_action_required;
CREATE INDEX idx_whatsapp_messages_action_required
  ON whatsapp_messages(user_id, intent_action_required, created_at DESC)
  WHERE intent_action_required = TRUE;

COMMENT ON INDEX idx_whatsapp_messages_action_required IS 'Quick lookup of messages requiring user action';

-- Index for scheduled messages (calendar integration)
DROP INDEX IF EXISTS idx_whatsapp_messages_scheduled;
CREATE INDEX idx_whatsapp_messages_scheduled
  ON whatsapp_messages(user_id, intent_mentioned_date, intent_mentioned_time)
  WHERE intent_mentioned_date IS NOT NULL;

COMMENT ON INDEX idx_whatsapp_messages_scheduled IS 'Messages with extracted dates/times for calendar integration';

DO $$ BEGIN
  RAISE NOTICE '✅ Created 4 indexes for intent-based search';
END $$;

-- =============================================================================
-- PART 6: CREATE SEMANTIC SEARCH FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION search_messages_by_intent(
  _user_id UUID,
  _query_embedding vector(768),
  _limit INTEGER DEFAULT 20,
  _category whatsapp_intent_category DEFAULT NULL,
  _min_urgency SMALLINT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  intent_summary TEXT,
  intent_category whatsapp_intent_category,
  intent_sentiment whatsapp_intent_sentiment,
  intent_urgency SMALLINT,
  intent_topic VARCHAR(50),
  intent_action_required BOOLEAN,
  intent_mentioned_date DATE,
  intent_mentioned_time TIME,
  message_timestamp TIMESTAMPTZ,
  contact_phone TEXT,
  contact_name TEXT,
  similarity_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wm.id,
    wm.intent_summary,
    wm.intent_category,
    wm.intent_sentiment,
    wm.intent_urgency,
    wm.intent_topic,
    wm.intent_action_required,
    wm.intent_mentioned_date,
    wm.intent_mentioned_time,
    wm.message_timestamp,
    wm.contact_phone,
    wm.contact_name,
    (1 - (wm.intent_embedding <=> _query_embedding))::DECIMAL AS similarity_score
  FROM whatsapp_messages wm
  WHERE wm.user_id = _user_id
    AND wm.processing_status = 'completed'
    AND wm.intent_embedding IS NOT NULL
    AND (_category IS NULL OR wm.intent_category = _category)
    AND wm.intent_urgency >= _min_urgency
  ORDER BY wm.intent_embedding <=> _query_embedding
  LIMIT _limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION search_messages_by_intent IS 'Semantic search for messages using Gemini embeddings. Returns similar messages ranked by cosine distance.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_messages_by_intent TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ Created search_messages_by_intent function';
END $$;

-- =============================================================================
-- PART 7: UPDATE TRIGGER FOR contact_network
-- =============================================================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS trigger_update_contact_last_message_preview ON whatsapp_messages;
DROP FUNCTION IF EXISTS update_contact_last_message_preview();

-- Create new trigger function for intent-based preview
CREATE OR REPLACE FUNCTION update_contact_last_intent_preview()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if processing is completed (intent extraction done)
  IF NEW.processing_status = 'completed' AND NEW.intent_summary IS NOT NULL THEN
    UPDATE contact_network
    SET
      last_intent_preview = NEW.intent_summary,
      last_intent_category = NEW.intent_category,
      last_intent_sentiment = NEW.intent_sentiment,
      last_intent_urgency = NEW.intent_urgency,
      last_whatsapp_message_at = COALESCE(NEW.message_timestamp, NOW()),
      updated_at = NOW()
    WHERE id = NEW.contact_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_contact_last_intent_preview IS 'Updates contact_network with intent preview when message processing completes (replaces raw text preview)';

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER trigger_update_contact_last_intent_preview
  AFTER INSERT OR UPDATE OF processing_status, intent_summary ON whatsapp_messages
  FOR EACH ROW
  WHEN (NEW.processing_status = 'completed' AND NEW.intent_summary IS NOT NULL)
  EXECUTE FUNCTION update_contact_last_intent_preview();

COMMENT ON TRIGGER trigger_update_contact_last_intent_preview ON whatsapp_messages IS 'Updates contact intent preview when message processing completes';

DO $$ BEGIN
  RAISE NOTICE '✅ Created trigger for intent preview updates';
END $$;

-- =============================================================================
-- PART 8: DROP OLD BACKFILL FUNCTION (no longer needed)
-- =============================================================================

DROP FUNCTION IF EXISTS backfill_contact_message_previews(UUID);

DO $$ BEGIN
  RAISE NOTICE '✅ Dropped obsolete backfill function';
END $$;

-- =============================================================================
-- PART 9: GRANT PERMISSIONS
-- =============================================================================

-- Grant authenticated users access to new functions
GRANT USAGE ON TYPE whatsapp_intent_category TO authenticated;
GRANT USAGE ON TYPE whatsapp_intent_sentiment TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ Granted permissions for intent types and functions';
END $$;

-- =============================================================================
-- PART 10: VERIFICATION
-- =============================================================================

DO $$
DECLARE
  _col_exists BOOLEAN;
  _type_exists BOOLEAN;
  _index_exists BOOLEAN;
  _trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE '>>> Running verification checks...';

  -- Verify content_text removed
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'content_text'
  ) INTO _col_exists;

  IF _col_exists THEN
    RAISE EXCEPTION '❌ FAILED: Column content_text still exists (privacy violation)';
  ELSE
    RAISE NOTICE '✅ Verified: content_text column removed';
  END IF;

  -- Verify intent_summary exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'intent_summary'
  ) INTO _col_exists;

  IF NOT _col_exists THEN
    RAISE EXCEPTION '❌ FAILED: Column intent_summary not created';
  ELSE
    RAISE NOTICE '✅ Verified: intent_summary column exists';
  END IF;

  -- Verify intent_embedding exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'intent_embedding'
  ) INTO _col_exists;

  IF NOT _col_exists THEN
    RAISE EXCEPTION '❌ FAILED: Column intent_embedding not created';
  ELSE
    RAISE NOTICE '✅ Verified: intent_embedding column exists';
  END IF;

  -- Verify enums exist
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'whatsapp_intent_category'
  ) INTO _type_exists;

  IF NOT _type_exists THEN
    RAISE EXCEPTION '❌ FAILED: Enum whatsapp_intent_category not created';
  ELSE
    RAISE NOTICE '✅ Verified: whatsapp_intent_category enum exists';
  END IF;

  -- Verify vector index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_messages'
      AND indexname = 'idx_whatsapp_messages_intent_embedding'
  ) INTO _index_exists;

  IF NOT _index_exists THEN
    RAISE EXCEPTION '❌ FAILED: Vector index idx_whatsapp_messages_intent_embedding not created';
  ELSE
    RAISE NOTICE '✅ Verified: Vector similarity search index exists';
  END IF;

  -- Verify trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_contact_last_intent_preview'
  ) INTO _trigger_exists;

  IF NOT _trigger_exists THEN
    RAISE EXCEPTION '❌ FAILED: Trigger trigger_update_contact_last_intent_preview not created';
  ELSE
    RAISE NOTICE '✅ Verified: Intent preview trigger exists';
  END IF;

  -- Verify contact_network columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_network'
      AND column_name = 'last_intent_preview'
  ) INTO _col_exists;

  IF NOT _col_exists THEN
    RAISE EXCEPTION '❌ FAILED: Column last_intent_preview not created in contact_network';
  ELSE
    RAISE NOTICE '✅ Verified: last_intent_preview column exists in contact_network';
  END IF;

  -- Verify pgvector extension
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) INTO _type_exists;

  IF NOT _type_exists THEN
    RAISE EXCEPTION '❌ FAILED: pgvector extension not enabled';
  ELSE
    RAISE NOTICE '✅ Verified: pgvector extension enabled';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✅ MIGRATION 20260205000001_whatsapp_intent_privacy COMPLETED SUCCESSFULLY';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary of changes:';
  RAISE NOTICE '- ✅ Removed content_text column (WhatsApp ToS compliance)';
  RAISE NOTICE '- ✅ Added 11 intent_* columns for semantic storage';
  RAISE NOTICE '- ✅ Enabled pgvector for embeddings (768-dimensional)';
  RAISE NOTICE '- ✅ Created 2 enums (intent_category, intent_sentiment)';
  RAISE NOTICE '- ✅ Created 4 indexes (vector similarity + intent filtering)';
  RAISE NOTICE '- ✅ Created search_messages_by_intent() function';
  RAISE NOTICE '- ✅ Updated contact_network with intent preview columns';
  RAISE NOTICE '- ✅ Created trigger for automatic intent preview updates';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update webhook-evolution to call Gemini for intent extraction';
  RAISE NOTICE '2. Generate embeddings via Gemini Embedding API (text-embedding-004)';
  RAISE NOTICE '3. Store intent_summary instead of raw content_text';
  RAISE NOTICE '4. Use search_messages_by_intent() for semantic timeline search';
  RAISE NOTICE '';
  RAISE NOTICE 'Privacy compliance:';
  RAISE NOTICE '✅ No raw message text stored (WhatsApp Terms compliant)';
  RAISE NOTICE '✅ Intent summaries safe for display (LGPD data minimization)';
  RAISE NOTICE '✅ Embeddings enable semantic search without exposing content';
  RAISE NOTICE '=============================================================================';

END $$;
