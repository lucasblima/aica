-- Migration: 20260216000001_interviewer_system.sql
-- Description: Create interviewer system tables for structured user profiling.
--              Users answer curated questions across 6 categories (biografia, anamnese,
--              censo, preferencias, conexoes, objetivos) that feed into user_memory
--              for AI personalization.

-- ============================================================================
-- 1. Create interviewer_questions table (question bank)
-- ============================================================================

CREATE TABLE IF NOT EXISTS interviewer_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('free_text', 'long_text', 'single_choice', 'multi_choice', 'scale', 'date', 'ranked_list')),
  category TEXT NOT NULL CHECK (category IN ('biografia', 'anamnese', 'censo', 'preferencias', 'conexoes', 'objetivos')),
  config JSONB DEFAULT '{}'::jsonb,
  target_modules TEXT[] DEFAULT '{}',
  memory_mapping JSONB DEFAULT '{}'::jsonb,
  depends_on UUID REFERENCES interviewer_questions(id),
  depends_on_value JSONB,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 3),
  is_curated BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE interviewer_questions IS
  'Question bank for structured user profiling. Questions are organized by category and type, with deterministic routing to user_memory via memory_mapping.';

-- ============================================================================
-- 2. Create interviewer_sessions table (thematic sessions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS interviewer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('biografia', 'anamnese', 'censo', 'preferencias', 'conexoes', 'objetivos')),
  title TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  question_ids UUID[] DEFAULT '{}',
  total_questions INTEGER DEFAULT 0,
  answered_count INTEGER DEFAULT 0,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused')),
  cp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE interviewer_sessions IS
  'Thematic interview sessions grouping questions by category. Tracks user progress and consciousness points earned.';

-- ============================================================================
-- 3. Create interviewer_responses table (user answers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS interviewer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES interviewer_sessions(id) ON DELETE SET NULL,
  question_id UUID NOT NULL REFERENCES interviewer_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  answer_text TEXT,
  embedding VECTOR(768),
  routed_to_memory BOOLEAN DEFAULT false,
  routed_modules TEXT[] DEFAULT '{}',
  quality_score NUMERIC(3,2),
  cp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_question_response UNIQUE(user_id, question_id)
);

COMMENT ON TABLE interviewer_responses IS
  'User answers to interview questions. Each user can answer each question once. Answers are routed to user_memory for AI personalization.';

-- ============================================================================
-- 4. Enable Row-Level Security
-- ============================================================================

ALTER TABLE interviewer_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewer_responses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies — interviewer_questions (public read)
-- ============================================================================

CREATE POLICY "Anyone can read interview questions"
  ON interviewer_questions FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to interview questions"
  ON interviewer_questions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. RLS Policies — interviewer_sessions (user ownership)
-- ============================================================================

CREATE POLICY "Users can view own interview sessions"
  ON interviewer_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interview sessions"
  ON interviewer_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview sessions"
  ON interviewer_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interview sessions"
  ON interviewer_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to interview sessions"
  ON interviewer_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. RLS Policies — interviewer_responses (user ownership)
-- ============================================================================

CREATE POLICY "Users can view own interview responses"
  ON interviewer_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interview responses"
  ON interviewer_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview responses"
  ON interviewer_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interview responses"
  ON interviewer_responses FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to interview responses"
  ON interviewer_responses FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. Triggers — updated_at auto-update
-- ============================================================================

CREATE TRIGGER update_interviewer_questions_updated_at
  BEFORE UPDATE ON interviewer_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviewer_sessions_updated_at
  BEFORE UPDATE ON interviewer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviewer_responses_updated_at
  BEFORE UPDATE ON interviewer_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. Performance Indexes
-- ============================================================================

-- interviewer_questions
CREATE INDEX idx_interviewer_questions_category ON interviewer_questions(category);
CREATE INDEX idx_interviewer_questions_type ON interviewer_questions(question_type);
CREATE INDEX idx_interviewer_questions_curated ON interviewer_questions(is_curated) WHERE is_curated = true;
CREATE INDEX idx_interviewer_questions_sort ON interviewer_questions(category, sort_order);

-- interviewer_sessions
CREATE INDEX idx_interviewer_sessions_user_id ON interviewer_sessions(user_id);
CREATE INDEX idx_interviewer_sessions_status ON interviewer_sessions(status);
CREATE INDEX idx_interviewer_sessions_user_category ON interviewer_sessions(user_id, category);

-- interviewer_responses
CREATE INDEX idx_interviewer_responses_user_id ON interviewer_responses(user_id);
CREATE INDEX idx_interviewer_responses_user_question ON interviewer_responses(user_id, question_id);
CREATE INDEX idx_interviewer_responses_session ON interviewer_responses(session_id);
CREATE INDEX idx_interviewer_responses_routed ON interviewer_responses(routed_to_memory) WHERE routed_to_memory = false;

-- ============================================================================
-- 10. RPC: get_next_interview_question
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_interview_question(
  p_user_id UUID,
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_next_question RECORD;
  v_result JSONB;
BEGIN
  -- Get the session
  SELECT * INTO v_session
  FROM interviewer_sessions
  WHERE id = p_session_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Session not found', 'question', NULL);
  END IF;

  IF v_session.status = 'completed' THEN
    RETURN jsonb_build_object('error', 'Session already completed', 'question', NULL);
  END IF;

  -- Find next unanswered question from session's question_ids, respecting sort_order and dependencies
  SELECT q.* INTO v_next_question
  FROM interviewer_questions q
  WHERE q.id = ANY(v_session.question_ids)
    -- Not yet answered by this user
    AND NOT EXISTS (
      SELECT 1 FROM interviewer_responses r
      WHERE r.user_id = p_user_id AND r.question_id = q.id
    )
    -- Dependencies satisfied (no dependency, or dependency answered)
    AND (
      q.depends_on IS NULL
      OR EXISTS (
        SELECT 1 FROM interviewer_responses r
        WHERE r.user_id = p_user_id
          AND r.question_id = q.depends_on
          AND (
            q.depends_on_value IS NULL
            OR r.answer @> q.depends_on_value
          )
      )
    )
  ORDER BY q.sort_order ASC, q.difficulty_level ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', NULL, 'question', NULL, 'session_complete', true);
  END IF;

  v_result := jsonb_build_object(
    'error', NULL,
    'session_complete', false,
    'question', jsonb_build_object(
      'id', v_next_question.id,
      'question_text', v_next_question.question_text,
      'question_type', v_next_question.question_type,
      'category', v_next_question.category,
      'config', v_next_question.config,
      'difficulty_level', v_next_question.difficulty_level,
      'sort_order', v_next_question.sort_order
    ),
    'progress', jsonb_build_object(
      'answered', v_session.answered_count,
      'total', v_session.total_questions,
      'percentage', v_session.completion_percentage
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_next_interview_question IS
  'Returns the next unanswered question from a session, respecting sort_order and conditional dependencies.';

-- ============================================================================
-- 11. RPC: get_interview_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_interview_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_questions INTEGER;
  v_total_answered INTEGER;
  v_categories_started INTEGER;
  v_categories_completed INTEGER;
  v_total_cp INTEGER;
  v_completion NUMERIC(5,2);
  v_result JSONB;
BEGIN
  -- Total curated questions
  SELECT COUNT(*) INTO v_total_questions
  FROM interviewer_questions
  WHERE is_curated = true;

  -- Total answered by user
  SELECT COUNT(*) INTO v_total_answered
  FROM interviewer_responses
  WHERE user_id = p_user_id;

  -- Categories with at least one session started
  SELECT COUNT(DISTINCT category) INTO v_categories_started
  FROM interviewer_sessions
  WHERE user_id = p_user_id AND status != 'not_started';

  -- Categories fully completed
  SELECT COUNT(DISTINCT category) INTO v_categories_completed
  FROM interviewer_sessions
  WHERE user_id = p_user_id AND status = 'completed';

  -- Total CP earned
  SELECT COALESCE(SUM(cp_earned), 0) INTO v_total_cp
  FROM interviewer_responses
  WHERE user_id = p_user_id;

  -- Overall completion
  IF v_total_questions > 0 THEN
    v_completion := ROUND((v_total_answered::NUMERIC / v_total_questions) * 100, 2);
  ELSE
    v_completion := 0;
  END IF;

  v_result := jsonb_build_object(
    'total_questions', v_total_questions,
    'total_answered', v_total_answered,
    'categories_started', v_categories_started,
    'categories_completed', v_categories_completed,
    'total_cp_earned', v_total_cp,
    'completion_percentage', v_completion
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_interview_stats IS
  'Returns aggregated interview statistics for a user: questions answered, categories progress, CP earned.';
