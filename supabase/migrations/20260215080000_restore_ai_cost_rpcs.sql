-- ============================================================================
-- RESTORE AI COST TRACKING RPCs
-- ============================================================================
-- Problem: The consolidated billing migration (20260215050000) and/or the
-- repair migration (20260209) broke the AI cost dashboard:
--   1. log_ai_usage was writing to ai_usage_logs but dashboard reads ai_usage_analytics
--   2. get_user_ai_costs, get_daily_ai_costs, get_current_month_cost may have been
--      dropped by CASCADE
--   3. CHECK constraints on ai_usage_analytics are too restrictive
--
-- Fix: Recreate all RPCs with CREATE OR REPLACE, relax constraints,
-- and make log_ai_usage write to ai_usage_analytics (the table the dashboard reads).
-- ============================================================================

-- ============================================================================
-- STEP 1: Relax CHECK constraints on ai_usage_analytics
-- ============================================================================

-- Drop the restrictive operation_type CHECK (allow any text value)
DO $$
BEGIN
  ALTER TABLE public.ai_usage_analytics DROP CONSTRAINT IF EXISTS ai_usage_analytics_operation_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Drop the restrictive module_type CHECK (allow any text value including new modules)
DO $$
BEGIN
  ALTER TABLE public.ai_usage_analytics DROP CONSTRAINT IF EXISTS ai_usage_analytics_module_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Make total_cost_usd nullable with default 0 (avoid insert failures)
ALTER TABLE public.ai_usage_analytics ALTER COLUMN total_cost_usd SET DEFAULT 0;
ALTER TABLE public.ai_usage_analytics ALTER COLUMN total_cost_usd DROP NOT NULL;

-- ============================================================================
-- STEP 2: Restore log_ai_usage → writes to ai_usage_analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_ai_usage(
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
  v_total NUMERIC;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  -- Auto-calculate total if not provided
  v_total := COALESCE(p_total_cost_usd, 0);
  IF v_total = 0 THEN
    v_total := COALESCE(p_input_cost_usd, 0) + COALESCE(p_output_cost_usd, 0);
  END IF;

  -- Insert into ai_usage_analytics (the table the dashboard reads)
  INSERT INTO ai_usage_analytics (
    user_id, operation_type, ai_model,
    input_tokens, output_tokens, total_tokens,
    duration_seconds,
    input_cost_usd, output_cost_usd, total_cost_usd,
    module_type, module_id,
    request_metadata
  ) VALUES (
    p_user_id, p_operation_type, p_ai_model,
    p_input_tokens, p_output_tokens,
    COALESCE(p_total_tokens, COALESCE(p_input_tokens, 0) + COALESCE(p_output_tokens, 0)),
    p_duration_seconds,
    COALESCE(p_input_cost_usd, 0), COALESCE(p_output_cost_usd, 0), v_total,
    p_module_type, p_module_id,
    COALESCE(p_request_metadata, '{}')
  )
  RETURNING id INTO v_record_id;

  -- Also insert into ai_usage_logs for backward compat (ignore failures)
  BEGIN
    INSERT INTO ai_usage_logs (
      user_id, operation_type, ai_model,
      input_tokens, output_tokens, total_tokens,
      duration_seconds,
      input_cost_usd, output_cost_usd, total_cost_usd,
      module_type, module_id, asset_id,
      request_metadata
    ) VALUES (
      p_user_id, p_operation_type, p_ai_model,
      p_input_tokens, p_output_tokens,
      COALESCE(p_total_tokens, COALESCE(p_input_tokens, 0) + COALESCE(p_output_tokens, 0)),
      p_duration_seconds,
      COALESCE(p_input_cost_usd, 0), COALESCE(p_output_cost_usd, 0), v_total,
      p_module_type, p_module_id, p_asset_id,
      COALESCE(p_request_metadata, '{}')
    );
  EXCEPTION WHEN OTHERS THEN
    -- ai_usage_logs may not exist or have different schema — ignore
    NULL;
  END;

  RETURN v_record_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'log_ai_usage failed: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- ============================================================================
-- STEP 3: Restore get_user_ai_costs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_ai_costs(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  operation_type TEXT,
  ai_model TEXT,
  total_requests BIGINT,
  total_tokens BIGINT,
  total_cost_usd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.operation_type,
    a.ai_model,
    COUNT(*)::BIGINT AS total_requests,
    COALESCE(SUM(a.total_tokens), 0)::BIGINT AS total_tokens,
    COALESCE(SUM(a.total_cost_usd), 0) AS total_cost_usd
  FROM ai_usage_analytics a
  WHERE a.user_id = p_user_id
    AND a.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY a.operation_type, a.ai_model
  ORDER BY total_cost_usd DESC;
END;
$$;

-- ============================================================================
-- STEP 4: Restore get_daily_ai_costs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_daily_ai_costs(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_cost_usd NUMERIC,
  total_requests BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(a.created_at) AS date,
    COALESCE(SUM(a.total_cost_usd), 0) AS total_cost_usd,
    COUNT(*)::BIGINT AS total_requests
  FROM ai_usage_analytics a
  WHERE a.user_id = p_user_id
    AND a.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(a.created_at)
  ORDER BY date DESC;
END;
$$;

-- ============================================================================
-- STEP 5: Restore get_current_month_cost
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_month_cost(
  p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_cost_usd), 0)
  INTO v_total
  FROM ai_usage_analytics
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());

  RETURN v_total;
END;
$$;

-- ============================================================================
-- STEP 6: Restore calculate_token_cost
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_token_cost(
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
  -- Try to get pricing from ai_model_pricing (handle both column naming conventions)
  BEGIN
    -- Schema from 20251209: input_price_per_1m_tokens / output_price_per_1m_tokens
    SELECT amp.input_price_per_1m_tokens, amp.output_price_per_1m_tokens
    INTO v_input_price, v_output_price
    FROM ai_model_pricing amp
    WHERE amp.model_name = p_model_name
    LIMIT 1;
  EXCEPTION WHEN undefined_column THEN
    -- Schema from 20251211: input_price / output_price
    BEGIN
      SELECT amp.input_price, amp.output_price
      INTO v_input_price, v_output_price
      FROM ai_model_pricing amp
      WHERE amp.model_name = p_model_name
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_input_price := NULL;
    END;
  END;

  IF v_input_price IS NULL THEN
    v_input_price := 0;
    v_output_price := 0;
  END IF;

  -- Calculate costs (price is per 1M tokens)
  v_input_cost := (COALESCE(p_input_tokens, 0)::NUMERIC / 1000000.0) * v_input_price;
  v_output_cost := (COALESCE(p_output_tokens, 0)::NUMERIC / 1000000.0) * v_output_price;

  RETURN QUERY
  SELECT
    ROUND(v_input_cost, 8) AS input_cost_usd,
    ROUND(v_output_cost, 8) AS output_cost_usd,
    ROUND(v_input_cost + v_output_cost, 8) AS total_cost_usd;
END;
$$;

-- ============================================================================
-- STEP 7: Restore get_current_model_pricing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_model_pricing(p_model_name TEXT)
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
  -- Try schema from 20251209 (input_price_per_1m_tokens)
  BEGIN
    RETURN QUERY
    SELECT amp.model_name, amp.input_price_per_1m_tokens, amp.output_price_per_1m_tokens, amp.provider
    FROM ai_model_pricing amp
    WHERE amp.model_name = p_model_name
    LIMIT 1;
    RETURN;
  EXCEPTION WHEN undefined_column THEN
    -- Try schema from 20251211 (input_price / output_price)
    BEGIN
      RETURN QUERY
      SELECT amp.model_name, amp.input_price, amp.output_price, amp.provider
      FROM ai_model_pricing amp
      WHERE amp.model_name = p_model_name
      LIMIT 1;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      -- Return nothing — TypeScript has LOCAL_PRICING_CACHE fallback
      RETURN;
    END;
  END;
END;
$$;

-- ============================================================================
-- STEP 8: Restore log_tracking_error
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_tracking_error(
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

-- ============================================================================
-- STEP 9: Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.log_ai_usage(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_ai_costs(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_ai_costs(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_month_cost(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_token_cost(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_model_pricing(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_tracking_error(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
