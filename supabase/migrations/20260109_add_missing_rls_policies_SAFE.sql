-- ============================================================================
-- Migration: Add Missing RLS Policies for Unified Timeline Tables (SAFE VERSION)
-- Date: 2026-01-09
-- Priority: CRITICAL - Security gaps identified in audit
-- Note: Only applies policies to tables that actually exist
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

-- ============================================================================
-- PART 1: question_responses - Add UPDATE and DELETE policies
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'question_responses') THEN
    RAISE NOTICE 'Processing: question_responses table';

    -- Drop existing policies if they exist (idempotent)
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own responses" ON question_responses';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own responses" ON question_responses';

    -- Ensure RLS is enabled
    EXECUTE 'ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY';

    -- CREATE UPDATE policy
    EXECUTE '
      CREATE POLICY "Users can update own responses"
        ON question_responses FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    ';

    -- CREATE DELETE policy (GDPR Right to Erasure)
    EXECUTE '
      CREATE POLICY "Users can delete own responses"
        ON question_responses FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id)
    ';

    RAISE NOTICE '✅ question_responses: Added UPDATE and DELETE policies';
  ELSE
    RAISE WARNING '⚠️ question_responses table not found - skipping RLS policies';
  END IF;
END $$;

-- ============================================================================
-- PART 2: weekly_summaries - Add INSERT and DELETE policies
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'weekly_summaries') THEN
    RAISE NOTICE 'Processing: weekly_summaries table';

    -- Drop existing policies if they exist (idempotent)
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert summaries" ON weekly_summaries';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own summaries" ON weekly_summaries';

    -- Ensure RLS is enabled
    EXECUTE 'ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY';

    -- CREATE INSERT policy (service role only)
    EXECUTE '
      CREATE POLICY "Service role can insert summaries"
        ON weekly_summaries FOR INSERT
        TO service_role
        WITH CHECK (true)
    ';

    -- CREATE DELETE policy (users can delete own summaries)
    EXECUTE '
      CREATE POLICY "Users can delete own summaries"
        ON weekly_summaries FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id)
    ';

    RAISE NOTICE '✅ weekly_summaries: Added INSERT (service_role) and DELETE policies';
  ELSE
    RAISE WARNING '⚠️ weekly_summaries table not found - skipping RLS policies';
  END IF;
END $$;

-- ============================================================================
-- PART 3: whatsapp_user_activity - Add DELETE policy
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_user_activity') THEN
    RAISE NOTICE 'Processing: whatsapp_user_activity table';

    -- Drop existing policy if it exists (idempotent)
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own activities" ON whatsapp_user_activity';

    -- Ensure RLS is enabled
    EXECUTE 'ALTER TABLE whatsapp_user_activity ENABLE ROW LEVEL SECURITY';

    -- CREATE DELETE policy
    EXECUTE '
      CREATE POLICY "Users can delete own activities"
        ON whatsapp_user_activity FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id)
    ';

    RAISE NOTICE '✅ whatsapp_user_activity: Added DELETE policy';
  ELSE
    RAISE WARNING '⚠️ whatsapp_user_activity table not found - skipping RLS policies';
  END IF;
END $$;

-- ============================================================================
-- PART 4: daily_questions - Add INSERT policies (restrict to service role)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'daily_questions') THEN
    RAISE NOTICE 'Processing: daily_questions table';

    -- Drop existing policies if they exist (idempotent)
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert AI questions" ON daily_questions';
    EXECUTE 'DROP POLICY IF EXISTS "Users cannot insert questions" ON daily_questions';

    -- Ensure RLS is enabled
    EXECUTE 'ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY';

    -- CREATE INSERT policy (service role only - for AI-generated questions)
    EXECUTE '
      CREATE POLICY "Service role can insert AI questions"
        ON daily_questions FOR INSERT
        TO service_role
        WITH CHECK (created_by_ai = true)
    ';

    -- CREATE INSERT policy (authenticated users CANNOT insert)
    EXECUTE '
      CREATE POLICY "Users cannot insert questions"
        ON daily_questions FOR INSERT
        TO authenticated
        WITH CHECK (false)
    ';

    RAISE NOTICE '✅ daily_questions: Added INSERT policies (service_role only)';
  ELSE
    RAISE WARNING '⚠️ daily_questions table not found - skipping RLS policies';
  END IF;
END $$;

-- ============================================================================
-- PART 5: user_activities table (if exists)
-- ============================================================================

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
  END IF;
END $$;

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POST-MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';

  -- Verify question_responses
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'question_responses') THEN
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'question_responses';
    IF policy_count >= 4 THEN
      RAISE NOTICE '✅ question_responses: % policies verified', policy_count;
    ELSE
      RAISE WARNING '⚠️ question_responses: Expected 4 policies, found %', policy_count;
    END IF;
  END IF;

  -- Verify weekly_summaries
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'weekly_summaries') THEN
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'weekly_summaries';
    IF policy_count >= 4 THEN
      RAISE NOTICE '✅ weekly_summaries: % policies verified', policy_count;
    ELSE
      RAISE WARNING '⚠️ weekly_summaries: Expected 4 policies, found %', policy_count;
    END IF;
  END IF;

  -- Verify whatsapp_user_activity
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_user_activity') THEN
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'whatsapp_user_activity';
    IF policy_count >= 3 THEN
      RAISE NOTICE '✅ whatsapp_user_activity: % policies verified', policy_count;
    ELSE
      RAISE WARNING '⚠️ whatsapp_user_activity: Expected 3 policies, found %', policy_count;
    END IF;
  END IF;

  -- Verify daily_questions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'daily_questions') THEN
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'daily_questions';
    IF policy_count >= 3 THEN
      RAISE NOTICE '✅ daily_questions: % policies verified', policy_count;
    ELSE
      RAISE WARNING '⚠️ daily_questions: Expected 3 policies, found %', policy_count;
    END IF;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- GRANT PERMISSIONS (only for tables that exist)
-- ============================================================================

DO $$
BEGIN
  -- question_responses
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'question_responses') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON question_responses TO authenticated';
    EXECUTE 'GRANT ALL ON question_responses TO service_role';
  END IF;

  -- weekly_summaries
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'weekly_summaries') THEN
    EXECUTE 'GRANT SELECT, UPDATE, DELETE ON weekly_summaries TO authenticated';
    EXECUTE 'GRANT ALL ON weekly_summaries TO service_role';
  END IF;

  -- whatsapp_user_activity
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_user_activity') THEN
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON whatsapp_user_activity TO authenticated';
    EXECUTE 'GRANT ALL ON whatsapp_user_activity TO service_role';
  END IF;

  -- daily_questions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'daily_questions') THEN
    EXECUTE 'GRANT SELECT ON daily_questions TO authenticated, anon';
    EXECUTE 'GRANT ALL ON daily_questions TO service_role';
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
