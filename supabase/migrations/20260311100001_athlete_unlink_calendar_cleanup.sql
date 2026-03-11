-- ============================================================================
-- Athlete Self-Unlink — Calendar Cleanup
--
-- Updates athlete_unlink_self() to also:
-- 1. Archive active/draft microcycles for the departing athlete
-- 2. Delete calendar_sync_map entries for that athlete's workout_slots
--
-- This ensures:
-- - Exercises disappear from the AICA Agenda (fluxProvider queries active/draft)
-- - Google Calendar sync mappings are cleaned up
-- ============================================================================

CREATE OR REPLACE FUNCTION public.athlete_unlink_self()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_athlete_id UUID;
  v_coach_user_id UUID;
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Find athlete record (must happen BEFORE unlink sets auth_user_id = NULL)
  SELECT id, user_id INTO v_athlete_id, v_coach_user_id
  FROM athletes
  WHERE auth_user_id = v_uid
  LIMIT 1;

  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'No athlete record found for this user';
  END IF;

  -- 2. Delete calendar_sync_map entries for this athlete's workout_slots
  --    (coach's Google Calendar event mappings for the athlete's workouts)
  DELETE FROM calendar_sync_map
  WHERE user_id = v_coach_user_id
    AND module = 'flux'
    AND entity_id IN (
      SELECT ws.id::text
      FROM workout_slots ws
      JOIN microcycles m ON m.id = ws.microcycle_id
      WHERE m.athlete_id = v_athlete_id
        AND m.status IN ('active', 'draft')
    );

  -- 3. Archive active/draft microcycles for this athlete
  --    (removes exercises from fluxProvider which queries active/draft only)
  UPDATE microcycles
  SET status = 'archived',
      updated_at = NOW()
  WHERE athlete_id = v_athlete_id
    AND status IN ('active', 'draft');

  -- 4. Unlink athlete
  UPDATE athletes
  SET auth_user_id = NULL,
      invitation_status = 'none',
      status = 'churned',
      updated_at = NOW()
  WHERE id = v_athlete_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Failed to unlink athlete record';
  END IF;
END;
$$;
