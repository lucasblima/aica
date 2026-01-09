-- ============================================================================
-- RLS COVERAGE AUDIT - Issue #73 Phase 1
-- ============================================================================
-- This file contains audit queries to identify RLS coverage gaps
-- Execute these queries in Supabase SQL Editor
-- Date: 2026-01-08
-- ============================================================================

-- ============================================================================
-- QUERY 1: Tables without RLS enabled
-- ============================================================================
-- Expected: Empty result (all tables should have RLS)

SELECT
  schemaname,
  tablename,
  'CRITICAL - No RLS!' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY tablename;

-- ============================================================================
-- QUERY 2: Tables with incomplete CRUD policies
-- ============================================================================
-- Expected: Empty result or only system tables
-- Each table should have 4 policies: SELECT, INSERT, UPDATE, DELETE

SELECT
  t.tablename,
  COUNT(DISTINCT p.cmd) as policy_count,
  ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) as policies_present,
  ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as expected_policies,
  CASE
    WHEN 'SELECT' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_select,
  CASE
    WHEN 'INSERT' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_insert,
  CASE
    WHEN 'UPDATE' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_update,
  CASE
    WHEN 'DELETE' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_delete
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename
HAVING COUNT(DISTINCT p.cmd) < 4
ORDER BY policy_count ASC, t.tablename;

-- ============================================================================
-- QUERY 3: All RLS policies by table (for verification)
-- ============================================================================
-- This shows the complete RLS policy coverage for all tables

SELECT
  tablename,
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies,
  CASE
    WHEN COUNT(DISTINCT cmd) = 4 THEN '✅ Complete'
    WHEN COUNT(DISTINCT cmd) = 0 THEN '❌ No policies'
    ELSE '⚠️ Incomplete (' || COUNT(DISTINCT cmd)::text || '/4)'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY
  CASE
    WHEN COUNT(DISTINCT cmd) = 4 THEN 3
    WHEN COUNT(DISTINCT cmd) = 0 THEN 1
    ELSE 2
  END,
  tablename;

-- ============================================================================
-- QUERY 4: Tables with RLS enabled but NO policies at all
-- ============================================================================
-- CRITICAL: These tables block all access!

SELECT
  t.tablename,
  '🔴 CRITICAL - RLS enabled but no policies' as issue
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.tablename
      AND p.schemaname = t.schemaname
  )
ORDER BY t.tablename;

-- ============================================================================
-- QUERY 5: Sensitive tables requiring RLS audit
-- ============================================================================
-- Focus on privacy-critical tables

SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) as policies,
  CASE
    WHEN t.rowsecurity = false THEN '🔴 CRITICAL - No RLS'
    WHEN COUNT(DISTINCT p.cmd) < 4 THEN '⚠️ Incomplete policies'
    ELSE '✅ OK'
  END as security_status
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'ai_usage_logs',
    'gemini_api_logs',
    'user_interactions',
    'consent_records',
    'users',
    'moments',
    'weekly_summaries',
    'daily_questions',
    'question_responses',
    'whatsapp_messages',
    'contact_network',
    'whatsapp_sync_logs'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY
  CASE
    WHEN t.rowsecurity = false THEN 1
    WHEN COUNT(DISTINCT p.cmd) < 4 THEN 2
    ELSE 3
  END,
  t.tablename;
