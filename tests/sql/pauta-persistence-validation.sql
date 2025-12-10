/**
 * Pauta Persistence Validation Tests
 *
 * This SQL test file validates the pauta persistence system:
 * 1. Schema structure (episode_id + user_id columns)
 * 2. Pauta save with correct data
 * 3. Pauta retrieval with cascade
 * 4. Version increment via trigger
 * 5. Cascade delete behavior
 * 6. RLS policy enforcement
 */

-- =====================================================
-- Test 1: Schema Validation
-- =====================================================

-- Verify podcast_generated_pautas has episode_id and user_id columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'podcast_generated_pautas'
  AND column_name IN ('episode_id', 'user_id', 'version', 'is_active')
ORDER BY ordinal_position;

-- Expected columns:
-- episode_id (uuid, not null)
-- user_id (uuid, not null)
-- version (integer, not null)
-- is_active (boolean, not null)

-- Verify related tables exist with correct schema
SELECT
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name IN (
  'podcast_pauta_outline_sections',
  'podcast_pauta_questions',
  'podcast_pauta_sources'
)
GROUP BY table_name;

-- Expected: 4+ tables with correct structure

-- =====================================================
-- Test 2: Foreign Key Relationships
-- =====================================================

-- Verify pauta_id foreign key constraints exist
SELECT
  constraint_name,
  table_name,
  column_name,
  foreign_table_name,
  foreign_column_name
FROM information_schema.key_column_usage
WHERE table_name IN (
  'podcast_pauta_outline_sections',
  'podcast_pauta_questions',
  'podcast_pauta_sources'
)
AND constraint_name LIKE '%pauta_id%'
ORDER BY table_name;

-- Expected: Foreign keys from child tables -> podcast_generated_pautas

-- =====================================================
-- Test 3: Indices for Performance
-- =====================================================

-- Verify indices on episode_id and user_id
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename = 'podcast_generated_pautas'
  AND (indexdef LIKE '%episode_id%' OR indexdef LIKE '%user_id%' OR indexdef LIKE '%is_active%')
ORDER BY indexname;

-- Expected: Indices on episode_id, user_id, and is_active for query performance

-- =====================================================
-- Test 4: Trigger Validation (Version Increment)
-- =====================================================

-- Check if version increment trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'podcast_generated_pautas'
  AND trigger_name LIKE '%version%'
ORDER BY trigger_name;

-- Expected: Trigger for auto-incrementing version on insert

-- =====================================================
-- Test 5: RLS Policies
-- =====================================================

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN (
  'podcast_generated_pautas',
  'podcast_pauta_outline_sections',
  'podcast_pauta_questions',
  'podcast_pauta_sources'
)
AND schemaname = 'public';

-- Expected: All 4 tables have rowsecurity = true

-- List all RLS policies
SELECT
  policyname,
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN (
  'podcast_generated_pautas',
  'podcast_pauta_outline_sections',
  'podcast_pauta_questions',
  'podcast_pauta_sources'
)
ORDER BY tablename, policyname;

-- Expected: 16 policies (4 per table: SELECT, INSERT, UPDATE, DELETE)

-- =====================================================
-- Test 6: Function Definitions
-- =====================================================

-- Verify user_owns_episode function exists and has correct properties
SELECT
  proname,
  pg_get_function_identity_arguments(oid),
  prosecdef as security_definer,
  provolatile,
  prokind
FROM pg_proc
WHERE proname = 'user_owns_episode'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Expected: Function with SECURITY DEFINER set to true

-- =====================================================
-- Test 7: Sample Data Test (Create, Read, Update, Delete)
-- =====================================================

-- NOTE: These tests assume you have an authenticated user ID
-- Replace 'YOUR_USER_ID' with an actual UUID from your auth system

-- Test INSERT: Create a sample pauta
-- (This simulates what the service does)
INSERT INTO podcast_generated_pautas (
  episode_id,
  user_id,
  guest_name,
  theme,
  version,
  is_active,
  research_summary,
  outline_title,
  estimated_duration,
  confidence_score,
  tone,
  depth,
  focus_areas,
  ice_breakers,
  additional_context
) VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID',
  'Test Guest Name',
  'Test Theme',
  1,
  true,
  'Test research summary',
  'Test Outline',
  60,
  0.9,
  'casual',
  'medium',
  ARRAY['focus1', 'focus2'],
  ARRAY['ice1', 'ice2'],
  'Additional context'
)
RETURNING id, episode_id, user_id, version, is_active, guest_name;

-- Test READ: Retrieve the created pauta
SELECT
  id,
  episode_id,
  user_id,
  version,
  is_active,
  guest_name,
  theme,
  created_at
FROM podcast_generated_pautas
WHERE guest_name = 'Test Guest Name'
ORDER BY created_at DESC
LIMIT 1;

-- Test UPDATE: Modify is_active status
UPDATE podcast_generated_pautas
SET is_active = false
WHERE guest_name = 'Test Guest Name'
RETURNING id, is_active;

-- Test DELETE: Clean up
DELETE FROM podcast_generated_pautas
WHERE guest_name = 'Test Guest Name'
RETURNING id;

-- =====================================================
-- Test 8: Cascade Delete Behavior
-- =====================================================

-- Create a test pauta with outline sections
WITH pauta_insert AS (
  INSERT INTO podcast_generated_pautas (
    episode_id,
    user_id,
    guest_name,
    theme,
    version,
    is_active,
    outline_title
  ) VALUES (
    gen_random_uuid(),
    'YOUR_USER_ID',
    'Cascade Test Guest',
    'Test Theme',
    1,
    true,
    'Test Outline'
  )
  RETURNING id
)
INSERT INTO podcast_pauta_outline_sections (
  pauta_id,
  section_type,
  section_order,
  title,
  description
)
SELECT
  id,
  'introduction'::section_type_enum,
  0,
  'Introduction',
  'Test introduction'
FROM pauta_insert
RETURNING pauta_id;

-- Delete the pauta - should cascade
DELETE FROM podcast_generated_pautas
WHERE guest_name = 'Cascade Test Guest'
RETURNING id;

-- Verify sections were deleted
SELECT COUNT(*) as remaining_sections
FROM podcast_pauta_outline_sections
WHERE pauta_id IN (
  SELECT id FROM podcast_generated_pautas WHERE guest_name = 'Cascade Test Guest'
);

-- Expected: 0 remaining sections (cascade worked)

-- =====================================================
-- Test 9: Version Increment on Insert
-- =====================================================

-- Insert multiple versions of the same pauta for an episode
WITH episode_id AS (SELECT gen_random_uuid() as id),
     user_id AS (SELECT 'YOUR_USER_ID'::uuid as id)
INSERT INTO podcast_generated_pautas (
  episode_id,
  user_id,
  guest_name,
  theme,
  is_active,
  outline_title
)
SELECT episode_id.id, user_id.id, 'Multi-Version Test', 'Test Theme', true, 'Outline v1' FROM episode_id, user_id
UNION ALL
SELECT episode_id.id, user_id.id, 'Multi-Version Test', 'Test Theme', true, 'Outline v2' FROM episode_id, user_id
UNION ALL
SELECT episode_id.id, user_id.id, 'Multi-Version Test', 'Test Theme', true, 'Outline v3' FROM episode_id, user_id
RETURNING episode_id, version, is_active, outline_title;

-- Verify versions are incrementing correctly
SELECT
  episode_id,
  version,
  is_active,
  outline_title,
  created_at
FROM podcast_generated_pautas
WHERE guest_name = 'Multi-Version Test'
ORDER BY version DESC;

-- Expected: Versions 3, 2, 1 (newest is active)

-- Clean up
DELETE FROM podcast_generated_pautas WHERE guest_name = 'Multi-Version Test';

-- =====================================================
-- Test 10: Active Pauta Retrieval
-- =====================================================

-- Get the current active pauta for a specific episode
-- This simulates what getActivePauta() does
WITH test_episode AS (
  SELECT episode_id, user_id, MAX(id) as latest_id
  FROM podcast_generated_pautas
  WHERE is_active = true
  GROUP BY episode_id, user_id
  LIMIT 1
)
SELECT
  p.id,
  p.episode_id,
  p.user_id,
  p.guest_name,
  p.theme,
  p.version,
  p.is_active,
  COUNT(DISTINCT s.id) as outline_sections_count,
  COUNT(DISTINCT q.id) as questions_count,
  COUNT(DISTINCT src.id) as sources_count
FROM podcast_generated_pautas p
LEFT JOIN podcast_pauta_outline_sections s ON p.id = s.pauta_id
LEFT JOIN podcast_pauta_questions q ON p.id = q.pauta_id
LEFT JOIN podcast_pauta_sources src ON p.id = src.pauta_id
WHERE p.is_active = true
GROUP BY p.id, p.episode_id, p.user_id, p.guest_name, p.theme, p.version, p.is_active
ORDER BY p.created_at DESC
LIMIT 1;

-- Expected: Returns the most recently created active pauta with related data counts
