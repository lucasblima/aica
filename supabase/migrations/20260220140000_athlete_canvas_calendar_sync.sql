-- Athlete Canvas: Calendar sync tracking + athlete schedule update RPC
-- Adds columns to workout_slots for Google Calendar integration
-- and an RPC for athletes to move their workout slots

-- ============================================================
-- 1. Calendar sync tracking columns on workout_slots
-- ============================================================

ALTER TABLE public.workout_slots
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS calendar_synced_at TIMESTAMPTZ;

-- Index for finding unsynced slots efficiently
CREATE INDEX IF NOT EXISTS idx_workout_slots_calendar_sync
  ON public.workout_slots(calendar_synced_at)
  WHERE calendar_event_id IS NOT NULL;

-- ============================================================
-- 2. RPC: update_athlete_workout_schedule
--    Allows an athlete to move their own workout slot
--    (day_of_week + start_time). Clears calendar sync so
--    the event gets re-created on next sync.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_athlete_workout_schedule(
  p_slot_id UUID,
  p_new_day_of_week INTEGER,
  p_new_start_time TIME
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot workout_slots%ROWTYPE;
  v_athlete_user_id UUID;
BEGIN
  -- Get the slot
  SELECT * INTO v_slot FROM workout_slots WHERE id = p_slot_id;
  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot não encontrado');
  END IF;

  -- Verify the calling user is the athlete linked to this microcycle
  SELECT a.auth_user_id INTO v_athlete_user_id
  FROM athletes a
  JOIN microcycles m ON m.athlete_id = a.id
  WHERE m.id = v_slot.microcycle_id;

  IF v_athlete_user_id IS NULL OR v_athlete_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  -- Validate day_of_week (1-7)
  IF p_new_day_of_week < 1 OR p_new_day_of_week > 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dia da semana inválido');
  END IF;

  -- Update the slot (keep calendar_event_id so sync does PUT instead of creating duplicates)
  UPDATE workout_slots
  SET
    day_of_week = p_new_day_of_week,
    start_time = p_new_start_time::TEXT,
    calendar_synced_at = NULL,
    updated_at = now()
  WHERE id = p_slot_id;

  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id,
    'new_day_of_week', p_new_day_of_week,
    'new_start_time', p_new_start_time::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_athlete_workout_schedule(UUID, INTEGER, TIME) TO authenticated;
