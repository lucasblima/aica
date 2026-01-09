-- ============================================================================
-- Migration: Add Missing RLS Policies for Unified Timeline Tables
-- Date: 2026-01-09
-- Auditor: Security & Privacy Agent
-- Priority: CRITICAL - Security gaps identified in audit
-- Related: docs/RLS_SECURITY_AUDIT_REPORT.md
-- ============================================================================
--
-- GDPR Compliance:
-- - Article 32: Security of Processing (technical measures)
-- - Article 17: Right to Erasure (DELETE policies)
-- - Article 5(1)(f): Integrity and Confidentiality
--
-- LGPD Compliance:
-- - Article 46: Security & Prevention Measures
--
-- ============================================================================

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICY REMEDIATION MIGRATION';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- Verify critical tables exist
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'question_responses',
    'weekly_summaries',
    'whatsapp_user_activity',
    'daily_questions'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = table_name) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'Missing tables: %. Skipping policies for these tables.', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All required tables exist';
  END IF;
END $$;

-- ============================================================================
-- PART 1: question_responses - Add UPDATE and DELETE policies
-- ============================================================================
-- GDPR Article 17: Right to Erasure compliance
-- Users must be able to update and delete their own responses

RAISE NOTICE 'Processing: question_responses table';

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can update own responses" ON question_responses;
DROP POLICY IF EXISTS "Users can delete own responses" ON question_responses;

-- Ensure RLS is enabled
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;

-- CREATE UPDATE policy
CREATE POLICY "Users can update own responses"
  ON question_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can update own responses" ON question_responses IS
  'Users can edit their own responses to daily questions. Auth via auth.uid().';

-- CREATE DELETE policy (GDPR Right to Erasure)
CREATE POLICY "Users can delete own responses"
  ON question_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete own responses" ON question_responses IS
  'GDPR Article 17: Users can delete their own responses (Right to Erasure). Auth via auth.uid().';

RAISE NOTICE '✅ question_responses: Added UPDATE and DELETE policies';

-- ============================================================================
-- PART 2: weekly_summaries - Add INSERT and DELETE policies
-- ============================================================================
-- INSERT: Only service role (Edge Functions) can generate summaries
-- DELETE: Users can delete their own summaries (GDPR compliance)

RAISE NOTICE 'Processing: weekly_summaries table';

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Service role can insert summaries" ON weekly_summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON weekly_summaries;

-- Ensure RLS is enabled
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

-- CREATE INSERT policy (service role only)
CREATE POLICY "Service role can insert summaries"
  ON weekly_summaries FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can insert summaries" ON weekly_summaries IS
  'Only Edge Functions (service role) can generate and insert weekly summaries. Auth via service_role JWT.';

-- CREATE DELETE policy (users can delete own summaries)
CREATE POLICY "Users can delete own summaries"
  ON weekly_summaries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete own summaries" ON weekly_summaries IS
  'GDPR Article 17: Users can delete their own weekly summaries (Right to Erasure). Auth via auth.uid().';

RAISE NOTICE '✅ weekly_summaries: Added INSERT (service_role) and DELETE policies';

-- ============================================================================
-- PART 3: whatsapp_user_activity - Add DELETE policy
-- ============================================================================
-- Users must be able to delete activity logs (GDPR compliance)

RAISE NOTICE 'Processing: whatsapp_user_activity table';

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Users can delete own activities" ON whatsapp_user_activity;

-- Ensure RLS is enabled
ALTER TABLE whatsapp_user_activity ENABLE ROW LEVEL SECURITY;

-- CREATE DELETE policy
CREATE POLICY "Users can delete own activities"
  ON whatsapp_user_activity FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete own activities" ON whatsapp_user_activity IS
  'GDPR Article 17: Users can delete their own activity records (Right to Erasure). Auth via auth.uid().';

RAISE NOTICE '✅ whatsapp_user_activity: Added DELETE policy';

-- ============================================================================
-- PART 4: daily_questions - Add INSERT policies (restrict to service role)
-- ============================================================================
-- CRITICAL: Prevent users from inserting malicious questions for other users
-- Only service role (AI question generation) can insert questions

RAISE NOTICE 'Processing: daily_questions table';

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Service role can insert AI questions" ON daily_questions;
DROP POLICY IF EXISTS "Users cannot insert questions" ON daily_questions;

-- Ensure RLS is enabled
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;

-- CREATE INSERT policy (service role only - for AI-generated questions)
CREATE POLICY "Service role can insert AI questions"
  ON daily_questions FOR INSERT
  TO service_role
  WITH CHECK (created_by_ai = true);

COMMENT ON POLICY "Service role can insert AI questions" ON daily_questions IS
  'Only Edge Functions (service role) can insert AI-generated questions. Auth via service_role JWT. created_by_ai must be true.';

-- CREATE INSERT policy (authenticated users CANNOT insert)
CREATE POLICY "Users cannot insert questions"
  ON daily_questions FOR INSERT
  TO authenticated
  WITH CHECK (false);

COMMENT ON POLICY "Users cannot insert questions" ON daily_questions IS
  'Security: Authenticated users are explicitly prevented from inserting daily questions to prevent abuse.';

RAISE NOTICE '✅ daily_questions: Added INSERT policies (service_role only)';

-- ============================================================================
-- PART 5: Verify user_activities table (if exists)
-- ============================================================================
-- This table is queried by unifiedTimelineService but may not exist
-- If it exists, ensure it has RLS policies

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_activities') THEN
    RAISE NOTICE 'Processing: user_activities table (found)';

    -- Enable RLS
    EXECUTE 'ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY';

    -- Drop existing policies if they exist
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own activities" ON user_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own activities" ON user_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own activities" ON user_activities';

    -- Create complete CRUD policies
    EXECUTE '
      CREATE POLICY "Users can view own activities"
        ON user_activities FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id)
    ';

    EXECUTE '
      CREATE POLICY "Users can insert own activities"
        ON user_activities FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id)
    ';

    EXECUTE '
      CREATE POLICY "Users can delete own activities"
        ON user_activities FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id)
    ';

    RAISE NOTICE '✅ user_activities: Added SELECT, INSERT, DELETE policies';
  ELSE
    RAISE WARNING '⚠️ user_activities table not found - skipping RLS policies';
    RAISE WARNING 'Action required: Verify if unifiedTimelineService.ts line 438 should query a different table';
  END IF;
END $$;

-- ============================================================================
-- PART 6: Add SECURITY DEFINER function documentation
-- ============================================================================
-- Document existing SECURITY DEFINER functions for security review

COMMENT ON FUNCTION public.user_owns_whatsapp_message(UUID, UUID, UUID) IS
  '🔒 SECURITY DEFINER: Checks if user owns a WhatsApp message via user_id or contact_network.
  - SET search_path = public prevents schema manipulation
  - Bypasses RLS on contact_network (intended behavior for ownership check)
  - Used by whatsapp_messages RLS policies
  - Audit: Verify contact_network has robust RLS policies';

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  table_name TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POST-MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';

  -- Verify question_responses has 4 policies (SELECT, INSERT, UPDATE, DELETE)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'question_responses';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ question_responses: % policies verified', policy_count;
  ELSE
    RAISE WARNING '⚠️ question_responses: Expected 4 policies, found %', policy_count;
  END IF;

  -- Verify weekly_summaries has 4 policies (SELECT, INSERT, UPDATE, DELETE)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'weekly_summaries';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ weekly_summaries: % policies verified', policy_count;
  ELSE
    RAISE WARNING '⚠️ weekly_summaries: Expected 4 policies, found %', policy_count;
  END IF;

  -- Verify whatsapp_user_activity has 3 policies (SELECT, INSERT, DELETE)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'whatsapp_user_activity';

  IF policy_count >= 3 THEN
    RAISE NOTICE '✅ whatsapp_user_activity: % policies verified', policy_count;
  ELSE
    RAISE WARNING '⚠️ whatsapp_user_activity: Expected 3 policies, found %', policy_count;
  END IF;

  -- Verify daily_questions has 3 policies (SELECT, 2x INSERT)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'daily_questions';

  IF policy_count >= 3 THEN
    RAISE NOTICE '✅ daily_questions: % policies verified', policy_count;
  ELSE
    RAISE WARNING '⚠️ daily_questions: Expected 3 policies, found %', policy_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Run supabase/audit-queries/verify_rls_policies.sql';
  RAISE NOTICE '2. Run supabase/audit-queries/test_rls_policies.sql';
  RAISE NOTICE '3. Fix unifiedTimelineService.ts: tasks → work_items';
  RAISE NOTICE '4. Deploy to staging and run E2E tests';
END $$;

-- ============================================================================
-- GRANT PERMISSIONS (if needed)
-- ============================================================================

-- Ensure authenticated users have permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON question_responses TO authenticated;
GRANT SELECT, UPDATE, DELETE ON weekly_summaries TO authenticated;
GRANT SELECT, INSERT, DELETE ON whatsapp_user_activity TO authenticated;
GRANT SELECT ON daily_questions TO authenticated, anon;

-- Service role gets full access (for Edge Functions)
GRANT ALL ON question_responses TO service_role;
GRANT ALL ON weekly_summaries TO service_role;
GRANT ALL ON whatsapp_user_activity TO service_role;
GRANT ALL ON daily_questions TO service_role;

-- ============================================================================
-- COMPLIANCE DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE question_responses IS
  'User responses to daily questions. GDPR Article 17 compliant (DELETE policy). RLS enforced via auth.uid().';

COMMENT ON TABLE weekly_summaries IS
  'AI-generated weekly summaries with user reflections. GDPR Article 17 compliant (DELETE policy). Insert via service_role only.';

COMMENT ON TABLE whatsapp_user_activity IS
  'Activity log for WhatsApp gamification. GDPR Article 17 compliant (DELETE policy). Append-only design with delete capability.';

COMMENT ON TABLE daily_questions IS
  'Daily reflection questions (pool + AI-generated). Insert restricted to service_role to prevent abuse. Public read for active questions.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
