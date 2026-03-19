-- Fix 3 security/correctness issues in feedback RPCs from 20260319200001
--
-- 1. get_unread_feedback_counts: add auth.uid() check (SECURITY DEFINER without caller verification)
-- 2. mark_feedback_read: add auth.uid() check (same issue)
-- 3. idx_afe_unread: wrong column — was (user_id, read_at), should be (microcycle_id, read_at)
--    because the RPCs join through microcycles.user_id (coach), not afe.user_id (athlete)

-- Fix 1: Redefine get_unread_feedback_counts with auth.uid() authorization check
CREATE OR REPLACE FUNCTION public.get_unread_feedback_counts(p_coach_user_id UUID)
RETURNS TABLE (athlete_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_coach_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only query own feedback counts';
  END IF;

  RETURN QUERY
  SELECT afe.athlete_id, COUNT(*)::BIGINT AS unread_count
  FROM athlete_feedback_entries afe
  JOIN microcycles mc ON mc.id = afe.microcycle_id
  WHERE mc.user_id = p_coach_user_id
    AND afe.read_at IS NULL
  GROUP BY afe.athlete_id;
END;
$$;

-- Fix 2: Redefine mark_feedback_read with auth.uid() authorization check
CREATE OR REPLACE FUNCTION public.mark_feedback_read(p_coach_user_id UUID, p_athlete_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_coach_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only query own feedback counts';
  END IF;

  UPDATE athlete_feedback_entries afe
  SET read_at = NOW()
  FROM microcycles mc
  WHERE afe.microcycle_id = mc.id
    AND mc.user_id = p_coach_user_id
    AND afe.athlete_id = p_athlete_id
    AND afe.read_at IS NULL;
END;
$$;

-- Fix 3: Drop incorrect index and create one matching the actual query pattern
DROP INDEX IF EXISTS idx_afe_unread;
CREATE INDEX idx_afe_unread ON athlete_feedback_entries (microcycle_id, read_at) WHERE read_at IS NULL;
