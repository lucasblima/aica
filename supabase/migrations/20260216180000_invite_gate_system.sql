-- Migration: Invite Gate System
-- Date: 2026-02-16
-- Description: Adds activation gate to user flow. New users must enter an
--   invite code to activate their account. Existing users are grandfathered.
--   Introduces human-readable invite codes (XXXX-XXXX format) alongside
--   the existing hex tokens.

-- ============================================================================
-- 1. ADD ACTIVATION COLUMNS TO user_profiles
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'is_activated'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_activated BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN activated_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'activated_by_referral'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN activated_by_referral UUID REFERENCES public.user_referrals(id);
  END IF;
END $$;

-- ============================================================================
-- 2. GRANDFATHER EXISTING USERS
-- ============================================================================

UPDATE public.user_profiles
SET is_activated = true, activated_at = NOW()
WHERE is_activated = false OR is_activated IS NULL;

-- ============================================================================
-- 3. ADD invite_code COLUMN TO user_referrals
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_referrals' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE public.user_referrals ADD COLUMN invite_code TEXT UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_referrals_invite_code ON public.user_referrals(invite_code);

-- ============================================================================
-- 4. UPDATE DEFAULT INVITES FROM 3 TO 5
-- ============================================================================

ALTER TABLE public.user_invites ALTER COLUMN available_invites SET DEFAULT 5;
ALTER TABLE public.user_invites ALTER COLUMN lifetime_invites SET DEFAULT 5;

-- Give existing users with the original 3 invites an extra 2
UPDATE public.user_invites
SET available_invites = available_invites + 2,
    lifetime_invites = lifetime_invites + 2
WHERE lifetime_invites = 3;

-- ============================================================================
-- 5. HELPER: generate_readable_code()
-- ============================================================================
-- Produces XXXX-XXXX using safe alphabet (no 0/O/1/I/L confusion)

CREATE OR REPLACE FUNCTION public.generate_readable_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code TEXT := '';
  v_i INTEGER;
  v_rand_bytes BYTEA;
BEGIN
  v_rand_bytes := gen_random_bytes(8);
  FOR v_i IN 1..8 LOOP
    v_code := v_code || SUBSTRING(v_alphabet FROM (get_byte(v_rand_bytes, v_i - 1) % LENGTH(v_alphabet)) + 1 FOR 1);
    IF v_i = 4 THEN
      v_code := v_code || '-';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- ============================================================================
-- 6. UPDATE generate_invite_token() — now also produces invite_code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_invite_token(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available INTEGER;
  v_token TEXT;
  v_invite_code TEXT;
  v_referral_id UUID;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 5;
  v_code_ok BOOLEAN := false;
BEGIN
  SELECT available_invites INTO v_available
  FROM public.user_invites WHERE user_id = p_user_id;

  IF v_available IS NULL THEN
    PERFORM get_or_create_user_invites(p_user_id);
    SELECT available_invites INTO v_available
    FROM public.user_invites WHERE user_id = p_user_id;
  END IF;

  IF v_available <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Você não tem convites disponíveis');
  END IF;

  v_token := encode(gen_random_bytes(12), 'hex');

  -- Generate unique invite code with retry
  WHILE v_attempt < v_max_attempts AND NOT v_code_ok LOOP
    v_attempt := v_attempt + 1;
    v_invite_code := generate_readable_code();

    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.user_referrals WHERE invite_code = v_invite_code) THEN
      v_code_ok := true;
    END IF;
  END LOOP;

  IF NOT v_code_ok THEN
    RETURN json_build_object('success', false, 'error', 'Falha ao gerar código de convite. Tente novamente.');
  END IF;

  INSERT INTO public.user_referrals (inviter_id, invite_token, invite_code, status)
  VALUES (p_user_id, v_token, v_invite_code, 'pending')
  RETURNING id INTO v_referral_id;

  UPDATE public.user_invites
  SET available_invites = available_invites - 1,
      total_sent = total_sent + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'invite_code', v_invite_code,
    'referral_id', v_referral_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 7. NEW RPC: validate_invite_code(p_code TEXT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.user_referrals;
  v_inviter_name TEXT;
  v_inviter_avatar TEXT;
BEGIN
  SELECT * INTO v_referral
  FROM public.user_referrals
  WHERE invite_code = UPPER(TRIM(p_code));

  IF v_referral IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Código de convite não encontrado');
  END IF;

  IF v_referral.status = 'accepted' THEN
    RETURN json_build_object('valid', false, 'error', 'Este convite já foi utilizado');
  END IF;

  IF v_referral.status = 'expired' OR v_referral.expires_at < NOW() THEN
    RETURN json_build_object('valid', false, 'error', 'Este convite expirou');
  END IF;

  SELECT COALESCE(name, 'Usuário Aica'), avatar_url
  INTO v_inviter_name, v_inviter_avatar
  FROM public.users WHERE id = v_referral.inviter_id;

  RETURN json_build_object(
    'valid', true,
    'inviter_name', v_inviter_name,
    'inviter_avatar', v_inviter_avatar,
    'created_at', v_referral.created_at,
    'expires_at', v_referral.expires_at
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('valid', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 8. NEW RPC: activate_with_code(p_user_id UUID, p_code TEXT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.activate_with_code(p_user_id UUID, p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.user_referrals;
  v_inviter_name TEXT;
  v_xp_bonus INTEGER := 50;
BEGIN
  -- Validate code
  SELECT * INTO v_referral
  FROM public.user_referrals
  WHERE invite_code = UPPER(TRIM(p_code))
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_referral IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código de convite inválido ou expirado');
  END IF;

  IF v_referral.inviter_id = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Você não pode usar seu próprio convite');
  END IF;

  -- Check if user is already activated
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = p_user_id AND is_activated = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Sua conta já está ativada');
  END IF;

  -- Accept the referral
  UPDATE public.user_referrals
  SET invitee_id = p_user_id,
      status = 'accepted',
      accepted_at = NOW(),
      xp_awarded = v_xp_bonus
  WHERE id = v_referral.id;

  -- Award inviter +2 bonus invites
  UPDATE public.user_invites
  SET total_accepted = total_accepted + 1,
      available_invites = available_invites + 2,
      updated_at = NOW()
  WHERE user_id = v_referral.inviter_id;

  -- Award inviter XP
  PERFORM award_user_xp(v_referral.inviter_id, v_xp_bonus, 'invite_accepted', 'Convite aceito por novo usuário');

  -- Activate the user
  UPDATE public.user_profiles
  SET is_activated = true,
      activated_at = NOW(),
      activated_by_referral = v_referral.id
  WHERE user_id = p_user_id;

  -- Ensure user_profiles row exists (in case it wasn't created yet)
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (user_id, is_activated, activated_at, activated_by_referral)
    VALUES (p_user_id, true, NOW(), v_referral.id)
    ON CONFLICT (user_id) DO UPDATE
    SET is_activated = true,
        activated_at = NOW(),
        activated_by_referral = v_referral.id;
  END IF;

  -- Create invitee's user_invites with 5 invites
  INSERT INTO public.user_invites (user_id, available_invites, lifetime_invites)
  VALUES (p_user_id, 5, 5)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get inviter name for response
  SELECT COALESCE(name, 'Usuário Aica') INTO v_inviter_name
  FROM public.users WHERE id = v_referral.inviter_id;

  RETURN json_build_object(
    'success', true,
    'inviter_name', v_inviter_name,
    'xp_awarded', v_xp_bonus
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 9. UPDATE accept_invite() — also activate user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT, p_invitee_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.user_referrals;
  v_inviter_name TEXT;
  v_xp_bonus INTEGER := 50;
BEGIN
  SELECT * INTO v_referral
  FROM public.user_referrals
  WHERE invite_token = p_token AND status = 'pending' AND expires_at > NOW();

  IF v_referral IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  IF v_referral.inviter_id = p_invitee_id THEN
    RETURN json_build_object('success', false, 'error', 'Você não pode aceitar seu próprio convite');
  END IF;

  UPDATE public.user_referrals
  SET invitee_id = p_invitee_id,
      status = 'accepted',
      accepted_at = NOW(),
      xp_awarded = v_xp_bonus
  WHERE id = v_referral.id;

  -- Give inviter +2 bonus invites
  UPDATE public.user_invites
  SET total_accepted = total_accepted + 1,
      available_invites = available_invites + 2,
      updated_at = NOW()
  WHERE user_id = v_referral.inviter_id;

  -- Create invites for new user
  PERFORM get_or_create_user_invites(p_invitee_id);

  -- Activate the user
  UPDATE public.user_profiles
  SET is_activated = true,
      activated_at = NOW(),
      activated_by_referral = v_referral.id
  WHERE user_id = p_invitee_id;

  -- Ensure user_profiles row exists
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (user_id, is_activated, activated_at, activated_by_referral)
    VALUES (p_invitee_id, true, NOW(), v_referral.id)
    ON CONFLICT (user_id) DO UPDATE
    SET is_activated = true,
        activated_at = NOW(),
        activated_by_referral = v_referral.id;
  END IF;

  SELECT COALESCE(name, 'Usuário Aica') INTO v_inviter_name
  FROM public.users WHERE id = v_referral.inviter_id;

  RETURN json_build_object('success', true, 'inviter_name', v_inviter_name, 'xp_awarded', v_xp_bonus);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 10. NEW RPC: check_user_activated(p_user_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_activated(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_activated BOOLEAN;
  v_activated_at TIMESTAMPTZ;
BEGIN
  SELECT is_activated, activated_at
  INTO v_is_activated, v_activated_at
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- No profile yet means not activated
    RETURN json_build_object('is_activated', false, 'activated_at', NULL);
  END IF;

  RETURN json_build_object(
    'is_activated', COALESCE(v_is_activated, false),
    'activated_at', v_activated_at
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('is_activated', false, 'activated_at', NULL);
END;
$$;

-- ============================================================================
-- 11. UPDATE get_or_create_user_invites() — default 5 instead of 3
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_user_invites(p_user_id UUID)
RETURNS public.user_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.user_invites;
BEGIN
  INSERT INTO public.user_invites (user_id, available_invites, lifetime_invites)
  VALUES (p_user_id, 5, 5)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_result FROM public.user_invites WHERE user_id = p_user_id;
  RETURN v_result;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Anon access (pre-auth: validate code before signup, check activation)
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_activated(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_activated(UUID) TO authenticated;

-- Authenticated access
GRANT EXECUTE ON FUNCTION public.generate_invite_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_with_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_user_invites(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_readable_code() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.generate_readable_code IS 'Generates a human-readable XXXX-XXXX code using safe alphabet (no 0/O/1/I/L confusion)';
COMMENT ON FUNCTION public.validate_invite_code IS 'Validates an invite code for pre-signup display. Anon-accessible.';
COMMENT ON FUNCTION public.activate_with_code IS 'Activates a new user account using an invite code. Awards XP to inviter.';
COMMENT ON FUNCTION public.check_user_activated IS 'Checks whether a user account has been activated. Anon-accessible.';
