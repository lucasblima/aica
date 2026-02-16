-- Fix: gen_random_bytes() not found because search_path excludes 'extensions'
-- Both generate_readable_code() and generate_invite_token() had SET search_path = public
-- but pgcrypto (gen_random_bytes) lives in the 'extensions' schema on Supabase.

-- Also redeploy process-interview-response Edge Function (separate step).

-- ============================================================================
-- 1. FIX generate_readable_code() — add extensions to search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_readable_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
-- 2. FIX generate_invite_token() — add extensions to search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_invite_token(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- Grants (re-apply)
GRANT EXECUTE ON FUNCTION public.generate_readable_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_token(UUID) TO authenticated;
