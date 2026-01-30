-- Migration: Invite System (Gmail-style viral invites)
-- Date: 2026-01-29
-- Description: Creates tables and functions for viral invite system

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  available_invites INTEGER NOT NULL DEFAULT 3,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_accepted INTEGER NOT NULL DEFAULT 0,
  lifetime_invites INTEGER NOT NULL DEFAULT 3,
  last_bonus_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_invites_user_id ON public.user_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_inviter_id ON public.user_referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_invitee_id ON public.user_referrals(invitee_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_token ON public.user_referrals(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_referrals_status ON public.user_referrals(status);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON public.user_invites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referrals" ON public.user_referrals
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get or create user invites record
CREATE OR REPLACE FUNCTION public.get_or_create_user_invites(p_user_id UUID)
RETURNS public.user_invites
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result public.user_invites;
BEGIN
  INSERT INTO public.user_invites (user_id, available_invites, lifetime_invites)
  VALUES (p_user_id, 3, 3)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_result FROM public.user_invites WHERE user_id = p_user_id;
  RETURN v_result;
END;
$$;

-- Generate invite token
CREATE OR REPLACE FUNCTION public.generate_invite_token(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_available INTEGER;
  v_token TEXT;
  v_referral_id UUID;
BEGIN
  SELECT available_invites INTO v_available FROM public.user_invites WHERE user_id = p_user_id;

  IF v_available IS NULL THEN
    PERFORM get_or_create_user_invites(p_user_id);
    SELECT available_invites INTO v_available FROM public.user_invites WHERE user_id = p_user_id;
  END IF;

  IF v_available <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Você não tem convites disponíveis');
  END IF;

  v_token := encode(gen_random_bytes(12), 'hex');

  INSERT INTO public.user_referrals (inviter_id, invite_token, status)
  VALUES (p_user_id, v_token, 'pending')
  RETURNING id INTO v_referral_id;

  UPDATE public.user_invites
  SET available_invites = available_invites - 1,
      total_sent = total_sent + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN json_build_object('success', true, 'token', v_token, 'referral_id', v_referral_id);
END;
$$;

-- Accept invite
CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT, p_invitee_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  SELECT COALESCE(name, 'Usuário Aica') INTO v_inviter_name
  FROM public.users WHERE id = v_referral.inviter_id;

  RETURN json_build_object('success', true, 'inviter_name', v_inviter_name, 'xp_awarded', v_xp_bonus);
END;
$$;

-- Get invite stats
CREATE OR REPLACE FUNCTION public.get_invite_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invites public.user_invites;
  v_pending_count INTEGER;
  v_accepted_count INTEGER;
BEGIN
  SELECT * INTO v_invites FROM public.user_invites WHERE user_id = p_user_id;

  IF v_invites IS NULL THEN
    PERFORM get_or_create_user_invites(p_user_id);
    SELECT * INTO v_invites FROM public.user_invites WHERE user_id = p_user_id;
  END IF;

  SELECT COUNT(*) INTO v_pending_count
  FROM public.user_referrals WHERE inviter_id = p_user_id AND status = 'pending';

  SELECT COUNT(*) INTO v_accepted_count
  FROM public.user_referrals WHERE inviter_id = p_user_id AND status = 'accepted';

  RETURN json_build_object(
    'available', v_invites.available_invites,
    'total_sent', v_invites.total_sent,
    'total_accepted', v_invites.total_accepted,
    'pending', v_pending_count,
    'lifetime', v_invites.lifetime_invites
  );
END;
$$;

-- Validate invite token (public - for invite page)
CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referral public.user_referrals;
  v_inviter_name TEXT;
  v_inviter_avatar TEXT;
BEGIN
  SELECT * INTO v_referral FROM public.user_referrals WHERE invite_token = p_token;

  IF v_referral IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Convite não encontrado');
  END IF;

  IF v_referral.status = 'accepted' THEN
    RETURN json_build_object('valid', false, 'error', 'Este convite já foi utilizado');
  END IF;

  IF v_referral.status = 'expired' OR v_referral.expires_at < NOW() THEN
    RETURN json_build_object('valid', false, 'error', 'Este convite expirou');
  END IF;

  SELECT COALESCE(name, 'Usuário Aica'), avatar_url INTO v_inviter_name, v_inviter_avatar
  FROM public.users WHERE id = v_referral.inviter_id;

  RETURN json_build_object(
    'valid', true,
    'inviter_name', v_inviter_name,
    'inviter_avatar', v_inviter_avatar,
    'created_at', v_referral.created_at,
    'expires_at', v_referral.expires_at
  );
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_or_create_user_invites(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_token(TEXT) TO authenticated;
