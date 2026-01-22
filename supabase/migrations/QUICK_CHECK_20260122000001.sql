-- ============================================================================
-- QUICK CHECK: Generated Decks Migration
-- Run this via Supabase Studio SQL editor after applying migration
-- ============================================================================

-- Check 1: Tables exist
SELECT 'Tables Created' AS check_name, COUNT(*) AS result, '2' AS expected
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('generated_decks', 'deck_slides')

UNION ALL

-- Check 2: RLS enabled
SELECT 'RLS Enabled', COUNT(*), '2'
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('generated_decks', 'deck_slides')
  AND rowsecurity = true

UNION ALL

-- Check 3: RLS policies
SELECT 'RLS Policies', COUNT(*), '8'
FROM pg_policies
WHERE tablename IN ('generated_decks', 'deck_slides')

UNION ALL

-- Check 4: Indexes
SELECT 'Indexes', COUNT(*), '>=7'
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('generated_decks', 'deck_slides')

UNION ALL

-- Check 5: SECURITY DEFINER function
SELECT 'SECURITY DEFINER Function', COUNT(*), '1'
FROM pg_proc
WHERE proname = 'user_owns_deck'
  AND prosecdef = true

UNION ALL

-- Check 6: Triggers
SELECT 'Updated_at Triggers', COUNT(*), '2'
FROM pg_trigger
WHERE tgname IN ('update_generated_decks_updated_at', 'update_deck_slides_updated_at')

UNION ALL

-- Check 7: Storage bucket
SELECT 'Storage Bucket', COUNT(*), '1'
FROM storage.buckets
WHERE id = 'presentation-assets'

UNION ALL

-- Check 8: Storage policies
SELECT 'Storage Policies', COUNT(*), '4'
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%presentation assets%';

-- ============================================================================
-- Expected Output:
-- All rows should have result = expected
-- If any row shows different result, check validation guide for details
-- ============================================================================
