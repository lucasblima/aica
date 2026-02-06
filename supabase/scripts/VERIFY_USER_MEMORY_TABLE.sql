-- Verification Script for user_memory table
-- Run this AFTER applying 20260205000001_create_user_memory_table.sql
-- This script checks all components are correctly installed

-- ============================================================================
-- 1. Verify table exists
-- ============================================================================
SELECT
    CASE
        WHEN EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'user_memory'
        )
        THEN '✅ Table user_memory exists'
        ELSE '❌ Table user_memory NOT FOUND'
    END AS table_check;

-- ============================================================================
-- 2. Verify all columns exist with correct types
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_memory'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid), user_id (uuid), category (text), module (text),
-- key (text), value (jsonb), confidence (double precision), source (text),
-- created_at (timestamp with time zone), updated_at (timestamp with time zone),
-- last_accessed_at (timestamp with time zone)

-- ============================================================================
-- 3. Verify RLS is enabled
-- ============================================================================
SELECT
    tablename,
    CASE
        WHEN rowsecurity = true THEN '✅ RLS enabled'
        ELSE '❌ RLS NOT enabled'
    END AS rls_status
FROM pg_tables
WHERE tablename = 'user_memory';

-- ============================================================================
-- 4. Verify all RLS policies exist
-- ============================================================================
SELECT
    policyname,
    cmd AS operation,
    qual AS using_clause,
    with_check AS with_check_clause
FROM pg_policies
WHERE tablename = 'user_memory'
ORDER BY policyname;

-- Expected policies (5 total):
-- 1. Users can view own memory (SELECT)
-- 2. Users can insert own memory (INSERT)
-- 3. Users can update own memory (UPDATE)
-- 4. Users can delete own memory (DELETE)
-- 5. Service role full access to memory (ALL)

-- ============================================================================
-- 5. Verify all indexes exist
-- ============================================================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_memory'
ORDER BY indexname;

-- Expected indexes (9 total):
-- 1. user_memory_pkey (PRIMARY KEY on id)
-- 2. idx_user_memory_user_id
-- 3. idx_user_memory_category
-- 4. idx_user_memory_module (partial: WHERE module IS NOT NULL)
-- 5. idx_user_memory_key
-- 6. idx_user_memory_last_accessed
-- 7. idx_user_memory_value (GIN index for JSONB)
-- 8. idx_user_memory_category_module
-- 9. idx_user_memory_source
-- 10. idx_user_memory_confidence (partial: WHERE confidence >= 0.7)

-- ============================================================================
-- 6. Verify unique constraint exists
-- ============================================================================
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
WHERE conrelid = 'user_memory'::regclass
    AND contype = 'u'  -- unique constraint
ORDER BY conname;

-- Expected: unique_user_memory_key UNIQUE (user_id, category, key, module)

-- ============================================================================
-- 7. Verify triggers exist
-- ============================================================================
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_memory'
ORDER BY trigger_name;

-- Expected: update_user_memory_updated_at (BEFORE UPDATE)

-- ============================================================================
-- 8. Verify helper function exists
-- ============================================================================
SELECT
    CASE
        WHEN EXISTS (
            SELECT FROM pg_proc
            WHERE proname = 'update_user_memory_last_accessed'
        )
        THEN '✅ Helper function update_user_memory_last_accessed exists'
        ELSE '❌ Helper function NOT FOUND'
    END AS function_check;

-- ============================================================================
-- 9. Verify CHECK constraints
-- ============================================================================
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
WHERE conrelid = 'user_memory'::regclass
    AND contype = 'c'  -- check constraint
ORDER BY conname;

-- Expected constraints:
-- - user_memory_category_check (category IN (...))
-- - user_memory_source_check (source IN (...))
-- - user_memory_confidence_check (confidence >= 0 AND confidence <= 1)
-- - user_memory_module_check (module IN (...))

-- ============================================================================
-- 10. Test INSERT with valid data (as authenticated user)
-- ============================================================================
-- Note: This requires auth.uid() to work (authenticated session)
-- Run this test in Supabase SQL Editor while logged in

DO $$
BEGIN
    -- Test insert (will auto-rollback in this block)
    BEGIN
        INSERT INTO user_memory (user_id, category, key, value, source, confidence)
        VALUES (
            auth.uid(),
            'preference',
            'test_verification',
            '{"test": "value", "timestamp": "2026-02-05"}'::jsonb,
            'explicit',
            1.0
        );

        RAISE NOTICE '✅ INSERT test successful';

        -- Clean up
        DELETE FROM user_memory WHERE key = 'test_verification';

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT test failed: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 11. Test UPSERT behavior (unique constraint)
-- ============================================================================
DO $$
DECLARE
    v_first_id UUID;
    v_second_id UUID;
BEGIN
    -- First insert
    INSERT INTO user_memory (user_id, category, key, value, source, confidence, module)
    VALUES (
        auth.uid(),
        'preference',
        'test_upsert',
        '{"version": 1}'::jsonb,
        'explicit',
        0.8,
        'atlas'
    )
    RETURNING id INTO v_first_id;

    -- Upsert (should update existing row)
    INSERT INTO user_memory (user_id, category, key, value, source, confidence, module)
    VALUES (
        auth.uid(),
        'preference',
        'test_upsert',
        '{"version": 2}'::jsonb,
        'explicit',
        0.9,
        'atlas'
    )
    ON CONFLICT (user_id, category, key, module)
    DO UPDATE SET
        value = EXCLUDED.value,
        confidence = EXCLUDED.confidence,
        updated_at = NOW()
    RETURNING id INTO v_second_id;

    IF v_first_id = v_second_id THEN
        RAISE NOTICE '✅ UPSERT test successful - updated existing row';
    ELSE
        RAISE NOTICE '❌ UPSERT test failed - created new row instead of updating';
    END IF;

    -- Clean up
    DELETE FROM user_memory WHERE key = 'test_upsert';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ UPSERT test failed: %', SQLERRM;
END $$;

-- ============================================================================
-- 12. Test JSONB search (GIN index)
-- ============================================================================
DO $$
BEGIN
    -- Insert test data
    INSERT INTO user_memory (user_id, category, key, value, source, confidence)
    VALUES (
        auth.uid(),
        'fact',
        'test_jsonb_search',
        '{"trigger": "deadlines", "emotion": "anxious", "frequency": "high"}'::jsonb,
        'inferred',
        0.85
    );

    -- Test JSONB contains search
    IF EXISTS (
        SELECT 1 FROM user_memory
        WHERE user_id = auth.uid()
            AND value @> '{"trigger": "deadlines"}'::jsonb
    ) THEN
        RAISE NOTICE '✅ JSONB search test successful';
    ELSE
        RAISE NOTICE '❌ JSONB search test failed';
    END IF;

    -- Clean up
    DELETE FROM user_memory WHERE key = 'test_jsonb_search';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ JSONB search test failed: %', SQLERRM;
END $$;

-- ============================================================================
-- 13. Test helper function
-- ============================================================================
DO $$
DECLARE
    v_memory_id UUID;
    v_old_accessed TIMESTAMPTZ;
    v_new_accessed TIMESTAMPTZ;
BEGIN
    -- Insert test memory
    INSERT INTO user_memory (user_id, category, key, value, source, confidence)
    VALUES (
        auth.uid(),
        'preference',
        'test_helper_function',
        '{"test": "value"}'::jsonb,
        'explicit',
        1.0
    )
    RETURNING id, last_accessed_at INTO v_memory_id, v_old_accessed;

    -- Wait a moment
    PERFORM pg_sleep(1);

    -- Call helper function
    PERFORM update_user_memory_last_accessed(v_memory_id);

    -- Check if timestamp updated
    SELECT last_accessed_at INTO v_new_accessed
    FROM user_memory WHERE id = v_memory_id;

    IF v_new_accessed > v_old_accessed THEN
        RAISE NOTICE '✅ Helper function test successful';
    ELSE
        RAISE NOTICE '❌ Helper function test failed - timestamp not updated';
    END IF;

    -- Clean up
    DELETE FROM user_memory WHERE id = v_memory_id;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Helper function test failed: %', SQLERRM;
END $$;

-- ============================================================================
-- 14. Summary Report
-- ============================================================================
SELECT
    '=== USER MEMORY TABLE VERIFICATION SUMMARY ===' AS report_section
UNION ALL
SELECT
    CONCAT(
        'Total policies: ',
        COUNT(*),
        ' (expected: 5)'
    )
FROM pg_policies WHERE tablename = 'user_memory'
UNION ALL
SELECT
    CONCAT(
        'Total indexes: ',
        COUNT(*),
        ' (expected: 10 including PK)'
    )
FROM pg_indexes WHERE tablename = 'user_memory'
UNION ALL
SELECT
    CONCAT(
        'RLS enabled: ',
        CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END
    )
FROM pg_tables WHERE tablename = 'user_memory'
UNION ALL
SELECT
    CONCAT(
        'Total columns: ',
        COUNT(*),
        ' (expected: 11)'
    )
FROM information_schema.columns WHERE table_name = 'user_memory';

-- ============================================================================
-- 15. Performance check - EXPLAIN ANALYZE queries
-- ============================================================================
-- Note: Run these separately to see query plans

-- Check user_id index usage
EXPLAIN ANALYZE
SELECT * FROM user_memory
WHERE user_id = auth.uid()
LIMIT 10;

-- Check category + module composite index
EXPLAIN ANALYZE
SELECT * FROM user_memory
WHERE user_id = auth.uid()
    AND category = 'pattern'
    AND module = 'atlas';

-- Check JSONB GIN index
EXPLAIN ANALYZE
SELECT * FROM user_memory
WHERE user_id = auth.uid()
    AND value @> '{"trigger": "deadlines"}'::jsonb;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ All checks should return success messages
-- ✅ 5 RLS policies
-- ✅ 10 indexes (including primary key)
-- ✅ 11 columns
-- ✅ 4 CHECK constraints
-- ✅ 1 UNIQUE constraint
-- ✅ 1 trigger (updated_at)
-- ✅ 1 helper function (last_accessed_at)
-- ✅ INSERT, UPSERT, JSONB search all work
-- ✅ Query plans show index usage (not sequential scans)
