-- Migration: Onboarding Context Captures
-- Description: Create table for storing contextual trail responses during onboarding
-- Date: 2025-12-11

-- =====================================================
-- 1. ONBOARDING_CONTEXT_CAPTURES TABLE
-- =====================================================
-- Purpose: Store user responses to contextual trails (health-emotional, health-physical, finance, relationships, growth)
-- Each user can complete one or more trails and have their responses captured with calculated scores

CREATE TABLE onboarding_context_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ========== TRAIL IDENTIFICATION ==========
  trail_id VARCHAR(50) NOT NULL,
  -- Values: 'health-emotional', 'health-physical', 'finance', 'relationships', 'growth'
  CONSTRAINT valid_trail_id CHECK (trail_id IN (
    'health-emotional',
    'health-physical',
    'finance',
    'relationships',
    'growth'
  )),

  -- ========== RESPONSES ==========
  -- Structured JSON: { question_id: { selectedAnswerIds: string[], answeredAt: ISO timestamp } }
  responses JSONB NOT NULL DEFAULT '{}',

  -- ========== SCORING & RECOMMENDATIONS ==========
  -- Trail score: 0-10 (average of answer weights)
  trail_score FLOAT CHECK (trail_score >= 0 AND trail_score <= 10),

  -- Recommended modules based on selected answers
  recommended_modules TEXT[] DEFAULT '{}',

  -- ========== TIMESTAMPS ==========
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ========== CONSTRAINTS ==========
  -- Unique constraint: one capture per user per trail
  -- Allows re-taking trials (will update existing record or create new based on app logic)
  CONSTRAINT onboarding_context_captures_user_trail_unique UNIQUE (user_id, trail_id)
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_onboarding_context_captures_user_id
  ON onboarding_context_captures(user_id);

CREATE INDEX idx_onboarding_context_captures_trail_id
  ON onboarding_context_captures(trail_id);

CREATE INDEX idx_onboarding_context_captures_created_at
  ON onboarding_context_captures(created_at DESC);

CREATE INDEX idx_onboarding_context_captures_user_trail
  ON onboarding_context_captures(user_id, trail_id);

-- GIN index for JSONB responses column (searching within JSON)
CREATE INDEX idx_onboarding_context_captures_responses
  USING GIN(responses);

-- Index for recommended modules array
CREATE INDEX idx_onboarding_context_captures_recommended_modules
  USING GIN(recommended_modules);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================
ALTER TABLE onboarding_context_captures ENABLE ROW LEVEL SECURITY;

-- Users can view their own context captures
CREATE POLICY "Users can view own context captures"
  ON onboarding_context_captures FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own context captures
CREATE POLICY "Users can insert own context captures"
  ON onboarding_context_captures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own context captures
CREATE POLICY "Users can update own context captures"
  ON onboarding_context_captures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own context captures
CREATE POLICY "Users can delete own context captures"
  ON onboarding_context_captures FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_onboarding_context_captures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call update function before each UPDATE
CREATE TRIGGER update_onboarding_context_captures_updated_at
  BEFORE UPDATE ON onboarding_context_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_context_captures_updated_at();

-- =====================================================
-- 5. UTILITY FUNCTIONS
-- =====================================================

-- Function to get all completed trails for a user
CREATE OR REPLACE FUNCTION get_user_completed_trails(p_user_id UUID)
RETURNS TABLE(trail_id VARCHAR, trail_score FLOAT, recommended_modules TEXT[], completed_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    occ.trail_id,
    occ.trail_score,
    occ.recommended_modules,
    occ.created_at
  FROM onboarding_context_captures occ
  WHERE occ.user_id = p_user_id
  ORDER BY occ.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get aggregated onboarding status for a user
CREATE OR REPLACE FUNCTION get_onboarding_status(p_user_id UUID)
RETURNS TABLE(
  trails_completed INT,
  total_trails INT,
  all_recommended_modules TEXT[],
  average_trail_score FLOAT,
  is_onboarding_complete BOOLEAN
) AS $$
DECLARE
  v_trails_completed INT;
  v_all_modules TEXT[];
  v_avg_score FLOAT;
BEGIN
  -- Count completed trails
  SELECT COUNT(DISTINCT trail_id) INTO v_trails_completed
  FROM onboarding_context_captures
  WHERE user_id = p_user_id;

  -- Aggregate all recommended modules (union)
  SELECT ARRAY_AGG(DISTINCT module)
  INTO v_all_modules
  FROM (
    SELECT UNNEST(recommended_modules) as module
    FROM onboarding_context_captures
    WHERE user_id = p_user_id
  ) t;

  -- Calculate average trail score
  SELECT AVG(trail_score) INTO v_avg_score
  FROM onboarding_context_captures
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    v_trails_completed,
    5, -- Total trails available
    COALESCE(v_all_modules, '{}'),
    v_avg_score,
    v_trails_completed >= 3; -- Consider onboarding complete after 3+ trails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 6. COMMENTS
-- =====================================================
COMMENT ON TABLE onboarding_context_captures IS 'Stores user responses to contextual trails during onboarding. Each trail captures 3-4 questions that help determine personalized module recommendations.';

COMMENT ON COLUMN onboarding_context_captures.trail_id IS 'The identifier of the trail: health-emotional, health-physical, finance, relationships, or growth';

COMMENT ON COLUMN onboarding_context_captures.responses IS 'JSON structure containing all question responses: {question_id: {selectedAnswerIds: [...], answeredAt: ISO timestamp}}';

COMMENT ON COLUMN onboarding_context_captures.trail_score IS 'Aggregated score (0-10) calculated as the average of all selected answer weights';

COMMENT ON COLUMN onboarding_context_captures.recommended_modules IS 'Array of module IDs recommended based on the selected answers from all questions in this trail';
