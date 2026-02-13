-- ============================================================================
-- OpenClaw Adaptation Phase 4: Living User Dossier — user_patterns
-- Issue: #251, #255
-- ============================================================================

-- Ensure pgvector extension exists (for embedding column)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE: user_patterns
-- Stores synthesized behavioral patterns with confidence scoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pattern identity
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'productivity', 'emotional', 'routine', 'social',
    'health', 'learning', 'trigger', 'strength'
  )),
  pattern_key TEXT NOT NULL,

  -- Pattern content
  description TEXT NOT NULL,
  evidence TEXT[] DEFAULT '{}',
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.50
    CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Embedding for RAG search
  embedding VECTOR(768),

  -- Lifecycle
  first_observed_at TIMESTAMPTZ DEFAULT NOW(),
  last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  times_observed INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique pattern per user
  CONSTRAINT user_pattern_unique UNIQUE (user_id, pattern_key)
);

CREATE INDEX IF NOT EXISTS idx_patterns_user ON user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON user_patterns(user_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON user_patterns(user_id, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_active ON user_patterns(user_id, is_active) WHERE is_active = true;

-- IVFFlat index for vector similarity search
-- Note: requires at least some rows to exist for lists parameter
-- Using a safe default that works with small datasets
DO $$
BEGIN
  CREATE INDEX idx_patterns_embedding ON user_patterns
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
EXCEPTION WHEN OTHERS THEN
  -- IVFFlat may fail if no rows exist yet; create HNSW instead
  CREATE INDEX IF NOT EXISTS idx_patterns_embedding_hnsw ON user_patterns
    USING hnsw (embedding vector_cosine_ops);
END;
$$;

ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own patterns" ON user_patterns;
CREATE POLICY "Users view own patterns" ON user_patterns
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages patterns" ON user_patterns;
CREATE POLICY "Service role manages patterns" ON user_patterns
  FOR ALL USING (true);

-- ============================================================================
-- RPC: get_relevant_patterns
-- Vector similarity search for proactive warnings in Atlas
-- ============================================================================

CREATE OR REPLACE FUNCTION get_relevant_patterns(
  p_user_id UUID,
  p_embedding VECTOR(768),
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  pattern_key TEXT,
  description TEXT,
  confidence_score NUMERIC,
  pattern_type TEXT,
  times_observed INTEGER,
  last_confirmed_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    up.pattern_key,
    up.description,
    up.confidence_score,
    up.pattern_type,
    up.times_observed,
    up.last_confirmed_at
  FROM user_patterns up
  WHERE up.user_id = p_user_id
    AND up.is_active = true
    AND up.confidence_score >= 0.40
    AND up.embedding IS NOT NULL
  ORDER BY up.embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- ============================================================================
-- RPC: get_user_patterns_summary
-- Returns all active patterns for a user, ordered by confidence
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_patterns_summary(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  pattern_type TEXT,
  pattern_key TEXT,
  description TEXT,
  confidence_score NUMERIC,
  times_observed INTEGER,
  evidence TEXT[],
  first_observed_at TIMESTAMPTZ,
  last_confirmed_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    up.id,
    up.pattern_type,
    up.pattern_key,
    up.description,
    up.confidence_score,
    up.times_observed,
    up.evidence,
    up.first_observed_at,
    up.last_confirmed_at
  FROM user_patterns up
  WHERE up.user_id = p_user_id
    AND up.is_active = true
  ORDER BY up.confidence_score DESC, up.times_observed DESC;
$$;

-- ============================================================================
-- RPC: get_weekly_synthesis_context
-- Gathers data for the weekly pattern synthesis
-- ============================================================================

CREATE OR REPLACE FUNCTION get_weekly_synthesis_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_council_insights JSONB;
  v_weekly_summary JSONB;
  v_existing_patterns JSONB;
BEGIN
  -- Council insights from last 7 days
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', c.insight_date,
    'status', c.overall_status,
    'headline', c.headline,
    'synthesis', c.synthesis,
    'actions', c.actions
  ) ORDER BY c.insight_date DESC), '[]'::jsonb)
  INTO v_council_insights
  FROM daily_council_insights c
  WHERE c.user_id = p_user_id
    AND c.insight_date >= CURRENT_DATE - 7;

  -- Latest weekly summary (Journey)
  SELECT COALESCE(jsonb_build_object(
    'summary_data', ws.summary_data,
    'week_number', ws.week_number,
    'period_start', ws.period_start,
    'period_end', ws.period_end
  ), '{}'::jsonb)
  INTO v_weekly_summary
  FROM weekly_summaries ws
  WHERE ws.user_id = p_user_id
  ORDER BY ws.period_end DESC
  LIMIT 1;

  -- Existing active patterns
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'pattern_key', up.pattern_key,
    'pattern_type', up.pattern_type,
    'description', up.description,
    'confidence_score', up.confidence_score,
    'times_observed', up.times_observed,
    'evidence', up.evidence
  ) ORDER BY up.confidence_score DESC), '[]'::jsonb)
  INTO v_existing_patterns
  FROM user_patterns up
  WHERE up.user_id = p_user_id
    AND up.is_active = true;

  RETURN jsonb_build_object(
    'council_insights', v_council_insights,
    'weekly_summary', COALESCE(v_weekly_summary, '{}'::jsonb),
    'existing_patterns', v_existing_patterns,
    'council_count', jsonb_array_length(v_council_insights),
    'patterns_count', jsonb_array_length(v_existing_patterns)
  );
END;
$$;

-- ============================================================================
-- RPC: apply_pattern_update
-- Updates confidence and evidence for an existing pattern
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_pattern_update(
  p_user_id UUID,
  p_pattern_key TEXT,
  p_confidence_delta NUMERIC,
  p_new_evidence TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_patterns SET
    confidence_score = GREATEST(0, LEAST(1, confidence_score + p_confidence_delta)),
    evidence = CASE
      WHEN p_new_evidence IS NOT NULL AND p_new_evidence != ''
      THEN array_append(
        -- Keep last 10 evidence items
        CASE WHEN array_length(evidence, 1) >= 10
          THEN evidence[2:10]
          ELSE evidence
        END,
        p_new_evidence
      )
      ELSE evidence
    END,
    times_observed = times_observed + 1,
    last_confirmed_at = NOW(),
    updated_at = NOW(),
    -- Auto-deactivate if confidence drops too low
    is_active = CASE
      WHEN confidence_score + p_confidence_delta < 0.20 THEN false
      ELSE true
    END
  WHERE user_id = p_user_id
    AND pattern_key = p_pattern_key
    AND is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION get_relevant_patterns TO service_role;
GRANT EXECUTE ON FUNCTION get_relevant_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_patterns_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_synthesis_context TO service_role;
GRANT EXECUTE ON FUNCTION apply_pattern_update TO service_role;
