-- Migration: 20260110_fix_rls_ai_usage_tracking_errors.sql
-- Description: Add missing RLS policies for ai_usage_tracking_errors table
-- Issue: #73 Phase 1 - Security & Integrity
-- Table: ai_usage_tracking_errors (CRITICAL - financial data)

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ai_usage_tracking_errors') THEN
    RAISE EXCEPTION 'Required table ai_usage_tracking_errors does not exist';
  END IF;
END $$;

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (if not already enabled)
-- ============================================================================

ALTER TABLE ai_usage_tracking_errors ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING INCOMPLETE POLICIES (to rebuild clean)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can insert their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can update their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can delete their own tracking errors" ON ai_usage_tracking_errors;

-- ============================================================================
-- CREATE COMPLETE RLS POLICIES (ALL CRUD)
-- ============================================================================

-- SELECT: Users can view only their own tracking errors
CREATE POLICY "Users can view their own tracking errors"
  ON ai_usage_tracking_errors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can insert their own tracking errors (via tracking service)
CREATE POLICY "Users can insert their own tracking errors"
  ON ai_usage_tracking_errors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own tracking errors (retry status, resolution)
CREATE POLICY "Users can update their own tracking errors"
  ON ai_usage_tracking_errors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own tracking errors (cleanup)
CREATE POLICY "Users can delete their own tracking errors"
  ON ai_usage_tracking_errors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ai_usage_tracking_errors TO authenticated;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view their own tracking errors" ON ai_usage_tracking_errors IS
  'Allows users to view their own AI cost tracking errors for debugging';

COMMENT ON POLICY "Users can insert their own tracking errors" ON ai_usage_tracking_errors IS
  'Allows tracking service to log errors for the user';

COMMENT ON POLICY "Users can update their own tracking errors" ON ai_usage_tracking_errors IS
  'Allows users to mark errors as resolved or update retry status';

COMMENT ON POLICY "Users can delete their own tracking errors" ON ai_usage_tracking_errors IS
  'Allows users to cleanup old error logs';

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'ai_usage_tracking_errors' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on ai_usage_tracking_errors';
  END IF;
END $$;

-- Verify all CRUD policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'ai_usage_tracking_errors'
    AND policyname IN (
      'Users can view their own tracking errors',
      'Users can insert their own tracking errors',
      'Users can update their own tracking errors',
      'Users can delete their own tracking errors'
    );

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 CRUD policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✅ All 4 CRUD policies verified for ai_usage_tracking_errors';
  END IF;
END $$;
