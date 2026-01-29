-- Migration: Model Router Service RPCs
-- Issue #177: Services Audit - modelRouterService.ts dependencies
-- Description: Creates RPC functions for AI model routing, billing tier checks, and token availability

-- ============================================================================
-- RPC 1: Get User Plan Details
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_plan_details(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if billing table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_subscriptions') THEN
    -- Return free tier default
    RETURN json_build_object(
      'planName', 'Free',
      'tier', 'lite',
      'tokenLimits', json_build_object(
        'premium', 50000,
        'standard', 200000,
        'lite', 1000000
      ),
      'remainingTokens', json_build_object(
        'premium', 50000,
        'standard', 200000,
        'lite', 1000000
      )
    );
  END IF;

  -- Query billing subscription
  SELECT json_build_object(
    'planName', COALESCE(bs.plan_name, 'Free'),
    'tier', COALESCE(bs.tier, 'lite'),
    'tokenLimits', COALESCE(bs.token_limits, json_build_object(
      'premium', 50000,
      'standard', 200000,
      'lite', 1000000
    )),
    'remainingTokens', (
      SELECT json_build_object(
        'premium', COALESCE(50000 - SUM(CASE WHEN model_tier = 'premium' THEN input_tokens + output_tokens ELSE 0 END), 50000),
        'standard', COALESCE(200000 - SUM(CASE WHEN model_tier = 'standard' THEN input_tokens + output_tokens ELSE 0 END), 200000),
        'lite', COALESCE(1000000 - SUM(CASE WHEN model_tier = 'lite' THEN input_tokens + output_tokens ELSE 0 END), 1000000)
      )
      FROM ai_usage_analytics
      WHERE user_id = p_user_id
        AND created_at >= date_trunc('month', NOW())
    )
  ) INTO v_result
  FROM billing_subscriptions bs
  WHERE bs.user_id = p_user_id
    AND bs.status = 'active'
  LIMIT 1;

  RETURN COALESCE(v_result, json_build_object(
    'planName', 'Free',
    'tier', 'lite',
    'tokenLimits', json_build_object('premium', 50000, 'standard', 200000, 'lite', 1000000),
    'remainingTokens', json_build_object('premium', 50000, 'standard', 200000, 'lite', 1000000)
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- RPC 2: Check Token Availability
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_token_availability(
  p_user_id UUID,
  p_model_tier TEXT,
  p_estimated_tokens INT
)
RETURNS JSON AS $$
DECLARE
  v_monthly_usage INT;
  v_tier_limit INT;
  v_remaining INT;
BEGIN
  -- Get tier limits (hardcoded for now, could be from billing table)
  v_tier_limit := CASE p_model_tier
    WHEN 'premium' THEN 50000
    WHEN 'standard' THEN 200000
    WHEN 'lite' THEN 1000000
    ELSE 1000000
  END;

  -- Calculate monthly usage for tier
  SELECT COALESCE(SUM(input_tokens + output_tokens), 0)
  INTO v_monthly_usage
  FROM ai_usage_analytics
  WHERE user_id = p_user_id
    AND model_tier = p_model_tier
    AND created_at >= date_trunc('month', NOW());

  -- Calculate remaining
  v_remaining := v_tier_limit - v_monthly_usage;

  -- Check availability
  RETURN json_build_object(
    'is_available', v_remaining >= p_estimated_tokens,
    'remaining_tokens', v_remaining,
    'tier_limit', v_tier_limit,
    'monthly_usage', v_monthly_usage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- Grants
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_user_plan_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_token_availability(UUID, TEXT, INT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.get_user_plan_details IS
  'Returns user billing plan details with token limits and remaining tokens per tier. Used by modelRouterService for AI model selection.';

COMMENT ON FUNCTION public.check_token_availability IS
  'Checks if user has enough tokens available for a request in a specific tier. Used by modelRouterService for rate limiting.';
