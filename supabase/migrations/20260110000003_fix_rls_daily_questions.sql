-- Migration: 20260110_fix_rls_daily_questions.sql
-- Description: Add missing RLS policies for daily_questions table
-- Issue: #73 Phase 1 - Security & Integrity
-- Table: daily_questions (CRITICAL - user personal reflection data)

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'daily_questions') THEN
    RAISE EXCEPTION 'Required table daily_questions does not exist';
  END IF;
END $$;

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (if not already enabled)
-- ============================================================================

ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING INCOMPLETE POLICIES (to rebuild clean)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can view their own daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can insert daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can update daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can delete daily questions" ON daily_questions;

-- ============================================================================
-- CREATE SECURITY DEFINER FUNCTION (if needed for shared questions)
-- ============================================================================

-- This function checks if a question is globally available or user-specific
CREATE OR REPLACE FUNCTION public.can_access_daily_question(
  _user_id UUID,
  _question_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if question is for current user OR if user_id is NULL (global question)
  RETURN _question_user_id IS NULL OR _question_user_id = _user_id;
END;
$$;

-- ============================================================================
-- CREATE COMPLETE RLS POLICIES (ALL CRUD)
-- ============================================================================

-- SELECT: Users can view global questions (user_id IS NULL) or their own questions
CREATE POLICY "Users can view daily questions"
  ON daily_questions FOR SELECT
  TO authenticated
  USING (
    public.can_access_daily_question(auth.uid(), user_id)
  );

-- INSERT: Users can insert questions for themselves OR service role can insert global questions
CREATE POLICY "Users can insert daily questions"
  ON daily_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can create personal questions
    auth.uid() = user_id
    -- OR service_role can create global questions (user_id IS NULL)
    -- This is handled by service role having bypass RLS
  );

-- UPDATE: Users can update only their own questions (not global ones)
CREATE POLICY "Users can update daily questions"
  ON daily_questions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND user_id IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id AND user_id IS NOT NULL
  );

-- DELETE: Users can delete only their own questions (not global ones)
CREATE POLICY "Users can delete daily questions"
  ON daily_questions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND user_id IS NOT NULL
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON daily_questions TO authenticated;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE daily_questions IS
  'Stores daily reflection questions - can be global (user_id NULL) or user-specific';

COMMENT ON FUNCTION public.can_access_daily_question(UUID, UUID) IS
  'SECURITY DEFINER: Checks if user can access a daily question (global or own)';

COMMENT ON POLICY "Users can view daily questions" ON daily_questions IS
  'Users can view global questions and their own personal questions';

COMMENT ON POLICY "Users can insert daily questions" ON daily_questions IS
  'Users can create personal reflection questions';

COMMENT ON POLICY "Users can update daily questions" ON daily_questions IS
  'Users can update only their own questions (not global system questions)';

COMMENT ON POLICY "Users can delete daily questions" ON daily_questions IS
  'Users can delete only their own questions (not global system questions)';

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'daily_questions' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on daily_questions';
  END IF;
END $$;

-- Verify all CRUD policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'daily_questions'
    AND policyname IN (
      'Users can view daily questions',
      'Users can insert daily questions',
      'Users can update daily questions',
      'Users can delete daily questions'
    );

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 CRUD policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✅ All 4 CRUD policies verified for daily_questions';
  END IF;
END $$;

-- Verify SECURITY DEFINER function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'can_access_daily_question'
  ) THEN
    RAISE EXCEPTION 'SECURITY DEFINER function can_access_daily_question not created';
  ELSE
    RAISE NOTICE '✅ SECURITY DEFINER function verified';
  END IF;
END $$;
