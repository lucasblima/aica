-- ============================================================================
-- Flux Viral Loop — Batch Adherence RPC + Invite Tracking
--
-- 1. Batch RPC: get_athletes_with_adherence(p_user_id UUID)
--    Returns all athletes for a coach with adherence calculated in a single query.
--    Replaces N+1 calls to calculate_athlete_adherence() on the dashboard.
--
-- 2. Invite tracking columns on athletes:
--    invitation_sent_at — when invite email was sent
--    invitation_email_status — none | sent | delivered | bounced | failed
-- ============================================================================

-- =====================
-- 1. INVITE TRACKING COLUMNS
-- =====================

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_email_status TEXT NOT NULL DEFAULT 'none'
    CHECK (invitation_email_status IN ('none', 'sent', 'delivered', 'bounced', 'failed'));

COMMENT ON COLUMN public.athletes.invitation_sent_at IS
  'Timestamp when the invite email was sent to the athlete via Resend';

COMMENT ON COLUMN public.athletes.invitation_email_status IS
  'Email delivery status: none (not sent), sent, delivered, bounced, failed';

-- Index for filtering athletes with pending/failed invites
CREATE INDEX IF NOT EXISTS idx_athletes_invitation_email_status
  ON public.athletes(invitation_email_status)
  WHERE invitation_email_status NOT IN ('none', 'delivered');

-- =====================
-- 2. BATCH ADHERENCE RPC
-- =====================

CREATE OR REPLACE FUNCTION public.get_athletes_with_adherence(p_user_id UUID)
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_athletes_with_adherence(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_athletes_with_adherence(UUID) IS
  'Returns all athletes for a coach with their adherence rate calculated from workout_slots in active microcycles. Efficient batch query replacing N+1 calls to calculate_athlete_adherence.';
