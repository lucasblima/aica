-- Migration: flux_feedback_columns
-- Adds coach_notes to workout_templates and athlete profile calculator fields to athletes

-- 1. Coach notes on workout_templates
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- 2. Athlete profile calculator fields on athletes
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS practiced_modalities TEXT[] DEFAULT '{}';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS practice_duration_months INTEGER;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS training_zones JSONB DEFAULT '{}';
