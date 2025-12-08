-- =====================================================
-- POST-DEPLOYMENT VALIDATION SCRIPT
-- Migration: 20251206_journey_redesign
-- =====================================================
-- Run this script after applying the migration to verify
-- everything was created correctly.
-- =====================================================

-- =====================================================
-- 1. TABLE VALIDATION
-- =====================================================

\echo '=================================================='
\echo '1. Validating Tables...'
\echo '=================================================='

-- 1.1 Check all tables exist
SELECT
  CASE
    WHEN COUNT(*) = 6 THEN '✓ PASS: All 6 tables created'
    ELSE '✗ FAIL: Expected 6 tables, found ' || COUNT(*)
  END as table_check
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'moments',
  'weekly_summaries',
  'daily_questions',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
);

-- 1.2 List all created tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
  'moments',
  'weekly_summaries',
  'daily_questions',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
)
ORDER BY table_name;

-- 1.3 Check RLS is enabled on all tables
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ Enabled'
    ELSE '✗ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'moments',
  'weekly_summaries',
  'daily_questions',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
)
ORDER BY tablename;

-- =====================================================
-- 2. FUNCTION VALIDATION
-- =====================================================

\echo ''
\echo '=================================================='
\echo '2. Validating Functions...'
\echo '=================================================='

-- 2.1 Check all functions exist
SELECT
  CASE
    WHEN COUNT(*) >= 3 THEN '✓ PASS: All 3+ functions created'
    ELSE '✗ FAIL: Expected 3+ functions, found ' || COUNT(*)
  END as function_check
FROM pg_proc
WHERE proname IN (
  'calculate_cp_level',
  'award_consciousness_points',
  'update_moment_streak',
  'update_updated_at_column'
);

-- 2.2 List all functions with signatures
SELECT
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc p
WHERE p.proname IN (
  'calculate_cp_level',
  'award_consciousness_points',
  'update_moment_streak',
  'update_updated_at_column'
)
ORDER BY p.proname;

-- 2.3 Test calculate_cp_level function
SELECT
  points,
  level,
  level_name,
  CASE
    WHEN (points = 0 AND level = 1 AND level_name = 'Observador') OR
         (points = 150 AND level = 2 AND level_name = 'Consciente') OR
         (points = 600 AND level = 3 AND level_name = 'Reflexivo') OR
         (points = 2000 AND level = 4 AND level_name = 'Integrado') OR
         (points = 6000 AND level = 5 AND level_name = 'Mestre')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as test_result
FROM (
  SELECT 0 as points, * FROM calculate_cp_level(0)
  UNION ALL
  SELECT 150 as points, * FROM calculate_cp_level(150)
  UNION ALL
  SELECT 600 as points, * FROM calculate_cp_level(600)
  UNION ALL
  SELECT 2000 as points, * FROM calculate_cp_level(2000)
  UNION ALL
  SELECT 6000 as points, * FROM calculate_cp_level(6000)
) tests;

-- =====================================================
-- 3. INDEX VALIDATION
-- =====================================================

\echo ''
\echo '=================================================='
\echo '3. Validating Indexes...'
\echo '=================================================='

-- 3.1 Check indexes on moments table
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'moments'
ORDER BY indexname;

-- 3.2 Check indexes on other key tables
SELECT
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'moments',
  'weekly_summaries',
  'question_responses',
  'consciousness_points_log'
)
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 4. TRIGGER VALIDATION
-- =====================================================

\echo ''
\echo '=================================================='
\echo '4. Validating Triggers...'
\echo '=================================================='

-- 4.1 Check triggers exist
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname LIKE '%update%updated_at%'
AND tgrelid::regclass::text IN (
  'moments',
  'user_consciousness_stats'
);

-- =====================================================
-- 5. RLS POLICY VALIDATION
-- =====================================================

\echo ''
\echo '=================================================='
\echo '5. Validating RLS Policies...'
\echo '=================================================='

-- 5.1 Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'moments',
  'weekly_summaries',
  'daily_questions',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
)
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 5.2 Verify critical policies exist
SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('moments', 'weekly_summaries', 'user_consciousness_stats')
ORDER BY tablename, policyname;

-- =====================================================
-- 6. SEED DATA VALIDATION
-- =====================================================

\echo ''
\echo '=================================================='
\echo '6. Validating Seed Data...'
\echo '=================================================='

-- 6.1 Check daily questions seeded
SELECT
  CASE
    WHEN COUNT(*) = 10 THEN '✓ PASS: All 10 questions seeded'
    ELSE '✗ FAIL: Expected 10 questions, found ' || COUNT(*)
  END as seed_check
FROM daily_questions;

-- 6.2 List all seeded questions
SELECT
  id,
  LEFT(question_text, 50) || '...' as question_preview,
  category,
  active
FROM daily_questions
ORDER BY created_at;

-- 6.3 Check question distribution by category
SELECT
  category,
  COUNT(*) as question_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) || '%' as percentage
FROM daily_questions
WHERE active = true
GROUP BY category
ORDER BY question_count DESC;

-- =====================================================
-- 7. CONSTRAINT VALIDATION
-- =====================================================

\echo ''
\echo '=================================================='
\echo '7. Validating Constraints...'
\echo '=================================================='

-- 7.1 Check primary keys
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'PRIMARY KEY'
AND tc.table_name IN (
  'moments',
  'weekly_summaries',
  'daily_questions',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
)
ORDER BY tc.table_name;

-- 7.2 Check foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN (
  'moments',
  'weekly_summaries',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
)
ORDER BY tc.table_name, kcu.column_name;

-- 7.3 Check unique constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as unique_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_schema = 'public'
AND tc.table_name IN (
  'moments',
  'weekly_summaries',
  'question_responses'
)
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- =====================================================
-- 8. STORAGE VALIDATION
-- =====================================================

\echo ''
\echo '=================================================='
\echo '8. Validating Storage Buckets...'
\echo '=================================================='

-- 8.1 Check moments-audio bucket exists
SELECT
  id,
  name,
  CASE WHEN public THEN '✓ Public' ELSE '✗ Private' END as accessibility,
  created_at
FROM storage.buckets
WHERE name = 'moments-audio';

-- 8.2 Check storage policies
SELECT
  policyname as policy_name,
  cmd as operation,
  CASE
    WHEN roles = '{authenticated}' THEN 'Authenticated users'
    WHEN roles = '{anon}' THEN 'Anonymous users'
    ELSE array_to_string(roles, ', ')
  END as allowed_roles
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%moments%audio%'
ORDER BY policyname;

-- =====================================================
-- 9. COMPREHENSIVE SUMMARY
-- =====================================================

\echo ''
\echo '=================================================='
\echo '9. Deployment Summary'
\echo '=================================================='

DO $$
DECLARE
  v_table_count INT;
  v_function_count INT;
  v_question_count INT;
  v_bucket_count INT;
  v_policy_count INT;
  v_index_count INT;
  v_all_pass BOOLEAN := true;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO v_table_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('moments', 'weekly_summaries', 'daily_questions',
                    'question_responses', 'consciousness_points_log',
                    'user_consciousness_stats');

  -- Count functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN ('calculate_cp_level', 'award_consciousness_points',
                    'update_moment_streak', 'update_updated_at_column');

  -- Count questions
  SELECT COUNT(*) INTO v_question_count
  FROM daily_questions
  WHERE active = true;

  -- Count storage buckets
  SELECT COUNT(*) INTO v_bucket_count
  FROM storage.buckets
  WHERE name = 'moments-audio';

  -- Count RLS policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('moments', 'weekly_summaries', 'daily_questions',
                    'question_responses', 'consciousness_points_log',
                    'user_consciousness_stats');

  -- Count indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('moments', 'weekly_summaries', 'question_responses',
                    'consciousness_points_log');

  -- Print summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DEPLOYMENT VALIDATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables:           %/6  %', v_table_count,
    CASE WHEN v_table_count = 6 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Functions:        %/4  %', v_function_count,
    CASE WHEN v_function_count >= 4 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Daily Questions:  %/10 %', v_question_count,
    CASE WHEN v_question_count = 10 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Storage Buckets:  %/1  %', v_bucket_count,
    CASE WHEN v_bucket_count = 1 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'RLS Policies:     %    %', v_policy_count,
    CASE WHEN v_policy_count >= 15 THEN '✓' ELSE '?' END;
  RAISE NOTICE 'Indexes:          %    %', v_index_count,
    CASE WHEN v_index_count >= 8 THEN '✓' ELSE '?' END;
  RAISE NOTICE '';

  -- Overall status
  IF v_table_count = 6 AND v_function_count >= 4 AND
     v_question_count = 10 AND v_bucket_count = 1 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ ALL CRITICAL VALIDATIONS PASSED';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '========================================';
    RAISE WARNING '✗ SOME VALIDATIONS FAILED - CHECK ABOVE';
    RAISE WARNING '========================================';
  END IF;
END $$;
