-- ============================================================================
-- Athlete ↔ User Linking
--
-- Allows athletes (end-users) to see their own training prescriptions.
-- The email is the link: coach enters email → athlete signs up → auto-linked.
--
-- New columns on athletes:
--   auth_user_id UUID   — FK to auth.users (NULL = not yet linked)
--   linked_at TIMESTAMPTZ
--   invitation_status TEXT — 'none' | 'pending' | 'connected'
--
-- Triggers:
--   1. link_athlete_on_signup — AFTER INSERT on auth.users
--   2. athlete_email_status_sync — BEFORE INSERT/UPDATE OF email on athletes
--
-- RLS: athlete can read own data across athletes, microcycles, workout_slots,
--       workout_templates, athlete_profiles. Can update workout_slots (mark done).
--
-- RPC: get_my_athlete_profile() — returns athlete's training overview
-- ============================================================================

-- =====================
-- 1. NEW COLUMNS
-- =====================

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_status TEXT NOT NULL DEFAULT 'none'
    CHECK (invitation_status IN ('none', 'pending', 'connected'));

CREATE INDEX IF NOT EXISTS idx_athletes_auth_user ON public.athletes(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_athletes_email_lower ON public.athletes(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_athletes_invitation_status ON public.athletes(invitation_status) WHERE invitation_status = 'pending';

-- =====================
-- 2. TRIGGER: athlete_email_status_sync
--    When coach adds/changes email, check if user already exists → link or set pending
-- =====================

CREATE OR REPLACE FUNCTION public.athlete_email_status_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- Email was removed
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    -- Only reset if not already connected (don't break existing link)
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'none';
    END IF;
    RETURN NEW;
  END IF;

  -- Check if a user with this email already exists
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(NEW.email))
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    -- User exists → link immediately
    NEW.auth_user_id := v_auth_user_id;
    NEW.linked_at := NOW();
    NEW.invitation_status := 'connected';
  ELSE
    -- User doesn't exist yet → pending
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block athlete creation/update
    RAISE WARNING 'athlete_email_status_sync failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_athlete_email_status_sync ON public.athletes;
CREATE TRIGGER trg_athlete_email_status_sync
  BEFORE INSERT OR UPDATE OF email ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.athlete_email_status_sync();

-- =====================
-- 3. TRIGGER: link_athlete_on_signup
--    When new user signs up, check if their email matches a pending athlete
-- =====================

CREATE OR REPLACE FUNCTION public.link_athlete_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to link any pending athletes that match this new user's email
  UPDATE public.athletes
  SET
    auth_user_id = NEW.id,
    linked_at = NOW(),
    invitation_status = 'connected'
  WHERE
    LOWER(email) = LOWER(NEW.email)
    AND invitation_status = 'pending'
    AND auth_user_id IS NULL;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- CRITICAL: Never block user signup
    RAISE WARNING 'link_athlete_on_signup failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_link_athlete ON auth.users;
CREATE TRIGGER on_auth_user_created_link_athlete
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_athlete_on_signup();

-- =====================
-- 4. RLS POLICIES — athlete can view their own data
-- =====================

-- athletes: athlete can see their own record
CREATE POLICY "athlete_select_self" ON public.athletes
  FOR SELECT USING (auth.uid() = auth_user_id);

-- microcycles: athlete can see microcycles assigned to them
CREATE POLICY "athlete_select_own_microcycles" ON public.microcycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = microcycles.athlete_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- workout_slots: athlete can see their workout slots
CREATE POLICY "athlete_select_own_slots" ON public.workout_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.microcycles m
      JOIN public.athletes a ON a.id = m.athlete_id
      WHERE m.id = workout_slots.microcycle_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- workout_slots: athlete can update own slots (mark done + feedback)
CREATE POLICY "athlete_update_own_slots" ON public.workout_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.microcycles m
      JOIN public.athletes a ON a.id = m.athlete_id
      WHERE m.id = workout_slots.microcycle_id
        AND a.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.microcycles m
      JOIN public.athletes a ON a.id = m.athlete_id
      WHERE m.id = workout_slots.microcycle_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- workout_templates: athlete can see templates used in their slots
CREATE POLICY "athlete_select_own_templates" ON public.workout_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_slots ws
      JOIN public.microcycles m ON m.id = ws.microcycle_id
      JOIN public.athletes a ON a.id = m.athlete_id
      WHERE ws.template_id = workout_templates.id
        AND a.auth_user_id = auth.uid()
    )
  );

-- athlete_profiles: athlete can see their own profiles
CREATE POLICY "athlete_select_own_profiles" ON public.athlete_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_profiles.athlete_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- =====================
-- 5. RPC: get_my_athlete_profile()
-- =====================

CREATE OR REPLACE FUNCTION public.get_my_athlete_profile()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'athlete_id', a.id,
    'athlete_name', a.name,
    'coach_name', COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = a.user_id),
      'Coach'
    ),
    'modality', a.modality,
    'level', a.level,
    'status', a.status,
    'active_microcycle', (
      SELECT json_build_object(
        'id', m.id,
        'name', m.name,
        'status', m.status,
        'start_date', m.start_date,
        'current_week', GREATEST(1, LEAST(3,
          EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM m.start_date) + 1
        )),
        'total_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id),
        'completed_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id AND ws.is_completed = true),
        'slots', (
          SELECT json_agg(
            json_build_object(
              'id', ws.id,
              'day_of_week', ws.day_of_week,
              'week_number', ws.week_number,
              'time_of_day', ws.time_of_day,
              'is_completed', ws.is_completed,
              'completed_at', ws.completed_at,
              'athlete_feedback', ws.athlete_feedback,
              'custom_duration', ws.custom_duration,
              'custom_notes', ws.custom_notes,
              'template', json_build_object(
                'id', wt.id,
                'name', wt.name,
                'category', wt.category,
                'duration', wt.duration,
                'intensity', wt.intensity
              )
            )
            ORDER BY ws.week_number, ws.day_of_week
          )
          FROM public.workout_slots ws
          JOIN public.workout_templates wt ON wt.id = ws.template_id
          WHERE ws.microcycle_id = m.id
        )
      )
      FROM public.microcycles m
      WHERE m.athlete_id = a.id AND m.status = 'active'
      ORDER BY m.start_date DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM public.athletes a
  WHERE a.auth_user_id = auth.uid()
  LIMIT 1;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_athlete_profile() TO authenticated;

-- =====================
-- 6. BACKFILL: Link existing athletes whose email matches an auth.users
-- =====================

UPDATE public.athletes a
SET
  auth_user_id = u.id,
  linked_at = NOW(),
  invitation_status = 'connected'
FROM auth.users u
WHERE LOWER(a.email) = LOWER(u.email)
  AND a.auth_user_id IS NULL
  AND a.email IS NOT NULL
  AND TRIM(a.email) != '';

-- Set remaining athletes with email to pending
UPDATE public.athletes
SET invitation_status = 'pending'
WHERE email IS NOT NULL
  AND TRIM(email) != ''
  AND auth_user_id IS NULL
  AND invitation_status = 'none';
