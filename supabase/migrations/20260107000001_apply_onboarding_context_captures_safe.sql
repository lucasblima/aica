-- Safe migration: Apply onboarding_context_captures if not exists
-- This handles the case where the table needs to be created in production

-- =====================================================
-- 1. ONBOARDING_CONTEXT_CAPTURES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_context_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ========== TRAIL IDENTIFICATION ==========
  trail_id VARCHAR(50) NOT NULL,
  CONSTRAINT valid_trail_id CHECK (trail_id IN (
    'health-emotional',
    'health-physical',
    'finance',
    'relationships',
    'growth'
  )),

  -- ========== RESPONSES ==========
  responses JSONB NOT NULL DEFAULT '{}',

  -- ========== SCORING & RECOMMENDATIONS ==========
  trail_score FLOAT CHECK (trail_score >= 0 AND trail_score <= 10),
  recommended_modules TEXT[] DEFAULT '{}',

  -- ========== TIMESTAMPS ==========
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ========== CONSTRAINTS ==========
  CONSTRAINT onboarding_context_captures_user_trail_unique UNIQUE (user_id, trail_id)
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_onboarding_context_captures_user_id
  ON onboarding_context_captures(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_context_captures_trail_id
  ON onboarding_context_captures(trail_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_context_captures_created_at
  ON onboarding_context_captures(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_context_captures_user_trail
  ON onboarding_context_captures(user_id, trail_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_context_captures_responses
  USING GIN(responses);

CREATE INDEX IF NOT EXISTS idx_onboarding_context_captures_recommended_modules
  USING GIN(recommended_modules);

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================
ALTER TABLE onboarding_context_captures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Users can view own context captures" ON onboarding_context_captures;
DROP POLICY IF EXISTS "Users can insert own context captures" ON onboarding_context_captures;
DROP POLICY IF EXISTS "Users can update own context captures" ON onboarding_context_captures;
DROP POLICY IF EXISTS "Users can delete own context captures" ON onboarding_context_captures;

-- Recreate policies
CREATE POLICY "Users can view own context captures"
  ON onboarding_context_captures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context captures"
  ON onboarding_context_captures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context captures"
  ON onboarding_context_captures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own context captures"
  ON onboarding_context_captures FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS update_onboarding_context_captures_updated_at ON onboarding_context_captures;
DROP FUNCTION IF EXISTS update_onboarding_context_captures_updated_at();

CREATE OR REPLACE FUNCTION update_onboarding_context_captures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_context_captures_updated_at
  BEFORE UPDATE ON onboarding_context_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_context_captures_updated_at();

-- =====================================================
-- 4. UTILITY FUNCTIONS
-- =====================================================
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
  SELECT COUNT(DISTINCT trail_id) INTO v_trails_completed
  FROM onboarding_context_captures
  WHERE user_id = p_user_id;

  SELECT ARRAY_AGG(DISTINCT module)
  INTO v_all_modules
  FROM (
    SELECT UNNEST(recommended_modules) as module
    FROM onboarding_context_captures
    WHERE user_id = p_user_id
  ) t;

  SELECT AVG(trail_score) INTO v_avg_score
  FROM onboarding_context_captures
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    v_trails_completed,
    5,
    COALESCE(v_all_modules, '{}'),
    v_avg_score,
    v_trails_completed >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
