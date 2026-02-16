-- Add start_time to workout_slots for time-based scheduling
-- Format: "HH:MM" (e.g., "09:00", "14:30")
-- Nullable: slots without a time are displayed as "flexible"

ALTER TABLE public.workout_slots ADD COLUMN start_time TEXT;

-- Index for time-based queries (agenda integration)
CREATE INDEX idx_workout_slots_start_time ON public.workout_slots(start_time)
  WHERE start_time IS NOT NULL;
