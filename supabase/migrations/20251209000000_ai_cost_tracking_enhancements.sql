-- =====================================================
-- MIGRATION: 20251209000000_ai_cost_tracking_enhancements
-- Description: Enhanced AI cost tracking with pricing table and optimized functions
-- Author: Aica Backend Architect
-- Date: 2025-12-09
-- =====================================================

-- =====================================================
-- TABLE: ai_model_pricing
-- Purpose: Single source of truth for LLM pricing
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL UNIQUE,

  -- Pricing in USD per 1 million tokens
  input_price_per_1m_tokens NUMERIC(10, 6) NOT NULL,
  output_price_per_1m_tokens NUMERIC(10, 6) NOT NULL,

  -- Metadata
  provider TEXT NOT NULL DEFAULT 'google', -- google, openai, anthropic
  model_family TEXT, -- gemini, gpt, claude
  context_window_tokens INT,

  -- Versioning
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE, -- NULL = still active

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (effective_until IS NULL OR effective_until > effective_from)
);

-- Comments
COMMENT ON TABLE public.ai_model_pricing IS 'Centralized pricing for all AI models - single source of truth';
COMMENT ON COLUMN public.ai_model_pricing.input_price_per_1m_tokens IS 'Cost in USD for 1M input tokens';
COMMENT ON COLUMN public.ai_model_pricing.output_price_per_1m_tokens IS 'Cost in USD for 1M output tokens';
COMMENT ON COLUMN public.ai_model_pricing.effective_until IS 'NULL means price is currently active';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_ai_model_pricing_name ON public.ai_model_pricing(model_name);
CREATE INDEX idx_ai_model_pricing_active ON public.ai_model_pricing(effective_from, effective_until)
  WHERE effective_until IS NULL;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can read pricing (needed for cost calculation)
CREATE POLICY "Anyone can view pricing"
  ON public.ai_model_pricing FOR SELECT
  USING (true);

-- Only admins can modify (service role)
CREATE POLICY "Service role can manage pricing"
  ON public.ai_model_pricing FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- SEED DATA: Current Gemini Pricing (Dec 2025)
-- Source: https://ai.google.dev/pricing
-- =====================================================

INSERT INTO public.ai_model_pricing (model_name, input_price_per_1m_tokens, output_price_per_1m_tokens, provider, model_family, context_window_tokens)
VALUES
  -- Gemini 2.0 Flash (Free tier: 1500 RPD, then paid)
  ('gemini-2.0-flash', 0.000, 0.000, 'google', 'gemini', 1048576), -- Free during preview
  ('gemini-2.0-flash-exp', 0.000, 0.000, 'google', 'gemini', 1048576), -- Experimental

  -- Gemini 1.5 Flash
  ('gemini-1.5-flash', 0.075, 0.30, 'google', 'gemini', 1048576),
  ('gemini-1.5-flash-8b', 0.0375, 0.15, 'google', 'gemini', 1048576),

  -- Gemini 1.5 Pro
  ('gemini-1.5-pro', 1.25, 5.00, 'google', 'gemini', 2097152),

  -- Gemini 2.5 Flash (NEW)
  ('gemini-2.5-flash', 0.10, 0.40, 'google', 'gemini', 1048576),

  -- Embeddings
  ('text-embedding-004', 0.00001, 0.00001, 'google', 'embedding', 2048),

  -- Image/Video Generation (priced per image/second, converted to token-equivalent)
  ('imagen-3', 0.04, 0.04, 'google', 'imagen', 0), -- $0.04 per image
  ('veo-2', 0.10, 0.10, 'google', 'veo', 0) -- $0.10 per second of video
ON CONFLICT (model_name) DO UPDATE SET
  input_price_per_1m_tokens = EXCLUDED.input_price_per_1m_tokens,
  output_price_per_1m_tokens = EXCLUDED.output_price_per_1m_tokens,
  updated_at = NOW();

-- =====================================================
-- FUNCTION: get_current_model_pricing
-- Purpose: Retrieve active pricing for a model
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_model_pricing(
  p_model_name TEXT
)
RETURNS TABLE (
  input_price NUMERIC,
  output_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    input_price_per_1m_tokens,
    output_price_per_1m_tokens
  FROM ai_model_pricing
  WHERE model_name = p_model_name
    AND effective_from <= CURRENT_DATE
    AND (effective_until IS NULL OR effective_until > CURRENT_DATE)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_model_pricing IS 'Returns current active pricing for a model';

-- =====================================================
-- FUNCTION: log_ai_usage
-- Purpose: Insert AI usage with validation and error handling
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_ai_usage(
  p_user_id UUID,
  p_operation_type TEXT,
  p_ai_model TEXT,
  p_input_tokens INT DEFAULT NULL,
  p_output_tokens INT DEFAULT NULL,
  p_total_tokens INT DEFAULT NULL,
  p_duration_seconds NUMERIC DEFAULT NULL,
  p_input_cost_usd NUMERIC DEFAULT NULL,
  p_output_cost_usd NUMERIC DEFAULT NULL,
  p_total_cost_usd NUMERIC,
  p_module_type TEXT DEFAULT NULL,
  p_module_id UUID DEFAULT NULL,
  p_asset_id UUID DEFAULT NULL,
  p_request_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
  v_calculated_total NUMERIC;
BEGIN
  -- Validate total cost matches sum (allow 0.000001 tolerance for rounding)
  v_calculated_total := COALESCE(p_input_cost_usd, 0) + COALESCE(p_output_cost_usd, 0);

  IF ABS(v_calculated_total - p_total_cost_usd) > 0.000001 THEN
    RAISE WARNING 'Cost mismatch: input (%) + output (%) != total (%)',
      p_input_cost_usd, p_output_cost_usd, p_total_cost_usd;
    -- Auto-correct to avoid data inconsistency
    p_total_cost_usd := v_calculated_total;
  END IF;

  -- Insert record
  INSERT INTO ai_usage_analytics (
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
    p_total_tokens,
    p_duration_seconds,
    p_input_cost_usd,
    p_output_cost_usd,
    p_total_cost_usd,
    p_module_type,
    p_module_id,
    p_asset_id,
    p_request_metadata
  )
  RETURNING id INTO v_record_id;

  RETURN v_record_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't propagate (fail-safe)
    RAISE WARNING 'Failed to log AI usage: %', SQLERRM;
    RETURN NULL; -- NULL indicates failure but doesn't break caller
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.log_ai_usage IS 'Safely logs AI usage with validation - returns NULL on error instead of throwing';

-- =====================================================
-- FUNCTION: calculate_token_cost
-- Purpose: Calculate cost from tokens using current pricing
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_token_cost(
  p_model_name TEXT,
  p_input_tokens INT,
  p_output_tokens INT
)
RETURNS TABLE (
  input_cost_usd NUMERIC,
  output_cost_usd NUMERIC,
  total_cost_usd NUMERIC
) AS $$
DECLARE
  v_input_price NUMERIC;
  v_output_price NUMERIC;
  v_input_cost NUMERIC;
  v_output_cost NUMERIC;
BEGIN
  -- Get pricing
  SELECT input_price, output_price
  INTO v_input_price, v_output_price
  FROM get_current_model_pricing(p_model_name);

  -- If model not found, return zeros
  IF v_input_price IS NULL THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Calculate costs (price is per 1M tokens)
  v_input_cost := (COALESCE(p_input_tokens, 0)::NUMERIC / 1000000.0) * v_input_price;
  v_output_cost := (COALESCE(p_output_tokens, 0)::NUMERIC / 1000000.0) * v_output_price;

  RETURN QUERY SELECT
    ROUND(v_input_cost, 6) as input_cost_usd,
    ROUND(v_output_cost, 6) as output_cost_usd,
    ROUND(v_input_cost + v_output_cost, 6) as total_cost_usd;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.calculate_token_cost IS 'Calculates USD cost from token counts using current pricing';

-- =====================================================
-- TRIGGER: Validate cost calculation on insert
-- =====================================================

CREATE OR REPLACE FUNCTION validate_ai_usage_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_calculated_total NUMERIC;
BEGIN
  -- Auto-calculate total_cost if not provided or zero
  v_calculated_total := COALESCE(NEW.input_cost_usd, 0) + COALESCE(NEW.output_cost_usd, 0);

  IF NEW.total_cost_usd = 0 OR NEW.total_cost_usd IS NULL THEN
    NEW.total_cost_usd := v_calculated_total;
  END IF;

  -- Validate total matches sum (with tolerance)
  IF ABS(v_calculated_total - NEW.total_cost_usd) > 0.000001 THEN
    -- Auto-correct instead of raising error
    NEW.total_cost_usd := v_calculated_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_ai_usage_cost ON public.ai_usage_analytics;

CREATE TRIGGER trigger_validate_ai_usage_cost
  BEFORE INSERT OR UPDATE ON public.ai_usage_analytics
  FOR EACH ROW
  EXECUTE FUNCTION validate_ai_usage_cost();

COMMENT ON TRIGGER trigger_validate_ai_usage_cost ON public.ai_usage_analytics
  IS 'Ensures total_cost = input_cost + output_cost before insert/update';

-- =====================================================
-- UPDATED_AT TRIGGER for ai_model_pricing
-- =====================================================

CREATE TRIGGER update_ai_model_pricing_updated_at
  BEFORE UPDATE ON public.ai_model_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PERFORMANCE: Additional indexes for common queries
-- =====================================================

-- Composite index for user + date range queries (dashboard)
CREATE INDEX idx_ai_usage_user_created ON public.ai_usage_analytics(user_id, created_at DESC);

-- Composite index for module-specific queries
CREATE INDEX idx_ai_usage_module_created ON public.ai_usage_analytics(module_type, module_id, created_at DESC)
  WHERE module_type IS NOT NULL;

-- Index for cost-based analysis
CREATE INDEX idx_ai_usage_user_cost ON public.ai_usage_analytics(user_id, total_cost_usd DESC);

-- =====================================================
-- AUDIT: Create tracking log table for failures
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_tracking_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- May be NULL if error occurred before user context
  operation_type TEXT,
  ai_model TEXT,
  error_message TEXT NOT NULL,
  error_context JSONB, -- Full request data that failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ai_usage_tracking_errors IS 'Logs failed AI usage tracking attempts for debugging';

CREATE INDEX idx_tracking_errors_created ON public.ai_usage_tracking_errors(created_at DESC);

ALTER TABLE public.ai_usage_tracking_errors ENABLE ROW LEVEL SECURITY;

-- Only service role can read tracking errors
CREATE POLICY "Service role can view tracking errors"
  ON public.ai_usage_tracking_errors FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- FUNCTION: log_tracking_error
-- Purpose: Log tracking failures for debugging
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_tracking_error(
  p_user_id UUID,
  p_operation_type TEXT,
  p_ai_model TEXT,
  p_error_message TEXT,
  p_error_context JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_tracking_errors (
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
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If we can't even log the error, just warn
    RAISE WARNING 'Failed to log tracking error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_tracking_error IS 'Logs tracking failures for debugging - never throws';

-- =====================================================
-- MATERIALIZED VIEW: Daily cost aggregations
-- Purpose: Pre-calculated daily costs for fast dashboard loading
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_ai_costs AS
SELECT
  user_id,
  DATE(created_at) as date,
  operation_type,
  ai_model,
  COUNT(*) as request_count,
  SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
  SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
  SUM(COALESCE(total_tokens, 0)) as total_tokens,
  SUM(total_cost_usd) as total_cost_usd,
  AVG(duration_seconds) as avg_duration_seconds
FROM ai_usage_analytics
GROUP BY user_id, DATE(created_at), operation_type, ai_model;

CREATE UNIQUE INDEX idx_mv_daily_costs_unique ON public.mv_daily_ai_costs(user_id, date, operation_type, ai_model);
CREATE INDEX idx_mv_daily_costs_user_date ON public.mv_daily_ai_costs(user_id, date DESC);

COMMENT ON MATERIALIZED VIEW public.mv_daily_ai_costs IS 'Pre-aggregated daily AI costs for fast dashboard queries';

-- Refresh function (to be called by cron job or manually)
CREATE OR REPLACE FUNCTION refresh_daily_ai_costs()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_ai_costs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_daily_ai_costs IS 'Refreshes materialized view - call this daily via pg_cron';

-- =====================================================
-- GRANTS: Ensure authenticated users can use functions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_current_model_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_ai_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_token_cost TO authenticated;
GRANT SELECT ON public.ai_model_pricing TO authenticated;
GRANT SELECT ON public.mv_daily_ai_costs TO authenticated;
