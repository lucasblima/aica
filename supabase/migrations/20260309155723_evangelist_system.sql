-- =============================================================================
-- Evangelist System — Phase 1: Tracking + Commission Calculation
-- Epic: Sistema de Evangelistas AICA
-- Issues: #811 (Sprint 1 — Database)
-- =============================================================================
-- 4 new tables: evangelists, referral_conversions, commission_ledger, tier_history
-- 2 RPCs: generate_referral_code, recalculate_evangelist_tier
-- Alter profiles: add referred_by_code, is_evangelist
-- Admin RLS uses existing is_admin() function
-- =============================================================================

-- =============================================================================
-- PART 1: ALTER PROFILES
-- =============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
ADD COLUMN IF NOT EXISTS is_evangelist BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- PART 2: EVANGELISTS TABLE
-- =============================================================================

CREATE TABLE public.evangelists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  invited_by UUID REFERENCES public.evangelists(id),
  pro_granted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_evangelists_user_id ON public.evangelists(user_id);
CREATE INDEX idx_evangelists_referral_code ON public.evangelists(referral_code);
CREATE INDEX idx_evangelists_status ON public.evangelists(status);

ALTER TABLE public.evangelists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evangelists_select_own" ON public.evangelists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "evangelists_admin_all" ON public.evangelists
  FOR ALL USING (is_admin());

-- =============================================================================
-- PART 3: REFERRAL CONVERSIONS TABLE
-- =============================================================================

CREATE TABLE public.referral_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evangelist_id UUID NOT NULL REFERENCES public.evangelists(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'teams')),
  plan_value NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'churned')),
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  churned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_user_id)
);

CREATE INDEX idx_referral_conversions_evangelist ON public.referral_conversions(evangelist_id);
CREATE INDEX idx_referral_conversions_status ON public.referral_conversions(status);

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversions_select_own" ON public.referral_conversions
  FOR SELECT USING (
    evangelist_id IN (
      SELECT id FROM public.evangelists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "conversions_admin_all" ON public.referral_conversions
  FOR ALL USING (is_admin());

-- =============================================================================
-- PART 4: COMMISSION LEDGER TABLE
-- =============================================================================

CREATE TABLE public.commission_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evangelist_id UUID NOT NULL REFERENCES public.evangelists(id) ON DELETE CASCADE,
  referral_conversion_id UUID REFERENCES public.referral_conversions(id),
  period_month DATE NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(4,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'calculated'
    CHECK (status IN ('calculated', 'pending_payment', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  asaas_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commission_ledger_evangelist ON public.commission_ledger(evangelist_id);
CREATE INDEX idx_commission_ledger_period ON public.commission_ledger(period_month);
CREATE INDEX idx_commission_ledger_status ON public.commission_ledger(status);

ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_select_own" ON public.commission_ledger
  FOR SELECT USING (
    evangelist_id IN (
      SELECT id FROM public.evangelists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ledger_admin_all" ON public.commission_ledger
  FOR ALL USING (is_admin());

-- =============================================================================
-- PART 5: TIER HISTORY TABLE
-- =============================================================================

CREATE TABLE public.tier_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evangelist_id UUID NOT NULL REFERENCES public.evangelists(id) ON DELETE CASCADE,
  from_tier INTEGER,
  to_tier INTEGER NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tier_history_evangelist ON public.tier_history(evangelist_id);

ALTER TABLE public.tier_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tier_history_select_own" ON public.tier_history
  FOR SELECT USING (
    evangelist_id IN (
      SELECT id FROM public.evangelists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tier_history_admin_all" ON public.tier_history
  FOR ALL USING (is_admin());

-- =============================================================================
-- PART 6: RPC — GENERATE REFERRAL CODE
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
BEGIN
  SELECT UPPER(SPLIT_PART(COALESCE(full_name, 'AICA'), ' ', 1))
  INTO v_name
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_name IS NULL OR v_name = '' THEN
    v_name := 'AICA';
  END IF;

  v_code := v_name || EXTRACT(YEAR FROM NOW())::INTEGER::TEXT;

  SELECT EXISTS(SELECT 1 FROM public.evangelists WHERE referral_code = v_code)
  INTO v_exists;

  IF v_exists THEN
    v_code := v_name || FLOOR(RANDOM() * 9000 + 1000)::INTEGER::TEXT;
  END IF;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.generate_referral_code IS 'Generates a unique referral code for an evangelist based on their first name + year';

-- =============================================================================
-- PART 7: RPC — RECALCULATE EVANGELIST TIER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_evangelist_tier(p_evangelist_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_confirmed_count INTEGER;
  v_new_tier INTEGER;
  v_current_tier INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_confirmed_count
  FROM public.referral_conversions
  WHERE evangelist_id = p_evangelist_id AND status = 'confirmed';

  SELECT tier INTO v_current_tier
  FROM public.evangelists WHERE id = p_evangelist_id;

  IF v_current_tier IS NULL THEN
    RAISE EXCEPTION 'Evangelist not found: %', p_evangelist_id;
  END IF;

  v_new_tier := CASE
    WHEN v_confirmed_count >= 25 THEN 4
    WHEN v_confirmed_count >= 10 THEN 3
    WHEN v_confirmed_count >= 3  THEN 2
    ELSE 1
  END;

  IF v_new_tier <> v_current_tier THEN
    UPDATE public.evangelists
    SET tier = v_new_tier, updated_at = NOW()
    WHERE id = p_evangelist_id;

    INSERT INTO public.tier_history (evangelist_id, from_tier, to_tier, reason)
    VALUES (
      p_evangelist_id, v_current_tier, v_new_tier,
      'Recalculo automatico: ' || v_confirmed_count || ' indicados confirmados'
    );
  END IF;

  RETURN v_new_tier;
END;
$$;

COMMENT ON FUNCTION public.recalculate_evangelist_tier IS 'Recalculates evangelist tier based on confirmed referral count and logs tier changes';

-- =============================================================================
-- PART 8: GRANTS
-- =============================================================================

GRANT SELECT ON public.evangelists TO authenticated;
GRANT SELECT ON public.referral_conversions TO authenticated;
GRANT SELECT ON public.commission_ledger TO authenticated;
GRANT SELECT ON public.tier_history TO authenticated;

GRANT ALL ON public.evangelists TO service_role;
GRANT ALL ON public.referral_conversions TO service_role;
GRANT ALL ON public.commission_ledger TO service_role;
GRANT ALL ON public.tier_history TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_evangelist_tier(UUID) TO authenticated;
