-- Flux Coach Experience Upgrade Migration
-- Features: group-linked invite links + feedback read/unread tracking

-- ============================================================================
-- Feature 2: Add group_id to coach_invite_links
-- ============================================================================

ALTER TABLE coach_invite_links
  ADD COLUMN group_id UUID REFERENCES athlete_groups(id) ON DELETE SET NULL;

-- Index for looking up links by group
CREATE INDEX idx_coach_invite_links_group
  ON coach_invite_links (group_id)
  WHERE group_id IS NOT NULL;

-- Update the use_coach_invite_link RPC to auto-assign athlete to group
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
  -- Lock the link row to prevent race conditions
  SELECT * INTO v_link
  FROM coach_invite_links
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link de convite não encontrado';
  END IF;

  IF NOT v_link.is_active THEN
    RAISE EXCEPTION 'Link de convite desativado';
  END IF;

  IF v_link.current_uses >= v_link.max_uses THEN
    RAISE EXCEPTION 'Limite de usos atingido';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
    RAISE EXCEPTION 'Link expirado';
  END IF;

  -- Create athlete
  INSERT INTO athletes (
    user_id,
    name,
    email,
    phone,
    status,
    invitation_status,
    invite_link_id,
    requires_cardio_exam,
    requires_clearance_cert,
    allow_parq_onboarding
  ) VALUES (
    v_link.user_id,
    p_name,
    NULLIF(TRIM(p_email), ''),
    p_phone,
    'trial',
    'pending',
    v_link.id,
    COALESCE((v_link.health_config->>'requires_cardio_exam')::boolean, false),
    COALESCE((v_link.health_config->>'requires_clearance_cert')::boolean, false),
    COALESCE((v_link.health_config->>'allow_parq_onboarding')::boolean, false)
  )
  RETURNING id INTO v_athlete_id;

  -- Auto-assign to group if link has group_id
  IF v_link.group_id IS NOT NULL THEN
    INSERT INTO athlete_group_members (group_id, athlete_id)
    VALUES (v_link.group_id, v_athlete_id)
    ON CONFLICT (group_id, athlete_id) DO NOTHING;
  END IF;

  -- Increment usage counter
  UPDATE coach_invite_links
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = v_link.id;

  RETURN v_athlete_id;
END;
$$;

-- Grant access (same as original)
GRANT EXECUTE ON FUNCTION public.use_coach_invite_link(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.use_coach_invite_link(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Feature 4: Add read_at to athlete_feedback_entries
-- ============================================================================

ALTER TABLE athlete_feedback_entries
  ADD COLUMN read_at TIMESTAMPTZ;

-- Index for querying unread feedback efficiently
CREATE INDEX idx_afe_unread
  ON athlete_feedback_entries (user_id, read_at)
  WHERE read_at IS NULL;

-- RPC to get unread feedback count per athlete (for badge on AthleteCard)
CREATE OR REPLACE FUNCTION public.get_unread_feedback_counts(p_coach_user_id UUID)
RETURNS TABLE (athlete_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT afe.athlete_id, COUNT(*)::BIGINT AS unread_count
  FROM athlete_feedback_entries afe
  JOIN microcycles mc ON mc.id = afe.microcycle_id
  WHERE mc.user_id = p_coach_user_id
    AND afe.read_at IS NULL
  GROUP BY afe.athlete_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_feedback_counts(UUID) TO authenticated;

-- RPC to mark feedback as read
CREATE OR REPLACE FUNCTION public.mark_feedback_read(p_coach_user_id UUID, p_athlete_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE athlete_feedback_entries afe
  SET read_at = NOW()
  FROM microcycles mc
  WHERE afe.microcycle_id = mc.id
    AND mc.user_id = p_coach_user_id
    AND afe.athlete_id = p_athlete_id
    AND afe.read_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_feedback_read(UUID, UUID) TO authenticated;
