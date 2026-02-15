-- Fix: get_athletes_with_adherence — return 'id' (not 'athlete_id')
-- Must DROP first because return type changed (Postgres restriction)

DROP FUNCTION IF EXISTS public.get_athletes_with_adherence(UUID);

CREATE FUNCTION public.get_athletes_with_adherence(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  modality TEXT,
  level TEXT,
  status TEXT,
  invitation_status TEXT,
  invitation_sent_at TIMESTAMPTZ,
  invitation_email_status TEXT,
  auth_user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  adherence_rate INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.email,
    a.phone,
    a.modality,
    a.level,
    a.status,
    a.invitation_status,
    a.invitation_sent_at,
    a.invitation_email_status,
    a.auth_user_id,
    a.created_at,
    a.updated_at,
    COALESCE(
      CASE
        WHEN slot_counts.total_slots = 0 THEN 0
        ELSE ROUND((slot_counts.completed_slots::NUMERIC / slot_counts.total_slots::NUMERIC) * 100)::INTEGER
      END,
      0
    ) AS adherence_rate
  FROM public.athletes a
  LEFT JOIN LATERAL (
    SELECT
      COUNT(ws.id) AS total_slots,
      COUNT(ws.id) FILTER (WHERE ws.is_completed = true) AS completed_slots
    FROM public.workout_slots ws
    INNER JOIN public.microcycles m ON m.id = ws.microcycle_id
    WHERE m.athlete_id = a.id
      AND m.status = 'active'
  ) slot_counts ON true
  WHERE a.user_id = p_user_id
  ORDER BY a.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_athletes_with_adherence(UUID) TO authenticated;
