-- ============================================================================
-- MIGRATION: WhatsApp AI Pipeline Infrastructure
-- Issues: #142, #143, #145
-- Date: 2026-01-21
--
-- PURPOSE:
-- Create AI analysis and semantic search infrastructure for WhatsApp contacts:
-- 1. contact_insights - AI-extracted conversation insights (LGPD compliant)
-- 2. contact_embeddings - Vector embeddings for semantic search
-- 3. Extensions to contact_network and whatsapp_messages
-- 4. Search functions using pgvector
--
-- LGPD COMPLIANCE:
-- - No raw message content stored in insights or embeddings
-- - Only derived/summarized data preserved
-- - Processing happens before 24h privacy purge window
-- ============================================================================

-- ============================================================================
-- TASK #142-1: Create contact_insights Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_insights (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and contact references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,

  -- Insight aggregation window
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- AI-extracted insights (NO raw message content - LGPD compliant)
  sentiment_summary JSONB DEFAULT '{}'::jsonb,
    -- Structure: {avg_score: -1 to 1, trend: "ascending|stable|descending", dominant_label: "positive|neutral|negative"}
  detected_topics TEXT[] DEFAULT '{}',
    -- Example: ["trabalho", "familia", "eventos", "projetos"]
  action_items TEXT[] DEFAULT '{}',
    -- Example: ["Confirmar reuniao sexta", "Enviar proposta"]
  conversation_summary TEXT,
    -- 2-3 sentence summary (NOT raw messages)
  relationship_indicators JSONB DEFAULT '{}'::jsonb,
    -- Structure: {responsiveness: 0-1, engagement: 0-1, formality: "formal|casual|mixed"}

  -- Processing metadata
  messages_analyzed INTEGER DEFAULT 0,
  processing_version TEXT DEFAULT 'v1',
  model_used TEXT DEFAULT 'gemini-1.5-flash',
  processing_time_ms INTEGER,
  processed_at TIMESTAMPTZ DEFAULT now(),

  -- Error tracking
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure unique insights per user, contact, and period
  CONSTRAINT unique_user_contact_period UNIQUE(user_id, contact_phone, period_start)
);

-- Comments
COMMENT ON TABLE contact_insights IS
  'AI-extracted insights from WhatsApp conversations. LGPD compliant: stores only derived summaries, never raw message content.';

COMMENT ON COLUMN contact_insights.conversation_summary IS
  'AI-generated summary of conversation themes. Must NOT contain direct quotes or raw message content.';

-- RLS Policies
ALTER TABLE contact_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_insights_select_own" ON contact_insights
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "contact_insights_insert_service" ON contact_insights
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "contact_insights_update_service" ON contact_insights
  FOR UPDATE TO service_role
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_insights_user_contact
  ON contact_insights(user_id, contact_phone);

CREATE INDEX IF NOT EXISTS idx_contact_insights_period
  ON contact_insights(period_start DESC, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_contact_insights_processed
  ON contact_insights(processed_at DESC);

-- ============================================================================
-- TASK #142-2: Add relationship_score to contact_network
-- ============================================================================

ALTER TABLE contact_network
  ADD COLUMN IF NOT EXISTS relationship_score DECIMAL(4,3)
    CHECK (relationship_score IS NULL OR (relationship_score >= 0 AND relationship_score <= 1)),
  ADD COLUMN IF NOT EXISTS last_insight_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS insight_summary JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN contact_network.relationship_score IS
  'AI-calculated relationship strength score (0-1). Based on engagement, sentiment, and recency.';

COMMENT ON COLUMN contact_network.insight_summary IS
  'Cached latest insights for quick access. Structure: {topics, sentiment_trend, last_action_items}';

-- Index for relationship score queries
CREATE INDEX IF NOT EXISTS idx_contact_network_relationship_score
  ON contact_network(relationship_score DESC NULLS LAST)
  WHERE relationship_score IS NOT NULL;

-- ============================================================================
-- TASK #142-5: Add ai_processed column to whatsapp_messages
-- ============================================================================

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_batch_id UUID;

COMMENT ON COLUMN whatsapp_messages.ai_processed IS
  'Whether this message has been processed by the AI pipeline';

COMMENT ON COLUMN whatsapp_messages.ai_batch_id IS
  'Batch ID for tracking which processing run analyzed this message';

-- Partial index for finding messages pending AI processing
-- Only considers completed messages that haven't been purged yet
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_ai_pending
  ON whatsapp_messages(created_at ASC)
  WHERE ai_processed = false
    AND processing_status = 'completed'
    AND purged_at IS NULL
    AND deleted_at IS NULL;

-- ============================================================================
-- TASK #143-1: Create contact_embeddings Table
-- ============================================================================

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.contact_embeddings (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and contact references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,

  -- Embedding type and data
  embedding_type TEXT NOT NULL
    CHECK (embedding_type IN ('profile', 'conversation_summary', 'action_items', 'topics')),
  embedding vector(768) NOT NULL,  -- 768 dimensions for text-embedding-004

  -- Source tracking for incremental updates
  content_hash TEXT NOT NULL,  -- MD5 hash of source content for change detection
  source_insight_id UUID REFERENCES contact_insights(id) ON DELETE SET NULL,

  -- Model versioning
  model_version TEXT DEFAULT 'text-embedding-004',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint per user/contact/type
  CONSTRAINT unique_user_contact_embedding_type UNIQUE(user_id, contact_phone, embedding_type)
);

-- Comments
COMMENT ON TABLE contact_embeddings IS
  'Vector embeddings for semantic search of contacts. Generated from AI insights, never from raw messages.';

COMMENT ON COLUMN contact_embeddings.content_hash IS
  'MD5 hash of the source content used to generate this embedding. Used to detect when re-embedding is needed.';

-- RLS Policies
ALTER TABLE contact_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_embeddings_select_own" ON contact_embeddings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "contact_embeddings_insert_service" ON contact_embeddings
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "contact_embeddings_update_service" ON contact_embeddings
  FOR UPDATE TO service_role
  USING (true);

CREATE POLICY "contact_embeddings_delete_service" ON contact_embeddings
  FOR DELETE TO service_role
  USING (true);

-- HNSW index for fast similarity search
-- Using cosine similarity (vector_cosine_ops)
CREATE INDEX IF NOT EXISTS idx_contact_embeddings_vector
  ON contact_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_contact_embeddings_user
  ON contact_embeddings(user_id);

-- Index for finding embeddings needing update
CREATE INDEX IF NOT EXISTS idx_contact_embeddings_user_type
  ON contact_embeddings(user_id, embedding_type);

-- ============================================================================
-- TASK #143-4: Create Hash Function for Change Detection
-- ============================================================================

CREATE OR REPLACE FUNCTION hash_contact_insight_content(
  p_contact_phone TEXT,
  p_topics TEXT[],
  p_summary TEXT,
  p_action_items TEXT[]
) RETURNS TEXT AS $$
BEGIN
  RETURN md5(
    COALESCE(p_contact_phone, '') || '|' ||
    COALESCE(array_to_string(p_topics, ','), '') || '|' ||
    COALESCE(p_summary, '') || '|' ||
    COALESCE(array_to_string(p_action_items, ','), '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hash_contact_insight_content IS
  'Generates MD5 hash of contact insight content for embedding change detection';

-- ============================================================================
-- TASK #145-1: Create search_contacts_by_embedding Function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_contacts_by_embedding(
  _query_embedding vector(768),
  _user_id UUID,
  _limit INTEGER DEFAULT 10,
  _min_similarity FLOAT DEFAULT 0.7,
  _embedding_types TEXT[] DEFAULT ARRAY['profile', 'conversation_summary']
)
RETURNS TABLE (
  contact_phone TEXT,
  contact_name TEXT,
  similarity FLOAT,
  embedding_type TEXT,
  relationship_score DECIMAL,
  last_message_at TIMESTAMPTZ,
  detected_topics TEXT[],
  conversation_summary TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_embeddings AS (
    SELECT
      ce.contact_phone,
      ce.embedding_type,
      1 - (ce.embedding <=> _query_embedding) AS sim
    FROM contact_embeddings ce
    WHERE ce.user_id = _user_id
      AND ce.embedding_type = ANY(_embedding_types)
      AND (1 - (ce.embedding <=> _query_embedding)) >= _min_similarity
  ),
  best_per_contact AS (
    SELECT DISTINCT ON (re.contact_phone)
      re.contact_phone,
      re.embedding_type,
      re.sim
    FROM ranked_embeddings re
    ORDER BY re.contact_phone, re.sim DESC
  )
  SELECT
    bpc.contact_phone,
    COALESCE(cn.name, cn.contact_name, bpc.contact_phone) AS contact_name,
    bpc.sim AS similarity,
    bpc.embedding_type,
    cn.relationship_score,
    COALESCE(cn.last_whatsapp_message_at, cn.updated_at) AS last_message_at,
    ci.detected_topics,
    ci.conversation_summary
  FROM best_per_contact bpc
  LEFT JOIN contact_network cn
    ON cn.user_id = _user_id
    AND (cn.phone_number = bpc.contact_phone OR cn.contact_phone = bpc.contact_phone)
  LEFT JOIN LATERAL (
    SELECT detected_topics, conversation_summary
    FROM contact_insights
    WHERE user_id = _user_id AND contact_phone = bpc.contact_phone
    ORDER BY period_end DESC
    LIMIT 1
  ) ci ON true
  ORDER BY bpc.sim DESC
  LIMIT _limit;
END;
$$;

COMMENT ON FUNCTION search_contacts_by_embedding IS
  'Semantic search for contacts using pgvector cosine similarity. Returns contacts ranked by relevance to query embedding.';

-- Grant execute to authenticated users (filtered by user_id internally)
GRANT EXECUTE ON FUNCTION search_contacts_by_embedding TO authenticated;

-- ============================================================================
-- HELPER: Get contacts pending AI processing
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contacts_pending_ai_processing(
  _batch_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  contact_phone TEXT,
  user_id UUID,
  message_count BIGINT,
  oldest_message TIMESTAMPTZ,
  newest_message TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wm.contact_phone,
    wm.user_id,
    COUNT(*) AS message_count,
    MIN(wm.created_at) AS oldest_message,
    MAX(wm.created_at) AS newest_message
  FROM whatsapp_messages wm
  WHERE wm.ai_processed = false
    AND wm.processing_status = 'completed'
    AND wm.purged_at IS NULL
    AND wm.deleted_at IS NULL
    AND wm.content_text IS NOT NULL
  GROUP BY wm.contact_phone, wm.user_id
  ORDER BY COUNT(*) DESC
  LIMIT _batch_size;
END;
$$;

COMMENT ON FUNCTION get_contacts_pending_ai_processing IS
  'Returns contacts with messages pending AI analysis, ordered by message count';

-- ============================================================================
-- HELPER: Mark messages as AI processed
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_messages_ai_processed(
  _user_id UUID,
  _contact_phone TEXT,
  _batch_id UUID,
  _before_timestamp TIMESTAMPTZ DEFAULT now()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  UPDATE whatsapp_messages
  SET
    ai_processed = true,
    ai_processed_at = now(),
    ai_batch_id = _batch_id
  WHERE user_id = _user_id
    AND contact_phone = _contact_phone
    AND ai_processed = false
    AND processing_status = 'completed'
    AND purged_at IS NULL
    AND deleted_at IS NULL
    AND created_at <= _before_timestamp;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

COMMENT ON FUNCTION mark_messages_ai_processed IS
  'Marks messages as processed by AI pipeline. Returns count of updated messages.';

-- ============================================================================
-- HELPER: Update contact relationship score
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contact_relationship_score(
  _user_id UUID,
  _contact_phone TEXT,
  _sentiment_avg DECIMAL,
  _responsiveness DECIMAL,
  _engagement DECIMAL,
  _recency_days INTEGER
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _score DECIMAL(4,3);
BEGIN
  -- Calculate relationship score using weighted formula
  -- Weights: sentiment (0.25), responsiveness (0.25), engagement (0.3), recency (0.2)
  _score := LEAST(1.0, GREATEST(0.0,
    (COALESCE(_sentiment_avg + 1, 1) / 2 * 0.25) +  -- Normalize -1 to 1 → 0 to 1
    (COALESCE(_responsiveness, 0.5) * 0.25) +
    (COALESCE(_engagement, 0.5) * 0.30) +
    (CASE
      WHEN _recency_days <= 1 THEN 1.0
      WHEN _recency_days <= 7 THEN 0.8
      WHEN _recency_days <= 30 THEN 0.5
      WHEN _recency_days <= 90 THEN 0.3
      ELSE 0.1
    END * 0.20)
  ))::DECIMAL(4,3);

  -- Update contact_network
  UPDATE contact_network
  SET
    relationship_score = _score,
    last_insight_at = now(),
    updated_at = now()
  WHERE user_id = _user_id
    AND (phone_number = _contact_phone OR contact_phone = _contact_phone);

  RETURN _score;
END;
$$;

COMMENT ON FUNCTION update_contact_relationship_score IS
  'Calculates and updates relationship score for a contact based on AI insights';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Tables
GRANT SELECT ON contact_insights TO authenticated;
GRANT ALL ON contact_insights TO service_role;

GRANT SELECT ON contact_embeddings TO authenticated;
GRANT ALL ON contact_embeddings TO service_role;

-- Functions (service role only for processing)
GRANT EXECUTE ON FUNCTION get_contacts_pending_ai_processing TO service_role;
GRANT EXECUTE ON FUNCTION mark_messages_ai_processed TO service_role;
GRANT EXECUTE ON FUNCTION update_contact_relationship_score TO service_role;
GRANT EXECUTE ON FUNCTION hash_contact_insight_content TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('contact_insights', 'contact_embeddings');

-- Check pgvector extension:
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('contact_insights', 'contact_embeddings');

-- Check functions:
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%contact%';
