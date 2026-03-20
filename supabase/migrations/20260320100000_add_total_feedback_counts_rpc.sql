-- RPC to get total feedback count per athlete (for AthleteCard display)
-- Mirrors get_unread_feedback_counts but counts ALL entries, not just unread

CREATE OR REPLACE FUNCTION public.get_total_feedback_counts(p_coach_user_id UUID)
RETURNS TABLE (athlete_id UUID, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_coach_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only query own feedback counts';
  END IF;

  RETURN QUERY
  SELECT afe.athlete_id, COUNT(*)::BIGINT AS total_count
  FROM athlete_feedback_entries afe
  JOIN microcycles mc ON mc.id = afe.microcycle_id
  WHERE mc.user_id = p_coach_user_id
  GROUP BY afe.athlete_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_feedback_counts(UUID) TO authenticated;
