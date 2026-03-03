-- ============================================================
-- Add daily feedback support to athlete_feedback_entries
-- PR review: Change feedback from per-week to per-day
-- ============================================================

-- 1. Add day_of_week column (nullable — weekly entries don't need it)
ALTER TABLE public.athlete_feedback_entries
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7);

-- 2. Update feedback_type CHECK to allow 'daily'
ALTER TABLE public.athlete_feedback_entries
  DROP CONSTRAINT IF EXISTS athlete_feedback_entries_feedback_type_check;

ALTER TABLE public.athlete_feedback_entries
  ADD CONSTRAINT athlete_feedback_entries_feedback_type_check
    CHECK (feedback_type IN ('exercise', 'weekly', 'daily'));

-- 3. Index for efficient daily feedback lookup
CREATE INDEX IF NOT EXISTS idx_afe_daily
  ON public.athlete_feedback_entries(microcycle_id, week_number, day_of_week)
  WHERE feedback_type = 'daily';
