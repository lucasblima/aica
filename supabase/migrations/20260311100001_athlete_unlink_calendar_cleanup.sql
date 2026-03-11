-- ============================================================================
-- Athlete Self-Unlink — Calendar Cleanup
--
-- Updates athlete_unlink_self() to also:
-- 1. Delete calendar_sync_map entries for the athlete's workout_slots
-- 2. Archive active/draft microcycles for the departing athlete
--
-- Returns deleted google_event_id values so the frontend can remove
-- orphaned events from Google Calendar (best-effort).
--
-- NOTE: All steps execute within a single transaction (PL/pgSQL default).
-- If any step fails, all changes are rolled back.
-- ============================================================================

-- Must DROP first because return type changed (void → TABLE)
DROP FUNCTION IF EXISTS public.athlete_unlink_self();

CREATE OR REPLACE FUNCTION public.athlete_unlink_self()
RETURNS TABLE(google_event_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify at least one athlete record exists
  SELECT count(*) INTO v_count FROM athletes WHERE auth_user_id = v_uid;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No athlete record found for this user';
  END IF;

  -- 1. Delete calendar_sync_map entries and return google_event_ids
  --    Handles ALL athlete records for this user (one user can be athlete
  --    for multiple coaches). Joins through the full chain:
  --    athletes → microcycles → workout_slots → calendar_sync_map
  RETURN QUERY
  DELETE FROM calendar_sync_map csm
  USING workout_slots ws
  JOIN microcycles m ON m.id = ws.microcycle_id
  JOIN athletes a ON a.id = m.athlete_id
  WHERE csm.module = 'flux'
    AND csm.entity_id = ws.id::text
    AND csm.user_id = a.user_id
    AND a.auth_user_id = v_uid
    AND m.status IN ('active', 'draft')
  RETURNING csm.google_event_id;

  -- 2. Archive active/draft microcycles for ALL of this user's athlete records
  --    (removes exercises from fluxProvider which queries active/draft only)
  UPDATE microcycles
  SET status = 'archived',
      updated_at = NOW()
  WHERE athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = v_uid)
    AND status IN ('active', 'draft');

  -- 3. Unlink ALL athlete records for this user
  UPDATE athletes
  SET auth_user_id = NULL,
      invitation_status = 'none',
      status = 'churned',
      updated_at = NOW()
  WHERE auth_user_id = v_uid;
END;
$$;
