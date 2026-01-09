-- ============================================================================
-- FOREIGN KEY AUDIT - Issue #73 Phase 1
-- ============================================================================
-- This file contains audit queries to analyze foreign key behavior
-- Execute these queries in Supabase SQL Editor
-- Date: 2026-01-08
-- ============================================================================

-- ============================================================================
-- QUERY 1: All Foreign Keys with ON DELETE behavior
-- ============================================================================

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  CASE
    WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ Cascades - verify intended'
    WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ Nulls - check queries handle NULL'
    WHEN rc.delete_rule = 'RESTRICT' THEN '✅ Blocks deletion'
    WHEN rc.delete_rule = 'NO ACTION' THEN '✅ Blocks deletion'
    ELSE '❓ Unknown behavior'
  END as risk_assessment
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN 1
    WHEN 'SET NULL' THEN 2
    WHEN 'RESTRICT' THEN 3
    ELSE 4
  END,
  tc.table_name,
  kcu.column_name;

-- ============================================================================
-- QUERY 2: Foreign Key DELETE Rule Distribution
-- ============================================================================

SELECT
  rc.delete_rule,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage,
  CASE
    WHEN rc.delete_rule = 'CASCADE' THEN 'Data deleted when parent deleted'
    WHEN rc.delete_rule = 'SET NULL' THEN 'Column set to NULL when parent deleted'
    WHEN rc.delete_rule = 'RESTRICT' THEN 'Prevents parent deletion if children exist'
    WHEN rc.delete_rule = 'NO ACTION' THEN 'Same as RESTRICT'
    ELSE 'Unknown behavior'
  END as behavior_description
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
GROUP BY rc.delete_rule
ORDER BY count DESC;

-- ============================================================================
-- QUERY 3: Critical CASCADE Foreign Keys
-- ============================================================================
-- These FKs will DELETE data when parent is deleted - verify intentional

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  '🔴 CASCADE DELETE - Data loss if parent deleted' as warning
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- QUERY 4: SET NULL Foreign Keys (Potential Orphaned Records)
-- ============================================================================
-- These FKs will set column to NULL when parent deleted
-- Queries expecting NOT NULL may break

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  '⚠️ SET NULL - May create orphaned records' as warning,
  CASE
    WHEN col.is_nullable = 'YES' THEN '✅ Column is nullable'
    ELSE '🔴 PROBLEM: Column is NOT NULL but FK uses SET NULL!'
  END as nullable_check
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
JOIN information_schema.columns col
  ON col.table_schema = tc.table_schema
  AND col.table_name = tc.table_name
  AND col.column_name = kcu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND rc.delete_rule = 'SET NULL'
ORDER BY
  CASE WHEN col.is_nullable = 'NO' THEN 1 ELSE 2 END,
  tc.table_name,
  kcu.column_name;

-- ============================================================================
-- QUERY 5: Foreign Key Chain Analysis
-- ============================================================================
-- Identify potential cascading delete chains

WITH fk_chains AS (
  SELECT
    tc.table_name as child_table,
    ccu.table_name AS parent_table,
    rc.delete_rule
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND rc.delete_rule = 'CASCADE'
)
SELECT
  fc1.parent_table as top_level_table,
  fc1.child_table as level_1_cascade,
  fc2.child_table as level_2_cascade,
  fc3.child_table as level_3_cascade,
  '⚠️ Multi-level cascade detected' as warning
FROM fk_chains fc1
LEFT JOIN fk_chains fc2 ON fc2.parent_table = fc1.child_table
LEFT JOIN fk_chains fc3 ON fc3.parent_table = fc2.child_table
WHERE fc2.child_table IS NOT NULL
ORDER BY fc1.parent_table, fc1.child_table;

-- ============================================================================
-- QUERY 6: User Data Cascade Paths
-- ============================================================================
-- What happens when a user is deleted?

SELECT
  kcu.table_name as table_will_be_affected,
  kcu.column_name as via_column,
  rc.delete_rule as action,
  CASE
    WHEN rc.delete_rule = 'CASCADE' THEN '🔴 All user data in this table will be DELETED'
    WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ Column will be NULL (orphaned records)'
    ELSE '✅ Deletion blocked (safe)'
  END as user_deletion_impact
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN 1
    WHEN 'SET NULL' THEN 2
    ELSE 3
  END,
  kcu.table_name;
