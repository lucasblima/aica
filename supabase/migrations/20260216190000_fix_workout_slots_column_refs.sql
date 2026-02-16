-- Fix: All RPCs referencing ws.is_completed on workout_slots
-- The column was renamed to "completed" in 20260216120000_fix_flux_canvas_schema.sql
-- Also fix references to removed columns (time_of_day, custom_duration, custom_notes)

-- ============================================================
-- 1. get_athletes_with_adherence — used by home page / Flux
-- ============================================================

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
      COUNT(ws.id) FILTER (WHERE ws.completed = true) AS completed_slots
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

-- ============================================================
-- 2. calculate_athlete_adherence — used by athlete detail
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_athlete_adherence(p_athlete_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_slots INTEGER;
  v_completed_slots INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_slots
  FROM workout_slots ws
  INNER JOIN microcycles m ON m.id = ws.microcycle_id
  WHERE m.athlete_id = p_athlete_id
    AND m.status IN ('active', 'completed');

  IF v_total_slots = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_completed_slots
  FROM workout_slots ws
  INNER JOIN microcycles m ON m.id = ws.microcycle_id
  WHERE m.athlete_id = p_athlete_id
    AND m.status IN ('active', 'completed')
    AND ws.completed = true;

  RETURN ROUND((v_completed_slots::NUMERIC / v_total_slots::NUMERIC) * 100)::INTEGER;
END;
$$;

-- ============================================================
-- 3. get_my_athlete_profile — athlete portal RPC
--    Fixes: is_completed→completed, time_of_day→start_time,
--           custom_duration→completion_data, custom_notes→coach_notes
-- ============================================================

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
        'current_week', GREATEST(1, LEAST(3,
          EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM m.start_date) + 1
        )),
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_my_athlete_profile() TO authenticated;
