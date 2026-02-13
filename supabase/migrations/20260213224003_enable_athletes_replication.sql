-- Enable Realtime Replication for Flow Module Tables
--
-- Issue: Athletes created via AthleteFormModal don't appear in FluxDashboard
-- Root Cause: Tables not added to supabase_realtime publication
-- Solution: Add all 8 Flow module tables to publication

-- Add athletes table (Flux base table)
ALTER PUBLICATION supabase_realtime ADD TABLE public.athletes;

-- Add Flow module tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.microcycles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_workouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_automations;

-- Verify (for debugging)
COMMENT ON TABLE public.athletes IS 'Realtime replication enabled for Flux module';
