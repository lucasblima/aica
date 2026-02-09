-- RPC: Get unanswered questions for a user (Issue #205)
-- Replaces 2 separate queries + JS filtering with a single server-side query

CREATE OR REPLACE FUNCTION public.get_unanswered_question(
  p_user_id UUID,
  p_limit INT DEFAULT 1
)
RETURNS SETOF daily_questions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT dq.*
  FROM daily_questions dq
  WHERE dq.active = true
    AND (dq.user_id IS NULL OR dq.user_id = p_user_id)
    AND dq.id NOT IN (
      SELECT qr.question_id FROM question_responses qr WHERE qr.user_id = p_user_id
    )
  ORDER BY COALESCE(dq.relevance_score, 0.5) DESC, random()
  LIMIT p_limit;
END;
$$;
