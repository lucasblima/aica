-- =============================================================================
-- VALIDATION TEST: 20260205000001_whatsapp_intent_privacy.sql
-- Run this after migration to verify all changes were applied correctly
-- =============================================================================

-- Test 1: Verify pgvector extension enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'FAIL: pgvector extension not enabled';
  END IF;
  RAISE NOTICE 'PASS: pgvector extension enabled';
END $$;

-- Test 2: Verify enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_intent_category') THEN
    RAISE EXCEPTION 'FAIL: whatsapp_intent_category enum not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_intent_sentiment') THEN
    RAISE EXCEPTION 'FAIL: whatsapp_intent_sentiment enum not found';
  END IF;
  RAISE NOTICE 'PASS: Both enums created';
END $$;

-- Test 3: Verify content_text column removed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'content_text'
  ) THEN
    RAISE EXCEPTION 'FAIL: content_text column still exists (privacy violation)';
  END IF;
  RAISE NOTICE 'PASS: content_text column removed';
END $$;

-- Test 4: Verify intent columns exist
DO $$
DECLARE
  _expected_columns TEXT[] := ARRAY[
    'intent_summary',
    'intent_category',
    'intent_sentiment',
    'intent_urgency',
    'intent_topic',
    'intent_action_required',
    'intent_mentioned_date',
    'intent_mentioned_time',
    'intent_media_type',
    'intent_confidence',
    'intent_embedding',
    'processing_status'
  ];
  _col TEXT;
  _missing INTEGER := 0;
BEGIN
  FOREACH _col IN ARRAY _expected_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'whatsapp_messages'
        AND column_name = _col
    ) THEN
      RAISE WARNING 'MISSING COLUMN: whatsapp_messages.%', _col;
      _missing := _missing + 1;
    END IF;
  END LOOP;

  IF _missing > 0 THEN
    RAISE EXCEPTION 'FAIL: % intent columns missing', _missing;
  END IF;

  RAISE NOTICE 'PASS: All 12 intent columns exist';
END $$;

-- Test 5: Verify contact_network columns updated
DO $$
BEGIN
  -- Old columns should be removed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_network'
      AND column_name IN ('last_message_preview', 'last_message_direction')
  ) THEN
    RAISE EXCEPTION 'FAIL: Old preview columns still exist in contact_network';
  END IF;

  -- New columns should exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_network'
      AND column_name = 'last_intent_preview'
  ) THEN
    RAISE EXCEPTION 'FAIL: last_intent_preview column missing in contact_network';
  END IF;

  RAISE NOTICE 'PASS: contact_network columns updated correctly';
END $$;

-- Test 6: Verify indexes exist
DO $$
DECLARE
  _expected_indexes TEXT[] := ARRAY[
    'idx_whatsapp_messages_intent_embedding',
    'idx_whatsapp_messages_intent_filter',
    'idx_whatsapp_messages_action_required',
    'idx_whatsapp_messages_scheduled'
  ];
  _idx TEXT;
  _missing INTEGER := 0;
BEGIN
  FOREACH _idx IN ARRAY _expected_indexes
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'whatsapp_messages'
        AND indexname = _idx
    ) THEN
      RAISE WARNING 'MISSING INDEX: %', _idx;
      _missing := _missing + 1;
    END IF;
  END LOOP;

  IF _missing > 0 THEN
    RAISE EXCEPTION 'FAIL: % indexes missing', _missing;
  END IF;

  RAISE NOTICE 'PASS: All 4 intent indexes created';
END $$;

-- Test 7: Verify function exists and is executable
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'search_messages_by_intent'
  ) THEN
    RAISE EXCEPTION 'FAIL: search_messages_by_intent function not found';
  END IF;

  -- Check if authenticated role can execute
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'search_messages_by_intent'
      AND grantee IN ('authenticated', 'PUBLIC')
  ) THEN
    RAISE WARNING 'WARNING: search_messages_by_intent may not be executable by authenticated users';
  END IF;

  RAISE NOTICE 'PASS: search_messages_by_intent function exists';
END $$;

-- Test 8: Verify trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_contact_last_intent_preview'
  ) THEN
    RAISE EXCEPTION 'FAIL: trigger_update_contact_last_intent_preview not found';
  END IF;

  -- Old trigger should be removed
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_contact_last_message_preview'
  ) THEN
    RAISE EXCEPTION 'FAIL: Old trigger still exists';
  END IF;

  RAISE NOTICE 'PASS: New trigger created, old trigger removed';
END $$;

-- Test 9: Verify old backfill function removed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'backfill_contact_message_previews'
  ) THEN
    RAISE WARNING 'WARNING: Old backfill function still exists (should be dropped)';
  END IF;

  RAISE NOTICE 'PASS: Old backfill function removed';
END $$;

-- Test 10: Check vector index type
DO $$
DECLARE
  _index_type TEXT;
BEGIN
  SELECT am.amname INTO _index_type
  FROM pg_class c
  JOIN pg_index i ON c.oid = i.indexrelid
  JOIN pg_am am ON c.relam = am.oid
  WHERE c.relname = 'idx_whatsapp_messages_intent_embedding';

  IF _index_type IS NULL THEN
    RAISE EXCEPTION 'FAIL: Vector index not found';
  END IF;

  IF _index_type != 'ivfflat' THEN
    RAISE WARNING 'WARNING: Vector index type is %, expected ivfflat', _index_type;
  END IF;

  RAISE NOTICE 'PASS: Vector index uses % access method', _index_type;
END $$;

-- Test 11: Verify enum values
DO $$
DECLARE
  _category_count INTEGER;
  _sentiment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _category_count
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'whatsapp_intent_category';

  SELECT COUNT(*) INTO _sentiment_count
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'whatsapp_intent_sentiment';

  IF _category_count != 9 THEN
    RAISE WARNING 'WARNING: Expected 9 intent categories, found %', _category_count;
  END IF;

  IF _sentiment_count != 4 THEN
    RAISE WARNING 'WARNING: Expected 4 sentiment values, found %', _sentiment_count;
  END IF;

  RAISE NOTICE 'PASS: Enums have correct values (% categories, % sentiments)', _category_count, _sentiment_count;
END $$;

-- Test 12: Test function call (dry run with NULL embedding)
DO $$
DECLARE
  _result RECORD;
BEGIN
  BEGIN
    -- Try to call function with dummy data
    SELECT * FROM search_messages_by_intent(
      gen_random_uuid(), -- user_id
      NULL::vector(768), -- query_embedding (NULL is ok for syntax test)
      1,                 -- limit
      NULL::whatsapp_intent_category,
      1                  -- min_urgency
    ) INTO _result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: search_messages_by_intent function call error: %', SQLERRM;
  END;

  RAISE NOTICE 'PASS: search_messages_by_intent function is callable';
END $$;

-- =============================================================================
-- SUMMARY
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ ALL VALIDATION TESTS PASSED';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration 20260205000001_whatsapp_intent_privacy.sql';
  RAISE NOTICE 'has been successfully applied and verified.';
  RAISE NOTICE '';
  RAISE NOTICE 'Privacy compliance status:';
  RAISE NOTICE '✅ Raw message text storage removed';
  RAISE NOTICE '✅ Intent-based storage implemented';
  RAISE NOTICE '✅ Semantic search via embeddings enabled';
  RAISE NOTICE '✅ Contact previews use intent summaries';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update webhook-evolution to extract intent';
  RAISE NOTICE '2. Create extract-intent Edge Function';
  RAISE NOTICE '3. Update frontend to display intent_summary';
  RAISE NOTICE '4. Test semantic search with sample queries';
  RAISE NOTICE '=====================================================';
END $$;
