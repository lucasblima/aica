-- Migration: 20260110_fix_rls_data_deletion_requests.sql
-- Description: Add missing UPDATE and DELETE policies for data_deletion_requests table
-- Issue: #73 Phase 1 - Security & Integrity
-- Table: data_deletion_requests (CRITICAL - GDPR/LGPD compliance)

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'data_deletion_requests') THEN
    RAISE EXCEPTION 'Required table data_deletion_requests does not exist';
  END IF;
END $$;

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (if not already enabled)
-- ============================================================================

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (to rebuild complete set)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can create deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can update their own deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can delete their own deletion requests" ON data_deletion_requests;

-- Also drop old policies if they exist
DROP POLICY IF EXISTS "Users can insert deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can select deletion requests" ON data_deletion_requests;

-- ============================================================================
-- CREATE COMPLETE RLS POLICIES (ALL CRUD)
-- ============================================================================

-- SELECT: Users can view only their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
  ON data_deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can create deletion requests for themselves
CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own deletion requests (cancel, add notes)
-- NOTE: Once marked as 'completed', should not be editable
CREATE POLICY "Users can update their own deletion requests"
  ON data_deletion_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status != 'completed' -- Prevent editing completed requests
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status != 'completed'
  );

-- DELETE: Users can delete their own PENDING deletion requests (cancel before processing)
-- NOTE: Cannot delete completed or in-progress requests for audit trail
CREATE POLICY "Users can delete their own deletion requests"
  ON data_deletion_requests FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending' -- Only pending requests can be deleted
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON data_deletion_requests TO authenticated;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view their own deletion requests" ON data_deletion_requests IS
  'GDPR/LGPD: Users can view their own data deletion requests';

COMMENT ON POLICY "Users can create deletion requests" ON data_deletion_requests IS
  'GDPR/LGPD: Users can request deletion of their personal data';

COMMENT ON POLICY "Users can update their own deletion requests" ON data_deletion_requests IS
  'Allows users to update pending deletion requests (cannot edit completed requests for audit trail)';

COMMENT ON POLICY "Users can delete their own deletion requests" ON data_deletion_requests IS
  'Allows users to cancel pending deletion requests (completed requests preserved for compliance audit)';

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'data_deletion_requests' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on data_deletion_requests';
  END IF;
END $$;

-- Verify all CRUD policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'data_deletion_requests'
    AND policyname IN (
      'Users can view their own deletion requests',
      'Users can create deletion requests',
      'Users can update their own deletion requests',
      'Users can delete their own deletion requests'
    );

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 CRUD policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✅ All 4 CRUD policies verified for data_deletion_requests';
  END IF;
END $$;
