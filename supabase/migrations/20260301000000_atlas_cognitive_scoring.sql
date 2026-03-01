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
-- 3. CREATE TABLE: scientific_model_registry
-- Central registry for all scientific models used across AICA
-- ============================================================================

CREATE TABLE IF NOT EXISTS scientific_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,                -- 'atlas', 'journey', 'flux', etc.
  display_name TEXT NOT NULL,
  description TEXT,

  -- Scientific provenance
  authors TEXT,                        -- Original researchers
  year INTEGER,                        -- Publication year
  paper_reference TEXT,                -- APA-style citation or DOI

  -- Implementation status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'experimental', 'contested', 'deprecated')),

  -- Model configuration
  parameters JSONB DEFAULT '{}',       -- Default parameters
  version TEXT DEFAULT '1.0',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scientific_model_registry_domain
  ON scientific_model_registry(domain);

CREATE INDEX IF NOT EXISTS idx_scientific_model_registry_status
  ON scientific_model_registry(status);

-- RLS: readable by all authenticated users, writable by service_role only
ALTER TABLE scientific_model_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read model registry"
  ON scientific_model_registry FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage model registry"
  ON scientific_model_registry FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE scientific_model_registry IS 'Central registry of scientific models with provenance and status tracking';

-- ============================================================================
-- 4. SEED: Atlas cognitive science models
-- ============================================================================

INSERT INTO scientific_model_registry (model_key, domain, display_name, description, authors, year, paper_reference, status, parameters)
VALUES
  (
    'cognitive_load',
    'atlas',
    'Cognitive Load Theory',
    'Measures intrinsic, extraneous, and germane cognitive load for task prioritization. Helps prevent overload by balancing task demands with available mental resources.',
    'John Sweller',
    1988,
    'Sweller, J. (1988). Cognitive load during problem solving. Cognitive Science, 12(2), 257-285.',
    'active',
    '{"weights": {"intrinsic": 0.4, "extraneous": 0.35, "germane": 0.25}, "max_daily_load": 100}'::jsonb
  ),
  (
    'flow_state',
    'atlas',
    'Flow State Model',
    'Predicts probability of entering flow based on skill-challenge balance. Tasks in the flow channel maximize productivity and satisfaction.',
    'Mihaly Csikszentmihalyi',
    1990,
    'Csikszentmihalyi, M. (1990). Flow: The Psychology of Optimal Experience. Harper & Row.',
    'active',
    '{"skill_challenge_ratio_optimal": 1.0, "flow_channel_width": 0.2, "min_duration_minutes": 25}'::jsonb
  ),
  (
    'planning_fallacy',
    'atlas',
    'Planning Fallacy',
    'Corrects systematic underestimation of task duration using historical actual/estimated ratios. Applies reference class forecasting.',
    'Roger Buehler, Dale Griffin, Michael Ross',
    1994,
    'Buehler, R., Griffin, D., & Ross, M. (1994). Exploring the planning fallacy. JPSP, 67(3), 366-381.',
    'active',
    '{"default_multiplier": 1.5, "learning_rate": 0.1, "min_samples": 5}'::jsonb
  ),
  (
    'task_switch_cost',
    'atlas',
    'Task Switch Cost',
    'Quantifies cognitive penalty of context switching between different task types. Groups similar tasks to reduce switch overhead.',
    'Joshua Rubinstein, David Meyer, Jeffrey Evans',
    2001,
    'Rubinstein, J.S., Meyer, D.E., & Evans, J.E. (2001). Executive control of cognitive processes in task switching. JEP:HPP, 27(4), 763-797.',
    'active',
    '{"base_cost_minutes": 10, "same_context_reduction": 0.7, "deep_work_penalty": 1.5}'::jsonb
  ),
  (
    'decision_fatigue',
    'atlas',
    'Decision Fatigue',
    'Models ego depletion from sequential decision-making. Schedules important decisions early and reduces choice load. Note: replication concerns exist.',
    'Shai Danziger, Jonathan Levav, Liora Avnaim-Pesso',
    2011,
    'Danziger, S., Levav, J., & Avnaim-Pesso, L. (2011). Extraneous factors in judicial decisions. PNAS, 108(17), 6889-6892.',
    'contested',
    '{"daily_decision_budget": 50, "depletion_rate": 0.02, "recovery_after_break_minutes": 15, "replication_note": "Ego depletion effect has mixed replication results"}'::jsonb
  ),
  (
    'attention_restoration',
    'atlas',
    'Attention Restoration Theory',
    'Predicts recovery of directed attention through restorative activities. Schedules breaks and nature exposure to maintain cognitive capacity.',
    'Rachel Kaplan, Stephen Kaplan',
    1995,
    'Kaplan, S. (1995). The restorative benefits of nature. Journal of Environmental Psychology, 15(3), 169-182.',
    'active',
    '{"restoration_types": ["nature", "meditation", "exercise", "social"], "min_break_minutes": 5, "optimal_break_minutes": 20}'::jsonb
  ),
  (
    'zeigarnik_effect',
    'atlas',
    'Zeigarnik Effect',
    'Leverages the tendency for incomplete tasks to occupy working memory. Strategically starts tasks to create commitment, and captures open loops to reduce anxiety.',
    'E.J. Masicampo, Roy Baumeister',
    2011,
    'Masicampo, E.J. & Baumeister, R.F. (2011). Consider it done! Plan making can eliminate the cognitive effects of unfulfilled goals. JPSP, 101(4), 667-683.',
    'active',
    '{"open_loop_cost": 0.05, "capture_relief": 0.8, "max_tracked_loops": 20}'::jsonb
  )
ON CONFLICT (model_key) DO NOTHING;

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
