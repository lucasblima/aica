-- ============================================================================
-- OpenClaw Adaptation Phase 3: Life Council — Daily AI Insights
-- Issue: #251, #254
-- ============================================================================

-- ============================================================================
-- TABLE: daily_council_insights
-- Stores synthesized daily insights from 3 AI personas
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_council_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date
  insight_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Persona outputs (raw for debugging and detail view)
  philosopher_output JSONB NOT NULL DEFAULT '{}',
  strategist_output JSONB NOT NULL DEFAULT '{}',
  biohacker_output JSONB NOT NULL DEFAULT '{}',

  -- Synthesized result
  overall_status TEXT NOT NULL DEFAULT 'balanced'
    CHECK (overall_status IN ('thriving', 'balanced', 'strained', 'burnout_risk')),
  headline TEXT NOT NULL DEFAULT '',
  synthesis TEXT NOT NULL DEFAULT '',
  actions JSONB NOT NULL DEFAULT '[]',
  conflicts_resolved TEXT[] DEFAULT '{}',

  -- Metadata
  model_used TEXT DEFAULT 'gemini-2.5-pro',
  total_tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  data_sources JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,

  -- One insight per user per day
  CONSTRAINT daily_council_user_date_unique UNIQUE (user_id, insight_date)
);

CREATE INDEX IF NOT EXISTS idx_council_user_date ON daily_council_insights(user_id, insight_date DESC);
CREATE INDEX IF NOT EXISTS idx_council_status ON daily_council_insights(overall_status);

ALTER TABLE daily_council_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own council insights" ON daily_council_insights;
CREATE POLICY "Users view own council insights" ON daily_council_insights
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users mark own insights viewed" ON daily_council_insights;
CREATE POLICY "Users mark own insights viewed" ON daily_council_insights
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role inserts council insights" ON daily_council_insights;
CREATE POLICY "Service role inserts council insights" ON daily_council_insights
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RPC: get_council_context
-- Gathers all data needed for the Life Council (last 24-48h)
-- Returns as a single JSON blob for the Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_council_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_moments JSONB;
  v_tasks JSONB;
  v_report JSONB;
  v_activity_times JSONB;
BEGIN
  -- Moments from last 24h
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'content', COALESCE(m.content, ''),
    'emotion', COALESCE(m.emotion, ''),
    'sentiment_data', COALESCE(m.sentiment_data, '{}'),
    'tags', COALESCE(m.tags, '{}'),
    'created_at', m.created_at
  ) ORDER BY m.created_at DESC), '[]'::jsonb)
  INTO v_moments
  FROM moments m
  WHERE m.user_id = p_user_id
    AND m.created_at >= NOW() - INTERVAL '24 hours';

  -- Work items: completed today + pending/overdue
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'title', w.title,
    'status', w.status,
    'priority', COALESCE(w.priority, 'none'),
    'due_date', w.due_date,
    'completed_at', w.completed_at
  )), '[]'::jsonb)
  INTO v_tasks
  FROM work_items w
  WHERE w.user_id = p_user_id
    AND (
      w.completed_at >= NOW() - INTERVAL '24 hours'
      OR (w.status IN ('todo', 'in_progress', 'pending') AND w.due_date <= CURRENT_DATE + 1)
    );

  -- Latest daily report (if exists for today)
  SELECT COALESCE(jsonb_build_object(
    'report_content', r.report_content,
    'insights_count', r.insights_count,
    'actions_identified', r.actions_identified
  ), '{}'::jsonb)
  INTO v_report
  FROM daily_reports r
  WHERE r.user_id = p_user_id
    AND r.report_date = CURRENT_DATE
  LIMIT 1;

  -- Activity timestamps (last 48h for Bio-Hacker analysis)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'created_at', m.created_at,
    'type', m.type
  ) ORDER BY m.created_at), '[]'::jsonb)
  INTO v_activity_times
  FROM moments m
  WHERE m.user_id = p_user_id
    AND m.created_at >= NOW() - INTERVAL '48 hours';

  RETURN jsonb_build_object(
    'moments', v_moments,
    'tasks', v_tasks,
    'daily_report', COALESCE(v_report, '{}'::jsonb),
    'activity_times', v_activity_times,
    'moments_count', jsonb_array_length(v_moments),
    'tasks_count', jsonb_array_length(v_tasks)
  );
END;
$$;

-- ============================================================================
-- RPC: get_latest_council_insight
-- Returns the most recent insight for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_latest_council_insight(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_insight JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', c.id,
    'insight_date', c.insight_date,
    'overall_status', c.overall_status,
    'headline', c.headline,
    'synthesis', c.synthesis,
    'actions', c.actions,
    'conflicts_resolved', c.conflicts_resolved,
    'philosopher_output', c.philosopher_output,
    'strategist_output', c.strategist_output,
    'biohacker_output', c.biohacker_output,
    'processing_time_ms', c.processing_time_ms,
    'created_at', c.created_at,
    'viewed_at', c.viewed_at
  )
  INTO v_insight
  FROM daily_council_insights c
  WHERE c.user_id = p_user_id
  ORDER BY c.insight_date DESC
  LIMIT 1;

  RETURN COALESCE(v_insight, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_council_context TO service_role;
GRANT EXECUTE ON FUNCTION get_latest_council_insight TO authenticated;
