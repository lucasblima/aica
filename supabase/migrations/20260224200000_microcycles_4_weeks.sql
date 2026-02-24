-- ============================================================
-- Expand microcycles from 3 weeks to 4 weeks
-- Ticket: #380
-- ============================================================

-- 1. microcycles: update duration constraint (3 weeks → 4 weeks)
ALTER TABLE public.microcycles
  DROP CONSTRAINT IF EXISTS microcycle_duration;

ALTER TABLE public.microcycles
  ADD CONSTRAINT microcycle_duration CHECK (end_date - start_date = 27);
  -- 4 weeks = 28 days, 0-27 inclusive

-- 1b. microcycles: add week_4_focus column
ALTER TABLE public.microcycles
  ADD COLUMN IF NOT EXISTS week_4_focus TEXT NOT NULL DEFAULT 'recovery'
    CHECK (week_4_focus IN ('volume', 'intensity', 'recovery', 'test'));

-- 2. workout_slots: expand week_number range 1-3 → 1-4
ALTER TABLE public.workout_slots
  DROP CONSTRAINT IF EXISTS workout_slots_week_number_check;

ALTER TABLE public.workout_slots
  ADD CONSTRAINT workout_slots_week_number_check CHECK (week_number BETWEEN 1 AND 4);

-- 3. scheduled_workouts: expand week_number range 1-3 → 1-4
ALTER TABLE public.scheduled_workouts
  DROP CONSTRAINT IF EXISTS scheduled_workouts_week_number_check;

ALTER TABLE public.scheduled_workouts
  ADD CONSTRAINT scheduled_workouts_week_number_check CHECK (week_number BETWEEN 1 AND 4);

-- 4. athlete_feedback_entries: expand week_number range 1-3 → 1-4
ALTER TABLE public.athlete_feedback_entries
  DROP CONSTRAINT IF EXISTS athlete_feedback_entries_week_number_check;

ALTER TABLE public.athlete_feedback_entries
  ADD CONSTRAINT athlete_feedback_entries_week_number_check CHECK (week_number BETWEEN 1 AND 4);

-- 5. RPC: get_my_athlete_profile() — LEAST(3→4) + include week focus fields
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
    'allow_parq_onboarding', COALESCE(a.allow_parq_onboarding, false),
    'parq_clearance_status', a.parq_clearance_status,
    'active_microcycle', (
      SELECT json_build_object(
        'id', m.id,
        'name', m.name,
        'status', m.status,
        'start_date', m.start_date,
        'current_week', GREATEST(1, LEAST(4,
          EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM m.start_date) + 1
        )),
        'week_1_focus', m.week_1_focus,
        'week_2_focus', m.week_2_focus,
        'week_3_focus', m.week_3_focus,
        'week_4_focus', m.week_4_focus,
        'total_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id),
        'completed_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id AND ws.completed = true),
        'slots', (
          SELECT json_agg(
            json_build_object(
              'id', ws.id,
              'day_of_week', ws.day_of_week,
              'week_number', ws.week_number,
              'time_of_day', ws.start_time,
              'is_completed', ws.completed,
              'completed_at', ws.completed_at,
              'athlete_feedback', ws.athlete_feedback,
              'custom_duration', (ws.completion_data->>'duration_actual')::INTEGER,
              'custom_notes', ws.coach_notes,
              'exercise_structure', ws.exercise_structure,
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
          LEFT JOIN public.workout_templates wt ON wt.id = ws.template_id
          WHERE ws.microcycle_id = m.id
        )
      )
      FROM public.microcycles m
      WHERE m.athlete_id = a.id
        AND m.status IN ('active', 'draft')
      ORDER BY m.created_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM public.athletes a
  WHERE a.auth_user_id = auth.uid()
  LIMIT 1;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_athlete_profile() TO authenticated;
