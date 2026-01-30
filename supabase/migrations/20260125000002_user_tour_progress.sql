-- ============================================================================
-- Migration: Organic Onboarding - User Tour Progress
-- Issue: Organic Onboarding Refactor - Track user tour completion
-- ============================================================================
--
-- This table tracks which tours/tooltips a user has seen or completed.
-- Used for contextual guidance within the app (learn by doing approach).
--
-- Key principles:
-- - Non-blocking: Tours are suggestions, not requirements
-- - Contextual: Show relevant guidance at the right time
-- - Respectful: Users can skip/dismiss without consequences
-- ============================================================================

-- Step 1: Create user_tour_progress table
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  current_step INT DEFAULT 0,
  total_steps INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one tour record per user per tour_id
  UNIQUE(user_id, tour_id)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user_id
ON public.user_tour_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_tour_id
ON public.user_tour_progress(tour_id);

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_status
ON public.user_tour_progress(status);

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user_tour
ON public.user_tour_progress(user_id, tour_id);

-- Step 3: Enable RLS
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Users can only read their own tour progress
CREATE POLICY "Users can read own tour progress"
ON public.user_tour_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own tour progress
CREATE POLICY "Users can insert own tour progress"
ON public.user_tour_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tour progress
CREATE POLICY "Users can update own tour progress"
ON public.user_tour_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can do anything (for analytics)
CREATE POLICY "Service role full access to tour progress"
ON public.user_tour_progress
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Step 5: Create function to mark tour as started
CREATE OR REPLACE FUNCTION public.start_tour(
  p_user_id UUID,
  p_tour_id TEXT,
  p_total_steps INT DEFAULT 1
)
RETURNS public.user_tour_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result user_tour_progress;
BEGIN
  INSERT INTO user_tour_progress (user_id, tour_id, status, started_at, total_steps)
  VALUES (p_user_id, p_tour_id, 'in_progress', now(), p_total_steps)
  ON CONFLICT (user_id, tour_id)
  DO UPDATE SET
    status = 'in_progress',
    started_at = COALESCE(user_tour_progress.started_at, now()),
    current_step = 0,
    total_steps = p_total_steps,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Step 6: Create function to update tour step
CREATE OR REPLACE FUNCTION public.update_tour_step(
  p_user_id UUID,
  p_tour_id TEXT,
  p_current_step INT
)
RETURNS public.user_tour_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result user_tour_progress;
BEGIN
  UPDATE user_tour_progress
  SET
    current_step = p_current_step,
    updated_at = now()
  WHERE user_id = p_user_id AND tour_id = p_tour_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Step 7: Create function to complete tour
CREATE OR REPLACE FUNCTION public.complete_tour(
  p_user_id UUID,
  p_tour_id TEXT
)
RETURNS public.user_tour_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result user_tour_progress;
BEGIN
  UPDATE user_tour_progress
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id AND tour_id = p_tour_id
  RETURNING * INTO v_result;

  -- If no row was updated, create one
  IF v_result IS NULL THEN
    INSERT INTO user_tour_progress (user_id, tour_id, status, completed_at)
    VALUES (p_user_id, p_tour_id, 'completed', now())
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- Step 8: Create function to skip tour
CREATE OR REPLACE FUNCTION public.skip_tour(
  p_user_id UUID,
  p_tour_id TEXT
)
RETURNS public.user_tour_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result user_tour_progress;
BEGIN
  INSERT INTO user_tour_progress (user_id, tour_id, status, skipped_at)
  VALUES (p_user_id, p_tour_id, 'skipped', now())
  ON CONFLICT (user_id, tour_id)
  DO UPDATE SET
    status = 'skipped',
    skipped_at = now(),
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Step 9: Create function to check if tour should be shown
CREATE OR REPLACE FUNCTION public.should_show_tour(
  p_user_id UUID,
  p_tour_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM user_tour_progress
  WHERE user_id = p_user_id AND tour_id = p_tour_id;

  -- Show tour if: never seen, or in progress
  -- Don't show if: completed or skipped
  RETURN v_status IS NULL OR v_status = 'not_started' OR v_status = 'in_progress';
END;
$$;

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION public.start_tour(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tour_step(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_tour(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_tour(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_show_tour(UUID, TEXT) TO authenticated;

-- Step 11: Add comments for documentation
COMMENT ON TABLE public.user_tour_progress IS 'Organic Onboarding: Tracks user progress through contextual tours/tooltips. Non-blocking, user can skip without consequences.';

COMMENT ON FUNCTION public.should_show_tour(UUID, TEXT) IS 'Returns TRUE if tour should be shown to user (not completed or skipped).';

-- ============================================================================
-- Rollback instructions (if needed):
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.start_tour(UUID, TEXT, INT);
-- DROP FUNCTION IF EXISTS public.update_tour_step(UUID, TEXT, INT);
-- DROP FUNCTION IF EXISTS public.complete_tour(UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.skip_tour(UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.should_show_tour(UUID, TEXT);
-- DROP TABLE IF EXISTS public.user_tour_progress;
-- ============================================================================
