-- =============================================================================
-- REPAIR: Add missing columns to daily_questions and user_question_context_bank
--
-- These columns were defined in migration 20260126000001 which was marked as
-- applied but likely failed partially. All ADD COLUMN IF NOT EXISTS is safe.
-- =============================================================================

-- daily_questions: columns needed by check_should_generate_questions RPC
ALTER TABLE daily_questions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE daily_questions ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_questions ADD COLUMN IF NOT EXISTS generation_context JSONB DEFAULT NULL;
ALTER TABLE daily_questions ADD COLUMN IF NOT EXISTS generation_prompt_hash TEXT DEFAULT NULL;
ALTER TABLE daily_questions ADD COLUMN IF NOT EXISTS relevance_score DECIMAL(3,2) DEFAULT 1.0;

-- user_question_context_bank: columns needed by generate-questions Edge Function
ALTER TABLE user_question_context_bank ADD COLUMN IF NOT EXISTS mentioned_areas TEXT[] DEFAULT '{}';
ALTER TABLE user_question_context_bank ADD COLUMN IF NOT EXISTS sentiment_trend TEXT DEFAULT 'neutral';
ALTER TABLE user_question_context_bank ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(3,2) DEFAULT 0.5;
ALTER TABLE user_question_context_bank ADD COLUMN IF NOT EXISTS avoided_topics TEXT[] DEFAULT '{}';
ALTER TABLE user_question_context_bank ADD COLUMN IF NOT EXISTS generation_count INT DEFAULT 0;

-- RLS: allow users to see global + own generated questions
DROP POLICY IF EXISTS "Users can view questions" ON daily_questions;
CREATE POLICY "Users can view questions" ON daily_questions
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- Index for user-specific questions
CREATE INDEX IF NOT EXISTS idx_daily_questions_user_id
  ON daily_questions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_questions_created_by_ai
  ON daily_questions(created_by_ai) WHERE created_by_ai = TRUE;
