-- Migration: 20260110_fix_rls_whatsapp_sync_logs.sql
-- Description: Add missing RLS policies for whatsapp_sync_logs table
-- Issue: #73 Phase 1 - Security & Integrity
-- Table: whatsapp_sync_logs (CRITICAL - sync metadata access control)

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_sync_logs') THEN
    RAISE EXCEPTION 'Required table whatsapp_sync_logs does not exist';
  END IF;
END $$;

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (if not already enabled)
-- ============================================================================

ALTER TABLE whatsapp_sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING INCOMPLETE POLICIES (to rebuild clean)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can insert their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can update their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can delete their own sync logs" ON whatsapp_sync_logs;

-- ============================================================================
-- CREATE COMPLETE RLS POLICIES (ALL CRUD)
-- ============================================================================

-- SELECT: Users can view only their own sync logs
CREATE POLICY "Users can view their own sync logs"
  ON whatsapp_sync_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can insert sync logs (via background sync processes)
-- NOTE: Typically inserted by Edge Functions/n8n, but allow user context
CREATE POLICY "Users can insert their own sync logs"
  ON whatsapp_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update sync logs (retry, status updates)
CREATE POLICY "Users can update their own sync logs"
  ON whatsapp_sync_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete old sync logs (cleanup)
-- NOTE: Consider retention policy - keep last N days for debugging
CREATE POLICY "Users can delete their own sync logs"
  ON whatsapp_sync_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_sync_logs TO authenticated;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_sync_logs IS
  'Tracks WhatsApp synchronization events and errors for debugging and monitoring';

COMMENT ON POLICY "Users can view their own sync logs" ON whatsapp_sync_logs IS
  'Users can view their WhatsApp sync logs for debugging and monitoring';

COMMENT ON POLICY "Users can insert their own sync logs" ON whatsapp_sync_logs IS
  'Allows sync processes to log events for the user';

COMMENT ON POLICY "Users can update their own sync logs" ON whatsapp_sync_logs IS
  'Allows updating sync status (retry attempts, resolution)';

COMMENT ON POLICY "Users can delete their own sync logs" ON whatsapp_sync_logs IS
  'Allows users to cleanup old sync logs (consider retention policy of 30-90 days)';

-- ============================================================================
-- INDEXES (if not already created)
-- ============================================================================

-- Create index on user_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_user_id
  ON whatsapp_sync_logs(user_id);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_created_at
  ON whatsapp_sync_logs(created_at DESC);

-- Create composite index for user + date range queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_user_date
  ON whatsapp_sync_logs(user_id, created_at DESC);

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'whatsapp_sync_logs' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on whatsapp_sync_logs';
  END IF;
END $$;

-- Verify all CRUD policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'whatsapp_sync_logs'
    AND policyname IN (
      'Users can view their own sync logs',
      'Users can insert their own sync logs',
      'Users can update their own sync logs',
      'Users can delete their own sync logs'
    );

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 CRUD policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✅ All 4 CRUD policies verified for whatsapp_sync_logs';
  END IF;
END $$;

-- Verify indexes exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'whatsapp_sync_logs'
      AND indexname = 'idx_whatsapp_sync_logs_user_id'
  ) THEN
    RAISE WARNING 'Index idx_whatsapp_sync_logs_user_id not created';
  ELSE
    RAISE NOTICE '✅ Required indexes verified';
  END IF;
END $$;
