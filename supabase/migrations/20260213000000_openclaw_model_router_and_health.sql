-- ============================================================================
-- OpenClaw Adaptation Phase 1+2: Model Router + Auto-Correction
-- Issue: #251, #252, #253
-- ============================================================================

-- ============================================================================
-- TABLE: ai_function_health
-- Tracks health of AI-powered Edge Functions for auto-correction
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_function_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Function identity
  function_name TEXT NOT NULL,
  action_name TEXT NOT NULL,

  -- Error tracking
  consecutive_failures INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  total_calls INTEGER DEFAULT 0,
  last_error_message TEXT,
  last_error_context JSONB DEFAULT '{}',

  -- Health status
  health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'critical')),
  alert_generated_at TIMESTAMPTZ,
  alert_acknowledged_at TIMESTAMPTZ,

  -- Prompt versioning
  current_prompt_hash TEXT,
  last_successful_prompt_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT ai_function_health_unique UNIQUE (function_name, action_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_health_status ON ai_function_health(health_status);
CREATE INDEX IF NOT EXISTS idx_ai_health_failures ON ai_function_health(consecutive_failures DESC);

ALTER TABLE ai_function_health ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read health dashboard
DROP POLICY IF EXISTS "Authenticated can read health" ON ai_function_health;
CREATE POLICY "Authenticated can read health" ON ai_function_health
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can manage (Edge Functions use service role)
DROP POLICY IF EXISTS "Service role manages health" ON ai_function_health;
CREATE POLICY "Service role manages health" ON ai_function_health
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- RPC: track_ai_success
-- Reset consecutive failures on successful AI call
-- ============================================================================

CREATE OR REPLACE FUNCTION track_ai_success(
  p_function_name TEXT,
  p_action_name TEXT,
  p_prompt_hash TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO ai_function_health (function_name, action_name, total_calls, current_prompt_hash, health_status)
  VALUES (p_function_name, p_action_name, 1, p_prompt_hash, 'healthy')
  ON CONFLICT (function_name, action_name) DO UPDATE SET
    consecutive_failures = 0,
    total_calls = ai_function_health.total_calls + 1,
    health_status = 'healthy',
    current_prompt_hash = COALESCE(p_prompt_hash, ai_function_health.current_prompt_hash),
    last_successful_prompt_hash = COALESCE(p_prompt_hash, ai_function_health.last_successful_prompt_hash),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- RPC: track_ai_failure
-- Increment failures, return whether alert threshold reached (3+)
-- ============================================================================

CREATE OR REPLACE FUNCTION track_ai_failure(
  p_function_name TEXT,
  p_action_name TEXT,
  p_error_message TEXT,
  p_error_context JSONB DEFAULT '{}'
)
RETURNS TABLE (should_alert BOOLEAN, consecutive_failures INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_failures INTEGER;
  v_status TEXT;
BEGIN
  INSERT INTO ai_function_health (
    function_name, action_name, consecutive_failures, total_failures, total_calls,
    last_error_message, last_error_context, health_status
  )
  VALUES (
    p_function_name, p_action_name, 1, 1, 1,
    p_error_message, p_error_context, 'degraded'
  )
  ON CONFLICT (function_name, action_name) DO UPDATE SET
    consecutive_failures = ai_function_health.consecutive_failures + 1,
    total_failures = ai_function_health.total_failures + 1,
    total_calls = ai_function_health.total_calls + 1,
    last_error_message = p_error_message,
    last_error_context = p_error_context,
    health_status = CASE
      WHEN ai_function_health.consecutive_failures + 1 >= 3 THEN 'critical'
      WHEN ai_function_health.consecutive_failures + 1 >= 1 THEN 'degraded'
      ELSE 'healthy'
    END,
    alert_generated_at = CASE
      WHEN ai_function_health.consecutive_failures + 1 = 3 THEN NOW()
      ELSE ai_function_health.alert_generated_at
    END,
    updated_at = NOW()
  RETURNING ai_function_health.consecutive_failures, ai_function_health.health_status
  INTO v_failures, v_status;

  -- Also log to ai_tracking_errors for historical record
  BEGIN
    INSERT INTO ai_tracking_errors (operation_type, ai_model, error_message, error_context)
    VALUES (p_function_name || '/' || p_action_name, 'gemini', p_error_message, p_error_context);
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail if ai_tracking_errors doesn't exist
    NULL;
  END;

  RETURN QUERY SELECT (v_failures >= 3), v_failures;
END;
$$;

-- ============================================================================
-- RPC: get_ai_health_dashboard
-- Returns all functions sorted by severity
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ai_health_dashboard()
RETURNS TABLE (
  function_name TEXT,
  action_name TEXT,
  health_status TEXT,
  consecutive_failures INTEGER,
  success_rate NUMERIC,
  total_calls INTEGER,
  last_error TEXT,
  alert_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    h.function_name,
    h.action_name,
    h.health_status,
    h.consecutive_failures,
    CASE WHEN h.total_calls > 0
      THEN ROUND((h.total_calls - h.total_failures)::NUMERIC / h.total_calls * 100, 1)
      ELSE 100
    END as success_rate,
    h.total_calls,
    h.last_error_message,
    h.alert_generated_at,
    h.updated_at
  FROM ai_function_health h
  ORDER BY
    CASE h.health_status WHEN 'critical' THEN 0 WHEN 'degraded' THEN 1 ELSE 2 END,
    h.consecutive_failures DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION track_ai_success TO service_role;
GRANT EXECUTE ON FUNCTION track_ai_failure TO service_role;
GRANT EXECUTE ON FUNCTION get_ai_health_dashboard TO authenticated;
