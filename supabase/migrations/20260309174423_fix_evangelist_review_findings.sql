-- Fix evangelist schema: review findings
-- 1. generate_referral_code: add retry loop so fallback random codes also check uniqueness
-- 2. Admin RLS policies: add WITH CHECK clause to allow INSERT/UPDATE operations

-- =============================================================================
-- Issue 1: generate_referral_code — loop for uniqueness
-- The previous version tried one fallback random code but didn't loop,
-- so the fallback could also collide. This version loops until unique.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  SELECT UPPER(SPLIT_PART(COALESCE(full_name, 'AICA'), ' ', 1))
  INTO v_name
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_name IS NULL OR v_name = '' THEN
    v_name := 'AICA';
  END IF;

  -- First attempt: name + current year
  v_code := v_name || EXTRACT(YEAR FROM NOW())::INTEGER::TEXT;

  LOOP
    SELECT EXISTS(SELECT 1 FROM public.evangelists WHERE referral_code = v_code)
    INTO v_exists;

    EXIT WHEN NOT v_exists;

    -- Generate random suffix and retry
    v_attempts := v_attempts + 1;
    v_code := v_name || FLOOR(RANDOM() * 9000 + 1000)::INTEGER::TEXT;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique referral code after 10 attempts';
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.generate_referral_code IS 'Generates a unique referral code for an evangelist based on their first name + year, with retry loop for uniqueness';

-- =============================================================================
-- Issue 2: Admin RLS policies — add WITH CHECK
-- FOR ALL policies without WITH CHECK silently block INSERT/UPDATE.
-- Drop and recreate with explicit WITH CHECK clause.
-- =============================================================================

-- evangelists
DROP POLICY IF EXISTS "evangelists_admin_all" ON public.evangelists;
CREATE POLICY "evangelists_admin_all" ON public.evangelists
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- referral_conversions
DROP POLICY IF EXISTS "conversions_admin_all" ON public.referral_conversions;
CREATE POLICY "conversions_admin_all" ON public.referral_conversions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- commission_ledger
DROP POLICY IF EXISTS "ledger_admin_all" ON public.commission_ledger;
CREATE POLICY "ledger_admin_all" ON public.commission_ledger
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- tier_history
DROP POLICY IF EXISTS "tier_history_admin_all" ON public.tier_history;
CREATE POLICY "tier_history_admin_all" ON public.tier_history
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
