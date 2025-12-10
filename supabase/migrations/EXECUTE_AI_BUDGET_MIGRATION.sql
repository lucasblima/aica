-- =====================================================
-- EXECUTE ESTA MIGRATION NO SUPABASE SQL EDITOR
-- =====================================================
-- Migration: Add AI Budget Functions
-- Date: 2025-12-09
-- Description: Adds helper functions for AI budget management
-- =====================================================

-- INSTRUÇÕES:
-- 1. Abra Supabase Dashboard → SQL Editor
-- 2. Cole TODO este arquivo
-- 3. Clique em "Run" (ou Ctrl+Enter)
-- =====================================================

-- Function 1: Get user AI budget from metadata
CREATE OR REPLACE FUNCTION public.get_user_ai_budget(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget NUMERIC;
BEGIN
  -- Get budget from user metadata
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

COMMENT ON FUNCTION public.get_user_ai_budget IS 'Returns monthly AI budget in USD from user metadata';

-- Function 2: Calculate budget alert level
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
  -- No budget set = no alert
  IF p_budget <= 0 THEN
    RETURN 'none';
  END IF;

  -- Calculate percentage used
  v_percentage := (p_current_cost / p_budget) * 100;

  -- Return alert level based on thresholds
  IF v_percentage >= 100 THEN
    RETURN 'danger';    -- Over budget
  ELSIF v_percentage >= 90 THEN
    RETURN 'critical';  -- 90-99% used
  ELSIF v_percentage >= 80 THEN
    RETURN 'warning';   -- 80-89% used
  ELSE
    RETURN 'ok';        -- Under 80%
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_budget_alert_level IS 'Returns alert level (ok/warning/critical/danger) based on budget usage percentage';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_ai_budget(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_budget_alert_level(UUID, NUMERIC, NUMERIC) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these queries to verify the migration succeeded:

-- 1. Check if functions exist
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name IN ('get_user_ai_budget', 'get_budget_alert_level');

-- 2. Test get_user_ai_budget (should return 0 if no budget set)
-- SELECT public.get_user_ai_budget(auth.uid());

-- 3. Test get_budget_alert_level
-- SELECT public.get_budget_alert_level(auth.uid(), 45, 50); -- Should return 'critical'
-- SELECT public.get_budget_alert_level(auth.uid(), 25, 50); -- Should return 'ok'
-- SELECT public.get_budget_alert_level(auth.uid(), 51, 50); -- Should return 'danger'

-- =====================================================
-- ✅ MIGRATION CONCLUÍDA
-- =====================================================
-- Se não houve erros, as funções foram criadas com sucesso!
-- Você pode agora testar o AI Cost Dashboard.
