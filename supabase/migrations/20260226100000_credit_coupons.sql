-- ============================================================
-- Credit Coupons & Admin Top-Up
-- Tables: coupons, coupon_redemptions
-- RPCs: redeem_coupon, admin_top_up, admin_create_coupon, admin_list_coupons, admin_toggle_coupon
-- ============================================================

-- 1. TABLES

CREATE TABLE IF NOT EXISTS coupons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT NOT NULL UNIQUE,
  credits              INTEGER NOT NULL CHECK (credits > 0),
  max_redemptions      INTEGER,
  max_per_user         INTEGER DEFAULT 1,
  current_redemptions  INTEGER DEFAULT 0 CHECK (current_redemptions >= 0),
  allowed_plans        TEXT[],
  campaign             TEXT,
  starts_at            TIMESTAMPTZ DEFAULT NOW(),
  expires_at           TIMESTAMPTZ,
  is_active            BOOLEAN DEFAULT true,
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  credits     INTEGER NOT NULL CHECK (credits > 0),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

CREATE INDEX idx_coupons_code ON coupons (code);
CREATE INDEX idx_coupons_campaign ON coupons (campaign) WHERE campaign IS NOT NULL;
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions (user_id, redeemed_at DESC);

-- 2. RLS

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- coupons: any authenticated user can read active coupons (needed for validation)
CREATE POLICY "Users can read active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (is_active = true);

-- coupons: admin (service_role) full access for CRUD
CREATE POLICY "Service role full access to coupons"
  ON coupons FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- coupon_redemptions: users read own
CREATE POLICY "Users can read own redemptions"
  ON coupon_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- coupon_redemptions: users insert own (via RPC, but RLS backup)
CREATE POLICY "Users can insert own redemptions"
  ON coupon_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- coupon_redemptions: service_role full access
CREATE POLICY "Service role full access to redemptions"
  ON coupon_redemptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. RPCs

-- 3a. redeem_coupon — user-facing, atomic
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE(success BOOLEAN, credits_earned INTEGER, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_user_plan TEXT;
  v_redemption_count INTEGER;
  v_new_balance INTEGER;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := UPPER(TRIM(p_code));

  -- Lock the coupon row
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = v_normalized_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom nao encontrado'::TEXT;
    RETURN;
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom desativado'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.starts_at > NOW() THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom ainda nao esta ativo'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= NOW() THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom expirado'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.current_redemptions >= v_coupon.max_redemptions THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom esgotado'::TEXT;
    RETURN;
  END IF;

  -- Check plan restriction
  IF v_coupon.allowed_plans IS NOT NULL THEN
    SELECT COALESCE(us.plan_id, 'free') INTO v_user_plan
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id AND us.status = 'active'
    LIMIT 1;

    v_user_plan := COALESCE(v_user_plan, 'free');

    IF NOT (v_user_plan = ANY(v_coupon.allowed_plans)) THEN
      RETURN QUERY SELECT false, 0, 0, ('Cupom nao disponivel para o plano ' || v_user_plan)::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check per-user limit
  SELECT COUNT(*) INTO v_redemption_count
  FROM coupon_redemptions cr
  WHERE cr.coupon_id = v_coupon.id AND cr.user_id = p_user_id;

  IF v_redemption_count >= v_coupon.max_per_user THEN
    RETURN QUERY SELECT false, 0, 0, 'Voce ja resgatou este cupom'::TEXT;
    RETURN;
  END IF;

  -- All checks passed — redeem!

  -- 1. Insert redemption record
  INSERT INTO coupon_redemptions (coupon_id, user_id, credits)
  VALUES (v_coupon.id, p_user_id, v_coupon.credits);

  -- 2. Increment coupon usage counter
  UPDATE coupons
  SET current_redemptions = current_redemptions + 1,
      updated_at = NOW()
  WHERE id = v_coupon.id;

  -- 3. Add credits to user (upsert in case user_credits row missing)
  INSERT INTO user_credits (user_id, balance, lifetime_earned)
  VALUES (p_user_id, v_coupon.credits, v_coupon.credits)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + v_coupon.credits,
      lifetime_earned = user_credits.lifetime_earned + v_coupon.credits,
      updated_at = NOW();

  -- Get new balance
  SELECT uc.balance INTO v_new_balance
  FROM user_credits uc
  WHERE uc.user_id = p_user_id;

  -- 4. Log transaction
  INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description)
  VALUES (
    p_user_id,
    'admin_adjustment',
    v_coupon.credits,
    v_new_balance,
    'Cupom: ' || v_coupon.code
  );

  RETURN QUERY SELECT true, v_coupon.credits, v_new_balance, 'Cupom resgatado com sucesso!'::TEXT;
END;
$$;

-- 3b. admin_top_up — admin grants credits to any user
CREATE OR REPLACE FUNCTION admin_top_up(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'Admin top-up'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Admin check (hardcoded owner UID)
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN QUERY SELECT false, 0, 'Acesso negado'::TEXT;
    RETURN;
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, 'Valor deve ser positivo'::TEXT;
    RETURN;
  END IF;

  -- Upsert credits
  INSERT INTO user_credits (user_id, balance, lifetime_earned)
  VALUES (p_target_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + p_amount,
      lifetime_earned = user_credits.lifetime_earned + p_amount,
      updated_at = NOW();

  SELECT uc.balance INTO v_new_balance
  FROM user_credits uc
  WHERE uc.user_id = p_target_user_id;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, metadata)
  VALUES (
    p_target_user_id,
    'admin_adjustment',
    p_amount,
    v_new_balance,
    p_reason,
    jsonb_build_object('admin_id', p_admin_id, 'type', 'top_up')
  );

  RETURN QUERY SELECT true, v_new_balance, ('Adicionados ' || p_amount || ' creditos')::TEXT;
END;
$$;

-- 3c. admin_create_coupon
CREATE OR REPLACE FUNCTION admin_create_coupon(
  p_admin_id UUID,
  p_code TEXT,
  p_credits INTEGER,
  p_max_redemptions INTEGER DEFAULT NULL,
  p_max_per_user INTEGER DEFAULT 1,
  p_allowed_plans TEXT[] DEFAULT NULL,
  p_campaign TEXT DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NOW(),
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, coupon_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id UUID;
  v_normalized_code TEXT;
BEGIN
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Acesso negado'::TEXT;
    RETURN;
  END IF;

  IF p_credits <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Creditos devem ser positivos'::TEXT;
    RETURN;
  END IF;

  v_normalized_code := UPPER(TRIM(p_code));

  IF LENGTH(v_normalized_code) < 3 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Codigo deve ter pelo menos 3 caracteres'::TEXT;
    RETURN;
  END IF;

  INSERT INTO coupons (code, credits, max_redemptions, max_per_user, allowed_plans, campaign, starts_at, expires_at, created_by)
  VALUES (v_normalized_code, p_credits, p_max_redemptions, p_max_per_user, p_allowed_plans, p_campaign, p_starts_at, p_expires_at, p_admin_id)
  RETURNING id INTO v_coupon_id;

  RETURN QUERY SELECT true, v_coupon_id, ('Cupom ' || v_normalized_code || ' criado')::TEXT;

EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT false, NULL::UUID, 'Codigo ja existe'::TEXT;
END;
$$;

-- 3d. admin_list_coupons
CREATE OR REPLACE FUNCTION admin_list_coupons(p_admin_id UUID)
RETURNS TABLE(
  id UUID,
  code TEXT,
  credits INTEGER,
  max_redemptions INTEGER,
  max_per_user INTEGER,
  current_redemptions INTEGER,
  allowed_plans TEXT[],
  campaign TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.code, c.credits, c.max_redemptions, c.max_per_user,
         c.current_redemptions, c.allowed_plans, c.campaign,
         c.starts_at, c.expires_at, c.is_active, c.created_at
  FROM coupons c
  ORDER BY c.created_at DESC;
END;
$$;

-- 3e. admin_toggle_coupon
CREATE OR REPLACE FUNCTION admin_toggle_coupon(
  p_admin_id UUID,
  p_coupon_id UUID,
  p_active BOOLEAN
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN QUERY SELECT false, 'Acesso negado'::TEXT;
    RETURN;
  END IF;

  UPDATE coupons
  SET is_active = p_active, updated_at = NOW()
  WHERE id = p_coupon_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Cupom nao encontrado'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, CASE WHEN p_active THEN 'Cupom ativado' ELSE 'Cupom desativado' END::TEXT;
END;
$$;

-- 4. VERIFICATION
DO $$
BEGIN
  -- Verify tables exist
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'coupons')), 'coupons table missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'coupon_redemptions')), 'coupon_redemptions table missing';

  -- Verify RLS enabled
  ASSERT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'coupons'), 'coupons RLS not enabled';
  ASSERT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'coupon_redemptions'), 'coupon_redemptions RLS not enabled';

  -- Verify functions exist
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'redeem_coupon')), 'redeem_coupon function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_top_up')), 'admin_top_up function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_create_coupon')), 'admin_create_coupon function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_list_coupons')), 'admin_list_coupons function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_toggle_coupon')), 'admin_toggle_coupon function missing';

  RAISE NOTICE 'Credit coupons migration verified successfully';
END;
$$;
