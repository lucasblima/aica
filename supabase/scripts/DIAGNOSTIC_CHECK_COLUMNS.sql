-- =============================================================================
-- DIAGNOSTIC: Check if columns exist in associations and contact_network
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- Check associations table columns
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'associations'
ORDER BY ordinal_position;

-- Check contact_network table columns
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contact_network'
ORDER BY ordinal_position;

-- Specifically check for the missing columns
SELECT
  'associations' as table_name,
  column_name,
  CASE WHEN column_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'associations'
  AND column_name IN ('type', 'cnpj', 'is_active', 'workspace_id', 'synced_at')
ORDER BY column_name;
