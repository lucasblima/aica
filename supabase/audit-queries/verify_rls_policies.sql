-- ============================================================================
-- RLS POLICY VERIFICATION SCRIPT
-- Purpose: Verify Row Level Security policies for Unified Timeline tables
-- Created: 2026-01-09
-- ============================================================================

-- ============================================================================
-- PART 1: CHECK RLS IS ENABLED
-- ============================================================================

SELECT
  'RLS ENABLED STATUS' as check_type,
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_messages',
    'moments',
    'work_items',
    'tasks',
    'question_responses',
    'weekly_summaries',
    'whatsapp_user_activity',
    'grant_responses',
    'daily_questions',
    'user_activities'
  )
ORDER BY
  CASE WHEN rowsecurity THEN 0 ELSE 1 END,
  tablename;

-- ============================================================================
-- PART 2: CHECK POLICIES EXIST (ALL TABLES)
-- ============================================================================

SELECT
  'POLICY INVENTORY' as check_type,
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ' | ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_messages',
    'moments',
    'work_items',
    'tasks',
    'question_responses',
    'weekly_summaries',
    'whatsapp_user_activity',
    'grant_responses',
    'daily_questions',
    'user_activities'
  )
GROUP BY schemaname, tablename
ORDER BY policy_count ASC, tablename;

-- ============================================================================
-- PART 3: DETAILED POLICY INSPECTION
-- ============================================================================

SELECT
  'POLICY DETAILS' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN '✅ PERMISSIVE'
    ELSE '⚠️ RESTRICTIVE'
  END as policy_type,
  roles,
  CASE
    WHEN qual IS NOT NULL THEN LEFT(qual::text, 80)
    ELSE 'N/A'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN LEFT(with_check::text, 80)
    ELSE 'N/A'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_messages',
    'moments',
    'work_items',
    'tasks',
    'question_responses',
    'weekly_summaries',
    'whatsapp_user_activity',
    'grant_responses',
    'daily_questions',
    'user_activities'
  )
ORDER BY
  tablename,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- PART 4: CHECK FOR MISSING CRUD POLICIES
-- ============================================================================

WITH expected_policies AS (
  SELECT table_name, operation
  FROM unnest(ARRAY[
    'whatsapp_messages', 'moments', 'work_items',
    'question_responses', 'weekly_summaries',
    'whatsapp_user_activity', 'grant_responses'
  ]) AS table_name
  CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS operation
),
actual_policies AS (
  SELECT
    tablename as table_name,
    cmd as operation
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'whatsapp_messages', 'moments', 'work_items',
      'question_responses', 'weekly_summaries',
      'whatsapp_user_activity', 'grant_responses'
    )
)
SELECT
  'MISSING POLICIES' as check_type,
  e.table_name,
  e.operation,
  '❌ MISSING' as status,
  CASE
    WHEN e.operation = 'SELECT' THEN 'CRITICAL - Users can potentially see all data'
    WHEN e.operation = 'INSERT' THEN 'HIGH - Users can insert data for any user_id'
    WHEN e.operation = 'UPDATE' THEN 'HIGH - Users can modify other users data'
    WHEN e.operation = 'DELETE' THEN 'MEDIUM - Users can delete other users data'
  END as security_risk
FROM expected_policies e
LEFT JOIN actual_policies a
  ON e.table_name = a.table_name
  AND e.operation = a.operation
WHERE a.table_name IS NULL
ORDER BY
  CASE
    WHEN e.operation = 'SELECT' THEN 1
    WHEN e.operation = 'INSERT' THEN 2
    WHEN e.operation = 'UPDATE' THEN 3
    WHEN e.operation = 'DELETE' THEN 4
  END,
  e.table_name;

-- ============================================================================
-- PART 5: CHECK IF POLICIES USE auth.uid()
-- ============================================================================

SELECT
  'AUTH.UID() USAGE' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual::text ILIKE '%auth.uid()%'
      OR with_check::text ILIKE '%auth.uid()%' THEN '✅ USES auth.uid()'
    WHEN qual::text ILIKE '%user_id%'
      OR with_check::text ILIKE '%user_id%' THEN '⚠️ Uses user_id (verify not client-controlled)'
    ELSE '❌ NO USER FILTERING DETECTED'
  END as auth_check_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_messages',
    'moments',
    'work_items',
    'tasks',
    'question_responses',
    'weekly_summaries',
    'whatsapp_user_activity',
    'grant_responses'
  )
ORDER BY
  CASE
    WHEN qual::text ILIKE '%auth.uid()%' OR with_check::text ILIKE '%auth.uid()%' THEN 0
    ELSE 1
  END,
  tablename;

-- ============================================================================
-- PART 6: CHECK FOR OVERLY PERMISSIVE POLICIES
-- ============================================================================

SELECT
  'OVERLY PERMISSIVE POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  '⚠️ WARNING' as severity,
  'Policy may allow access to all rows - verify this is intentional' as warning
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_messages',
    'moments',
    'work_items',
    'tasks',
    'question_responses',
    'weekly_summaries',
    'whatsapp_user_activity',
    'grant_responses'
  )
  AND (
    qual::text ILIKE '%true%'
    OR with_check::text ILIKE '%true%'
    OR (qual IS NULL AND cmd = 'SELECT')
  )
ORDER BY tablename, cmd;

-- ============================================================================
-- PART 7: CHECK USER_ID COLUMN EXISTS
-- ============================================================================

SELECT
  'USER_ID COLUMN CHECK' as check_type,
  table_name,
  column_name,
  data_type,
  CASE
    WHEN is_nullable = 'NO' THEN '✅ NOT NULL (Good)'
    ELSE '⚠️ NULLABLE (Consider making NOT NULL)'
  END as nullable_status,
  CASE
    WHEN data_type = 'uuid' THEN '✅ UUID (Standard)'
    ELSE '⚠️ Non-UUID type'
  END as type_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'whatsapp_messages',
    'moments',
    'work_items',
    'tasks',
    'question_responses',
    'weekly_summaries',
    'whatsapp_user_activity',
    'grant_responses'
  )
  AND column_name = 'user_id'
ORDER BY table_name;

-- ============================================================================
-- PART 8: SUMMARY REPORT
-- ============================================================================

WITH rls_summary AS (
  SELECT
    COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls,
    COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls,
    COUNT(*) as total_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'whatsapp_messages', 'moments', 'work_items',
      'question_responses', 'weekly_summaries',
      'whatsapp_user_activity', 'grant_responses'
    )
),
policy_summary AS (
  SELECT
    COUNT(DISTINCT tablename) as tables_with_policies,
    COUNT(*) as total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'whatsapp_messages', 'moments', 'work_items',
      'question_responses', 'weekly_summaries',
      'whatsapp_user_activity', 'grant_responses'
    )
)
SELECT
  'EXECUTIVE SUMMARY' as report_section,
  r.total_tables as total_timeline_tables,
  r.tables_with_rls as tables_with_rls_enabled,
  r.tables_without_rls as tables_without_rls,
  p.tables_with_policies,
  p.total_policies as total_policies_defined,
  ROUND(100.0 * r.tables_with_rls / NULLIF(r.total_tables, 0), 1) as rls_coverage_percent,
  CASE
    WHEN r.tables_with_rls = r.total_tables
      AND p.tables_with_policies = r.total_tables
      AND p.total_policies >= (r.total_tables * 4) -- At least 4 policies per table (CRUD)
    THEN '✅ SECURE'
    WHEN r.tables_with_rls >= (r.total_tables * 0.7)
    THEN '⚠️ NEEDS IMPROVEMENT'
    ELSE '❌ CRITICAL SECURITY GAPS'
  END as overall_status
FROM rls_summary r
CROSS JOIN policy_summary p;

-- ============================================================================
-- INSTRUCTIONS FOR USE:
-- ============================================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Review each section carefully
-- 3. Any table with "❌ DISABLED" in PART 1 is CRITICAL priority
-- 4. Any missing policy in PART 4 requires immediate remediation
-- 5. Export results and attach to security audit report
-- ============================================================================
