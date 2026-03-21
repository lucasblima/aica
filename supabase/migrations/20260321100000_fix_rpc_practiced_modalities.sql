-- Fix: Include practiced_modalities in get_athletes_with_adherence() RPC
-- Root cause: AthleteCard reads practiced_modalities but the RPC never returned it
-- Must DROP first because RETURNS TABLE signature changed (added practiced_modalities)

DROP FUNCTION IF EXISTS public.get_athletes_with_adherence(UUID);

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
  avatar_url TEXT,
  practiced_modalities TEXT[],
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
    a.practiced_modalities,
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


-- Also fix get_my_athlete_profile() to include practiced_modalities
-- Root cause: AthletePortalView reads modality (singular) → shows only 1 emoji

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
    'practiced_modalities', a.practiced_modalities,
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
