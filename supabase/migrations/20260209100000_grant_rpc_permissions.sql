-- Grant EXECUTE permissions on Journey RPCs to authenticated role
-- Safety net: PostgreSQL grants EXECUTE to PUBLIC by default, but
-- some Supabase configurations may revoke this.

GRANT EXECUTE ON FUNCTION public.get_unanswered_question(UUID, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_journey_activity_heatmap(UUID, INT) TO authenticated, anon;
