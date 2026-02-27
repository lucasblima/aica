-- ============================================================================
-- Fix: Allow authenticated users to read all user_stats for leaderboard
-- Issue: #518 (Gap 8)
-- ============================================================================
-- The existing RLS policy "Users can view own stats" only allows SELECT where
-- auth.uid() = user_id. This breaks leaderboard queries which need to read
-- all users' rows.
--
-- Solution: Add a read-all policy for authenticated users on SELECT only.
-- The existing policy handles UPDATE/INSERT restriction to own rows.
-- ============================================================================

CREATE POLICY "Authenticated users can view all stats for leaderboard"
ON public.user_stats
FOR SELECT
TO authenticated
USING (true);
