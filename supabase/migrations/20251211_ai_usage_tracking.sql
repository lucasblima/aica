-- =====================================================
-- AI Usage Tracking Migration
-- Created: 2025-12-11
-- Description: Creates tables and RPC functions for AI cost tracking
-- =====================================================

-- 1. AI Model Pricing Table
CREATE TABLE IF NOT EXISTS ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  input_price NUMERIC(12, 8) NOT NULL, -- Price per 1M tokens (USD)
  output_price NUMERIC(12, 8) NOT NULL, -- Price per 1M tokens (USD)
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ, -- NULL means currently active
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_model_pricing_model_name ON ai_model_pricing(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_pricing_effective_date ON ai_model_pricing(effective_date DESC);

-- Insert default pricing for Gemini models (December 2025)
INSERT INTO ai_model_pricing (model_name, provider, input_price, output_price, notes) VALUES
  ('gemini-2.0-flash', 'google', 0.0, 0.0, 'Free preview model'),
  ('gemini-2.0-flash-exp', 'google', 0.0, 0.0, 'Free experimental preview'),
  ('gemini-2.5-flash', 'google', 0.10, 0.40, 'Standard flash model'),
  ('gemini-1.5-flash', 'google', 0.075, 0.30, 'Legacy flash model'),
  ('gemini-1.5-flash-8b', 'google', 0.0375, 0.15, 'Small flash model'),
  ('gemini-1.5-pro', 'google', 1.25, 5.0, 'Pro model'),
  ('text-embedding-004', 'google', 0.00001, 0.00001, 'Embedding model'),
  ('imagen-3', 'google', 0.04, 0.04, 'Image generation'),
  ('veo-2', 'google', 0.10, 0.10, 'Video generation')
ON CONFLICT DO NOTHING;

-- 2. AI Usage Logs Table
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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_operation_type ON ai_usage_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_ai_model ON ai_usage_logs(ai_model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_module_type ON ai_usage_logs(module_type);

-- 3. AI Tracking Errors Table (for debugging)
CREATE TABLE IF NOT EXISTS ai_tracking_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT,
  ai_model TEXT,
  error_message TEXT NOT NULL,
  error_context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tracking_errors_created_at ON ai_tracking_errors(created_at DESC);

-- 4. Enable RLS on all tables
ALTER TABLE ai_model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tracking_errors ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- ai_model_pricing: Everyone can read pricing (public info)
CREATE POLICY "Anyone can read model pricing"
  ON ai_model_pricing FOR SELECT
  USING (true);

-- ai_usage_logs: Users can only see their own usage
CREATE POLICY "Users can view own usage logs"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ai_tracking_errors: Users can see and insert their own errors
CREATE POLICY "Users can view own tracking errors"
  ON ai_tracking_errors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking errors"
  ON ai_tracking_errors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- 6. get_current_model_pricing: Get current pricing for a model
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
  SELECT
    amp.model_name,
    amp.input_price,
    amp.output_price,
    amp.provider
  FROM ai_model_pricing amp
  WHERE amp.model_name = p_model_name
    AND amp.effective_date <= now()
    AND (amp.end_date IS NULL OR amp.end_date > now())
  ORDER BY amp.effective_date DESC
  LIMIT 1;
END;
$$;

-- 7. calculate_token_cost: Calculate cost from token counts
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
  -- Get current pricing
  SELECT amp.input_price, amp.output_price
  INTO v_input_price, v_output_price
  FROM ai_model_pricing amp
  WHERE amp.model_name = p_model_name
    AND amp.effective_date <= now()
    AND (amp.end_date IS NULL OR amp.end_date > now())
  ORDER BY amp.effective_date DESC
  LIMIT 1;

  -- Default to 0 if no pricing found
  IF v_input_price IS NULL THEN
    v_input_price := 0;
    v_output_price := 0;
  END IF;

  -- Calculate costs (price is per 1M tokens)
  v_input_cost := (COALESCE(p_input_tokens, 0)::NUMERIC / 1000000.0) * v_input_price;
  v_output_cost := (COALESCE(p_output_tokens, 0)::NUMERIC / 1000000.0) * v_output_price;

  RETURN QUERY
  SELECT
    ROUND(v_input_cost, 8) as input_cost_usd,
    ROUND(v_output_cost, 8) as output_cost_usd,
    ROUND(v_input_cost + v_output_cost, 8) as total_cost_usd;
END;
$$;

-- 8. log_ai_usage: Main function to log AI usage
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
  -- Validate user_id
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert the usage log
  INSERT INTO ai_usage_logs (
    user_id,
    operation_type,
    ai_model,
    input_tokens,
    output_tokens,
    total_tokens,
    duration_seconds,
    input_cost_usd,
    output_cost_usd,
    total_cost_usd,
    module_type,
    module_id,
    asset_id,
    request_metadata
  ) VALUES (
    p_user_id,
    p_operation_type,
    p_ai_model,
    p_input_tokens,
    p_output_tokens,
    COALESCE(p_total_tokens, COALESCE(p_input_tokens, 0) + COALESCE(p_output_tokens, 0)),
    p_duration_seconds,
    COALESCE(p_input_cost_usd, 0),
    COALESCE(p_output_cost_usd, 0),
    COALESCE(p_total_cost_usd, 0),
    p_module_type,
    p_module_id,
    p_asset_id,
    COALESCE(p_request_metadata, '{}')
  )
  RETURNING id INTO v_record_id;

  RETURN v_record_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error silently and return NULL (non-blocking)
    RAISE WARNING 'log_ai_usage failed: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- 9. log_tracking_error: Log tracking errors for debugging
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
  INSERT INTO ai_tracking_errors (
    user_id,
    operation_type,
    ai_model,
    error_message,
    error_context
  ) VALUES (
    p_user_id,
    p_operation_type,
    p_ai_model,
    p_error_message,
    p_error_context
  )
  RETURNING id INTO v_record_id;

  RETURN v_record_id;

EXCEPTION
  WHEN OTHERS THEN
    -- If even error logging fails, just return NULL
    RETURN NULL;
END;
$$;

-- 10. get_user_ai_usage_summary: Get summary of user's AI usage
CREATE OR REPLACE FUNCTION get_user_ai_usage_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_requests BIGINT,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_cost_usd NUMERIC,
  avg_duration_seconds NUMERIC,
  most_used_model TEXT,
  most_used_operation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as request_count,
      SUM(COALESCE(aul.input_tokens, 0)) as input_tokens,
      SUM(COALESCE(aul.output_tokens, 0)) as output_tokens,
      SUM(COALESCE(aul.total_cost_usd, 0)) as cost,
      AVG(aul.duration_seconds) as avg_duration
    FROM ai_usage_logs aul
    WHERE aul.user_id = p_user_id
      AND aul.created_at >= now() - (p_days || ' days')::INTERVAL
  ),
  top_model AS (
    SELECT aul.ai_model
    FROM ai_usage_logs aul
    WHERE aul.user_id = p_user_id
      AND aul.created_at >= now() - (p_days || ' days')::INTERVAL
    GROUP BY aul.ai_model
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  top_operation AS (
    SELECT aul.operation_type
    FROM ai_usage_logs aul
    WHERE aul.user_id = p_user_id
      AND aul.created_at >= now() - (p_days || ' days')::INTERVAL
    GROUP BY aul.operation_type
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    stats.request_count::BIGINT,
    stats.input_tokens::BIGINT,
    stats.output_tokens::BIGINT,
    ROUND(stats.cost, 6),
    ROUND(stats.avg_duration, 3),
    top_model.ai_model,
    top_operation.operation_type
  FROM stats
  CROSS JOIN LATERAL (SELECT ai_model FROM top_model LIMIT 1) top_model
  CROSS JOIN LATERAL (SELECT operation_type FROM top_operation LIMIT 1) top_operation;
END;
$$;

-- 11. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_model_pricing(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_token_cost(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_usage(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_tracking_error(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ai_usage_summary(UUID, INTEGER) TO authenticated;

-- 12. Add comment documentation
COMMENT ON TABLE ai_model_pricing IS 'Stores pricing information for AI models (price per 1M tokens)';
COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API usage for cost monitoring and analytics';
COMMENT ON TABLE ai_tracking_errors IS 'Logs errors that occur during AI usage tracking for debugging';
COMMENT ON FUNCTION log_ai_usage IS 'Main RPC function to log AI usage - non-blocking, returns NULL on error';
COMMENT ON FUNCTION calculate_token_cost IS 'Calculate cost from token counts using current pricing';
