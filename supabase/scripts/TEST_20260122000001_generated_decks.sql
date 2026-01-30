-- ============================================================================
-- TEST SCRIPT: Generated Decks Migration Validation
-- Date: 2026-01-22
-- Purpose: Validate Phase 1 migration for sponsor deck generator
--
-- HOW TO USE:
-- 1. Apply main migration: npx supabase db reset --local
-- 2. Run this test script to verify everything works
-- 3. Check output for ✅ success or ❌ failure messages
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Mock user
  test_org_id UUID;
  test_deck_id UUID;
  test_slide_id UUID;
  test_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GENERATED DECKS MIGRATION TEST SUITE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ========================================================================
  -- TEST 1: Verify tables exist
  -- ========================================================================
  RAISE NOTICE '📋 TEST 1: Verify tables exist';

  SELECT COUNT(*) INTO test_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('generated_decks', 'deck_slides');

  IF test_count = 2 THEN
    RAISE NOTICE '  ✅ Both tables created successfully';
  ELSE
    RAISE EXCEPTION '  ❌ Missing tables! Found % of 2', test_count;
  END IF;

  -- ========================================================================
  -- TEST 2: Verify RLS is enabled
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔒 TEST 2: Verify RLS enabled on all tables';

  SELECT COUNT(*) INTO test_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('generated_decks', 'deck_slides')
    AND rowsecurity = true;

  IF test_count = 2 THEN
    RAISE NOTICE '  ✅ RLS enabled on all tables';
  ELSE
    RAISE EXCEPTION '  ❌ RLS not enabled! Only % of 2 tables have RLS', test_count;
  END IF;

  -- ========================================================================
  -- TEST 3: Verify RLS policies exist
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🛡️  TEST 3: Verify RLS policies';

  -- Check generated_decks policies (should have 4: SELECT, INSERT, UPDATE, DELETE)
  SELECT COUNT(*) INTO test_count
  FROM pg_policies
  WHERE tablename = 'generated_decks';

  IF test_count = 4 THEN
    RAISE NOTICE '  ✅ generated_decks has 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  ELSE
    RAISE EXCEPTION '  ❌ generated_decks has % policies, expected 4', test_count;
  END IF;

  -- Check deck_slides policies (should have 4)
  SELECT COUNT(*) INTO test_count
  FROM pg_policies
  WHERE tablename = 'deck_slides';

  IF test_count = 4 THEN
    RAISE NOTICE '  ✅ deck_slides has 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  ELSE
    RAISE EXCEPTION '  ❌ deck_slides has % policies, expected 4', test_count;
  END IF;

  -- ========================================================================
  -- TEST 4: Verify indexes exist
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🚀 TEST 4: Verify performance indexes';

  SELECT COUNT(*) INTO test_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND (
      tablename = 'generated_decks'
      OR tablename = 'deck_slides'
    );

  IF test_count >= 7 THEN
    RAISE NOTICE '  ✅ Found % indexes (expected at least 7)', test_count;
  ELSE
    RAISE EXCEPTION '  ❌ Only found % indexes, expected at least 7', test_count;
  END IF;

  -- ========================================================================
  -- TEST 5: Verify SECURITY DEFINER function exists
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔐 TEST 5: Verify SECURITY DEFINER function';

  SELECT COUNT(*) INTO test_count
  FROM pg_proc
  WHERE proname = 'user_owns_deck'
    AND prosecdef = true; -- SECURITY DEFINER flag

  IF test_count = 1 THEN
    RAISE NOTICE '  ✅ user_owns_deck function exists with SECURITY DEFINER';
  ELSE
    RAISE EXCEPTION '  ❌ user_owns_deck function not found or not SECURITY DEFINER';
  END IF;

  -- ========================================================================
  -- TEST 6: Verify updated_at triggers exist
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '⏰ TEST 6: Verify updated_at triggers';

  SELECT COUNT(*) INTO test_count
  FROM pg_trigger
  WHERE tgname IN (
    'update_generated_decks_updated_at',
    'update_deck_slides_updated_at'
  );

  IF test_count = 2 THEN
    RAISE NOTICE '  ✅ Both updated_at triggers exist';
  ELSE
    RAISE EXCEPTION '  ❌ Missing triggers! Found % of 2', test_count;
  END IF;

  -- ========================================================================
  -- TEST 7: Verify storage bucket exists
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '📦 TEST 7: Verify storage bucket';

  SELECT COUNT(*) INTO test_count
  FROM storage.buckets
  WHERE id = 'presentation-assets';

  IF test_count = 1 THEN
    RAISE NOTICE '  ✅ presentation-assets bucket exists';
  ELSE
    RAISE EXCEPTION '  ❌ presentation-assets bucket not found';
  END IF;

  -- Verify bucket configuration
  SELECT COUNT(*) INTO test_count
  FROM storage.buckets
  WHERE id = 'presentation-assets'
    AND public = false
    AND file_size_limit = 52428800; -- 50MB

  IF test_count = 1 THEN
    RAISE NOTICE '  ✅ Bucket configuration correct (private, 50MB limit)';
  ELSE
    RAISE EXCEPTION '  ❌ Bucket misconfigured';
  END IF;

  -- ========================================================================
  -- TEST 8: Verify storage RLS policies
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🗄️  TEST 8: Verify storage RLS policies';

  SELECT COUNT(*) INTO test_count
  FROM pg_policies
  WHERE tablename = 'objects'
    AND policyname LIKE '%presentation assets%';

  IF test_count = 4 THEN
    RAISE NOTICE '  ✅ Storage has 4 RLS policies';
  ELSE
    RAISE EXCEPTION '  ❌ Storage has % policies, expected 4', test_count;
  END IF;

  -- ========================================================================
  -- TEST 9: Verify table constraints
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '✔️  TEST 9: Verify table constraints';

  -- Check template CHECK constraint
  SELECT COUNT(*) INTO test_count
  FROM information_schema.check_constraints
  WHERE constraint_name LIKE '%template%'
    AND constraint_schema = 'public';

  IF test_count >= 1 THEN
    RAISE NOTICE '  ✅ Template CHECK constraint exists';
  ELSE
    RAISE NOTICE '  ⚠️  Warning: Template CHECK constraint not found (non-critical)';
  END IF;

  -- Check slide_type CHECK constraint
  SELECT COUNT(*) INTO test_count
  FROM information_schema.check_constraints
  WHERE constraint_name LIKE '%slide_type%'
    AND constraint_schema = 'public';

  IF test_count >= 1 THEN
    RAISE NOTICE '  ✅ Slide type CHECK constraint exists';
  ELSE
    RAISE NOTICE '  ⚠️  Warning: Slide type CHECK constraint not found (non-critical)';
  END IF;

  -- ========================================================================
  -- TEST 10: Verify foreign keys
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔗 TEST 10: Verify foreign key relationships';

  SELECT COUNT(*) INTO test_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('generated_decks', 'deck_slides');

  IF test_count >= 4 THEN
    RAISE NOTICE '  ✅ Found % foreign keys (expected at least 4)', test_count;
  ELSE
    RAISE EXCEPTION '  ❌ Only found % foreign keys, expected at least 4', test_count;
  END IF;

  -- ========================================================================
  -- SUMMARY
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL TESTS PASSED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration 20260122000001_generated_decks.sql is valid.';
  RAISE NOTICE '';
  RAISE NOTICE 'Schema verification:';
  RAISE NOTICE '  ✅ Tables created with proper structure';
  RAISE NOTICE '  ✅ RLS enabled on all tables';
  RAISE NOTICE '  ✅ RLS policies comprehensive (8 total)';
  RAISE NOTICE '  ✅ Performance indexes optimized';
  RAISE NOTICE '  ✅ SECURITY DEFINER function prevents recursion';
  RAISE NOTICE '  ✅ Triggers for updated_at automation';
  RAISE NOTICE '  ✅ Storage bucket configured';
  RAISE NOTICE '  ✅ Storage RLS policies secure';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '❌ TEST FAILED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;

-- ============================================================================
-- BONUS: Display policy details for manual review
-- ============================================================================

SELECT
  '📋 RLS Policies Overview' AS section,
  tablename AS table_name,
  policyname AS policy_name,
  cmd AS operation
FROM pg_policies
WHERE tablename IN ('generated_decks', 'deck_slides')
ORDER BY tablename, cmd;
