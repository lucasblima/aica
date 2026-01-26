-- =============================================================================
-- Fix question_responses RLS policies
-- Issue: Question responses may not be saving due to missing INSERT/UPDATE policies
-- =============================================================================

-- Step 1: Check current policies
SELECT
  policyname,
  cmd,
  qual::text as using_expr,
  with_check::text as with_check_expr
FROM pg_policies
WHERE tablename = 'question_responses';

-- Step 2: Check how many questions exist in the pool
SELECT COUNT(*) as total_questions FROM daily_questions WHERE active = true;

-- Step 3: Check responses for current user (replace with actual user_id if needed)
-- SELECT COUNT(*) as total_responses FROM question_responses WHERE user_id = 'USER_ID_HERE';

-- =============================================================================
-- Apply fixes (run each section separately if needed)
-- =============================================================================

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view own responses" ON question_responses;
CREATE POLICY "Users can view own responses" ON question_responses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Ensure INSERT policy exists (required for new responses)
DROP POLICY IF EXISTS "Users can insert own responses" ON question_responses;
CREATE POLICY "Users can insert own responses" ON question_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure UPDATE policy exists (required for UPSERT to work)
DROP POLICY IF EXISTS "Users can update own responses" ON question_responses;
CREATE POLICY "Users can update own responses" ON question_responses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Verify policies after fix
-- =============================================================================
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'question_responses'
ORDER BY policyname;

-- =============================================================================
-- Important Note about Response Count:
-- =============================================================================
-- If user has answered all questions in the pool (e.g., 10 questions),
-- subsequent answers will UPDATE existing rows due to UPSERT with
-- onConflict: 'user_id,question_id'. This is expected behavior.
--
-- The number of responses will max out at the number of unique questions
-- in the daily_questions pool.
-- =============================================================================
