-- Athletes avatar_url — display Google profile pictures on athlete cards
-- Adds avatar_url column, backfills from auth.users metadata, and creates
-- a trigger to auto-populate when an athlete is linked via auth_user_id.

-- 1. Add column (idempotent)
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Backfill from auth.users metadata (try both 'avatar_url' and 'picture' keys)
UPDATE public.athletes a
SET avatar_url = (
  SELECT COALESCE(
    raw_user_meta_data->>'avatar_url',
    raw_user_meta_data->>'picture'
  )
  FROM auth.users u
  WHERE u.id = a.auth_user_id
)
WHERE a.auth_user_id IS NOT NULL
  AND a.avatar_url IS NULL;

-- 3. Trigger: auto-populate avatar_url when auth_user_id is set or changed
CREATE OR REPLACE FUNCTION public.sync_athlete_avatar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND (OLD.auth_user_id IS NULL OR OLD.auth_user_id != NEW.auth_user_id) THEN
    NEW.avatar_url := (
      SELECT COALESCE(
        raw_user_meta_data->>'avatar_url',
        raw_user_meta_data->>'picture'
      )
      FROM auth.users WHERE id = NEW.auth_user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_athlete_avatar
  BEFORE INSERT OR UPDATE OF auth_user_id ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_athlete_avatar();

-- 5. Update get_athletes_with_adherence RPC to include avatar_url
--    Must DROP first because RETURNS TABLE signature changed (added avatar_url)
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
  avatar_url TEXT,
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
    a.avatar_url,
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
      COUNT(*)::INTEGER AS total_slots,
      COUNT(*) FILTER (WHERE ws.completed = true)::INTEGER AS completed_slots
    FROM public.microcycles m
    JOIN public.workout_slots ws ON ws.microcycle_id = m.id
    WHERE m.athlete_id = a.id
      AND m.status = 'active'
  ) slot_counts ON true
  WHERE a.user_id = p_user_id
  ORDER BY a.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_athletes_with_adherence(UUID) TO authenticated;
