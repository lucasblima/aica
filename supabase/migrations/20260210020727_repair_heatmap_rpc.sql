-- =============================================================================
-- REPAIR: Re-create get_journey_activity_heatmap RPC
-- Context: Migration 20260208000001 was marked as applied but the function
-- may not exist (partial migration failure pattern).
-- Uses CREATE OR REPLACE for idempotency.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_journey_activity_heatmap(
  p_user_id UUID,
  p_days INT DEFAULT 90
)
RETURNS TABLE (activity_date DATE, moment_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DATE(m.created_at) as activity_date, COUNT(*)::BIGINT as moment_count
  FROM moments m
  WHERE m.user_id = p_user_id
    AND m.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(m.created_at)
  ORDER BY activity_date;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_journey_activity_heatmap(UUID, INT) TO authenticated, anon;
