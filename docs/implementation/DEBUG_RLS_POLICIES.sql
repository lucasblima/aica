-- =============================================================================
-- Debug: Check RLS policies for user_consciousness_stats
-- Verify if authenticated users can read their own stats
-- =============================================================================

-- 1. Check if RLS is enabled
SELECT
  'RLS STATUS' as section,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_consciousness_stats';

-- 2. List ALL policies on user_consciousness_stats
SELECT
  'POLICIES' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_consciousness_stats';

-- 3. Test if current user can SELECT their own data
-- (Run as authenticated user in app, not as postgres/service_role)
SELECT
  'CAN I READ MY DATA?' as section,
  EXISTS(
    SELECT 1 FROM user_consciousness_stats
    WHERE user_id = auth.uid()
  ) as has_access,
  auth.uid() as my_user_id,
  auth.role() as my_role;

-- 4. Try to SELECT your stats directly
SELECT
  'MY STATS (if readable)' as section,
  *
FROM user_consciousness_stats
WHERE user_id = auth.uid();

-- =============================================================================
-- Expected:
-- - RLS should be enabled (rls_enabled = true)
-- - Should have SELECT policy for authenticated users
-- - has_access should be true
-- - Should return your stats in query 4
-- =============================================================================
