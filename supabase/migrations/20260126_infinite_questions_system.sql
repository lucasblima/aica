-- =============================================================================
-- Migration: Infinite Questions System
-- Description: Extends daily_questions for user-specific AI-generated questions
--              and creates context bank for personalized generation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend daily_questions table
-- -----------------------------------------------------------------------------

-- Add user_id for user-specific generated questions (NULL = global question)
ALTER TABLE daily_questions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add generation metadata
ALTER TABLE daily_questions
  ADD COLUMN IF NOT EXISTS generation_context JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS generation_prompt_hash TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES daily_questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS relevance_score DECIMAL(3,2) DEFAULT 1.0;

-- Ensure created_by_ai column exists
ALTER TABLE daily_questions
  ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_daily_questions_user_id
  ON daily_questions(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_questions_created_by_ai
  ON daily_questions(created_by_ai) WHERE created_by_ai = TRUE;

CREATE INDEX IF NOT EXISTS idx_daily_questions_user_active
  ON daily_questions(user_id, active) WHERE active = TRUE;

-- -----------------------------------------------------------------------------
-- 2. Create user_question_context_bank table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_question_context_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Aggregated context from responses
  dominant_emotions TEXT[] DEFAULT '{}',
  recurring_themes TEXT[] DEFAULT '{}',
  mentioned_areas TEXT[] DEFAULT '{}',
  sentiment_trend TEXT DEFAULT 'neutral' CHECK (sentiment_trend IN ('positive', 'negative', 'neutral', 'volatile')),

  -- Engagement statistics
  total_responses INT DEFAULT 0,
  avg_response_length INT DEFAULT 0,
  engagement_score DECIMAL(3,2) DEFAULT 0.5 CHECK (engagement_score >= 0 AND engagement_score <= 1),

  -- Question preferences (learned over time)
  preferred_categories TEXT[] DEFAULT '{}',
  avoided_topics TEXT[] DEFAULT '{}',

  -- Generation tracking
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  last_generation_at TIMESTAMPTZ,
  generation_count INT DEFAULT 0,

  -- Constraints
  CONSTRAINT user_context_unique UNIQUE (user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_context_bank_user_id
  ON user_question_context_bank(user_id);

-- -----------------------------------------------------------------------------
-- 3. RLS Policies for user_question_context_bank
-- -----------------------------------------------------------------------------

ALTER TABLE user_question_context_bank ENABLE ROW LEVEL SECURITY;

-- Users can view their own context
DROP POLICY IF EXISTS "Users can view own context" ON user_question_context_bank;
CREATE POLICY "Users can view own context" ON user_question_context_bank
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own context (via service)
DROP POLICY IF EXISTS "Users can insert own context" ON user_question_context_bank;
CREATE POLICY "Users can insert own context" ON user_question_context_bank
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own context
DROP POLICY IF EXISTS "Users can update own context" ON user_question_context_bank;
CREATE POLICY "Users can update own context" ON user_question_context_bank
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. Update RLS Policies for daily_questions
-- -----------------------------------------------------------------------------

-- Allow users to see global questions OR their own generated questions
DROP POLICY IF EXISTS "Users can view questions" ON daily_questions;
CREATE POLICY "Users can view questions" ON daily_questions
  FOR SELECT TO authenticated
  USING (
    user_id IS NULL  -- Global questions
    OR user_id = auth.uid()  -- User's own generated questions
  );

-- Allow system to insert user-specific questions (via Edge Function with service role)
-- Note: Edge Functions use service_role which bypasses RLS

-- -----------------------------------------------------------------------------
-- 5. Helper Functions
-- -----------------------------------------------------------------------------

-- Function to check if user needs new questions
CREATE OR REPLACE FUNCTION check_should_generate_questions(p_user_id UUID)
RETURNS TABLE (
  should_generate BOOLEAN,
  unanswered_count INT,
  total_available INT,
  hours_since_last_generation DECIMAL,
  daily_generation_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unanswered INT;
  v_total INT;
  v_last_gen TIMESTAMPTZ;
  v_hours_since DECIMAL;
  v_daily_count INT;
  v_min_threshold INT := 3;  -- Generate when below 3 unanswered
  v_min_hours INT := 12;     -- Minimum 12 hours between generations
  v_max_daily INT := 2;      -- Max 2 generations per day
BEGIN
  -- Count total available questions for user (global + user-specific)
  SELECT COUNT(*) INTO v_total
  FROM daily_questions
  WHERE active = TRUE
    AND (user_id IS NULL OR user_id = p_user_id);

  -- Count unanswered questions
  SELECT COUNT(*) INTO v_unanswered
  FROM daily_questions dq
  WHERE dq.active = TRUE
    AND (dq.user_id IS NULL OR dq.user_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM question_responses qr
      WHERE qr.question_id = dq.id AND qr.user_id = p_user_id
    );

  -- Get last generation time
  SELECT last_generation_at INTO v_last_gen
  FROM user_question_context_bank
  WHERE user_id = p_user_id;

  -- Calculate hours since last generation
  IF v_last_gen IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (NOW() - v_last_gen)) / 3600;
  ELSE
    v_hours_since := 999;  -- Never generated
  END IF;

  -- Count generations in last 24 hours
  SELECT COUNT(*) INTO v_daily_count
  FROM daily_questions
  WHERE user_id = p_user_id
    AND created_by_ai = TRUE
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Return results
  RETURN QUERY SELECT
    (v_unanswered < v_min_threshold
     AND v_hours_since >= v_min_hours
     AND v_daily_count < v_max_daily) AS should_generate,
    v_unanswered AS unanswered_count,
    v_total AS total_available,
    v_hours_since AS hours_since_last_generation,
    v_daily_count AS daily_generation_count;
END;
$$;

-- Function to update context bank after answering questions
CREATE OR REPLACE FUNCTION update_user_context_bank(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_responses INT;
  v_avg_length INT;
  v_categories TEXT[];
BEGIN
  -- Count total responses
  SELECT COUNT(*), COALESCE(AVG(LENGTH(response_text)), 0)::INT
  INTO v_total_responses, v_avg_length
  FROM question_responses
  WHERE user_id = p_user_id;

  -- Get preferred categories (most answered)
  SELECT ARRAY_AGG(category ORDER BY cnt DESC)
  INTO v_categories
  FROM (
    SELECT dq.category, COUNT(*) as cnt
    FROM question_responses qr
    JOIN daily_questions dq ON dq.id = qr.question_id
    WHERE qr.user_id = p_user_id
    GROUP BY dq.category
    LIMIT 3
  ) sub;

  -- Upsert context bank
  INSERT INTO user_question_context_bank (
    user_id,
    total_responses,
    avg_response_length,
    preferred_categories,
    last_updated
  ) VALUES (
    p_user_id,
    v_total_responses,
    v_avg_length,
    COALESCE(v_categories, '{}'),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_responses = EXCLUDED.total_responses,
    avg_response_length = EXCLUDED.avg_response_length,
    preferred_categories = EXCLUDED.preferred_categories,
    last_updated = NOW();
END;
$$;

-- Trigger to update context bank after answering
CREATE OR REPLACE FUNCTION trigger_update_context_bank()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_user_context_bank(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_context_bank ON question_responses;
CREATE TRIGGER trg_update_context_bank
  AFTER INSERT OR UPDATE ON question_responses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_context_bank();

-- -----------------------------------------------------------------------------
-- 6. Grant permissions
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION check_should_generate_questions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_context_bank(UUID) TO authenticated;
