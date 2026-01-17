-- Migration: Minha Jornada Redesign
-- Description: Tables for moments, weekly summaries, consciousness points, and daily questions
-- Date: 2025-12-06

-- =====================================================
-- 1. MOMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  type TEXT NOT NULL CHECK (type IN ('audio', 'text', 'both')),
  content TEXT, -- Text content or transcription
  audio_url TEXT, -- Supabase Storage URL

  -- Emotion & Sentiment
  emotion TEXT, -- Selected emotion emoji/name
  sentiment_data JSONB, -- SentimentAnalysis object

  -- Metadata
  tags TEXT[], -- Quick tags: #saúde #trabalho etc
  location TEXT, -- Optional location

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT moments_user_id_created_at_idx UNIQUE (user_id, created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_tags ON moments USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_moments_sentiment ON moments USING GIN(sentiment_data);

-- RLS Policies
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own moments" ON moments;
CREATE POLICY "Users can view own moments"
  ON moments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own moments" ON moments;
CREATE POLICY "Users can insert own moments"
  ON moments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own moments" ON moments;
CREATE POLICY "Users can update own moments"
  ON moments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own moments" ON moments;
CREATE POLICY "Users can delete own moments"
  ON moments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. WEEKLY SUMMARIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time period
  week_number INT NOT NULL, -- ISO week number
  year INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Summary data (JSON structure)
  summary_data JSONB NOT NULL,
  -- {
  --   emotionalTrend: 'ascending' | 'stable' | 'descending' | 'volatile',
  --   dominantEmotions: string[],
  --   keyMoments: { id, preview, sentiment }[],
  --   insights: string[],
  --   suggestedFocus: string
  -- }

  -- User reflection
  user_reflection TEXT, -- Optional user-added reflection

  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,

  -- Unique constraint
  CONSTRAINT weekly_summaries_user_week_unique UNIQUE (user_id, year, week_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_id ON weekly_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_period ON weekly_summaries(period_start DESC);

-- RLS Policies
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summaries" ON weekly_summaries;
CREATE POLICY "Users can view own summaries"
  ON weekly_summaries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own summaries" ON weekly_summaries;
CREATE POLICY "Users can update own summaries"
  ON weekly_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. DAILY QUESTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Question
  question_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('reflection', 'gratitude', 'energy', 'learning', 'change')),

  -- Status
  active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial questions (only if category column exists and table is empty)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_questions' AND column_name = 'category' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM daily_questions LIMIT 1) THEN
      INSERT INTO daily_questions (question_text, category) VALUES
        ('O que te trouxe energia essa semana?', 'energy'),
        ('Se pudesse mudar uma coisa hoje, o que seria?', 'change'),
        ('Qual foi seu maior aprendizado recente?', 'learning'),
        ('Pelo que você é grato hoje?', 'gratitude'),
        ('Como você está se sentindo neste momento?', 'reflection'),
        ('Que desafio você superou recentemente?', 'reflection'),
        ('O que te fez sorrir hoje?', 'gratitude'),
        ('Qual seu maior objetivo para esta semana?', 'change'),
        ('Que hábito você gostaria de criar?', 'change'),
        ('Quem te inspirou recentemente?', 'gratitude');
    END IF;
  END IF;
END $$;

-- No RLS needed (public read)
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;

-- Policy with active column (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_questions' AND column_name = 'active' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Anyone can view active questions" ON daily_questions;
    CREATE POLICY "Anyone can view active questions"
      ON daily_questions FOR SELECT
      USING (active = true);
  ELSE
    -- Fallback: allow all reads if active column doesn't exist
    DROP POLICY IF EXISTS "Anyone can view questions" ON daily_questions;
    CREATE POLICY "Anyone can view questions"
      ON daily_questions FOR SELECT
      USING (true);
  END IF;
END $$;

-- =====================================================
-- 4. QUESTION RESPONSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,

  -- Response
  response_text TEXT NOT NULL,

  -- Timestamp
  responded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: one response per user per question
  CONSTRAINT question_responses_user_question_unique UNIQUE (user_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_question_responses_user_id ON question_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_responded_at ON question_responses(responded_at DESC);

-- RLS Policies
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own responses" ON question_responses;
CREATE POLICY "Users can view own responses"
  ON question_responses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own responses" ON question_responses;
CREATE POLICY "Users can insert own responses"
  ON question_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. CONSCIOUSNESS POINTS LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS consciousness_points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Points
  points INT NOT NULL,
  reason TEXT NOT NULL, -- 'moment_registered', 'question_answered', 'weekly_reflection', 'streak_7_days'

  -- Reference
  reference_id UUID, -- ID of moment/question/summary
  reference_type TEXT, -- 'moment', 'question', 'summary'

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cp_log_user_id ON consciousness_points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_log_created_at ON consciousness_points_log(created_at DESC);

-- RLS Policies
ALTER TABLE consciousness_points_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own CP log" ON consciousness_points_log;
CREATE POLICY "Users can view own CP log"
  ON consciousness_points_log FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. USER CONSCIOUSNESS STATS (Aggregate View)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_consciousness_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Totals
  total_points INT DEFAULT 0,
  level INT DEFAULT 1, -- 1-5
  level_name TEXT DEFAULT 'Observador',

  -- Streaks
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_moment_date DATE,

  -- Counts
  total_moments INT DEFAULT 0,
  total_questions_answered INT DEFAULT 0,
  total_summaries_reflected INT DEFAULT 0,

  -- Updated
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_consciousness_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stats" ON user_consciousness_stats;
CREATE POLICY "Users can view own stats"
  ON user_consciousness_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON user_consciousness_stats;
CREATE POLICY "Users can update own stats"
  ON user_consciousness_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. FUNCTIONS
-- =====================================================

-- Function: Calculate CP level from points
CREATE OR REPLACE FUNCTION calculate_cp_level(points INT)
RETURNS TABLE(level INT, level_name TEXT) AS $$
BEGIN
  IF points >= 5000 THEN
    RETURN QUERY SELECT 5, 'Mestre'::TEXT;
  ELSIF points >= 1500 THEN
    RETURN QUERY SELECT 4, 'Integrado'::TEXT;
  ELSIF points >= 500 THEN
    RETURN QUERY SELECT 3, 'Reflexivo'::TEXT;
  ELSIF points >= 100 THEN
    RETURN QUERY SELECT 2, 'Consciente'::TEXT;
  ELSE
    RETURN QUERY SELECT 1, 'Observador'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Award consciousness points
CREATE OR REPLACE FUNCTION award_consciousness_points(
  p_user_id UUID,
  p_points INT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_total INT;
  v_level INT;
  v_level_name TEXT;
  v_leveled_up BOOLEAN := false;
  v_old_level INT;
BEGIN
  -- Insert into log
  INSERT INTO consciousness_points_log (user_id, points, reason, reference_id, reference_type)
  VALUES (p_user_id, p_points, p_reason, p_reference_id, p_reference_type);

  -- Get current stats or create
  INSERT INTO user_consciousness_stats (user_id, total_points)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get old level
  SELECT level INTO v_old_level
  FROM user_consciousness_stats
  WHERE user_id = p_user_id;

  -- Update total points
  UPDATE user_consciousness_stats
  SET total_points = total_points + p_points,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_new_total;

  -- Calculate new level
  SELECT * INTO v_level, v_level_name FROM calculate_cp_level(v_new_total);

  -- Check if leveled up
  IF v_level > v_old_level THEN
    v_leveled_up := true;
  END IF;

  -- Update level
  UPDATE user_consciousness_stats
  SET level = v_level,
      level_name = v_level_name
  WHERE user_id = p_user_id;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'new_total', v_new_total,
    'level', v_level,
    'level_name', v_level_name,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update streak
CREATE OR REPLACE FUNCTION update_moment_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_today DATE := CURRENT_DATE;
  v_streak_bonus BOOLEAN := false;
BEGIN
  -- Get current stats
  SELECT last_moment_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM user_consciousness_stats
  WHERE user_id = p_user_id;

  -- If first moment ever
  IF v_last_date IS NULL THEN
    v_current_streak := 1;
    v_longest_streak := 1;
  -- If last moment was yesterday, increment streak
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    -- Award bonus at 7 days
    IF v_current_streak = 7 THEN
      v_streak_bonus := true;
      PERFORM award_consciousness_points(p_user_id, 50, 'streak_7_days', NULL, NULL);
    END IF;
  -- If last moment was today, no change
  ELSIF v_last_date = v_today THEN
    -- No change to streak
    NULL;
  -- If streak broken
  ELSE
    v_current_streak := 1;
  END IF;

  -- Update stats
  UPDATE user_consciousness_stats
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_moment_date = v_today,
      total_moments = total_moments + 1
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'streak_bonus_awarded', v_streak_bonus
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger: Auto-update updated_at on moments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_moments_updated_at
  BEFORE UPDATE ON moments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE moments IS 'User journal moments (audio, text, or both)';
COMMENT ON TABLE weekly_summaries IS 'AI-generated weekly summaries with insights';
COMMENT ON TABLE daily_questions IS 'Pool of daily reflection questions';
COMMENT ON TABLE question_responses IS 'User responses to daily questions';
COMMENT ON TABLE consciousness_points_log IS 'Log of all CP transactions';
COMMENT ON TABLE user_consciousness_stats IS 'Aggregated CP stats per user';
