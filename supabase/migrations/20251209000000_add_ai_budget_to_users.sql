-- =====================================================
-- MIGRATION: 20251209000000_add_ai_budget_to_users
-- Description: Add AI budget tracking to user metadata
-- Author: Aica Backend Architect
-- Date: 2025-12-09
-- =====================================================

-- =====================================================
-- USER AI BUDGET
-- =====================================================

-- Supabase's auth.users table uses raw_user_meta_data JSONB column
-- for custom user settings. We'll store budget there as:
-- {"monthly_ai_budget_usd": 50.00}

-- No schema changes needed - auth.users already has raw_user_meta_data

-- Add comment for documentation
COMMENT ON COLUMN auth.users.raw_user_meta_data IS
'User metadata including AI budget settings: {"monthly_ai_budget_usd": 50.00, ...}';

-- =====================================================
-- HELPER FUNCTION: Get User AI Budget
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_ai_budget(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget NUMERIC;
BEGIN
  -- Extract budget from user metadata
  SELECT COALESCE(
    (raw_user_meta_data->>'monthly_ai_budget_usd')::NUMERIC,
    0
  )
  INTO v_budget
  FROM auth.users
  WHERE id = p_user_id;

  RETURN COALESCE(v_budget, 0);
END;
$$;

COMMENT ON FUNCTION public.get_user_ai_budget IS
'Get monthly AI budget for user from auth.users.raw_user_meta_data';

-- =====================================================
-- HELPER FUNCTION: Check Budget Alert Level
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_budget_alert_level(
  p_user_id UUID,
  p_current_cost NUMERIC,
  p_budget NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percentage NUMERIC;
BEGIN
  -- Handle zero budget
  IF p_budget <= 0 THEN
    RETURN 'none';
  END IF;

  -- Calculate percentage
  v_percentage := (p_current_cost / p_budget) * 100;

  -- Determine alert level
  IF v_percentage >= 100 THEN
    RETURN 'danger';
  ELSIF v_percentage >= 90 THEN
    RETURN 'critical';
  ELSIF v_percentage >= 80 THEN
    RETURN 'warning';
  ELSE
    RETURN 'ok';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_budget_alert_level IS
'Determine alert level based on percentage of budget used (ok, warning, critical, danger, none)';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test functions
DO $$
BEGIN
  -- Verify functions were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_user_ai_budget'
  ) THEN
    RAISE EXCEPTION 'Function get_user_ai_budget was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_budget_alert_level'
  ) THEN
    RAISE EXCEPTION 'Function get_budget_alert_level was not created';
  END IF;

  RAISE NOTICE 'Migration completed successfully';
END $$;
