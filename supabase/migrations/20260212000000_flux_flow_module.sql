-- Flow Module: Sistema de Prescrição Inteligente de Treino
-- 7 tables: workout_templates, microcycles, workout_slots, athlete_profiles,
-- coach_messages, scheduled_workouts, workout_automations

-- ============================================================================
-- TABLE 1: workout_templates (Exercise Library)
-- ============================================================================
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('warmup', 'main', 'cooldown', 'recovery', 'test')),
  modality TEXT NOT NULL CHECK (modality IN ('swimming', 'running', 'cycling', 'strength')),

  -- Exercise Details
  duration INTEGER NOT NULL, -- minutes
  intensity TEXT NOT NULL CHECK (intensity IN ('low', 'medium', 'high')),
  exercise_structure JSONB, -- { sets: 3, reps: 10, rest: 60 } or { intervals: [...] }

  -- Intensity Zones (modality-specific)
  ftp_percentage INTEGER, -- cycling (50-120%)
  pace_zone TEXT, -- running ('Z1', 'Z2', 'Z3', 'Z4', 'Z5')
  css_percentage INTEGER, -- swimming (60-110%)
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10), -- Rate of Perceived Exertion

  -- Tags & Organization
  tags TEXT[],
  level TEXT[] DEFAULT '{}', -- ['iniciante_1', 'intermediario_2', ...]
  is_public BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  usage_count INTEGER DEFAULT 0
);

-- Indices for workout_templates
CREATE INDEX idx_workout_templates_user_id ON public.workout_templates(user_id);
CREATE INDEX idx_workout_templates_modality ON public.workout_templates(modality);
CREATE INDEX idx_workout_templates_category ON public.workout_templates(category);
CREATE INDEX idx_workout_templates_tags ON public.workout_templates USING GIN(tags);
CREATE INDEX idx_workout_templates_created_at ON public.workout_templates(created_at DESC);

-- RLS for workout_templates
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_or_public_templates" ON public.workout_templates
FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "insert_own_templates" ON public.workout_templates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_templates" ON public.workout_templates
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_templates" ON public.workout_templates
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_templates" ON public.workout_templates
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 2: microcycles (3-week Planning Blocks)
-- ============================================================================
CREATE TABLE public.microcycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL, -- References existing mock athletes (athlete-1, etc)

  -- Microcycle Info
  name TEXT NOT NULL,
  description TEXT,
  week_1_focus TEXT, -- 'volume', 'intensity', 'recovery', 'test'
  week_2_focus TEXT,
  week_3_focus TEXT,

  -- Date Range (3 weeks)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Load Targets (TSS or similar)
  target_weekly_load INTEGER[], -- [350, 400, 250] for weeks 1-3
  actual_weekly_load INTEGER[], -- Calculated from completed workouts

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),

  -- Integration
  sent_to_whatsapp BOOLEAN DEFAULT false,
  whatsapp_message_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indices for microcycles
CREATE INDEX idx_microcycles_user_id ON public.microcycles(user_id);
CREATE INDEX idx_microcycles_athlete_id ON public.microcycles(athlete_id);
CREATE INDEX idx_microcycles_status ON public.microcycles(status);
CREATE INDEX idx_microcycles_start_date ON public.microcycles(start_date DESC);

-- RLS for microcycles
ALTER TABLE public.microcycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_microcycles" ON public.microcycles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_microcycles" ON public.microcycles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_microcycles" ON public.microcycles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_microcycles" ON public.microcycles
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_microcycles" ON public.microcycles
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 3: workout_slots (Weekly Grid Assignments)
-- ============================================================================
CREATE TABLE public.workout_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  microcycle_id UUID NOT NULL REFERENCES public.microcycles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,

  -- Slot Position
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 3),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday

  -- Workout Details (copied from template + customizations)
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  intensity TEXT NOT NULL,
  modality TEXT NOT NULL,
  exercise_structure JSONB,

  -- Intensity Overrides (coach can adjust from template)
  ftp_percentage INTEGER,
  pace_zone TEXT,
  css_percentage INTEGER,
  rpe INTEGER,

  -- Coach Notes
  coach_notes TEXT,
  athlete_feedback TEXT,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completion_data JSONB, -- { duration_actual: 45, rpe_actual: 7, ... }

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for workout_slots
CREATE INDEX idx_workout_slots_user_id ON public.workout_slots(user_id);
CREATE INDEX idx_workout_slots_microcycle_id ON public.workout_slots(microcycle_id);
CREATE INDEX idx_workout_slots_template_id ON public.workout_slots(template_id);
CREATE INDEX idx_workout_slots_week_day ON public.workout_slots(week_number, day_of_week);
CREATE INDEX idx_workout_slots_completed ON public.workout_slots(completed);

-- RLS for workout_slots
ALTER TABLE public.workout_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_slots" ON public.workout_slots
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_slots" ON public.workout_slots
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_slots" ON public.workout_slots
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_slots" ON public.workout_slots
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_slots" ON public.workout_slots
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 4: athlete_profiles (Performance Thresholds + Level)
-- ============================================================================
CREATE TABLE public.athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL UNIQUE, -- athlete-1, athlete-2, etc

  -- Basic Info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Training Profile
  modality TEXT NOT NULL CHECK (modality IN ('swimming', 'running', 'cycling', 'strength')),
  level TEXT NOT NULL CHECK (level IN ('iniciante_1', 'iniciante_2', 'iniciante_3', 'intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado')),

  -- Performance Thresholds
  ftp INTEGER, -- watts (cycling)
  pace_threshold TEXT, -- '4:30/km' (running)
  swim_css TEXT, -- '1:30/100m' (swimming)
  last_test_date DATE,

  -- Training History
  weekly_volume_average INTEGER, -- minutes per week
  consistency_rate INTEGER, -- 0-100%
  current_microcycle_id UUID REFERENCES public.microcycles(id),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'paused', 'churned')),
  trial_expires_at DATE,

  -- Anamnese (Health Info)
  anamnesis JSONB, -- { sleep_quality: 'good', stress_level: 'medium', injuries: [...] }

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for athlete_profiles
CREATE INDEX idx_athlete_profiles_user_id ON public.athlete_profiles(user_id);
CREATE INDEX idx_athlete_profiles_athlete_id ON public.athlete_profiles(athlete_id);
CREATE INDEX idx_athlete_profiles_modality ON public.athlete_profiles(modality);
CREATE INDEX idx_athlete_profiles_level ON public.athlete_profiles(level);
CREATE INDEX idx_athlete_profiles_status ON public.athlete_profiles(status);

-- RLS for athlete_profiles
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_athlete_profiles" ON public.athlete_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_athlete_profiles" ON public.athlete_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_athlete_profiles" ON public.athlete_profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_athlete_profiles" ON public.athlete_profiles
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_athlete_profiles" ON public.athlete_profiles
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 5: coach_messages (WhatsApp Automation Templates)
-- ============================================================================
CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message Info
  name TEXT NOT NULL,
  message_template TEXT NOT NULL, -- Supports {{athlete_name}}, {{week_number}}, etc
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'microcycle_start', 'low_consistency', 'missed_workout', 'weekly_summary')),

  -- Conditions
  applies_to_modality TEXT[], -- ['swimming', 'running'] or empty for all
  applies_to_level TEXT[], -- ['iniciante_1', 'intermediario_2'] or empty for all
  consistency_threshold INTEGER, -- Only send if consistency < X%

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Usage Stats
  times_sent INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for coach_messages
CREATE INDEX idx_coach_messages_user_id ON public.coach_messages(user_id);
CREATE INDEX idx_coach_messages_trigger_type ON public.coach_messages(trigger_type);
CREATE INDEX idx_coach_messages_active ON public.coach_messages(is_active);

-- RLS for coach_messages
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_coach_messages" ON public.coach_messages
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_coach_messages" ON public.coach_messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_coach_messages" ON public.coach_messages
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_coach_messages" ON public.coach_messages
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_coach_messages" ON public.coach_messages
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 6: scheduled_workouts (WhatsApp Delivery Queue)
-- ============================================================================
CREATE TABLE public.scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  microcycle_id UUID NOT NULL REFERENCES public.microcycles(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  send_method TEXT NOT NULL DEFAULT 'whatsapp' CHECK (send_method IN ('whatsapp', 'email', 'app_notification')),

  -- Message Content
  message_text TEXT NOT NULL,
  message_data JSONB, -- { week_workouts: [...], load_total: 350, ... }

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- WhatsApp Integration
  whatsapp_message_id TEXT,
  whatsapp_recipient_phone TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for scheduled_workouts
CREATE INDEX idx_scheduled_workouts_user_id ON public.scheduled_workouts(user_id);
CREATE INDEX idx_scheduled_workouts_microcycle_id ON public.scheduled_workouts(microcycle_id);
CREATE INDEX idx_scheduled_workouts_athlete_id ON public.scheduled_workouts(athlete_id);
CREATE INDEX idx_scheduled_workouts_status ON public.scheduled_workouts(status);
CREATE INDEX idx_scheduled_workouts_scheduled_for ON public.scheduled_workouts(scheduled_for);

-- RLS for scheduled_workouts
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_scheduled_workouts" ON public.scheduled_workouts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_scheduled_workouts" ON public.scheduled_workouts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_scheduled_workouts" ON public.scheduled_workouts
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_scheduled_workouts" ON public.scheduled_workouts
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_scheduled_workouts" ON public.scheduled_workouts
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 7: workout_automations (Triggers + Actions)
-- ============================================================================
CREATE TABLE public.workout_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Automation Info
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Trigger Configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'microcycle_starts',
    'workout_completed',
    'workout_missed',
    'consistency_drops',
    'weekly_summary',
    'athlete_joins',
    'trial_expiring'
  )),
  trigger_config JSONB, -- { consistency_threshold: 60, days_before_expiry: 7, ... }

  -- Action Configuration
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_whatsapp',
    'send_email',
    'create_alert',
    'adjust_workout',
    'send_notification'
  )),
  action_config JSONB, -- { message_template_id: '...', recipient: 'athlete', ... }

  -- Filters
  applies_to_athletes TEXT[], -- ['athlete-1', 'athlete-5'] or empty for all
  applies_to_modality TEXT[],
  applies_to_level TEXT[],

  -- Usage Stats
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for workout_automations
CREATE INDEX idx_workout_automations_user_id ON public.workout_automations(user_id);
CREATE INDEX idx_workout_automations_trigger_type ON public.workout_automations(trigger_type);
CREATE INDEX idx_workout_automations_active ON public.workout_automations(is_active);

-- RLS for workout_automations
ALTER TABLE public.workout_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_automations" ON public.workout_automations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_automations" ON public.workout_automations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_automations" ON public.workout_automations
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_automations" ON public.workout_automations
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_automations" ON public.workout_automations
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Calculate TSS for a workout slot
CREATE OR REPLACE FUNCTION public.calculate_workout_tss(
  p_duration INTEGER,
  p_intensity TEXT,
  p_ftp_percentage INTEGER DEFAULT NULL,
  p_rpe INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_intensity_multiplier NUMERIC;
  v_tss INTEGER;
BEGIN
  -- Intensity multiplier based on intensity level or RPE
  IF p_rpe IS NOT NULL THEN
    v_intensity_multiplier := p_rpe / 10.0;
  ELSIF p_intensity = 'low' THEN
    v_intensity_multiplier := 0.5;
  ELSIF p_intensity = 'medium' THEN
    v_intensity_multiplier := 0.75;
  ELSIF p_intensity = 'high' THEN
    v_intensity_multiplier := 1.0;
  ELSE
    v_intensity_multiplier := 0.6;
  END IF;

  -- FTP-based adjustment if available
  IF p_ftp_percentage IS NOT NULL THEN
    v_intensity_multiplier := v_intensity_multiplier * (p_ftp_percentage / 100.0);
  END IF;

  -- TSS = duration * intensity_multiplier * 1.5
  v_tss := (p_duration * v_intensity_multiplier * 1.5)::INTEGER;

  RETURN v_tss;
END;
$$;

-- Function: Update microcycle actual load when slots are marked complete
CREATE OR REPLACE FUNCTION public.update_microcycle_load()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_loads INTEGER[];
  v_week1_load INTEGER := 0;
  v_week2_load INTEGER := 0;
  v_week3_load INTEGER := 0;
BEGIN
  -- Calculate total TSS for each week
  SELECT COALESCE(SUM(calculate_workout_tss(duration, intensity, ftp_percentage, rpe)), 0)
  INTO v_week1_load
  FROM public.workout_slots
  WHERE microcycle_id = NEW.microcycle_id
    AND week_number = 1
    AND completed = true;

  SELECT COALESCE(SUM(calculate_workout_tss(duration, intensity, ftp_percentage, rpe)), 0)
  INTO v_week2_load
  FROM public.workout_slots
  WHERE microcycle_id = NEW.microcycle_id
    AND week_number = 2
    AND completed = true;

  SELECT COALESCE(SUM(calculate_workout_tss(duration, intensity, ftp_percentage, rpe)), 0)
  INTO v_week3_load
  FROM public.workout_slots
  WHERE microcycle_id = NEW.microcycle_id
    AND week_number = 3
    AND completed = true;

  v_week_loads := ARRAY[v_week1_load, v_week2_load, v_week3_load];

  -- Update microcycle
  UPDATE public.microcycles
  SET actual_weekly_load = v_week_loads,
      updated_at = now()
  WHERE id = NEW.microcycle_id;

  RETURN NEW;
END;
$$;

-- Trigger: Update microcycle load when workout slot is completed
CREATE TRIGGER trigger_update_microcycle_load
AFTER UPDATE OF completed ON public.workout_slots
FOR EACH ROW
WHEN (NEW.completed = true AND OLD.completed = false)
EXECUTE FUNCTION public.update_microcycle_load();

-- Function: Increment template usage count
CREATE OR REPLACE FUNCTION public.increment_template_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE public.workout_templates
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = NEW.template_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Increment usage count when template is used in a slot
CREATE TRIGGER trigger_increment_template_usage
AFTER INSERT ON public.workout_slots
FOR EACH ROW
WHEN (NEW.template_id IS NOT NULL)
EXECUTE FUNCTION public.increment_template_usage();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.workout_templates IS 'Exercise library with zones, categories, and modality-specific parameters';
COMMENT ON TABLE public.microcycles IS '3-week training planning blocks with load targets and focus areas';
COMMENT ON TABLE public.workout_slots IS 'Weekly grid assignments (21 slots per microcycle: 3 weeks × 7 days)';
COMMENT ON TABLE public.athlete_profiles IS 'Athlete performance thresholds, modality, level, and training history';
COMMENT ON TABLE public.coach_messages IS 'WhatsApp automation message templates with trigger conditions';
COMMENT ON TABLE public.scheduled_workouts IS 'WhatsApp delivery queue for workout plans';
COMMENT ON TABLE public.workout_automations IS 'Automation engine: triggers + actions for workflow optimization';

COMMENT ON FUNCTION public.calculate_workout_tss IS 'Calculate Training Stress Score for a workout based on duration, intensity, and FTP/RPE';
COMMENT ON FUNCTION public.update_microcycle_load IS 'Automatically update microcycle actual_weekly_load when workout slots are completed';
COMMENT ON FUNCTION public.increment_template_usage IS 'Track how many times each workout template is used';
