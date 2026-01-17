-- ============================================================================
-- PHASE 2.2: COMPREHENSIVE AUDIT QUERIES
-- ============================================================================
-- Verify that all Phase 1 migrations were applied correctly
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '========== PHASE 2.2: RLS AUDIT VERIFICATION ==========';
  RAISE NOTICE 'Checking: 5 tables, 20 policies, 2 functions, 3 indexes';
  RAISE NOTICE '======================================================';
END $$;

-- ============================================================================
-- AUDIT 1: RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  policy_list TEXT;
  tables_checked INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> AUDIT 1: RLS POLICIES';
  RAISE NOTICE '';

  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  );

  -- Get policy list
  SELECT STRING_AGG(
    tablename || ': ' || COUNT(*)::text || ' policies',
    ' | ' ORDER BY tablename
  ) INTO policy_list
  FROM pg_policies
  WHERE tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
  GROUP BY tablename;

  RAISE NOTICE 'Total RLS Policies: % (expected: 20)', policy_count;
  RAISE NOTICE 'Breakdown: %', COALESCE(policy_list, 'No policies found');

  IF policy_count = 20 THEN
    RAISE NOTICE '✅ RLS POLICIES: PASS (20/20)';
  ELSIF policy_count > 0 THEN
    RAISE WARNING '⚠️  RLS POLICIES: PARTIAL (% / 20)', policy_count;
  ELSE
    RAISE WARNING '❌ RLS POLICIES: FAIL (0 / 20)';
  END IF;
END $$;

-- ============================================================================
-- AUDIT 2: SECURITY DEFINER FUNCTIONS
-- ============================================================================

DO $$
DECLARE
  function_count INTEGER;
  func_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> AUDIT 2: SECURITY DEFINER FUNCTIONS';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('can_access_daily_question', 'user_owns_whatsapp_message')
  AND prosecdef = true;

  RAISE NOTICE 'Total SECURITY DEFINER Functions: % (expected: 2)', function_count;

  FOR func_record IN
    SELECT proname, prosecdef
    FROM pg_proc
    WHERE proname IN ('can_access_daily_question', 'user_owns_whatsapp_message')
  LOOP
    RAISE NOTICE '  - %: prosecdef=%', func_record.proname, func_record.prosecdef;
  END LOOP;

  IF function_count = 2 THEN
    RAISE NOTICE '✅ FUNCTIONS: PASS (2/2)';
  ELSIF function_count > 0 THEN
    RAISE WARNING '⚠️  FUNCTIONS: PARTIAL (% / 2)', function_count;
  ELSE
    RAISE WARNING '❌ FUNCTIONS: FAIL (0 / 2)';
  END IF;
END $$;

-- ============================================================================
-- AUDIT 3: PERFORMANCE INDEXES
-- ============================================================================

DO $$
DECLARE
  index_count INTEGER;
  idx_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> AUDIT 3: PERFORMANCE INDEXES';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'whatsapp_sync_logs'
  AND indexname LIKE 'idx_whatsapp_sync_logs%';

  RAISE NOTICE 'Total Indexes on whatsapp_sync_logs: % (expected: 3)', index_count;

  FOR idx_record IN
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'whatsapp_sync_logs'
    AND indexname LIKE 'idx_whatsapp_sync_logs%'
    ORDER BY indexname
  LOOP
    RAISE NOTICE '  ✓ %', idx_record.indexname;
  END LOOP;

  IF index_count = 3 THEN
    RAISE NOTICE '✅ INDEXES: PASS (3/3)';
  ELSIF index_count > 0 THEN
    RAISE WARNING '⚠️  INDEXES: PARTIAL (% / 3)', index_count;
  ELSE
    RAISE WARNING '❌ INDEXES: FAIL (0 / 3)';
  END IF;
END $$;

-- ============================================================================
-- AUDIT 4: TABLE RLS STATUS
-- ============================================================================

DO $$
DECLARE
  rls_record RECORD;
  rls_enabled_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> AUDIT 4: TABLE RLS STATUS';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables
  WHERE tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
  AND schemaname = 'public'
  AND rowsecurity = true;

  RAISE NOTICE 'Tables with RLS enabled: % (expected: 5)', rls_enabled_count;

  FOR rls_record IN
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE tablename IN (
      'ai_usage_tracking_errors',
      'data_deletion_requests',
      'daily_questions',
      'whatsapp_messages',
      'whatsapp_sync_logs'
    )
    AND schemaname = 'public'
    ORDER BY tablename
  LOOP
    IF rls_record.rowsecurity THEN
      RAISE NOTICE '  ✓ %: RLS ENABLED', rls_record.tablename;
    ELSE
      RAISE WARNING '  ✗ %: RLS DISABLED', rls_record.tablename;
    END IF;
  END LOOP;

  IF rls_enabled_count = 5 THEN
    RAISE NOTICE '✅ RLS STATUS: PASS (5/5)';
  ELSIF rls_enabled_count > 0 THEN
    RAISE WARNING '⚠️  RLS STATUS: PARTIAL (% / 5)', rls_enabled_count;
  ELSE
    RAISE WARNING '❌ RLS STATUS: FAIL (0 / 5)';
  END IF;
END $$;

-- ============================================================================
-- AUDIT 5: POLICY OPERATIONS COVERAGE
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
  table_policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> AUDIT 5: POLICY OPERATIONS COVERAGE (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '';

  FOR policy_record IN
    SELECT
      tablename,
      STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as operations,
      COUNT(*) as policy_count
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
  LOOP
    RAISE NOTICE '  %: % (policies: %)',
      RPAD(policy_record.tablename, 30),
      policy_record.operations,
      policy_record.policy_count;
  END LOOP;

  RAISE NOTICE '✅ POLICY COVERAGE: All tables checked';
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  total_policies INTEGER;
  total_functions INTEGER;
  total_indexes INTEGER;
  total_tables_rls INTEGER;
  success_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== PHASE 2.2: AUDIT SUMMARY ==========';
  RAISE NOTICE '';

  -- Get totals
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  );

  SELECT COUNT(*) INTO total_functions
  FROM pg_proc
  WHERE proname IN ('can_access_daily_question', 'user_owns_whatsapp_message')
  AND prosecdef = true;

  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE tablename = 'whatsapp_sync_logs'
  AND indexname LIKE 'idx_whatsapp_sync_logs%';

  SELECT COUNT(*) INTO total_tables_rls
  FROM pg_tables
  WHERE tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  )
  AND schemaname = 'public'
  AND rowsecurity = true;

  -- Calculate success
  IF total_policies = 20 THEN success_count := success_count + 1; END IF;
  IF total_functions = 2 THEN success_count := success_count + 1; END IF;
  IF total_indexes = 3 THEN success_count := success_count + 1; END IF;
  IF total_tables_rls = 5 THEN success_count := success_count + 1; END IF;

  -- Print results
  RAISE NOTICE 'RLS Policies:        % / 20 ❌', total_policies;
  RAISE NOTICE 'Functions:           % / 2  ❌', total_functions;
  RAISE NOTICE 'Indexes:             % / 3  ❌', total_indexes;
  RAISE NOTICE 'Tables with RLS:     % / 5  ❌', total_tables_rls;
  RAISE NOTICE '';

  IF success_count = 4 THEN
    RAISE NOTICE '🎉 PHASE 2.2: AUDIT PASSED (4/4 checks)';
    RAISE NOTICE 'All Phase 1 migrations applied successfully!';
  ELSE
    RAISE WARNING '⚠️  PHASE 2.2: PARTIAL PASS (% / 4 checks)', success_count;
    RAISE WARNING 'Review warnings above for details';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Next: Phase 2.3 - RLS Policy Testing';
  RAISE NOTICE 'Create test users and verify access controls';
  RAISE NOTICE '==============================================';
END $$;
