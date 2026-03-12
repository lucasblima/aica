-- ============================================================================
-- Update athlete_unlink_self() to clean up calendar_sync_map entries
-- for BOTH coach-owned (legacy) and athlete-owned (new) sync mappings.
-- ============================================================================

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

  SELECT count(*) INTO v_count FROM athletes WHERE auth_user_id = v_uid;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No athlete record found for this user';
  END IF;

  -- Delete calendar_sync_map entries: athlete-owned (new) entries
  -- where user_id = athlete's auth_user_id
  RETURN QUERY
  DELETE FROM calendar_sync_map csm
  WHERE csm.module = 'flux'
    AND csm.user_id = v_uid
  RETURNING csm.google_event_id;

  -- Also delete legacy coach-owned entries (from before the sync target fix)
  -- RETURN QUERY so the frontend can delete these Google events too
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

  -- Archive active/draft microcycles
  UPDATE microcycles
  SET status = 'archived',
      updated_at = NOW()
  WHERE athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = v_uid)
    AND status IN ('active', 'draft');

  -- Unlink all athlete records
  UPDATE athletes
  SET auth_user_id = NULL,
      invitation_status = 'none',
      status = 'churned',
      updated_at = NOW()
  WHERE auth_user_id = v_uid;
END;
$$;
