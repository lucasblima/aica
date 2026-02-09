-- =============================================================================
-- REPAIR MIGRATION: Re-create missing RPC functions
--
-- Context: Several migrations were marked as applied but their functions
-- don't exist in the database (likely partial migration failures).
-- All statements use CREATE OR REPLACE / IF NOT EXISTS for idempotency.
-- =============================================================================

-- =====================================================
-- 1. AI USAGE TRACKING RPCs (from 20251211000000)
-- =====================================================

-- Ensure tables exist
CREATE TABLE IF NOT EXISTS ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  input_price NUMERIC(12, 8) NOT NULL,
  output_price NUMERIC(12, 8) NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  duration_seconds NUMERIC(10, 3),
  input_cost_usd NUMERIC(12, 8) DEFAULT 0,
  output_cost_usd NUMERIC(12, 8) DEFAULT 0,
  total_cost_usd NUMERIC(12, 8) DEFAULT 0,
  module_type TEXT,
  module_id UUID,
  asset_id UUID,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_tracking_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT,
  ai_model TEXT,
  error_message TEXT NOT NULL,
  error_context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tracking_errors ENABLE ROW LEVEL SECURITY;

-- RLS policies (DROP IF EXISTS + CREATE for idempotency)
DROP POLICY IF EXISTS "Anyone can read model pricing" ON ai_model_pricing;
CREATE POLICY "Anyone can read model pricing" ON ai_model_pricing FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own usage logs" ON ai_usage_logs;
CREATE POLICY "Users can view own usage logs" ON ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage logs" ON ai_usage_logs;
CREATE POLICY "Users can insert own usage logs" ON ai_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own tracking errors" ON ai_tracking_errors;
CREATE POLICY "Users can view own tracking errors" ON ai_tracking_errors FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tracking errors" ON ai_tracking_errors;
CREATE POLICY "Users can insert own tracking errors" ON ai_tracking_errors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default pricing (skip duplicates)
INSERT INTO ai_model_pricing (model_name, provider, input_price, output_price, notes) VALUES
  ('gemini-2.5-flash', 'google', 0.10, 0.40, 'Standard flash model'),
  ('gemini-2.5-pro', 'google', 1.25, 5.0, 'Pro model'),
  ('gemini-2.0-flash', 'google', 0.0, 0.0, 'Free preview model'),
  ('text-embedding-004', 'google', 0.00001, 0.00001, 'Embedding model')
ON CONFLICT DO NOTHING;

-- RPC: get_current_model_pricing
CREATE OR REPLACE FUNCTION get_current_model_pricing(p_model_name TEXT)
RETURNS TABLE (
  model_name TEXT,
  input_price NUMERIC,
  output_price NUMERIC,
  provider TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT amp.model_name, amp.input_price, amp.output_price, amp.provider
  FROM ai_model_pricing amp
  WHERE amp.model_name = p_model_name
    AND amp.effective_date <= now()
    AND (amp.end_date IS NULL OR amp.end_date > now())
  ORDER BY amp.effective_date DESC
  LIMIT 1;
END;
$$;

-- RPC: calculate_token_cost
CREATE OR REPLACE FUNCTION calculate_token_cost(
  p_model_name TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER
)
RETURNS TABLE (
  input_cost_usd NUMERIC,
  output_cost_usd NUMERIC,
  total_cost_usd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_input_price NUMERIC;
  v_output_price NUMERIC;
  v_input_cost NUMERIC;
  v_output_cost NUMERIC;
BEGIN
  SELECT amp.input_price, amp.output_price
  INTO v_input_price, v_output_price
  FROM ai_model_pricing amp
  WHERE amp.model_name = p_model_name
    AND amp.effective_date <= now()
    AND (amp.end_date IS NULL OR amp.end_date > now())
  ORDER BY amp.effective_date DESC
  LIMIT 1;

  IF v_input_price IS NULL THEN
    v_input_price := 0;
    v_output_price := 0;
  END IF;

  v_input_cost := (COALESCE(p_input_tokens, 0)::NUMERIC / 1000000.0) * v_input_price;
  v_output_cost := (COALESCE(p_output_tokens, 0)::NUMERIC / 1000000.0) * v_output_price;

  RETURN QUERY
  SELECT
    ROUND(v_input_cost, 8) as input_cost_usd,
    ROUND(v_output_cost, 8) as output_cost_usd,
    ROUND(v_input_cost + v_output_cost, 8) as total_cost_usd;
END;
$$;

-- RPC: log_ai_usage
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_operation_type TEXT,
  p_ai_model TEXT,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL,
  p_total_tokens INTEGER DEFAULT NULL,
  p_duration_seconds NUMERIC DEFAULT NULL,
  p_input_cost_usd NUMERIC DEFAULT 0,
  p_output_cost_usd NUMERIC DEFAULT 0,
  p_total_cost_usd NUMERIC DEFAULT 0,
  p_module_type TEXT DEFAULT NULL,
  p_module_id UUID DEFAULT NULL,
  p_asset_id UUID DEFAULT NULL,
  p_request_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO ai_usage_logs (
    user_id, operation_type, ai_model, input_tokens, output_tokens, total_tokens,
    duration_seconds, input_cost_usd, output_cost_usd, total_cost_usd,
    module_type, module_id, asset_id, request_metadata
  ) VALUES (
    p_user_id, p_operation_type, p_ai_model, p_input_tokens, p_output_tokens,
    COALESCE(p_total_tokens, COALESCE(p_input_tokens, 0) + COALESCE(p_output_tokens, 0)),
    p_duration_seconds, COALESCE(p_input_cost_usd, 0), COALESCE(p_output_cost_usd, 0),
    COALESCE(p_total_cost_usd, 0), p_module_type, p_module_id, p_asset_id,
    COALESCE(p_request_metadata, '{}')
  )
  RETURNING id INTO v_record_id;
  RETURN v_record_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'log_ai_usage failed: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- RPC: log_tracking_error
CREATE OR REPLACE FUNCTION log_tracking_error(
  p_user_id UUID,
  p_operation_type TEXT,
  p_ai_model TEXT,
  p_error_message TEXT,
  p_error_context JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO ai_tracking_errors (user_id, operation_type, ai_model, error_message, error_context)
  VALUES (p_user_id, p_operation_type, p_ai_model, p_error_message, p_error_context)
  RETURNING id INTO v_record_id;
  RETURN v_record_id;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_model_pricing(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_token_cost(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_usage(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_tracking_error(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- =====================================================
-- 2. QUESTION GENERATION RPCs (from 20260126000001)
-- =====================================================

-- Ensure context bank table exists
CREATE TABLE IF NOT EXISTS user_question_context_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dominant_emotions TEXT[] DEFAULT '{}',
  recurring_themes TEXT[] DEFAULT '{}',
  total_responses INTEGER DEFAULT 0,
  avg_response_length INTEGER DEFAULT 0,
  preferred_categories TEXT[] DEFAULT '{}',
  last_generation_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_context UNIQUE(user_id)
);

-- RPC: check_should_generate_questions
CREATE OR REPLACE FUNCTION check_should_generate_questions(p_user_id UUID)
RETURNS TABLE (
  should_generate BOOLEAN,
  unanswered_count INT,
  total_available INT,
  hours_since_last_generation DECIMAL,
  daily_generation_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unanswered INT;
  v_total INT;
  v_last_gen TIMESTAMPTZ;
  v_hours_since DECIMAL;
  v_daily_count INT;
  v_min_threshold INT := 3;
  v_min_hours INT := 12;
  v_max_daily INT := 2;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM daily_questions
  WHERE active = TRUE AND (user_id IS NULL OR user_id = p_user_id);

  SELECT COUNT(*) INTO v_unanswered
  FROM daily_questions dq
  WHERE dq.active = TRUE
    AND (dq.user_id IS NULL OR dq.user_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM question_responses qr
      WHERE qr.question_id = dq.id AND qr.user_id = p_user_id
    );

  SELECT last_generation_at INTO v_last_gen
  FROM user_question_context_bank WHERE user_id = p_user_id;

  IF v_last_gen IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (NOW() - v_last_gen)) / 3600;
  ELSE
    v_hours_since := 999;
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM daily_questions
  WHERE user_id = p_user_id AND created_by_ai = TRUE
    AND created_at > NOW() - INTERVAL '24 hours';

  RETURN QUERY SELECT
    (v_unanswered < v_min_threshold AND v_hours_since >= v_min_hours AND v_daily_count < v_max_daily),
    v_unanswered, v_total, v_hours_since, v_daily_count;
END;
$$;

GRANT EXECUTE ON FUNCTION check_should_generate_questions(UUID) TO authenticated;

-- =====================================================
-- 3. Indexes (idempotent)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ai_model_pricing_model_name ON ai_model_pricing(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tracking_errors_created_at ON ai_tracking_errors(created_at DESC);
