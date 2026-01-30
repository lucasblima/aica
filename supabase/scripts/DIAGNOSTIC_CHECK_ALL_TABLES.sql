-- =============================================================================
-- DIAGNOSTIC: Check all tables used by createAssociation and bootstrap
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- 1. Check if tables exist
SELECT
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('associations', 'association_members', 'states', 'modules', 'profiles', 'daily_agenda', 'life_areas')
ORDER BY table_name;

-- 2. Check associations columns
SELECT 'ASSOCIATIONS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'associations'
ORDER BY ordinal_position;

-- 3. Check states table columns (if exists)
SELECT 'STATES COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'states'
ORDER BY ordinal_position;

-- 4. Check association_members columns (if exists)
SELECT 'ASSOCIATION_MEMBERS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'association_members'
ORDER BY ordinal_position;

-- 5. Check RLS policies on associations
SELECT 'ASSOCIATIONS RLS POLICIES:' as info;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'associations';

-- 6. Try to identify the exact error by checking constraints
SELECT 'ASSOCIATIONS CONSTRAINTS:' as info;
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.associations'::regclass;
