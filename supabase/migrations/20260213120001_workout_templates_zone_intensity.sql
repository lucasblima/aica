-- Migration: Expand intensity to support training zones (Z1-Z5)
-- Keeps backward compatibility with low/medium/high values

-- Drop old constraint and add expanded one
ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_intensity_check;

ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_intensity_check
  CHECK (intensity IN ('low', 'medium', 'high', 'z1', 'z2', 'z3', 'z4', 'z5'));

-- Also expand custom_intensity on scheduled_workouts if it exists
ALTER TABLE public.scheduled_workouts
  DROP CONSTRAINT IF EXISTS scheduled_workouts_custom_intensity_check;

ALTER TABLE public.scheduled_workouts
  ADD CONSTRAINT scheduled_workouts_custom_intensity_check
  CHECK (custom_intensity IS NULL OR custom_intensity IN ('low', 'medium', 'high', 'z1', 'z2', 'z3', 'z4', 'z5'));
