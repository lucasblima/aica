-- ============================================
-- Coach Invite Links ("Link Coringa")
-- Reusable invite links for coaches to onboard multiple athletes
-- ============================================

-- Table
CREATE TABLE IF NOT EXISTS public.coach_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 10,
  current_uses INTEGER NOT NULL DEFAULT 0,
  health_config JSONB NOT NULL DEFAULT '{
    "requires_cardio_exam": false,
    "requires_clearance_cert": false,
    "allow_parq_onboarding": false
  }'::jsonb,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_invite_links_token ON public.coach_invite_links(token);
CREATE INDEX IF NOT EXISTS idx_coach_invite_links_user_active ON public.coach_invite_links(user_id, is_active);

-- RLS
ALTER TABLE public.coach_invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can read own links"
  ON public.coach_invite_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can insert own links"
  ON public.coach_invite_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can update own links"
  ON public.coach_invite_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can delete own links"
  ON public.coach_invite_links FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-set user_id on insert
CREATE OR REPLACE FUNCTION public.set_coach_invite_link_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_coach_invite_link_user_id
  BEFORE INSERT ON public.coach_invite_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_coach_invite_link_user_id();

-- ============================================
-- RPC: use_coach_invite_link
-- Atomically creates an athlete from a coach invite link
-- Returns the new athlete_id
-- ============================================
CREATE OR REPLACE FUNCTION public.use_coach_invite_link(
  p_token TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_athlete_id UUID;
BEGIN
  -- Lock the link row for atomic update
  SELECT * INTO v_link
  FROM coach_invite_links
  WHERE token = p_token
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link invalido ou desativado';
  END IF;

  IF v_link.current_uses >= v_link.max_uses THEN
    RAISE EXCEPTION 'Link atingiu o limite de usos';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Link expirado';
  END IF;

  -- Create the athlete record
  INSERT INTO athletes (
    user_id,
    name,
    email,
    phone,
    status,
    invitation_status,
    requires_cardio_exam,
    requires_clearance_cert,
    allow_parq_onboarding,
    invite_link_id
  ) VALUES (
    v_link.user_id,
    p_name,
    p_email,
    p_phone,
    'trial',
    'pending',
    COALESCE((v_link.health_config->>'requires_cardio_exam')::boolean, false),
    COALESCE((v_link.health_config->>'requires_clearance_cert')::boolean, false),
    COALESCE((v_link.health_config->>'allow_parq_onboarding')::boolean, false),
    v_link.id
  )
  RETURNING id INTO v_athlete_id;

  -- Increment usage counter
  UPDATE coach_invite_links
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = v_link.id;

  RETURN v_athlete_id;
END;
$$;

-- ============================================
-- RPC: get_coach_invite_link
-- Public info about a coach invite link (no auth required)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_coach_invite_link(p_token TEXT)
RETURNS TABLE (
  coach_name TEXT,
  health_config JSONB,
  max_uses INTEGER,
  current_uses INTEGER,
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(up.display_name, up.email, 'Treinador') AS coach_name,
    cil.health_config,
    cil.max_uses,
    cil.current_uses,
    cil.is_active,
    cil.expires_at
  FROM coach_invite_links cil
  LEFT JOIN user_profiles up ON up.id = cil.user_id
  WHERE cil.token = p_token;
END;
$$;

-- Grant execute to authenticated and anon (public pages need anon access)
GRANT EXECUTE ON FUNCTION public.use_coach_invite_link(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_invite_link(TEXT) TO anon, authenticated;

-- Add invite_link_id column to athletes if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'athletes'
      AND column_name = 'invite_link_id'
  ) THEN
    ALTER TABLE public.athletes ADD COLUMN invite_link_id UUID REFERENCES public.coach_invite_links(id);
  END IF;
END;
$$;
