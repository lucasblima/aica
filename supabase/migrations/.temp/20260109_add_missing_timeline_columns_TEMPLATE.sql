-- ============================================================================
-- Migration: 20260109_add_missing_timeline_columns.sql
-- Description: Add missing columns for unified timeline service
-- Issue: Unified Timeline Phase 2 - Schema Alignment
-- Author: Backend Architect Agent
-- ============================================================================
-- IMPORTANT: This is a TEMPLATE. Uncomment only the sections needed based
-- on verification results from verify_unified_timeline_schema.sql
-- ============================================================================

-- ============================================================================
-- PRE-FLIGHT CHECK: Verify all target tables exist
-- ============================================================================

DO $$
BEGIN
  -- Check whatsapp_messages
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_messages') THEN
    RAISE EXCEPTION 'Table whatsapp_messages does not exist';
  END IF;

  -- Check moments
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'moments') THEN
    RAISE EXCEPTION 'Table moments does not exist';
  END IF;

  -- Check tasks
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tasks') THEN
    RAISE EXCEPTION 'Table tasks does not exist';
  END IF;

  -- Check daily_questions
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'daily_questions') THEN
    RAISE EXCEPTION 'Table daily_questions does not exist';
  END IF;

  -- Check weekly_summaries
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'weekly_summaries') THEN
    RAISE EXCEPTION 'Table weekly_summaries does not exist';
  END IF;

  -- Check user_activities
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_activities') THEN
    RAISE EXCEPTION 'Table user_activities does not exist';
  END IF;

  RAISE NOTICE 'All target tables exist - proceeding with migration';
END $$;

-- ============================================================================
-- 1. WHATSAPP_MESSAGES - Add Missing Columns
-- ============================================================================

-- Add sentiment column (AI analysis)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE whatsapp_messages
-- ADD COLUMN IF NOT EXISTS sentiment TEXT
-- CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed'));

-- Add tags column (array of strings)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE whatsapp_messages
-- ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add intent column (AI-analyzed user intent)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE whatsapp_messages
-- ADD COLUMN IF NOT EXISTS intent TEXT;

-- Add media_url column (for images/videos)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE whatsapp_messages
-- ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Create indexes for whatsapp_messages
-- UNCOMMENT IF COLUMNS ADDED:
-- CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sentiment
-- ON whatsapp_messages(sentiment)
-- WHERE sentiment IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tags
-- ON whatsapp_messages USING GIN(tags)
-- WHERE array_length(tags, 1) > 0;

-- Add comments
-- UNCOMMENT IF COLUMNS ADDED:
-- COMMENT ON COLUMN whatsapp_messages.sentiment IS
-- 'AI-analyzed sentiment: positive, neutral, negative, mixed';

-- COMMENT ON COLUMN whatsapp_messages.tags IS
-- 'User-defined or AI-suggested tags for categorization';

-- COMMENT ON COLUMN whatsapp_messages.intent IS
-- 'AI-analyzed user intent (e.g., question, command, statement)';

-- COMMENT ON COLUMN whatsapp_messages.media_url IS
-- 'URL to media attachment (image, video, document)';

-- ============================================================================
-- 2. MOMENTS - Add Missing Columns
-- ============================================================================

-- Add sentiment column (AI analysis)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE moments
-- ADD COLUMN IF NOT EXISTS sentiment TEXT
-- CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed'));

-- Add audio_url column (voice recordings)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE moments
-- ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add audio_duration column (seconds)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE moments
-- ADD COLUMN IF NOT EXISTS audio_duration INTEGER
-- CHECK (audio_duration > 0);

-- Create indexes for moments
-- UNCOMMENT IF COLUMNS ADDED:
-- CREATE INDEX IF NOT EXISTS idx_moments_sentiment
-- ON moments(sentiment)
-- WHERE sentiment IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS idx_moments_audio
-- ON moments(user_id, created_at)
-- WHERE audio_url IS NOT NULL;

-- Add comments
-- UNCOMMENT IF COLUMNS ADDED:
-- COMMENT ON COLUMN moments.sentiment IS
-- 'AI-analyzed sentiment of moment content';

-- COMMENT ON COLUMN moments.audio_url IS
-- 'URL to audio recording if moment was captured via voice';

-- COMMENT ON COLUMN moments.audio_duration IS
-- 'Duration of audio recording in seconds';

-- ============================================================================
-- 3. TASKS - Add Missing Columns
-- ============================================================================

-- Add quadrant column (Eisenhower Matrix 1-4)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE tasks
-- ADD COLUMN IF NOT EXISTS quadrant INTEGER
-- CHECK (quadrant BETWEEN 1 AND 4);

-- Add completed_at column (completion timestamp)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE tasks
-- ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add xp_earned column (gamification)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE tasks
-- ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0
-- CHECK (xp_earned >= 0);

-- Create indexes for tasks
-- UNCOMMENT IF COLUMNS ADDED:
-- CREATE INDEX IF NOT EXISTS idx_tasks_quadrant
-- ON tasks(quadrant)
-- WHERE quadrant IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS idx_tasks_completed_at
-- ON tasks(completed_at)
-- WHERE completed_at IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS idx_tasks_xp_earned
-- ON tasks(xp_earned)
-- WHERE xp_earned > 0;

-- Add comments
-- UNCOMMENT IF COLUMNS ADDED:
-- COMMENT ON COLUMN tasks.quadrant IS
-- 'Eisenhower Matrix quadrant: 1=urgent+important, 2=not urgent+important, 3=urgent+not important, 4=not urgent+not important';

-- COMMENT ON COLUMN tasks.completed_at IS
-- 'Timestamp when task was marked as completed';

-- COMMENT ON COLUMN tasks.xp_earned IS
-- 'Experience points earned for completing this task';

-- ============================================================================
-- 4. DAILY_QUESTIONS - Add Missing Columns
-- ============================================================================

-- Add xp_earned column (gamification)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE daily_questions
-- ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0
-- CHECK (xp_earned >= 0);

-- Add answered_at column (response timestamp)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE daily_questions
-- ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

-- Add skipped column (track skipped questions)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE daily_questions
-- ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT FALSE;

-- Create indexes for daily_questions
-- UNCOMMENT IF COLUMNS ADDED:
-- CREATE INDEX IF NOT EXISTS idx_daily_questions_xp_earned
-- ON daily_questions(xp_earned)
-- WHERE xp_earned > 0;

-- CREATE INDEX IF NOT EXISTS idx_daily_questions_answered_at
-- ON daily_questions(answered_at)
-- WHERE answered_at IS NOT NULL;

-- Add comments
-- UNCOMMENT IF COLUMNS ADDED:
-- COMMENT ON COLUMN daily_questions.xp_earned IS
-- 'Experience points earned for answering the question';

-- COMMENT ON COLUMN daily_questions.answered_at IS
-- 'Timestamp when question was answered';

-- COMMENT ON COLUMN daily_questions.skipped IS
-- 'Whether user explicitly skipped this question';

-- ============================================================================
-- 5. WEEKLY_SUMMARIES - Add Missing Columns
-- ============================================================================

-- Add highlights column (array of key moments)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE weekly_summaries
-- ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT '{}';

-- Add reflection column (AI-generated reflection)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE weekly_summaries
-- ADD COLUMN IF NOT EXISTS reflection TEXT;

-- Add mood_average column (average mood score)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE weekly_summaries
-- ADD COLUMN IF NOT EXISTS mood_average DECIMAL(3,2)
-- CHECK (mood_average BETWEEN 0 AND 5);

-- Add moments_count column (total moments this week)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE weekly_summaries
-- ADD COLUMN IF NOT EXISTS moments_count INTEGER DEFAULT 0
-- CHECK (moments_count >= 0);

-- Add tasks_completed column (tasks completed this week)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE weekly_summaries
-- ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0
-- CHECK (tasks_completed >= 0);

-- Create indexes for weekly_summaries
-- UNCOMMENT IF COLUMNS ADDED:
-- CREATE INDEX IF NOT EXISTS idx_weekly_summaries_highlights
-- ON weekly_summaries USING GIN(highlights)
-- WHERE array_length(highlights, 1) > 0;

-- CREATE INDEX IF NOT EXISTS idx_weekly_summaries_mood_average
-- ON weekly_summaries(mood_average)
-- WHERE mood_average IS NOT NULL;

-- Add comments
-- UNCOMMENT IF COLUMNS ADDED:
-- COMMENT ON COLUMN weekly_summaries.highlights IS
-- 'Array of highlight strings summarizing key moments of the week';

-- COMMENT ON COLUMN weekly_summaries.reflection IS
-- 'AI-generated reflection text based on week activities';

-- COMMENT ON COLUMN weekly_summaries.mood_average IS
-- 'Average mood score for the week (0-5 scale)';

-- COMMENT ON COLUMN weekly_summaries.moments_count IS
-- 'Total number of moments recorded this week';

-- COMMENT ON COLUMN weekly_summaries.tasks_completed IS
-- 'Total number of tasks completed this week';

-- ============================================================================
-- 6. USER_ACTIVITIES - Add Missing Columns
-- ============================================================================

-- Add description column (activity description)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE user_activities
-- ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Add xp_earned column (gamification)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE user_activities
-- ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0
-- CHECK (xp_earned >= 0);

-- Add metadata column (flexible JSONB storage)
-- UNCOMMENT IF MISSING:
-- ALTER TABLE user_activities
-- ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for user_activities
-- UNCOMMENT IF COLUMNS ADDED:
-- CREATE INDEX IF NOT EXISTS idx_user_activities_xp_earned
-- ON user_activities(xp_earned)
-- WHERE xp_earned > 0;

-- CREATE INDEX IF NOT EXISTS idx_user_activities_metadata
-- ON user_activities USING GIN(metadata)
-- WHERE metadata != '{}'::jsonb;

-- Add comments
-- UNCOMMENT IF COLUMNS ADDED:
-- COMMENT ON COLUMN user_activities.description IS
-- 'Human-readable description of the activity';

-- COMMENT ON COLUMN user_activities.xp_earned IS
-- 'Experience points earned for this activity';

-- COMMENT ON COLUMN user_activities.metadata IS
-- 'Flexible JSONB storage for activity-specific data';

-- ============================================================================
-- 7. GRANT_RESPONSES - Verify Schema (Future Implementation)
-- ============================================================================

-- Note: grant_responses table should already exist from grants module
-- Verify it has columns needed for ApprovalEvent interface

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'grant_responses') THEN
    -- Check for required columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'grant_responses'
        AND column_name IN ('id', 'user_id', 'created_at', 'status')
    ) THEN
      RAISE WARNING 'grant_responses table exists but missing required columns for timeline';
    ELSE
      RAISE NOTICE 'grant_responses table has required columns for timeline';
    END IF;
  ELSE
    RAISE NOTICE 'grant_responses table does not exist - will be created by grants module';
  END IF;
END $$;

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

-- Verify no columns were added that break existing queries
-- This should NOT fail - just informational
DO $$
DECLARE
  v_table_name TEXT;
  v_column_count INTEGER;
BEGIN
  FOR v_table_name IN
    SELECT unnest(ARRAY[
      'whatsapp_messages',
      'moments',
      'tasks',
      'daily_questions',
      'weekly_summaries',
      'user_activities'
    ])
  LOOP
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = v_table_name;

    RAISE NOTICE 'Table % has % columns', v_table_name, v_column_count;
  END LOOP;

  RAISE NOTICE 'Post-flight verification complete';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- If this migration causes issues, rollback with:
--
-- ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS sentiment;
-- ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS tags;
-- ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS intent;
-- ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS media_url;
--
-- ALTER TABLE moments DROP COLUMN IF EXISTS sentiment;
-- ALTER TABLE moments DROP COLUMN IF EXISTS audio_url;
-- ALTER TABLE moments DROP COLUMN IF EXISTS audio_duration;
--
-- ALTER TABLE tasks DROP COLUMN IF EXISTS quadrant;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS completed_at;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS xp_earned;
--
-- ALTER TABLE daily_questions DROP COLUMN IF EXISTS xp_earned;
-- ALTER TABLE daily_questions DROP COLUMN IF EXISTS answered_at;
-- ALTER TABLE daily_questions DROP COLUMN IF EXISTS skipped;
--
-- ALTER TABLE weekly_summaries DROP COLUMN IF EXISTS highlights;
-- ALTER TABLE weekly_summaries DROP COLUMN IF EXISTS reflection;
-- ALTER TABLE weekly_summaries DROP COLUMN IF EXISTS mood_average;
-- ALTER TABLE weekly_summaries DROP COLUMN IF EXISTS moments_count;
-- ALTER TABLE weekly_summaries DROP COLUMN IF EXISTS tasks_completed;
--
-- ALTER TABLE user_activities DROP COLUMN IF EXISTS description;
-- ALTER TABLE user_activities DROP COLUMN IF EXISTS xp_earned;
-- ALTER TABLE user_activities DROP COLUMN IF EXISTS metadata;
--
-- DROP INDEX IF EXISTS idx_whatsapp_messages_sentiment;
-- DROP INDEX IF EXISTS idx_whatsapp_messages_tags;
-- DROP INDEX IF EXISTS idx_moments_sentiment;
-- DROP INDEX IF EXISTS idx_moments_audio;
-- DROP INDEX IF EXISTS idx_tasks_quadrant;
-- DROP INDEX IF EXISTS idx_tasks_completed_at;
-- DROP INDEX IF EXISTS idx_tasks_xp_earned;
-- DROP INDEX IF EXISTS idx_daily_questions_xp_earned;
-- DROP INDEX IF EXISTS idx_daily_questions_answered_at;
-- DROP INDEX IF EXISTS idx_weekly_summaries_highlights;
-- DROP INDEX IF EXISTS idx_weekly_summaries_mood_average;
-- DROP INDEX IF EXISTS idx_user_activities_xp_earned;
-- DROP INDEX IF EXISTS idx_user_activities_metadata;

-- ============================================================================
-- END OF MIGRATION TEMPLATE
-- ============================================================================
