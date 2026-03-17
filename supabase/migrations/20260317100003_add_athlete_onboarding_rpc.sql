-- Public RPC for athlete onboarding: returns limited athlete data by ID
-- No auth required (anon can call) — only exposes fields needed for onboarding
-- Does NOT expose coach user_id or sensitive data
CREATE OR REPLACE FUNCTION public.get_athlete_onboarding(p_athlete_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  modality TEXT,
  level TEXT,
  status TEXT,
  invitation_status TEXT,
  requires_cardio_exam BOOLEAN,
  requires_clearance_cert BOOLEAN,
  allow_parq_onboarding BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.email,
    a.phone,
    a.modality::TEXT,
    a.level::TEXT,
    a.status::TEXT,
    a.invitation_status::TEXT,
    a.requires_cardio_exam,
    a.requires_clearance_cert,
    a.allow_parq_onboarding
  FROM public.athletes a
  WHERE a.id = p_athlete_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_athlete_onboarding(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_athlete_onboarding(UUID) TO authenticated;

-- Public RPC for athlete to update their own onboarding info
-- Validates the athlete exists
CREATE OR REPLACE FUNCTION public.complete_athlete_onboarding(
  p_athlete_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_auth_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT invitation_status INTO v_current_status
  FROM public.athletes
  WHERE id = p_athlete_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Athlete not found';
  END IF;

  UPDATE public.athletes
  SET
    name = p_name,
    email = p_email,
    phone = p_phone,
    auth_user_id = COALESCE(p_auth_user_id, auth_user_id),
    invitation_status = CASE
      WHEN p_auth_user_id IS NOT NULL THEN 'connected'
      ELSE invitation_status
    END,
    linked_at = CASE
      WHEN p_auth_user_id IS NOT NULL THEN now()
      ELSE linked_at
    END,
    status = CASE
      WHEN p_auth_user_id IS NOT NULL THEN 'active'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_athlete_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_athlete_onboarding(UUID, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_athlete_onboarding(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
