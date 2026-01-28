-- =============================================================================
-- DIAGNOSTIC: Check tables required by generate-questions Edge Function
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- 1. Check if required tables exist
SELECT
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_question_context_bank',
    'daily_questions',
    'question_responses'
  )
ORDER BY table_name;

-- 2. Check user_question_context_bank columns (if exists)
SELECT 'USER_QUESTION_CONTEXT_BANK COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_question_context_bank'
ORDER BY ordinal_position;

-- 3. Check daily_questions columns (if exists)
SELECT 'DAILY_QUESTIONS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'daily_questions'
ORDER BY ordinal_position;

-- 4. Check question_responses columns (if exists)
SELECT 'QUESTION_RESPONSES COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'question_responses'
ORDER BY ordinal_position;

-- 5. Check if RPC function exists
SELECT 'RPC FUNCTIONS:' as info;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('check_should_generate_questions', 'increment_generation_count');
