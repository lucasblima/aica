-- Count distinct days where a user had real interactions across modules.
-- Used by useTrustLevel to measure actual engagement, not just account age.

CREATE OR REPLACE FUNCTION public.count_days_with_activity(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT activity_date)::INTEGER FROM (
    SELECT DATE(created_at) AS activity_date FROM moments WHERE user_id = p_user_id
    UNION
    SELECT DATE(updated_at) AS activity_date FROM work_items WHERE user_id = p_user_id
    UNION
    SELECT DATE(created_at) AS activity_date FROM finance_transactions WHERE user_id = p_user_id
  ) AS all_activity;
$$;

GRANT EXECUTE ON FUNCTION public.count_days_with_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_days_with_activity(UUID) TO service_role;
