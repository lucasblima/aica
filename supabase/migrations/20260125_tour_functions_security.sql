-- ============================================================================
-- Migration: Tour Functions Security Improvement
-- Issue: PR #155 Review - Use auth.uid() internally for better security
-- ============================================================================
--
-- This migration updates the tour RPC functions to use auth.uid() internally
-- instead of trusting the client-provided p_user_id parameter.
-- This adds defense in depth - even SECURITY DEFINER functions verify the user.
--
-- Benefits:
-- - Prevents any possibility of user impersonation
-- - Defense in depth: RLS + function-level verification
-- - Clear audit trail: functions always operate on authenticated user
-- ============================================================================

-- Step 1: Update start_tour to use auth.uid()
CREATE OR REPLACE FUNCTION public.start_tour(
  p_user_id UUID,  -- Kept for API compatibility, but ignored
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
  v_auth_user_id UUID;
BEGIN
  -- Always use authenticated user, ignore client parameter
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_tour_progress (user_id, tour_id, status, started_at, total_steps)
  VALUES (v_auth_user_id, p_tour_id, 'in_progress', now(), p_total_steps)
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

-- Step 2: Update update_tour_step to use auth.uid()
CREATE OR REPLACE FUNCTION public.update_tour_step(
  p_user_id UUID,  -- Kept for API compatibility, but ignored
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
  v_auth_user_id UUID;
BEGIN
  -- Always use authenticated user, ignore client parameter
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_tour_progress
  SET
    current_step = p_current_step,
    updated_at = now()
  WHERE user_id = v_auth_user_id AND tour_id = p_tour_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Step 3: Update complete_tour to use auth.uid()
CREATE OR REPLACE FUNCTION public.complete_tour(
  p_user_id UUID,  -- Kept for API compatibility, but ignored
  p_tour_id TEXT
)
RETURNS public.user_tour_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result user_tour_progress;
  v_auth_user_id UUID;
BEGIN
  -- Always use authenticated user, ignore client parameter
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_tour_progress
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE user_id = v_auth_user_id AND tour_id = p_tour_id
  RETURNING * INTO v_result;

  -- If no row was updated, create one
  IF v_result IS NULL THEN
    INSERT INTO user_tour_progress (user_id, tour_id, status, completed_at)
    VALUES (v_auth_user_id, p_tour_id, 'completed', now())
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- Step 4: Update skip_tour to use auth.uid()
CREATE OR REPLACE FUNCTION public.skip_tour(
  p_user_id UUID,  -- Kept for API compatibility, but ignored
  p_tour_id TEXT
)
RETURNS public.user_tour_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result user_tour_progress;
  v_auth_user_id UUID;
BEGIN
  -- Always use authenticated user, ignore client parameter
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_tour_progress (user_id, tour_id, status, skipped_at)
  VALUES (v_auth_user_id, p_tour_id, 'skipped', now())
  ON CONFLICT (user_id, tour_id)
  DO UPDATE SET
    status = 'skipped',
    skipped_at = now(),
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Step 5: Update should_show_tour to use auth.uid()
CREATE OR REPLACE FUNCTION public.should_show_tour(
  p_user_id UUID,  -- Kept for API compatibility, but ignored
  p_tour_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_auth_user_id UUID;
BEGIN
  -- Always use authenticated user, ignore client parameter
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RETURN FALSE;  -- Don't show tours if not authenticated
  END IF;

  SELECT status INTO v_status
  FROM user_tour_progress
  WHERE user_id = v_auth_user_id AND tour_id = p_tour_id;

  -- Show tour if: never seen, or in progress
  -- Don't show if: completed or skipped
  RETURN v_status IS NULL OR v_status = 'not_started' OR v_status = 'in_progress';
END;
$$;

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON FUNCTION public.start_tour(UUID, TEXT, INT) IS 'Start a tour for the authenticated user. p_user_id is ignored for security (uses auth.uid()).';
COMMENT ON FUNCTION public.update_tour_step(UUID, TEXT, INT) IS 'Update current step for the authenticated user. p_user_id is ignored for security (uses auth.uid()).';
COMMENT ON FUNCTION public.complete_tour(UUID, TEXT) IS 'Mark tour as completed for the authenticated user. p_user_id is ignored for security (uses auth.uid()).';
COMMENT ON FUNCTION public.skip_tour(UUID, TEXT) IS 'Mark tour as skipped for the authenticated user. p_user_id is ignored for security (uses auth.uid()).';
COMMENT ON FUNCTION public.should_show_tour(UUID, TEXT) IS 'Check if tour should be shown to authenticated user. p_user_id is ignored for security (uses auth.uid()).';
