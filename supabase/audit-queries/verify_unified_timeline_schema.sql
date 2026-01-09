-- ============================================================================
-- UNIFIED TIMELINE SCHEMA VERIFICATION
-- ============================================================================
-- Purpose: Verify that all columns required by unifiedTimelineService.ts exist
-- Date: 2026-01-09
-- Issue: Unified Timeline Phase 2 - Column Verification
-- Agent: Backend Architect (Supabase)
-- ============================================================================

-- ============================================================================
-- 1. VERIFY ALL TIMELINE TABLES EXIST
-- ============================================================================

SELECT
  'TABLE EXISTENCE CHECK' as check_type,
  tablename,
  CASE
    WHEN tablename IN (
      'whatsapp_messages',
      'moments',
      'tasks',
      'daily_questions',
      'weekly_summaries',
      'user_activities',
      'grant_responses'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_messages',
    'moments',
    'tasks',
    'daily_questions',
    'weekly_summaries',
    'user_activities',
    'grant_responses'
  )
ORDER BY tablename;

-- ============================================================================
-- 2. WHATSAPP_MESSAGES TABLE - COLUMN VERIFICATION
-- ============================================================================

-- Service expects (from line 191-204 of unifiedTimelineService.ts):
-- Required: id, user_id, created_at
-- Content: content OR message OR message_text
-- Contact: contact_name, contact_number OR remote_jid
-- Metadata: message_type, direction, sentiment, tags

SELECT
  'whatsapp_messages' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at') THEN '🔴 REQUIRED'
    WHEN column_name IN ('content', 'message', 'message_text') THEN '🟡 CONTENT (one required)'
    WHEN column_name IN ('contact_name', 'contact_number', 'remote_jid') THEN '🟡 CONTACT (fallback)'
    WHEN column_name IN ('message_type', 'direction') THEN '🟢 METADATA'
    WHEN column_name IN ('sentiment', 'tags') THEN '🔵 OPTIONAL AI'
    ELSE '⚪ OTHER'
  END as requirement_level
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_messages'
ORDER BY
  CASE requirement_level
    WHEN '🔴 REQUIRED' THEN 1
    WHEN '🟡 CONTENT (one required)' THEN 2
    WHEN '🟡 CONTACT (fallback)' THEN 3
    WHEN '🟢 METADATA' THEN 4
    WHEN '🔵 OPTIONAL AI' THEN 5
    ELSE 6
  END,
  column_name;

-- Check for missing expected columns
SELECT
  'whatsapp_messages' as table_name,
  'MISSING COLUMN CHECK' as check_type,
  unnest(ARRAY[
    'id', 'user_id', 'created_at',
    'content', 'message', 'message_text',
    'contact_name', 'contact_number', 'remote_jid',
    'message_type', 'direction',
    'sentiment', 'tags'
  ]) as expected_column,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'whatsapp_messages'
        AND column_name = unnest
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ============================================================================
-- 3. MOMENTS TABLE - COLUMN VERIFICATION
-- ============================================================================

-- Service expects (from line 244-258):
-- Required: id, user_id, created_at
-- Content: content, title, emotion, energy_level
-- AI/Audio: sentiment, audio_url, audio_duration
-- Tags: tags

SELECT
  'moments' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at') THEN '🔴 REQUIRED'
    WHEN column_name IN ('content') THEN '🔴 REQUIRED CONTENT'
    WHEN column_name IN ('title', 'emotion', 'energy_level') THEN '🟢 METADATA'
    WHEN column_name IN ('sentiment', 'audio_url', 'audio_duration') THEN '🔵 OPTIONAL AI'
    WHEN column_name IN ('tags') THEN '🟢 TAGS'
    ELSE '⚪ OTHER'
  END as requirement_level
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'moments'
ORDER BY
  CASE requirement_level
    WHEN '🔴 REQUIRED' THEN 1
    WHEN '🔴 REQUIRED CONTENT' THEN 2
    WHEN '🟢 METADATA' THEN 3
    WHEN '🔵 OPTIONAL AI' THEN 4
    WHEN '🟢 TAGS' THEN 5
    ELSE 6
  END,
  column_name;

-- Check for missing columns
SELECT
  'moments' as table_name,
  unnest(ARRAY[
    'id', 'user_id', 'created_at',
    'content', 'title', 'emotion', 'energy_level',
    'sentiment', 'audio_url', 'audio_duration',
    'tags'
  ]) as expected_column,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'moments'
        AND column_name = unnest
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ============================================================================
-- 4. TASKS TABLE - COLUMN VERIFICATION
-- ============================================================================

-- Service expects (from line 298-311):
-- Required: id, user_id, created_at
-- Content: title OR name, description
-- Status: status, priority OR quadrant
-- Dates: completed_at, due_date
-- Gamification: xp_earned

SELECT
  'tasks' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at') THEN '🔴 REQUIRED'
    WHEN column_name IN ('title', 'name') THEN '🟡 TITLE (one required)'
    WHEN column_name IN ('description', 'status') THEN '🟢 METADATA'
    WHEN column_name IN ('priority', 'quadrant') THEN '🟡 PRIORITY (fallback)'
    WHEN column_name IN ('completed_at', 'due_date') THEN '🟢 DATES'
    WHEN column_name IN ('xp_earned') THEN '🔵 GAMIFICATION'
    ELSE '⚪ OTHER'
  END as requirement_level
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tasks'
ORDER BY
  CASE requirement_level
    WHEN '🔴 REQUIRED' THEN 1
    WHEN '🟡 TITLE (one required)' THEN 2
    WHEN '🟢 METADATA' THEN 3
    WHEN '🟡 PRIORITY (fallback)' THEN 4
    WHEN '🟢 DATES' THEN 5
    WHEN '🔵 GAMIFICATION' THEN 6
    ELSE 7
  END,
  column_name;

-- Check for missing columns
SELECT
  'tasks' as table_name,
  unnest(ARRAY[
    'id', 'user_id', 'created_at',
    'title', 'name', 'description', 'status',
    'priority', 'quadrant',
    'completed_at', 'due_date',
    'xp_earned'
  ]) as expected_column,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tasks'
        AND column_name = unnest
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ============================================================================
-- 5. DAILY_QUESTIONS TABLE - COLUMN VERIFICATION
-- ============================================================================

-- Service expects (from line 351-362):
-- Required: id, user_id, created_at
-- Content: question OR question_text
-- Response: response OR answer, answered_at, skipped
-- Gamification: xp_earned

SELECT
  'daily_questions' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at') THEN '🔴 REQUIRED'
    WHEN column_name IN ('question', 'question_text') THEN '🟡 QUESTION (one required)'
    WHEN column_name IN ('response', 'answer') THEN '🟡 RESPONSE (fallback)'
    WHEN column_name IN ('answered_at', 'skipped') THEN '🟢 METADATA'
    WHEN column_name IN ('xp_earned') THEN '🔵 GAMIFICATION'
    ELSE '⚪ OTHER'
  END as requirement_level
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'daily_questions'
ORDER BY
  CASE requirement_level
    WHEN '🔴 REQUIRED' THEN 1
    WHEN '🟡 QUESTION (one required)' THEN 2
    WHEN '🟡 RESPONSE (fallback)' THEN 3
    WHEN '🟢 METADATA' THEN 4
    WHEN '🔵 GAMIFICATION' THEN 5
    ELSE 6
  END,
  column_name;

-- Check for missing columns
SELECT
  'daily_questions' as table_name,
  unnest(ARRAY[
    'id', 'user_id', 'created_at',
    'question', 'question_text',
    'response', 'answer', 'answered_at', 'skipped',
    'xp_earned'
  ]) as expected_column,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'daily_questions'
        AND column_name = unnest
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ============================================================================
-- 6. WEEKLY_SUMMARIES TABLE - COLUMN VERIFICATION
-- ============================================================================

-- Service expects (from line 402-415):
-- Required: id, user_id, created_at
-- Dates: week_start, week_end
-- Content: highlights, reflection
-- Stats: mood_average, moments_count, tasks_completed

SELECT
  'weekly_summaries' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at') THEN '🔴 REQUIRED'
    WHEN column_name IN ('week_start', 'week_end') THEN '🔴 REQUIRED DATES'
    WHEN column_name IN ('highlights', 'reflection') THEN '🔵 OPTIONAL CONTENT'
    WHEN column_name IN ('mood_average', 'moments_count', 'tasks_completed') THEN '🔵 OPTIONAL STATS'
    ELSE '⚪ OTHER'
  END as requirement_level
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'weekly_summaries'
ORDER BY
  CASE requirement_level
    WHEN '🔴 REQUIRED' THEN 1
    WHEN '🔴 REQUIRED DATES' THEN 2
    WHEN '🔵 OPTIONAL CONTENT' THEN 3
    WHEN '🔵 OPTIONAL STATS' THEN 4
    ELSE 5
  END,
  column_name;

-- Check for missing columns
SELECT
  'weekly_summaries' as table_name,
  unnest(ARRAY[
    'id', 'user_id', 'created_at',
    'week_start', 'week_end',
    'highlights', 'reflection',
    'mood_average', 'moments_count', 'tasks_completed'
  ]) as expected_column,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'weekly_summaries'
        AND column_name = unnest
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ============================================================================
-- 7. USER_ACTIVITIES TABLE - COLUMN VERIFICATION
-- ============================================================================

-- Service expects (from line 455-465):
-- Required: id, user_id, created_at
-- Content: activity_type OR type, description
-- Metadata: metadata
-- Gamification: xp_earned

SELECT
  'user_activities' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at') THEN '🔴 REQUIRED'
    WHEN column_name IN ('activity_type', 'type') THEN '🟡 TYPE (one required)'
    WHEN column_name IN ('description') THEN '🟢 CONTENT'
    WHEN column_name IN ('metadata') THEN '🔵 OPTIONAL METADATA'
    WHEN column_name IN ('xp_earned') THEN '🔵 GAMIFICATION'
    ELSE '⚪ OTHER'
  END as requirement_level
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_activities'
ORDER BY
  CASE requirement_level
    WHEN '🔴 REQUIRED' THEN 1
    WHEN '🟡 TYPE (one required)' THEN 2
    WHEN '🟢 CONTENT' THEN 3
    WHEN '🔵 OPTIONAL METADATA' THEN 4
    WHEN '🔵 GAMIFICATION' THEN 5
    ELSE 6
  END,
  column_name;

-- Check for missing columns
SELECT
  'user_activities' as table_name,
  unnest(ARRAY[
    'id', 'user_id', 'created_at',
    'activity_type', 'type', 'description',
    'metadata',
    'xp_earned'
  ]) as expected_column,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_activities'
        AND column_name = unnest
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ============================================================================
-- 8. GRANT_RESPONSES TABLE - COLUMN VERIFICATION (APPROVAL EVENTS)
-- ============================================================================

-- Note: ApprovalEvent interface exists but fetch function not implemented yet
-- Expected columns based on types/unifiedEvent.ts lines 91-98:
-- Required: id, user_id, created_at
-- Content: title, description
-- Status: status (pending/approved/rejected)
-- Dates: approved_at, rejected_at

SELECT
  'grant_responses' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'user_id', 'created_at') THEN '🔴 REQUIRED'
    WHEN column_name IN ('title', 'grant_id') THEN '🟢 METADATA'
    WHEN column_name IN ('status') THEN '🔴 REQUIRED STATUS'
    WHEN column_name IN ('notes', 'description') THEN '🔵 OPTIONAL CONTENT'
    WHEN column_name IN ('approved_at', 'rejected_at') THEN '🔵 OPTIONAL DATES'
    ELSE '⚪ OTHER'
  END as requirement_level
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'grant_responses'
ORDER BY
  CASE requirement_level
    WHEN '🔴 REQUIRED' THEN 1
    WHEN '🔴 REQUIRED STATUS' THEN 2
    WHEN '🟢 METADATA' THEN 3
    WHEN '🔵 OPTIONAL CONTENT' THEN 4
    WHEN '🔵 OPTIONAL DATES' THEN 5
    ELSE 6
  END,
  column_name;

-- ============================================================================
-- 9. COMPREHENSIVE MISSING COLUMNS REPORT
-- ============================================================================

-- Generate a summary of all missing columns across all timeline tables
SELECT
  '⚠️ MISSING COLUMNS SUMMARY' as report_section,
  table_name,
  string_agg(expected_column, ', ') as missing_columns
FROM (
  -- WhatsApp Messages
  SELECT 'whatsapp_messages' as table_name,
         unnest(ARRAY['content', 'sentiment', 'tags']) as expected_column
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = unnest
  )

  UNION ALL

  -- Moments
  SELECT 'moments' as table_name,
         unnest(ARRAY['sentiment', 'audio_url', 'audio_duration']) as expected_column
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'moments'
      AND column_name = unnest
  )

  UNION ALL

  -- Tasks
  SELECT 'tasks' as table_name,
         unnest(ARRAY['quadrant', 'xp_earned']) as expected_column
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = unnest
  )

  UNION ALL

  -- Daily Questions
  SELECT 'daily_questions' as table_name,
         unnest(ARRAY['xp_earned']) as expected_column
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_questions'
      AND column_name = unnest
  )

  UNION ALL

  -- Weekly Summaries
  SELECT 'weekly_summaries' as table_name,
         unnest(ARRAY['highlights', 'reflection', 'mood_average', 'moments_count', 'tasks_completed']) as expected_column
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weekly_summaries'
      AND column_name = unnest
  )

  UNION ALL

  -- User Activities
  SELECT 'user_activities' as table_name,
         unnest(ARRAY['description', 'xp_earned']) as expected_column
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_activities'
      AND column_name = unnest
  )
) missing
GROUP BY table_name
ORDER BY table_name;

-- ============================================================================
-- 10. RLS VERIFICATION FOR TIMELINE TABLES
-- ============================================================================

-- Verify RLS is enabled on all timeline tables
SELECT
  'RLS STATUS' as check_type,
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  string_agg(DISTINCT p.cmd, ', ') as policy_types
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'whatsapp_messages',
    'moments',
    'tasks',
    'daily_questions',
    'weekly_summaries',
    'user_activities',
    'grant_responses'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- ============================================================================
-- 11. INDEX VERIFICATION FOR TIMELINE QUERIES
-- ============================================================================

-- Check if critical indexes exist for timeline queries
SELECT
  'INDEX COVERAGE' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_messages',
    'moments',
    'tasks',
    'daily_questions',
    'weekly_summaries',
    'user_activities'
  )
  AND (
    indexdef LIKE '%user_id%'
    OR indexdef LIKE '%created_at%'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================
