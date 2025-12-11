-- Migration: Consolidate moment_entries (unify journey_moments and moments)
-- Description: Creates new unified moment_entries table combining both legacy systems.
--              Provides backward compatibility views for existing code.
--              NO DATA MIGRATION in this phase (will be done in subsequent migration).
-- Date: 2025-12-11
-- Status: Phase 1 - Schema creation and compatibility layer
-- Author: Backend Architect Agent (Aica Life OS)

-- =====================================================
-- TABLE: moment_entries (NEW - UNIFIED)
-- =====================================================
-- Purpose: Central repository for all types of journey entries
-- Consolidates: journey_moments (legacy) + moments (new) into one table
-- Features:
--   - Supports audio, text, and hybrid content
--   - Tracks entry type (moment, reflection, question_answer, weekly_summary)
--   - Emotion tracking with intensity scale (1-10)
--   - Sentiment analysis (AI-generated)
--   - Life areas categorization
--   - Weekly aggregation support
--   - Full RLS isolation per user

CREATE TABLE IF NOT EXISTS moment_entries (
  -- ========== PRIMARY KEY & USER ==========
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ========== CONTENT ==========
  content TEXT,                              -- Text content or audio transcription
  audio_url TEXT,                            -- Supabase Storage URL (if audio)
  audio_duration_seconds INT,                -- Duration of audio clip (in seconds)
  audio_transcribed_at TIMESTAMPTZ,          -- When transcription was completed

  -- ========== TYPE & CONTEXT ==========
  entry_type VARCHAR(50) NOT NULL,           -- 'moment', 'reflection', 'question_answer', 'weekly_summary'
  source TEXT CHECK (source IN ('manual', 'voice', 'imported')), -- How it was created

  -- If this is a question_answer
  question_id UUID REFERENCES daily_questions(id) ON DELETE SET NULL,
  question_text TEXT,                        -- Denormalized for reference

  -- If this is a reflection on a weekly_summary
  weekly_summary_id UUID REFERENCES weekly_summaries(id) ON DELETE SET NULL,

  -- ========== EMOTION & SENTIMENT ==========
  emotion_selected TEXT,                     -- User-selected emotion/mood
  emotion_intensity INT CHECK (emotion_intensity >= 0 AND emotion_intensity <= 10), -- 1-10 scale
  emotion_categories TEXT[],                 -- Can have multiple: ['anger', 'sadness', ...]

  -- Sentiment analysis (AI-generated)
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_label VARCHAR(20),               -- 'very_positive', 'positive', 'neutral', 'negative', 'very_negative'
  sentiment_generated_at TIMESTAMPTZ,        -- When AI analysis was done

  -- ========== CATEGORIZATION ==========
  tags TEXT[],                               -- User/AI tags: #health #work #relationships
  life_areas TEXT[],                         -- Categorized areas: ['health', 'finance', 'relationships']
  is_shared_with_associations UUID[],        -- Which associations can see this

  -- ========== LOCATION & CONTEXT ==========
  location TEXT,                             -- Optional: where this happened
  weather_notes TEXT,                        -- Optional: weather context
  people_involved TEXT[],                    -- Optional: who was involved

  -- ========== WEEK TRACKING ==========
  week_number INT NOT NULL,                  -- ISO week number
  year INT NOT NULL,                         -- Year
  day_of_week INT,                           -- 0-6 (0 = Sunday)

  -- ========== TIMESTAMPS ==========
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  happened_at TIMESTAMPTZ,                   -- When the event actually occurred (optional)

  -- ========== CONSTRAINTS ==========
  CONSTRAINT moment_entries_user_created_unique UNIQUE(user_id, created_at)
);

-- =====================================================
-- INDEXES (For query performance)
-- =====================================================

-- User filtering (most common)
CREATE INDEX IF NOT EXISTS idx_moment_entries_user_id
  ON moment_entries(user_id);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_moment_entries_created_at
  ON moment_entries(created_at DESC);

-- Week aggregation (for weekly summaries, stats)
CREATE INDEX IF NOT EXISTS idx_moment_entries_week
  ON moment_entries(user_id, week_number, year);

-- Type-based filtering
CREATE INDEX IF NOT EXISTS idx_moment_entries_type
  ON moment_entries(user_id, entry_type);

-- Emotion analysis
CREATE INDEX IF NOT EXISTS idx_moment_entries_emotion
  ON moment_entries(emotion_selected);

-- Tag-based searching (GIN index for arrays)
CREATE INDEX IF NOT EXISTS idx_moment_entries_tags
  ON moment_entries USING GIN(tags);

-- Life areas filtering (GIN index)
CREATE INDEX IF NOT EXISTS idx_moment_entries_life_areas
  ON moment_entries USING GIN(life_areas);

-- Sentiment-based sorting and analysis
CREATE INDEX IF NOT EXISTS idx_moment_entries_sentiment
  ON moment_entries(sentiment_score DESC);

-- Foreign key performance
CREATE INDEX IF NOT EXISTS idx_moment_entries_question_id
  ON moment_entries(question_id) WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moment_entries_weekly_summary_id
  ON moment_entries(weekly_summary_id) WHERE weekly_summary_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on moment_entries
ALTER TABLE moment_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own entries
CREATE POLICY "Users can view own entries"
  ON moment_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert own entries
CREATE POLICY "Users can insert own entries"
  ON moment_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own entries
CREATE POLICY "Users can update own entries"
  ON moment_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete own entries
CREATE POLICY "Users can delete own entries"
  ON moment_entries FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_moment_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists to avoid duplicates)
DROP TRIGGER IF EXISTS update_moment_entries_updated_at_trigger ON moment_entries;

CREATE TRIGGER update_moment_entries_updated_at_trigger
  BEFORE UPDATE ON moment_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_moment_entries_updated_at();

-- =====================================================
-- BACKWARD COMPATIBILITY VIEWS
-- =====================================================
-- These views allow existing code to continue working
-- against the old table names while reading from moment_entries

-- View: moments_legacy
-- Maps moment_entries to the old moments schema for backward compatibility
CREATE OR REPLACE VIEW moments_legacy AS
SELECT
  id,
  user_id,
  content,
  audio_url,
  emotion_selected as emotion,
  jsonb_build_object(
    'score', sentiment_score,
    'label', sentiment_label
  ) as sentiment_data,
  tags,
  location,
  created_at,
  updated_at
FROM moment_entries
WHERE entry_type = 'moment'
  AND sentiment_score IS NOT NULL;

-- View: journey_moments_legacy
-- Maps moment_entries to the old journey_moments schema for backward compatibility
CREATE OR REPLACE VIEW journey_moments_legacy AS
SELECT
  id,
  user_id,
  content,
  emotion_selected as mood,
  entry_type as type,
  question_id,
  week_number,
  created_at
FROM moment_entries
WHERE entry_type IN ('moment', 'question_answer', 'reflection');

-- =====================================================
-- COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE moment_entries IS
  'Unified table for all types of journey entries: moments, reflections, question answers, and weekly reflections. Consolidates legacy journey_moments and moments tables.';

COMMENT ON COLUMN moment_entries.entry_type IS
  'Type of entry: moment (freeform), reflection (on specific topic), question_answer (response to daily question), weekly_summary (reflection on week)';

COMMENT ON COLUMN moment_entries.source IS
  'How the entry was created: manual (typed), voice (recorded audio), imported (from external source)';

COMMENT ON COLUMN moment_entries.emotion_intensity IS
  'User perceived intensity of the emotion on a 1-10 scale. 1=barely noticeable, 10=extremely intense';

COMMENT ON COLUMN moment_entries.sentiment_score IS
  'AI-analyzed sentiment on a scale of -1 to 1. -1=very negative, 0=neutral, 1=very positive';

COMMENT ON COLUMN moment_entries.life_areas IS
  'Life areas affected: health, finance, relationships, work, personal, spiritual, education, family, leisure, etc.';

COMMENT ON COLUMN moment_entries.week_number IS
  'ISO week number (1-53) for aggregation and weekly summary matching';

COMMENT ON COLUMN moment_entries.day_of_week IS
  'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday) for pattern analysis';

COMMENT ON VIEW moments_legacy IS
  'DEPRECATED: Backward compatibility view mapping moment_entries to old moments schema. Use moment_entries directly in new code.';

COMMENT ON VIEW journey_moments_legacy IS
  'DEPRECATED: Backward compatibility view mapping moment_entries to old journey_moments schema. Use moment_entries directly in new code.';

-- =====================================================
-- MIGRATION NOTES
-- =====================================================
-- 1. TABLE CREATION: moment_entries table created successfully
-- 2. RLS POLICIES: All CRUD operations secured (SELECT, INSERT, UPDATE, DELETE)
-- 3. INDEXES: Performance indexes created for common query patterns
-- 4. TRIGGERS: Auto-update timestamp trigger configured
-- 5. BACKWARD COMPATIBILITY: Legacy views created to prevent code breakage
-- 6. DATA MIGRATION: NOT included in this migration (will be in Phase 1b)
--
-- NEXT STEPS (Phase 1b):
-- - Create migration: 20251211_migrate_moment_data.sql
--   * Migrate journey_moments → moment_entries (insert new records)
--   * Migrate moments → moment_entries (insert new records)
--   * Create backup views for old tables
--   * Rename old tables to *_deprecated
--
-- TIMELINE:
-- - Week 1: Schema creation + data migration
-- - Week 2-3: Update frontend code to use moment_entries
-- - Week 4: Full testing of onboarding → moment capture flow
-- - Week 5-6: Monitor, fix bugs, collect user feedback
-- - Week 7: Remove backward compatibility views
-- - Week 8: Delete deprecated tables

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- To verify the migration was successful, run:
--
-- SELECT EXISTS (
--   SELECT 1 FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'moment_entries'
-- ) as table_exists;
--
-- SELECT * FROM pg_indexes
-- WHERE tablename = 'moment_entries'
-- ORDER BY indexname;
--
-- SELECT * FROM pg_policies
-- WHERE tablename = 'moment_entries'
-- ORDER BY policyname;
