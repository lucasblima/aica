-- ============================================================================
-- PHASE 1 POST-EXECUTION VALIDATION SCRIPT
-- ============================================================================
-- Issue: #73 Phase 2 - Performance & Indexes
-- Task: 2.1 - Validate Phase 1 Migrations
-- Project: uzywajqzbdbrfammshdg (Staging)
-- Purpose: Comprehensive validation of all Phase 1 migration results
-- ============================================================================

\echo '============================================================================'
\echo 'PHASE 1 POST-EXECUTION VALIDATION'
\echo 'Started at: ' || NOW()::TEXT
\echo '============================================================================'

-- ============================================================================
-- TEST 1: RLS Enabled Status
-- ============================================================================

\echo ''
\echo '>>> TEST 1: Verify RLS is enabled on all 5 tables'
\echo ''

DO $$
DECLARE
  rls_disabled_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO rls_disabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'ai_usage_tracking_errors',
      'data_deletion_requests',
      'daily_questions',
      'whatsapp_messages',
      'whatsapp_sync_logs'
    )
    AND rowsecurity = false;

  IF rls_disabled_count > 0 THEN
    RAISE WARNING '❌ TEST 1 FAILED: % tables have RLS disabled', rls_disabled_count;
    FOR rec IN (
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'ai_usage_tracking_errors',
          'data_deletion_requests',
          'daily_questions',
          'whatsapp_messages',
          'whatsapp_sync_logs'
        )
        AND rowsecurity = false
    ) LOOP
      RAISE WARNING '   - Table: %', rec.tablename;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ TEST 1 PASSED: All 5 tables have RLS enabled';
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Policy Count by Table
-- ============================================================================

\echo ''
\echo '>>> TEST 2: Verify 4 CRUD policies per table'
\echo ''

SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ PASS'
    WHEN COUNT(*) < 4 THEN '❌ FAIL (missing ' || (4 - COUNT(*))::TEXT || ')'
    ELSE '⚠️  WARN (extra ' || (COUNT(*) - 4)::TEXT || ')'
  END as status,
  STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as operations
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- TEST 3: Detailed Policy List
-- ============================================================================

\echo ''
\echo '>>> TEST 3: Detailed policy breakdown by table and operation'
\echo ''

SELECT
  tablename,
  policyname,
  cmd::text as operation,
  roles::text,
  CASE
    WHEN qual IS NOT NULL THEN 'USING defined'
    ELSE 'No USING'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK defined'
    ELSE 'No WITH CHECK'
  END as check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
ORDER BY tablename, cmd;

-- ============================================================================
-- TEST 4: SECURITY DEFINER Functions
-- ============================================================================

\echo ''
\echo '>>> TEST 4: Verify SECURITY DEFINER functions exist'
\echo ''

DO $$
DECLARE
  function_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'can_access_daily_question',
    'user_owns_whatsapp_message'
  );

  IF function_count < 2 THEN
    RAISE WARNING '❌ TEST 4 FAILED: Expected 2 SECURITY DEFINER functions, found %', function_count;
  ELSE
    RAISE NOTICE '✅ TEST 4 PASSED: All 2 SECURITY DEFINER functions exist';
  END IF;

  -- List function details
  RAISE NOTICE '';
  RAISE NOTICE 'Function details:';
  FOR rec IN (
    SELECT
      proname as function_name,
      prosecdef as is_security_definer,
      provolatile as volatility,
      pronargs as arg_count
    FROM pg_proc
    WHERE proname IN (
      'can_access_daily_question',
      'user_owns_whatsapp_message'
    )
    ORDER BY proname
  ) LOOP
    RAISE NOTICE '   - %: security_definer=%, args=%',
      rec.function_name, rec.is_security_definer, rec.arg_count;
  END LOOP;
END $$;

-- ============================================================================
-- TEST 5: Performance Indexes on whatsapp_sync_logs
-- ============================================================================

\echo ''
\echo '>>> TEST 5: Verify performance indexes exist'
\echo ''

DO $$
DECLARE
  index_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'whatsapp_sync_logs'
    AND indexname LIKE 'idx_whatsapp_sync_logs%';

  IF index_count < 3 THEN
    RAISE WARNING '❌ TEST 5 FAILED: Expected 3 indexes, found %', index_count;
  ELSE
    RAISE NOTICE '✅ TEST 5 PASSED: All 3 performance indexes exist';
  END IF;

  -- List index details
  RAISE NOTICE '';
  RAISE NOTICE 'Index details:';
  FOR rec IN (
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_sync_logs'
      AND indexname LIKE 'idx_whatsapp_sync_logs%'
    ORDER BY indexname
  ) LOOP
    RAISE NOTICE '   - %', rec.indexname;
  END LOOP;
END $$;

-- ============================================================================
-- TEST 6: Permission Grants
-- ============================================================================

\echo ''
\echo '>>> TEST 6: Verify table permissions for authenticated role'
\echo ''

SELECT
  tablename,
  STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) as granted_privileges
FROM information_schema.table_privileges
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
  AND table_name IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- TEST 7: Policy Coverage Gap Analysis
-- ============================================================================

\echo ''
\echo '>>> TEST 7: Identify missing CRUD operations'
\echo ''

WITH required_operations AS (
  SELECT
    table_name,
    operation
  FROM (
    VALUES
      ('ai_usage_tracking_errors'), ('data_deletion_requests'),
      ('daily_questions'), ('whatsapp_messages'), ('whatsapp_sync_logs')
  ) AS tables(table_name)
  CROSS JOIN (
    VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
  ) AS ops(operation)
),
existing_policies AS (
  SELECT
    tablename as table_name,
    cmd::text as operation
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'ai_usage_tracking_errors',
      'data_deletion_requests',
      'daily_questions',
      'whatsapp_messages',
      'whatsapp_sync_logs'
    )
)
SELECT
  r.table_name,
  r.operation,
  CASE
    WHEN e.operation IS NULL THEN '❌ MISSING'
    ELSE '✅ EXISTS'
  END as status
FROM required_operations r
LEFT JOIN existing_policies e
  ON r.table_name = e.table_name
  AND r.operation = e.operation
WHERE e.operation IS NULL
ORDER BY r.table_name, r.operation;

-- ============================================================================
-- TEST 8: Policy Naming Convention Compliance
-- ============================================================================

\echo ''
\echo '>>> TEST 8: Verify policy naming follows standards'
\echo ''

SELECT
  tablename,
  policyname,
  CASE
    WHEN policyname LIKE 'Users can %' THEN '✅ PASS'
    ELSE '⚠️  NON-STANDARD'
  END as naming_compliance
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST 9: Check for Orphaned Policies (No RLS Enabled)
-- ============================================================================

\echo ''
\echo '>>> TEST 9: Check for policies on tables without RLS enabled'
\echo ''

DO $$
DECLARE
  orphaned_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM pg_policies pol
  JOIN pg_tables tbl
    ON pol.tablename = tbl.tablename
    AND pol.schemaname = tbl.schemaname
  WHERE pol.schemaname = 'public'
    AND pol.tablename IN (
      'ai_usage_tracking_errors',
      'data_deletion_requests',
      'daily_questions',
      'whatsapp_messages',
      'whatsapp_sync_logs'
    )
    AND tbl.rowsecurity = false;

  IF orphaned_count > 0 THEN
    RAISE WARNING '❌ TEST 9 FAILED: Found % orphaned policies (RLS disabled)', orphaned_count;
  ELSE
    RAISE NOTICE '✅ TEST 9 PASSED: No orphaned policies found';
  END IF;
END $$;

-- ============================================================================
-- TEST 10: Verify Updated USING and WITH CHECK Clauses
-- ============================================================================

\echo ''
\echo '>>> TEST 10: Verify policies have proper USING/WITH CHECK logic'
\echo ''

SELECT
  tablename,
  policyname,
  cmd::text as operation,
  CASE
    WHEN cmd IN ('SELECT', 'DELETE', 'UPDATE') AND qual IS NULL THEN '❌ Missing USING'
    WHEN cmd IN ('SELECT', 'DELETE', 'UPDATE') AND qual IS NOT NULL THEN '✅ Has USING'
    ELSE 'N/A'
  END as using_check,
  CASE
    WHEN cmd IN ('INSERT', 'UPDATE') AND with_check IS NULL THEN '❌ Missing WITH CHECK'
    WHEN cmd IN ('INSERT', 'UPDATE') AND with_check IS NOT NULL THEN '✅ Has WITH CHECK'
    ELSE 'N/A'
  END as check_clause_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
ORDER BY tablename, cmd;

-- ============================================================================
-- FINAL SUMMARY REPORT
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'FINAL SUMMARY REPORT'
\echo '============================================================================'

DO $$
DECLARE
  total_tables INTEGER;
  tables_with_rls INTEGER;
  total_policies INTEGER;
  expected_policies INTEGER := 20;
  total_functions INTEGER;
  expected_functions INTEGER := 2;
  total_indexes INTEGER;
  expected_indexes INTEGER := 3;
  missing_operations INTEGER;
  all_tests_passed BOOLEAN := true;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'ai_usage_tracking_errors',
      'data_deletion_requests',
      'daily_questions',
      'whatsapp_messages',
      'whatsapp_sync_logs'
    );

  -- Count tables with RLS
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'ai_usage_tracking_errors',
      'data_deletion_requests',
      'daily_questions',
      'whatsapp_messages',
      'whatsapp_sync_logs'
    )
    AND rowsecurity = true;

  -- Count policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'ai_usage_tracking_errors',
      'data_deletion_requests',
      'daily_questions',
      'whatsapp_messages',
      'whatsapp_sync_logs'
    );

  -- Count functions
  SELECT COUNT(*) INTO total_functions
  FROM pg_proc
  WHERE proname IN (
    'can_access_daily_question',
    'user_owns_whatsapp_message'
  );

  -- Count indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'whatsapp_sync_logs'
    AND indexname LIKE 'idx_whatsapp_sync_logs%';

  -- Count missing operations
  WITH required_operations AS (
    SELECT table_name, operation
    FROM (
      VALUES
        ('ai_usage_tracking_errors'), ('data_deletion_requests'),
        ('daily_questions'), ('whatsapp_messages'), ('whatsapp_sync_logs')
    ) AS tables(table_name)
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS ops(operation)
  ),
  existing_policies AS (
    SELECT tablename as table_name, cmd::text as operation
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'ai_usage_tracking_errors', 'data_deletion_requests',
        'daily_questions', 'whatsapp_messages', 'whatsapp_sync_logs'
      )
  )
  SELECT COUNT(*) INTO missing_operations
  FROM required_operations r
  LEFT JOIN existing_policies e
    ON r.table_name = e.table_name AND r.operation = e.operation
  WHERE e.operation IS NULL;

  -- Print summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 VALIDATION RESULTS:';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Tables
  IF total_tables = 5 AND tables_with_rls = 5 THEN
    RAISE NOTICE '✅ Tables: %/5 exist, %/5 have RLS enabled', total_tables, tables_with_rls;
  ELSE
    RAISE WARNING '❌ Tables: %/5 exist, %/5 have RLS enabled', total_tables, tables_with_rls;
    all_tests_passed := false;
  END IF;

  -- Policies
  IF total_policies = expected_policies THEN
    RAISE NOTICE '✅ RLS Policies: %/% created', total_policies, expected_policies;
  ELSE
    RAISE WARNING '❌ RLS Policies: %/% created (missing: %)', total_policies, expected_policies, (expected_policies - total_policies);
    all_tests_passed := false;
  END IF;

  -- Functions
  IF total_functions = expected_functions THEN
    RAISE NOTICE '✅ SECURITY DEFINER Functions: %/% created', total_functions, expected_functions;
  ELSE
    RAISE WARNING '❌ SECURITY DEFINER Functions: %/% created', total_functions, expected_functions;
    all_tests_passed := false;
  END IF;

  -- Indexes
  IF total_indexes = expected_indexes THEN
    RAISE NOTICE '✅ Performance Indexes: %/% created', total_indexes, expected_indexes;
  ELSE
    RAISE WARNING '❌ Performance Indexes: %/% created', total_indexes, expected_indexes;
    all_tests_passed := false;
  END IF;

  -- Missing operations
  IF missing_operations = 0 THEN
    RAISE NOTICE '✅ CRUD Coverage: Complete (no missing operations)';
  ELSE
    RAISE WARNING '❌ CRUD Coverage: % missing operations detected', missing_operations;
    all_tests_passed := false;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════';

  IF all_tests_passed THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PHASE 1 VALIDATION: 100%% SUCCESS';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 ALL TESTS PASSED - Ready for Phase 2';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Run full security audit (security-audit-full.sql)';
    RAISE NOTICE '   2. Test RLS policies with test users';
    RAISE NOTICE '   3. Proceed to Phase 2: Create 13 performance indexes';
    RAISE NOTICE '   4. Monitor query performance after index creation';
  ELSE
    RAISE WARNING '';
    RAISE WARNING '⚠️  PHASE 1 VALIDATION: INCOMPLETE';
    RAISE WARNING '';
    RAISE WARNING '📋 ACTION REQUIRED:';
    RAISE WARNING '   1. Review failed test details above';
    RAISE WARNING '   2. Re-run specific migrations that failed';
    RAISE WARNING '   3. Verify database connection and permissions';
    RAISE WARNING '   4. Check migration logs for errors';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Validation completed at: ' || NOW()::TEXT;
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
