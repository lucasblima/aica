-- ============================================================================
-- MIGRATION: User Profile System — Phase 1
-- Date: 2026-02-18
--
-- PURPOSE:
-- Create cross-module user profile snapshots with 8 scored dimensions,
-- enabling profile comparison and enriched AI context.
--
-- Tables: user_profile_snapshots, user_profile_dimensions
-- RPCs: get_profile_aggregation_context, compare_user_profiles, find_similar_profiles
-- Cron: daily-user-profile-build (06:30 BRT / 09:30 UTC)
-- ============================================================================

-- Ensure pgvector extension is available (needed for dimension_vector)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE 1: user_profile_snapshots — Daily aggregated profile snapshot
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Module aggregates (raw numbers from all AICA modules)
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- AI-generated narrative summary (2-3 paragraphs, Portuguese)
  narrative TEXT,

  -- Overall wellness indicator (from Life Council trend + AI judgment)
  wellness_trend TEXT CHECK (wellness_trend IN ('thriving', 'balanced', 'strained', 'burnout_risk')),

  -- Comparison opt-in (users must explicitly enable)
  is_public BOOLEAN DEFAULT FALSE,

  -- Metadata
  model_used TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_snapshot_date_unique UNIQUE (user_id, snapshot_date)
);

CREATE INDEX idx_profile_snapshots_user ON user_profile_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_profile_snapshots_public ON user_profile_snapshots(is_public) WHERE is_public = true;

-- ============================================================================
-- TABLE 2: user_profile_dimensions — 8 scored dimensions for comparison
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Dimension scores (0.000 to 1.000)
  emotional_intelligence NUMERIC(4,3) DEFAULT 0,
  productivity NUMERIC(4,3) DEFAULT 0,
  financial_awareness NUMERIC(4,3) DEFAULT 0,
  social_connectivity NUMERIC(4,3) DEFAULT 0,
  creativity NUMERIC(4,3) DEFAULT 0,
  physical_wellness NUMERIC(4,3) DEFAULT 0,
  knowledge_growth NUMERIC(4,3) DEFAULT 0,
  digital_organization NUMERIC(4,3) DEFAULT 0,

  -- Composite vector for fast cosine similarity comparison (8 dimensions)
  dimension_vector vector(8),

  -- Which dimensions changed most since last snapshot
  biggest_growth TEXT,
  biggest_decline TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_dimension_date_unique UNIQUE (user_id, snapshot_date)
);

CREATE INDEX idx_profile_dims_user ON user_profile_dimensions(user_id, snapshot_date DESC);

-- HNSW index for profile similarity search
CREATE INDEX idx_profile_dims_vector ON user_profile_dimensions
  USING hnsw (dimension_vector vector_cosine_ops);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE user_profile_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can read their own snapshots
CREATE POLICY "Users view own snapshots" ON user_profile_snapshots
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read public snapshots (for comparison)
CREATE POLICY "Users view public snapshots" ON user_profile_snapshots
  FOR SELECT USING (is_public = true);

-- Users can toggle their own is_public setting
CREATE POLICY "Users update own snapshot public flag" ON user_profile_snapshots
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all snapshots (Edge Function uses service role key)
CREATE POLICY "Service role manages snapshots" ON user_profile_snapshots
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE user_profile_dimensions ENABLE ROW LEVEL SECURITY;

-- Users can read their own dimensions
CREATE POLICY "Users view own dimensions" ON user_profile_dimensions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view dimensions of public profiles (for comparison)
CREATE POLICY "Users view public dimensions" ON user_profile_dimensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile_snapshots ups
      WHERE ups.user_id = user_profile_dimensions.user_id
        AND ups.snapshot_date = user_profile_dimensions.snapshot_date
        AND ups.is_public = true
    )
  );

-- Service role can manage all dimensions
CREATE POLICY "Service role manages dimensions" ON user_profile_dimensions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- RPC 1: get_profile_aggregation_context
-- Gathers raw data from ALL modules for profile building (single DB round-trip)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_profile_aggregation_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_journey JSONB;
  v_atlas JSONB;
  v_finance JSONB;
  v_connections JSONB;
  v_studio JSONB;
  v_flux JSONB;
  v_council JSONB;
  v_patterns JSONB;
  v_consciousness JSONB;
BEGIN
  -- Journey stats (from moments table)
  SELECT jsonb_build_object(
    'total_moments', COUNT(*),
    'moments_7d', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
    'moments_30d', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
    'avg_quality', ROUND(AVG(COALESCE((sentiment_data->>'quality_score')::NUMERIC, 0)), 2),
    'emotion_diversity', COUNT(DISTINCT emotion),
    'top_emotions', (
      SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('emotion', emotion, 'count', COUNT(*)) AS e
        FROM moments WHERE user_id = p_user_id AND emotion IS NOT NULL
        GROUP BY emotion ORDER BY COUNT(*) DESC LIMIT 5
      ) sub
    ),
    'tag_distribution', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('tag', unnest(tags), 'count', COUNT(*)) AS t
        FROM moments WHERE user_id = p_user_id AND tags IS NOT NULL
        GROUP BY unnest(tags) ORDER BY COUNT(*) DESC LIMIT 10
      ) sub
    )
  ) INTO v_journey
  FROM moments WHERE user_id = p_user_id;

  -- Atlas stats (from work_items table)
  SELECT jsonb_build_object(
    'total_tasks', COUNT(*),
    'completed_total', COUNT(*) FILTER (WHERE status = 'completed'),
    'completed_7d', COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= NOW() - INTERVAL '7 days'),
    'overdue', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND due_date < CURRENT_DATE),
    'completion_rate', CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC, 3)
      ELSE 0 END,
    'priority_distribution', jsonb_build_object(
      'q1', COUNT(*) FILTER (WHERE priority_quadrant = 1),
      'q2', COUNT(*) FILTER (WHERE priority_quadrant = 2),
      'q3', COUNT(*) FILTER (WHERE priority_quadrant = 3),
      'q4', COUNT(*) FILTER (WHERE priority_quadrant = 4)
    )
  ) INTO v_atlas
  FROM work_items WHERE user_id = p_user_id;

  -- Finance stats (from finance_transactions table)
  SELECT jsonb_build_object(
    'total_transactions', COUNT(*),
    'transactions_30d', COUNT(*) FILTER (WHERE transaction_date >= CURRENT_DATE - 30),
    'categorized_pct', CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE category IS NOT NULL AND category != 'outros')::NUMERIC / COUNT(*)::NUMERIC, 3)
      ELSE 0 END,
    'recurring_count', COUNT(*) FILTER (WHERE is_recurring = true),
    'income_30d', COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND transaction_date >= CURRENT_DATE - 30), 0),
    'expense_30d', COALESCE(ABS(SUM(amount) FILTER (WHERE type = 'expense' AND transaction_date >= CURRENT_DATE - 30)), 0)
  ) INTO v_finance
  FROM finance_transactions WHERE user_id = p_user_id;

  -- Connections stats
  SELECT jsonb_build_object(
    'total_contacts', (SELECT COUNT(*) FROM contact_network WHERE user_id = p_user_id),
    'contacts_with_dossier', (SELECT COUNT(*) FROM contact_network WHERE user_id = p_user_id AND dossier_json IS NOT NULL),
    'active_threads_7d', (
      SELECT COUNT(*) FROM conversation_threads
      WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '7 days'
    ),
    'total_messages', (SELECT COUNT(*) FROM whatsapp_messages WHERE user_id = p_user_id)
  ) INTO v_connections;

  -- Studio stats
  SELECT jsonb_build_object(
    'total_shows', (SELECT COUNT(*) FROM podcast_shows WHERE user_id = p_user_id),
    'total_episodes', (
      SELECT COUNT(*) FROM podcast_episodes pe
      JOIN podcast_shows ps ON pe.show_id = ps.id
      WHERE ps.user_id = p_user_id
    ),
    'episodes_30d', (
      SELECT COUNT(*) FROM podcast_episodes pe
      JOIN podcast_shows ps ON pe.show_id = ps.id
      WHERE ps.user_id = p_user_id AND pe.created_at >= NOW() - INTERVAL '30 days'
    )
  ) INTO v_studio;

  -- Flux stats
  SELECT jsonb_build_object(
    'total_athletes', (SELECT COUNT(*) FROM athletes WHERE coach_id = p_user_id),
    'total_workouts', (
      SELECT COUNT(*) FROM workout_blocks wb
      JOIN athletes a ON wb.athlete_id = a.id
      WHERE a.coach_id = p_user_id
    ),
    'workouts_7d', (
      SELECT COUNT(*) FROM workout_blocks wb
      JOIN athletes a ON wb.athlete_id = a.id
      WHERE a.coach_id = p_user_id AND wb.created_at >= NOW() - INTERVAL '7 days'
    )
  ) INTO v_flux;

  -- Latest Life Council insight
  SELECT COALESCE(jsonb_build_object(
    'overall_status', c.overall_status,
    'headline', c.headline,
    'philosopher_pattern', c.philosopher_output->>'pattern',
    'strategist_completion', c.strategist_output->>'completionRate',
    'biohacker_sleep', c.biohacker_output->>'sleepEstimate'
  ), '{}'::jsonb) INTO v_council
  FROM daily_council_insights c
  WHERE c.user_id = p_user_id
  ORDER BY c.insight_date DESC LIMIT 1;

  -- Active behavioral patterns (from OpenClaw synthesis)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', up.pattern_type,
    'key', up.pattern_key,
    'description', up.description,
    'confidence', up.confidence_score
  ) ORDER BY up.confidence_score DESC), '[]'::jsonb) INTO v_patterns
  FROM user_patterns up
  WHERE up.user_id = p_user_id AND up.is_active = true AND up.confidence_score >= 0.5;

  -- Consciousness / gamification stats
  SELECT COALESCE(jsonb_build_object(
    'total_points', cs.total_points,
    'level', cs.level,
    'level_name', cs.level_name,
    'current_streak', cs.current_streak,
    'longest_streak', cs.longest_streak,
    'total_moments', cs.total_moments
  ), '{}'::jsonb) INTO v_consciousness
  FROM user_consciousness_stats cs WHERE cs.user_id = p_user_id;

  RETURN jsonb_build_object(
    'journey', COALESCE(v_journey, '{}'::jsonb),
    'atlas', COALESCE(v_atlas, '{}'::jsonb),
    'finance', COALESCE(v_finance, '{}'::jsonb),
    'connections', COALESCE(v_connections, '{}'::jsonb),
    'studio', COALESCE(v_studio, '{}'::jsonb),
    'flux', COALESCE(v_flux, '{}'::jsonb),
    'council', COALESCE(v_council, '{}'::jsonb),
    'patterns', COALESCE(v_patterns, '[]'::jsonb),
    'consciousness', COALESCE(v_consciousness, '{}'::jsonb)
  );
END;
$$;

-- ============================================================================
-- RPC 2: compare_user_profiles
-- Compare two user profiles by dimension vector similarity
-- ============================================================================

CREATE OR REPLACE FUNCTION compare_user_profiles(
  p_user_id_a UUID,
  p_user_id_b UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dims_a user_profile_dimensions%ROWTYPE;
  v_dims_b user_profile_dimensions%ROWTYPE;
  v_similarity FLOAT;
BEGIN
  -- Get latest dimensions for each user
  SELECT * INTO v_dims_a FROM user_profile_dimensions
    WHERE user_id = p_user_id_a ORDER BY snapshot_date DESC LIMIT 1;
  SELECT * INTO v_dims_b FROM user_profile_dimensions
    WHERE user_id = p_user_id_b ORDER BY snapshot_date DESC LIMIT 1;

  IF v_dims_a IS NULL OR v_dims_b IS NULL THEN
    RETURN jsonb_build_object('error', 'One or both profiles not found');
  END IF;

  -- Cosine similarity via pgvector operator
  SELECT 1 - (v_dims_a.dimension_vector <=> v_dims_b.dimension_vector) INTO v_similarity;

  RETURN jsonb_build_object(
    'similarity_score', ROUND(v_similarity::NUMERIC, 3),
    'user_a', jsonb_build_object(
      'emotional_intelligence', v_dims_a.emotional_intelligence,
      'productivity', v_dims_a.productivity,
      'financial_awareness', v_dims_a.financial_awareness,
      'social_connectivity', v_dims_a.social_connectivity,
      'creativity', v_dims_a.creativity,
      'physical_wellness', v_dims_a.physical_wellness,
      'knowledge_growth', v_dims_a.knowledge_growth,
      'digital_organization', v_dims_a.digital_organization
    ),
    'user_b', jsonb_build_object(
      'emotional_intelligence', v_dims_b.emotional_intelligence,
      'productivity', v_dims_b.productivity,
      'financial_awareness', v_dims_b.financial_awareness,
      'social_connectivity', v_dims_b.social_connectivity,
      'creativity', v_dims_b.creativity,
      'physical_wellness', v_dims_b.physical_wellness,
      'knowledge_growth', v_dims_b.knowledge_growth,
      'digital_organization', v_dims_b.digital_organization
    )
  );
END;
$$;

-- ============================================================================
-- RPC 3: find_similar_profiles
-- Find the most similar public profiles using cosine similarity on dimension_vector
-- ============================================================================

CREATE OR REPLACE FUNCTION find_similar_profiles(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  similarity FLOAT,
  snapshot_date DATE
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH my_profile AS (
    SELECT dimension_vector, user_id AS my_id
    FROM user_profile_dimensions
    WHERE user_id = p_user_id
    ORDER BY snapshot_date DESC LIMIT 1
  )
  SELECT
    upd.user_id,
    1 - (upd.dimension_vector <=> mp.dimension_vector) AS similarity,
    upd.snapshot_date
  FROM user_profile_dimensions upd
  CROSS JOIN my_profile mp
  WHERE upd.user_id != mp.my_id
    -- Only return public profiles
    AND EXISTS (
      SELECT 1 FROM user_profile_snapshots ups
      WHERE ups.user_id = upd.user_id
        AND ups.snapshot_date = upd.snapshot_date
        AND ups.is_public = true
    )
    -- Only latest snapshot per user
    AND upd.snapshot_date = (
      SELECT MAX(snapshot_date) FROM user_profile_dimensions
      WHERE user_id = upd.user_id
    )
  ORDER BY upd.dimension_vector <=> mp.dimension_vector ASC
  LIMIT p_limit;
$$;

-- ============================================================================
-- CRON JOB: Daily profile build at 06:30 BRT (09:30 UTC)
-- Runs after Life Council (06:00 BRT) to include latest insights
-- Reuses trigger_edge_function_for_users() from OpenClaw cron migration
-- ============================================================================

SELECT cron.unschedule('daily-user-profile-build')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-user-profile-build'
);

SELECT cron.schedule(
  'daily-user-profile-build',
  '30 9 * * *',  -- 09:30 UTC = 06:30 BRT
  $$SELECT trigger_edge_function_for_users('build-user-profile')$$
);
