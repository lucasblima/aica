-- ============================================================================
-- Migration: Atlas Cognitive Scoring — Sprint 2
-- Adds cognitive science columns to work_items, creates user_cognitive_profiles,
-- seeds scientific_model_registry with Atlas models, and defines RPCs.
-- ============================================================================

-- ============================================================================
-- 1. ALTER work_items — Add cognitive scoring columns
-- ============================================================================

ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS cognitive_load_score REAL,
  ADD COLUMN IF NOT EXISTS flow_probability REAL,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS planning_fallacy_multiplier REAL,
  ADD COLUMN IF NOT EXISTS energy_level_required TEXT
    CHECK (energy_level_required IS NULL OR energy_level_required IN ('low', 'medium', 'high', 'peak')),
  ADD COLUMN IF NOT EXISTS context_category TEXT,
  ADD COLUMN IF NOT EXISTS scientific_priority_score REAL;

COMMENT ON COLUMN work_items.cognitive_load_score IS 'Sweller CLT score 0-1: intrinsic + extraneous + germane load';
COMMENT ON COLUMN work_items.flow_probability IS 'Csikszentmihalyi flow probability 0-1 based on skill/challenge ratio';
COMMENT ON COLUMN work_items.actual_duration_minutes IS 'Actual time spent on task (for planning fallacy calibration)';
COMMENT ON COLUMN work_items.planning_fallacy_multiplier IS 'Per-task ratio of actual/estimated duration';
COMMENT ON COLUMN work_items.energy_level_required IS 'Energy demand: low, medium, high, peak (maps to ultradian rhythm)';
COMMENT ON COLUMN work_items.context_category IS 'Task context for switch-cost calculation (e.g. coding, writing, email)';
COMMENT ON COLUMN work_items.scientific_priority_score IS 'Composite priority from cognitive models (replaces simple urgency)';

-- Indexes for cognitive scoring queries
CREATE INDEX IF NOT EXISTS idx_work_items_cognitive_load
  ON work_items(cognitive_load_score)
  WHERE cognitive_load_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_flow_probability
  ON work_items(flow_probability)
  WHERE flow_probability IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_scientific_priority
  ON work_items(scientific_priority_score)
  WHERE scientific_priority_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_energy_level
  ON work_items(energy_level_required)
  WHERE energy_level_required IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_context_category
  ON work_items(context_category)
  WHERE context_category IS NOT NULL;

-- ============================================================================
-- 2. CREATE TABLE: user_cognitive_profiles
-- One row per user — stores chronotype, peak hours, and calibration data
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Chronotype (Horne-Ostberg based)
  chronotype TEXT CHECK (chronotype IS NULL OR chronotype IN ('morning_lark', 'neutral', 'night_owl'))
    DEFAULT 'neutral',

  -- Peak productivity hours (JSONB array of {start, end} objects)
  -- e.g. [{"start": "09:00", "end": "11:30"}, {"start": "15:00", "end": "16:30"}]
  peak_hours JSONB DEFAULT '[]',

  -- Ultradian rhythm period in minutes (typically 90)
  ultradian_period_minutes INTEGER DEFAULT 90
    CHECK (ultradian_period_minutes BETWEEN 60 AND 120),

  -- Average planning fallacy multiplier (calibrated over time)
  -- 1.0 = perfect estimation, 1.5 = tasks take 50% longer than estimated
  avg_planning_fallacy REAL DEFAULT 1.5
    CHECK (avg_planning_fallacy BETWEEN 0.5 AND 5.0),

  -- Energy pattern throughout the day (JSONB)
  -- e.g. {"06-09": "rising", "09-12": "peak", "12-14": "dip", "14-17": "moderate", "17-21": "declining"}
  energy_pattern JSONB DEFAULT '{}',

  -- Per-category duration multipliers (JSONB)
  -- e.g. {"coding": 1.3, "writing": 1.1, "email": 0.9, "meetings": 1.0}
  task_category_multipliers JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Index for lookup by user_id (UNIQUE already covers this but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_user_cognitive_profiles_user_id
  ON user_cognitive_profiles(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_cognitive_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_cognitive_profiles_updated_at ON user_cognitive_profiles;
CREATE TRIGGER trg_user_cognitive_profiles_updated_at
  BEFORE UPDATE ON user_cognitive_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cognitive_profiles_updated_at();

-- RLS
ALTER TABLE user_cognitive_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cognitive profile"
  ON user_cognitive_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cognitive profile"
  ON user_cognitive_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cognitive profile"
  ON user_cognitive_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cognitive profile"
  ON user_cognitive_profiles FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_cognitive_profiles IS 'Per-user cognitive calibration data for Atlas scientific scoring';
COMMENT ON COLUMN user_cognitive_profiles.chronotype IS 'Horne-Ostberg chronotype: morning_lark, neutral, night_owl';
COMMENT ON COLUMN user_cognitive_profiles.peak_hours IS 'JSONB array of {start, end} time windows for peak productivity';
COMMENT ON COLUMN user_cognitive_profiles.ultradian_period_minutes IS 'Basic rest-activity cycle length in minutes (typically 90)';
COMMENT ON COLUMN user_cognitive_profiles.avg_planning_fallacy IS 'Calibrated ratio actual/estimated — 1.0 is perfect, >1 means underestimates';
COMMENT ON COLUMN user_cognitive_profiles.energy_pattern IS 'JSONB map of time-of-day ranges to energy levels';
COMMENT ON COLUMN user_cognitive_profiles.task_category_multipliers IS 'JSONB map of context_category to duration multiplier';

-- ============================================================================
-- 3. SEED: Additional Atlas cognitive science models
-- (scientific_model_registry table already created in Sprint 1 migration)
-- ============================================================================

INSERT INTO scientific_model_registry (id, name, module, category, methodology_reference, version, formula_description, is_active, is_contested, contested_note)
VALUES
  ('task_switch_cost', 'Task Switch Cost', 'atlas', 'scoring',
   'Rubinstein, J.S., Meyer, D.E., & Evans, J.E. (2001). Executive control of cognitive processes in task switching. JEP:HPP, 27(4), 763-797.',
   '1.0', 'effective = base + nSwitches * costByComplexity. Groups similar tasks to reduce switch overhead.',
   true, false, NULL),
  ('decision_fatigue', 'Decision Fatigue (Ego Depletion)', 'atlas', 'scoring',
   'Danziger, S., Levav, J., & Avnaim-Pesso, L. (2011). Extraneous factors in judicial decisions. PNAS, 108(17), 6889-6892.',
   '1.0', 'Schedule complex decisions early. Daily decision budget model with depletion rate.',
   true, true, 'Ego depletion effect has mixed replication results. Used as practical heuristic, not proven science.'),
  ('attention_restoration', 'Attention Restoration Theory', 'atlas', 'scoring',
   'Kaplan, S. (1995). The restorative benefits of nature. Journal of Environmental Psychology, 15(3), 169-182.',
   '1.0', 'Break quality scoring: nature(+3), change(+2), explore(+1). Predicts recovery of directed attention.',
   true, false, NULL),
  ('zeigarnik_effect', 'Zeigarnik Effect', 'atlas', 'scoring',
   'Masicampo, E.J. & Baumeister, R.F. (2011). Consider it done! Plan making can eliminate the cognitive effects of unfulfilled goals. JPSP, 101(4), 667-683.',
   '1.0', 'Capture open loops to reduce anxiety. Plan-making eliminates cognitive burden of unfulfilled goals.',
   true, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. RPCs: Cognitive Profile CRUD
-- ============================================================================

-- Get user's cognitive profile (returns NULL fields if no profile exists)
CREATE OR REPLACE FUNCTION get_user_cognitive_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  chronotype TEXT,
  peak_hours JSONB,
  ultradian_period_minutes INTEGER,
  avg_planning_fallacy REAL,
  energy_pattern JSONB,
  task_category_multipliers JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ucp.id,
    ucp.user_id,
    ucp.chronotype,
    ucp.peak_hours,
    ucp.ultradian_period_minutes,
    ucp.avg_planning_fallacy,
    ucp.energy_pattern,
    ucp.task_category_multipliers,
    ucp.updated_at
  FROM user_cognitive_profiles ucp
  WHERE ucp.user_id = p_user_id;
$$;

-- Upsert user's cognitive profile
CREATE OR REPLACE FUNCTION upsert_user_cognitive_profile(
  p_user_id UUID,
  p_chronotype TEXT DEFAULT NULL,
  p_peak_hours JSONB DEFAULT NULL,
  p_ultradian_period_minutes INTEGER DEFAULT NULL,
  p_avg_planning_fallacy REAL DEFAULT NULL,
  p_energy_pattern JSONB DEFAULT NULL,
  p_task_category_multipliers JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_cognitive_profiles (
    user_id,
    chronotype,
    peak_hours,
    ultradian_period_minutes,
    avg_planning_fallacy,
    energy_pattern,
    task_category_multipliers
  )
  VALUES (
    p_user_id,
    COALESCE(p_chronotype, 'neutral'),
    COALESCE(p_peak_hours, '[]'::jsonb),
    COALESCE(p_ultradian_period_minutes, 90),
    COALESCE(p_avg_planning_fallacy, 1.5),
    COALESCE(p_energy_pattern, '{}'::jsonb),
    COALESCE(p_task_category_multipliers, '{}'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    chronotype = COALESCE(p_chronotype, user_cognitive_profiles.chronotype),
    peak_hours = COALESCE(p_peak_hours, user_cognitive_profiles.peak_hours),
    ultradian_period_minutes = COALESCE(p_ultradian_period_minutes, user_cognitive_profiles.ultradian_period_minutes),
    avg_planning_fallacy = COALESCE(p_avg_planning_fallacy, user_cognitive_profiles.avg_planning_fallacy),
    energy_pattern = COALESCE(p_energy_pattern, user_cognitive_profiles.energy_pattern),
    task_category_multipliers = COALESCE(p_task_category_multipliers, user_cognitive_profiles.task_category_multipliers),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================================
-- 6. Grant RPC permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_cognitive_profile TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_user_cognitive_profile TO authenticated, service_role;
