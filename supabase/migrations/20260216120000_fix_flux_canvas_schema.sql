-- Fix Flux Canvas Schema
-- The original flow_module_complete migration created tables with columns
-- that don't match the frontend TypeScript types. This migration drops and
-- recreates microcycles + workout_slots with the correct schema.

-- ==============================================
-- 1. Drop dependent tables first (reverse FK order)
-- ==============================================

-- scheduled_workouts references microcycles
DROP TABLE IF EXISTS public.scheduled_workouts CASCADE;

-- workout_slots references microcycles + workout_templates
DROP TABLE IF EXISTS public.workout_slots CASCADE;

-- microcycles references athletes
DROP TABLE IF EXISTS public.microcycles CASCADE;

-- Drop old RPCs
DROP FUNCTION IF EXISTS public.get_active_microcycle(UUID);
DROP FUNCTION IF EXISTS public.calculate_microcycle_completion(UUID);


-- ==============================================
-- 2. Recreate MICROCYCLES with correct schema
-- ==============================================
-- Matches frontend Microcycle type in flow.ts

CREATE TABLE public.microcycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,

  -- Basic info (frontend uses "name", not "title")
  name TEXT NOT NULL,
  description TEXT,

  -- Week focus (volume/intensity/recovery/test for each of 3 weeks)
  week_1_focus TEXT NOT NULL DEFAULT 'volume'
    CHECK (week_1_focus IN ('volume', 'intensity', 'recovery', 'test')),
  week_2_focus TEXT NOT NULL DEFAULT 'intensity'
    CHECK (week_2_focus IN ('volume', 'intensity', 'recovery', 'test')),
  week_3_focus TEXT NOT NULL DEFAULT 'recovery'
    CHECK (week_3_focus IN ('volume', 'intensity', 'recovery', 'test')),

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Load tracking (arrays: [week1, week2, week3])
  target_weekly_load JSONB DEFAULT '[]',
  actual_weekly_load JSONB DEFAULT '[]',

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),

  -- WhatsApp integration
  sent_to_whatsapp BOOLEAN DEFAULT false,
  whatsapp_message_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT microcycle_dates_valid CHECK (end_date >= start_date)
);

-- Indices
CREATE INDEX idx_microcycles_user ON public.microcycles(user_id);
CREATE INDEX idx_microcycles_athlete ON public.microcycles(athlete_id);
CREATE INDEX idx_microcycles_dates ON public.microcycles(start_date, end_date);
CREATE INDEX idx_microcycles_status ON public.microcycles(status);
CREATE INDEX idx_microcycles_active ON public.microcycles(athlete_id, status)
  WHERE status IN ('active', 'draft');

-- RLS
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
-- 3. Recreate WORKOUT_SLOTS with correct schema
-- ==============================================
-- Matches frontend WorkoutSlot type in flow.ts
-- day_of_week: 1-7 (Mon=1, Sun=7), NOT 0-6
-- template_id: nullable (slots can be created without a template)

CREATE TABLE public.workout_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  microcycle_id UUID NOT NULL REFERENCES public.microcycles(id) ON DELETE CASCADE,
  template_id UUID, -- nullable, no FK (templates may use mock IDs)

  -- Position in the grid
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 3),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- Mon=1, Sun=7

  -- Workout details (copied from template or set directly)
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  intensity TEXT NOT NULL CHECK (intensity IN ('low', 'medium', 'high', 'z1', 'z2', 'z3', 'z4', 'z5')),
  modality TEXT NOT NULL CHECK (modality IN ('swimming', 'running', 'cycling', 'strength', 'walking')),
  exercise_structure JSONB DEFAULT '{}',

  -- Intensity zone overrides
  ftp_percentage INTEGER CHECK (ftp_percentage BETWEEN 40 AND 150),
  pace_zone TEXT CHECK (pace_zone IN ('Z1', 'Z2', 'Z3', 'Z4', 'Z5')),
  css_percentage INTEGER CHECK (css_percentage BETWEEN 50 AND 120),
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),

  -- Coach/athlete interaction
  coach_notes TEXT,
  athlete_feedback TEXT,

  -- Completion tracking
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completion_data JSONB, -- {duration_actual, rpe_actual, notes}

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_workout_slots_user ON public.workout_slots(user_id);
CREATE INDEX idx_workout_slots_microcycle ON public.workout_slots(microcycle_id);
CREATE INDEX idx_workout_slots_schedule ON public.workout_slots(microcycle_id, week_number, day_of_week);
CREATE INDEX idx_workout_slots_completed ON public.workout_slots(completed, completed_at);

-- RLS
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
-- 4. Recreate SCHEDULED_WORKOUTS (was dropped by CASCADE)
-- ==============================================

CREATE TABLE public.scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  microcycle_id UUID NOT NULL REFERENCES public.microcycles(id) ON DELETE CASCADE,

  -- Schedule
  scheduled_for TIMESTAMPTZ NOT NULL,
  send_method TEXT DEFAULT 'whatsapp' CHECK (send_method IN ('whatsapp', 'email', 'app_notification')),

  -- Message
  message_text TEXT NOT NULL,
  message_data JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- WhatsApp tracking
  whatsapp_message_id TEXT,
  whatsapp_recipient_phone TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_scheduled_workouts_user ON public.scheduled_workouts(user_id);
CREATE INDEX idx_scheduled_workouts_athlete ON public.scheduled_workouts(athlete_id);
CREATE INDEX idx_scheduled_workouts_microcycle ON public.scheduled_workouts(microcycle_id);
CREATE INDEX idx_scheduled_workouts_status ON public.scheduled_workouts(status, scheduled_for);
CREATE INDEX idx_scheduled_workouts_pending ON public.scheduled_workouts(status, scheduled_for)
  WHERE status = 'pending';

-- RLS
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
