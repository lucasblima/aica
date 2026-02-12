-- Flow Module - Complete Database Schema
-- 8 tables total: 1 Flux base table + 7 Flow module tables
-- Supports 5 modalities: swimming, running, cycling, strength, walking

-- ==============================================
-- 0. ATHLETES (Flux module base table)
-- ==============================================
-- Athlete profiles managed by coaches

CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL, -- WhatsApp format: +5511987654321
  level TEXT NOT NULL CHECK (level IN (
    'iniciante_1', 'iniciante_2', 'iniciante_3',
    'intermediario_1', 'intermediario_2', 'intermediario_3',
    'avancado'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'trial', 'churned')),
  modality TEXT NOT NULL CHECK (modality IN ('swimming', 'running', 'cycling', 'strength', 'walking')),

  -- Trial tracking
  trial_expires_at TIMESTAMPTZ,

  -- AI onboarding data
  onboarding_data JSONB DEFAULT '{}',

  -- Health data (anamnesis)
  anamnesis JSONB DEFAULT '{}',
  -- Example: {"injuries": [], "chronic_pain": [], "sleep_quality": "good", "stress_level": "low", "medications": []}

  -- Performance thresholds
  ftp INTEGER, -- Functional Threshold Power (watts) - cycling
  pace_threshold TEXT, -- "4:30/km" - running
  swim_css TEXT, -- Critical Swim Speed "1:30/100m" - swimming
  current_block_id UUID, -- Reference to active workout block
  last_performance_test DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_athletes_user ON public.athletes(user_id);
CREATE INDEX idx_athletes_status ON public.athletes(status);
CREATE INDEX idx_athletes_modality ON public.athletes(modality);
CREATE INDEX idx_athletes_level ON public.athletes(level);
CREATE INDEX idx_athletes_phone ON public.athletes(phone);
CREATE INDEX idx_athletes_active ON public.athletes(user_id, status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.athletes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.athletes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.athletes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.athletes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.athletes
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- 1. WORKOUT_TEMPLATES
-- ==============================================
-- Exercise library with zones, categories, descriptions

CREATE TABLE IF NOT EXISTS public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('warmup', 'main', 'cooldown', 'recovery', 'test')),
  modality TEXT NOT NULL CHECK (modality IN ('swimming', 'running', 'cycling', 'strength', 'walking')),

  -- Exercise structure (JSONB for flexibility)
  exercise_structure JSONB NOT NULL DEFAULT '{}',
  -- Example structure:
  -- {
  --   "sets": 3,
  --   "reps": "4x100m",
  --   "rest": "30s",
  --   "intervals": [{"distance": 100, "intensity": "Z3", "rest": 30}],
  --   "distance": 5000,
  --   "target_time": 1200,
  --   "equipment": ["pull buoy", "fins"]
  -- }

  -- Intensity zones (modality-dependent)
  duration INTEGER NOT NULL, -- minutes
  intensity TEXT NOT NULL CHECK (intensity IN ('low', 'medium', 'high')),
  ftp_percentage INTEGER CHECK (ftp_percentage BETWEEN 40 AND 150), -- cycling only
  pace_zone TEXT CHECK (pace_zone IN ('Z1', 'Z2', 'Z3', 'Z4', 'Z5')), -- running only
  css_percentage INTEGER CHECK (css_percentage BETWEEN 50 AND 120), -- swimming only
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10), -- all modalities

  -- Organization
  tags TEXT[] DEFAULT '{}',
  level_range TEXT[] DEFAULT '{}', -- ['iniciante_1', 'iniciante_2', ...]
  is_public BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_workout_templates_user ON public.workout_templates(user_id);
CREATE INDEX idx_workout_templates_modality ON public.workout_templates(modality);
CREATE INDEX idx_workout_templates_category ON public.workout_templates(category);
CREATE INDEX idx_workout_templates_tags ON public.workout_templates USING GIN(tags);
CREATE INDEX idx_workout_templates_favorite ON public.workout_templates(user_id, is_favorite) WHERE is_favorite = true;

-- RLS Policies
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.workout_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.workout_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.workout_templates
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.workout_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.workout_templates
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_workout_templates_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- 2. MICROCYCLES (3-week planning blocks)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.microcycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),

  -- Planning metadata
  focus TEXT, -- e.g., "Base Aerobica", "Forca Maxima"
  intensity_profile TEXT CHECK (intensity_profile IN ('progressive', 'steady', 'undulating', 'recovery')),

  -- Tracking
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  adherence_rate INTEGER CHECK (adherence_rate BETWEEN 0 AND 100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT microcycle_dates_valid CHECK (end_date >= start_date),
  CONSTRAINT microcycle_duration CHECK (end_date - start_date = 20) -- 3 weeks = 21 days (0-20 inclusive)
);

-- Indices
CREATE INDEX idx_microcycles_user ON public.microcycles(user_id);
CREATE INDEX idx_microcycles_athlete ON public.microcycles(athlete_id);
CREATE INDEX idx_microcycles_dates ON public.microcycles(start_date, end_date);
CREATE INDEX idx_microcycles_status ON public.microcycles(status);
CREATE INDEX idx_microcycles_active ON public.microcycles(athlete_id, status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE public.microcycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.microcycles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.microcycles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.microcycles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.microcycles
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.microcycles
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_microcycles_updated_at
  BEFORE UPDATE ON public.microcycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- 3. WORKOUT_SLOTS (weekly grid assignments)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.workout_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  microcycle_id UUID NOT NULL REFERENCES public.microcycles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,

  -- Scheduling
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 3), -- 1-3 within microcycle
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'flexible')),

  -- Customization (override template defaults)
  custom_duration INTEGER, -- minutes
  custom_intensity TEXT CHECK (custom_intensity IN ('low', 'medium', 'high')),
  custom_notes TEXT,

  -- Completion tracking
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  actual_duration INTEGER, -- minutes
  athlete_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_slot_position UNIQUE (microcycle_id, week_number, day_of_week, time_of_day)
);

-- Indices
CREATE INDEX idx_workout_slots_user ON public.workout_slots(user_id);
CREATE INDEX idx_workout_slots_microcycle ON public.workout_slots(microcycle_id);
CREATE INDEX idx_workout_slots_template ON public.workout_slots(template_id);
CREATE INDEX idx_workout_slots_schedule ON public.workout_slots(microcycle_id, week_number, day_of_week);
CREATE INDEX idx_workout_slots_completed ON public.workout_slots(is_completed, completed_at);

-- RLS Policies
ALTER TABLE public.workout_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.workout_slots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.workout_slots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.workout_slots
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.workout_slots
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.workout_slots
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_workout_slots_updated_at
  BEFORE UPDATE ON public.workout_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- 4. ATHLETE_PROFILES (performance thresholds)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,

  -- Performance thresholds (for intensity calculations)
  modality TEXT NOT NULL CHECK (modality IN ('swimming', 'running', 'cycling', 'strength', 'walking')),
  ftp INTEGER, -- Functional Threshold Power (watts) - cycling
  pace_threshold TEXT, -- "4:30/km" format - running
  css TEXT, -- Critical Swim Speed "1:30/100m" - swimming
  max_hr INTEGER, -- Maximum heart rate

  -- Athlete level
  level TEXT NOT NULL CHECK (level IN (
    'iniciante_1', 'iniciante_2', 'iniciante_3',
    'intermediario_1', 'intermediario_2', 'intermediario_3',
    'avancado'
  )),

  -- Health data
  anamnesis JSONB DEFAULT '{}',
  -- Example: {"injuries": ["knee"], "medications": [], "sleep_quality": "good"}

  -- Last test date
  last_performance_test DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_athlete_modality UNIQUE (athlete_id, modality)
);

-- Indices
CREATE INDEX idx_athlete_profiles_user ON public.athlete_profiles(user_id);
CREATE INDEX idx_athlete_profiles_athlete ON public.athlete_profiles(athlete_id);
CREATE INDEX idx_athlete_profiles_modality ON public.athlete_profiles(modality);
CREATE INDEX idx_athlete_profiles_level ON public.athlete_profiles(level);

-- RLS Policies
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.athlete_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.athlete_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.athlete_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.athlete_profiles
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.athlete_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_athlete_profiles_updated_at
  BEFORE UPDATE ON public.athlete_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- 5. COACH_MESSAGES (WhatsApp templates)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template info
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('weekly_plan', 'motivation', 'feedback_request', 'adjustment', 'celebration', 'custom')),
  message_template TEXT NOT NULL,

  -- Variables supported
  -- {{athlete_name}}, {{week_number}}, {{focus}}, {{intensity}}, {{completion_rate}}

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_coach_messages_user ON public.coach_messages(user_id);
CREATE INDEX idx_coach_messages_category ON public.coach_messages(category);
CREATE INDEX idx_coach_messages_usage ON public.coach_messages(user_id, usage_count DESC);

-- RLS Policies
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.coach_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.coach_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.coach_messages
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.coach_messages
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.coach_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_coach_messages_updated_at
  BEFORE UPDATE ON public.coach_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- 6. SCHEDULED_WORKOUTS (WhatsApp delivery queue)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  microcycle_id UUID NOT NULL REFERENCES public.microcycles(id) ON DELETE CASCADE,

  -- Schedule
  scheduled_for TIMESTAMPTZ NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 3),

  -- Message
  message_text TEXT NOT NULL,
  message_template_id UUID REFERENCES public.coach_messages(id) ON DELETE SET NULL,

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,

  -- Evolution API tracking
  whatsapp_message_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_scheduled_workouts_user ON public.scheduled_workouts(user_id);
CREATE INDEX idx_scheduled_workouts_athlete ON public.scheduled_workouts(athlete_id);
CREATE INDEX idx_scheduled_workouts_microcycle ON public.scheduled_workouts(microcycle_id);
CREATE INDEX idx_scheduled_workouts_schedule ON public.scheduled_workouts(scheduled_for);
CREATE INDEX idx_scheduled_workouts_status ON public.scheduled_workouts(status, scheduled_for);
CREATE INDEX idx_scheduled_workouts_pending ON public.scheduled_workouts(status, scheduled_for)
  WHERE status = 'pending';

-- RLS Policies
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.scheduled_workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.scheduled_workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.scheduled_workouts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.scheduled_workouts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.scheduled_workouts
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_scheduled_workouts_updated_at
  BEFORE UPDATE ON public.scheduled_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- 7. WORKOUT_AUTOMATIONS (triggers + actions)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.workout_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Automation config
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Trigger
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'microcycle_start',
    'week_start',
    'low_adherence',
    'milestone_reached',
    'custom'
  )),
  trigger_config JSONB DEFAULT '{}',
  -- Example: {"adherence_threshold": 70, "milestone_type": "completion"}

  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_message',
    'create_alert',
    'adjust_intensity',
    'schedule_test',
    'custom'
  )),
  action_config JSONB DEFAULT '{}',
  -- Example: {"message_template_id": "uuid", "intensity_change": -10}

  -- Targeting
  applies_to_all_athletes BOOLEAN DEFAULT false,
  specific_athlete_ids UUID[] DEFAULT '{}',

  -- Usage tracking
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_workout_automations_user ON public.workout_automations(user_id);
CREATE INDEX idx_workout_automations_active ON public.workout_automations(is_active) WHERE is_active = true;
CREATE INDEX idx_workout_automations_trigger ON public.workout_automations(trigger_type);
CREATE INDEX idx_workout_automations_action ON public.workout_automations(action_type);

-- RLS Policies
ALTER TABLE public.workout_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.workout_automations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.workout_automations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.workout_automations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.workout_automations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.workout_automations
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_workout_automations_updated_at
  BEFORE UPDATE ON public.workout_automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- HELPER RPCs
-- ==============================================

-- Get active microcycle for athlete
CREATE OR REPLACE FUNCTION public.get_active_microcycle(p_athlete_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  start_date DATE,
  end_date DATE,
  current_week INTEGER,
  days_remaining INTEGER,
  completion_percentage INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.title,
    m.start_date,
    m.end_date,
    LEAST(FLOOR((CURRENT_DATE - m.start_date) / 7) + 1, 3)::INTEGER AS current_week,
    GREATEST(m.end_date - CURRENT_DATE, 0)::INTEGER AS days_remaining,
    m.completion_percentage
  FROM microcycles m
  WHERE m.athlete_id = p_athlete_id
    AND m.status = 'active'
    AND CURRENT_DATE BETWEEN m.start_date AND m.end_date
  ORDER BY m.start_date DESC
  LIMIT 1;
END;
$$;

-- Calculate microcycle completion
CREATE OR REPLACE FUNCTION public.calculate_microcycle_completion(p_microcycle_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM workout_slots
  WHERE microcycle_id = p_microcycle_id;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_completed
  FROM workout_slots
  WHERE microcycle_id = p_microcycle_id
    AND is_completed = true;

  RETURN ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100)::INTEGER;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_active_microcycle(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_microcycle_completion(UUID) TO authenticated;
