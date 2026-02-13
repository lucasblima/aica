-- Migration: Expand intensity to support training zones (Z1-Z5)
-- Keeps backward compatibility with low/medium/high values

-- Drop old constraint and add expanded one
ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_intensity_check;

ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_intensity_check
  CHECK (intensity IN ('low', 'medium', 'high', 'z1', 'z2', 'z3', 'z4', 'z5'));

-- Note: scheduled_workouts.custom_intensity may not exist on remote yet
-- (flow_module_complete migration may be pending). Skip for now.
