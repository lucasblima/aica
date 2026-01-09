-- ============================================================================
-- PHASE 1 CONSOLIDATED MIGRATION SCRIPT
-- ============================================================================
-- Issue: #73 Phase 1 - Security & Integrity
-- Purpose: Apply all 5 RLS policy migrations in correct order
-- Execute via: Supabase SQL Editor (Dashboard)
-- Project: gppebtrshbvuzatmebhr (Staging)
--
-- WARNING: This script applies 20 RLS policies across 5 tables
-- Estimated execution time: 30-60 seconds
-- ============================================================================

\echo '============================================================================'
\echo 'STARTING PHASE 1 MIGRATION APPLICATION'
\echo 'Project: gppebtrshbvuzatmebhr (Staging)'
\echo 'Tables affected: 5'
\echo 'Policies to create: 20'
\echo '============================================================================'

-- ============================================================================
-- MIGRATION 1: ai_usage_tracking_errors
-- ============================================================================

\echo ''
\echo '>>> Migration 1/5: ai_usage_tracking_errors'
\echo ''

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ai_usage_tracking_errors') THEN
    RAISE EXCEPTION 'Required table ai_usage_tracking_errors does not exist';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE ai_usage_tracking_errors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can insert their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can update their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can delete their own tracking errors" ON ai_usage_tracking_errors;

-- Create complete CRUD policies
CREATE POLICY "Users can view their own tracking errors"
  ON ai_usage_tracking_errors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracking errors"
  ON ai_usage_tracking_errors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking errors"
  ON ai_usage_tracking_errors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking errors"
  ON ai_usage_tracking_errors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_usage_tracking_errors TO authenticated;

-- Add comments
COMMENT ON POLICY "Users can view their own tracking errors" ON ai_usage_tracking_errors IS
  'Allows users to view their own AI cost tracking errors for debugging';

-- Verify
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'ai_usage_tracking_errors';

  IF policy_count < 4 THEN
    RAISE WARNING '⚠️  Expected 4 policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✅ Migration 1/5 SUCCESS: ai_usage_tracking_errors (% policies)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 2: data_deletion_requests
-- ============================================================================

\echo ''
\echo '>>> Migration 2/5: data_deletion_requests'
\echo ''

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'data_deletion_requests') THEN
    RAISE EXCEPTION 'Required table data_deletion_requests does not exist';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can create deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can update their own deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can delete their own deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can insert deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can select deletion requests" ON data_deletion_requests;

-- Create complete CRUD policies
CREATE POLICY "Users can view their own deletion requests"
  ON data_deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deletion requests"
  ON data_deletion_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status != 'completed'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status != 'completed'
  );

CREATE POLICY "Users can delete their own deletion requests"
  ON data_deletion_requests FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON data_deletion_requests TO authenticated;

-- Add comments
COMMENT ON POLICY "Users can view their own deletion requests" ON data_deletion_requests IS
  'GDPR/LGPD: Users can view their own data deletion requests';

-- Verify
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'data_deletion_requests';

  IF policy_count < 4 THEN
    RAISE WARNING '⚠️  Expected 4 policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✅ Migration 2/5 SUCCESS: data_deletion_requests (% policies)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 3: daily_questions
-- ============================================================================

\echo ''
\echo '>>> Migration 3/5: daily_questions'
\echo ''

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'daily_questions') THEN
    RAISE EXCEPTION 'Required table daily_questions does not exist';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can view their own daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can insert daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can update daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can delete daily questions" ON daily_questions;

-- Create SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.can_access_daily_question(
  _user_id UUID,
  _question_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN _question_user_id IS NULL OR _question_user_id = _user_id;
END;
$$;

-- Create complete CRUD policies
CREATE POLICY "Users can view daily questions"
  ON daily_questions FOR SELECT
  TO authenticated
  USING (
    public.can_access_daily_question(auth.uid(), user_id)
  );

CREATE POLICY "Users can insert daily questions"
  ON daily_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update daily questions"
  ON daily_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can delete daily questions"
  ON daily_questions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_questions TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.can_access_daily_question(UUID, UUID) IS
  'SECURITY DEFINER: Checks if user can access a daily question (global or own)';

-- Verify
DO $$
DECLARE
  policy_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'daily_questions';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'can_access_daily_question'
  ) INTO function_exists;

  IF policy_count < 4 THEN
    RAISE WARNING '⚠️  Expected 4 policies, found %', policy_count;
  ELSIF NOT function_exists THEN
    RAISE WARNING '⚠️  SECURITY DEFINER function not created';
  ELSE
    RAISE NOTICE '✅ Migration 3/5 SUCCESS: daily_questions (% policies + SECURITY DEFINER)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 4: whatsapp_messages
-- ============================================================================

\echo ''
\echo '>>> Migration 4/5: whatsapp_messages'
\echo ''

-- Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_messages') THEN
    RAISE EXCEPTION 'Required table whatsapp_messages does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'contact_network') THEN
    RAISE EXCEPTION 'Required table contact_network does not exist';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can select their messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update message status" ON whatsapp_messages;

-- Create SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.user_owns_whatsapp_message(
  _user_id UUID,
  _message_user_id UUID,
  _contact_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _message_user_id = _user_id THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM contact_network
    WHERE id = _contact_id AND user_id = _user_id
  );
END;
$$;

-- Create complete CRUD policies
CREATE POLICY "Users can view their own messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    public.user_owns_whatsapp_message(auth.uid(), user_id, contact_id)
  );

CREATE POLICY "Users can insert their own messages"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM contact_network
      WHERE id = contact_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON whatsapp_messages FOR UPDATE
  TO authenticated
  USING (
    public.user_owns_whatsapp_message(auth.uid(), user_id, contact_id)
  )
  WITH CHECK (
    public.user_owns_whatsapp_message(auth.uid(), user_id, contact_id)
  );

CREATE POLICY "Users can delete their own messages"
  ON whatsapp_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_messages TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.user_owns_whatsapp_message(UUID, UUID, UUID) IS
  'SECURITY DEFINER: Checks if user owns a WhatsApp message via user_id or contact_network';

-- Verify
DO $$
DECLARE
  policy_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'whatsapp_messages';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_owns_whatsapp_message'
  ) INTO function_exists;

  IF policy_count < 4 THEN
    RAISE WARNING '⚠️  Expected 4 policies, found %', policy_count;
  ELSIF NOT function_exists THEN
    RAISE WARNING '⚠️  SECURITY DEFINER function not created';
  ELSE
    RAISE NOTICE '✅ Migration 4/5 SUCCESS: whatsapp_messages (% policies + SECURITY DEFINER)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 5: whatsapp_sync_logs
-- ============================================================================

\echo ''
\echo '>>> Migration 5/5: whatsapp_sync_logs'
\echo ''

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_sync_logs') THEN
    RAISE EXCEPTION 'Required table whatsapp_sync_logs does not exist';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE whatsapp_sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can insert their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can update their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can delete their own sync logs" ON whatsapp_sync_logs;

-- Create complete CRUD policies
CREATE POLICY "Users can view their own sync logs"
  ON whatsapp_sync_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
  ON whatsapp_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync logs"
  ON whatsapp_sync_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync logs"
  ON whatsapp_sync_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_sync_logs TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_user_id
  ON whatsapp_sync_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_created_at
  ON whatsapp_sync_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_user_date
  ON whatsapp_sync_logs(user_id, created_at DESC);

-- Add comments
COMMENT ON POLICY "Users can view their own sync logs" ON whatsapp_sync_logs IS
  'Users can view their WhatsApp sync logs for debugging and monitoring';

-- Verify
DO $$
DECLARE
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'whatsapp_sync_logs';

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'whatsapp_sync_logs'
    AND indexname LIKE 'idx_whatsapp_sync_logs%';

  IF policy_count < 4 THEN
    RAISE WARNING '⚠️  Expected 4 policies, found %', policy_count;
  ELSIF index_count < 3 THEN
    RAISE WARNING '⚠️  Expected 3 indexes, found %', index_count;
  ELSE
    RAISE NOTICE '✅ Migration 5/5 SUCCESS: whatsapp_sync_logs (% policies + % indexes)', policy_count, index_count;
  END IF;
END $$;

-- ============================================================================
-- FINAL SUMMARY REPORT
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'PHASE 1 MIGRATION COMPLETE - FINAL AUDIT'
\echo '============================================================================'

DO $$
DECLARE
  total_policies INTEGER;
  total_functions INTEGER;
  total_indexes INTEGER;
  rec RECORD;
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  );

  -- Count SECURITY DEFINER functions
  SELECT COUNT(*) INTO total_functions
  FROM pg_proc
  WHERE proname IN (
    'can_access_daily_question',
    'user_owns_whatsapp_message'
  );

  -- Count performance indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE tablename = 'whatsapp_sync_logs'
    AND indexname LIKE 'idx_whatsapp_sync_logs%';

  RAISE NOTICE '';
  RAISE NOTICE '📊 SUMMARY STATISTICS:';
  RAISE NOTICE '   Total RLS Policies: % (expected: 20)', total_policies;
  RAISE NOTICE '   SECURITY DEFINER Functions: % (expected: 2)', total_functions;
  RAISE NOTICE '   Performance Indexes: % (expected: 3)', total_indexes;
  RAISE NOTICE '';

  IF total_policies = 20 AND total_functions = 2 AND total_indexes = 3 THEN
    RAISE NOTICE '✅ PHASE 1 MIGRATION: 100%% SUCCESS';
    RAISE NOTICE '';
    RAISE NOTICE '📋 POLICY BREAKDOWN:';
    FOR rec IN (
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE tablename IN (
        'ai_usage_tracking_errors',
        'data_deletion_requests',
        'daily_questions',
        'whatsapp_messages',
        'whatsapp_sync_logs'
      )
      GROUP BY tablename
      ORDER BY tablename
    ) LOOP
      RAISE NOTICE '   ✓ %.%: % policies', rec.tablename, REPEAT(' ', 30 - LENGTH(rec.tablename)), rec.policy_count;
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '   1. Run full audit queries (phase1-rls-coverage.sql)';
    RAISE NOTICE '   2. Test RLS policies with test users';
    RAISE NOTICE '   3. Proceed to Phase 2: Performance Indexes';
  ELSE
    RAISE WARNING '⚠️  PHASE 1 INCOMPLETE - Review migration logs';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;
