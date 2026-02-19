-- Fix start_tour and complete_tour RPCs to match actual user_tour_progress schema
-- Actual columns: id (uuid), user_id (uuid), tour_key (text), completed_at (timestamptz)
-- Old functions referenced non-existent columns: tour_id, status, started_at, total_steps, current_step, updated_at

-- Drop old functions with wrong return types
DROP FUNCTION IF EXISTS public.start_tour(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS public.complete_tour(UUID, TEXT);

-- Recreate with correct schema
CREATE FUNCTION public.start_tour(
  p_user_id UUID,
  p_tour_id TEXT,
  p_total_steps INT DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_tour_progress (user_id, tour_key, completed_at)
  VALUES (v_auth_user_id, p_tour_id, NULL)
  ON CONFLICT (user_id, tour_key) DO UPDATE
    SET completed_at = NULL;
END;
$$;

CREATE FUNCTION public.complete_tour(
  p_user_id UUID,
  p_tour_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_tour_progress (user_id, tour_key, completed_at)
  VALUES (v_auth_user_id, p_tour_id, now())
  ON CONFLICT (user_id, tour_key) DO UPDATE
    SET completed_at = now();
END;
$$;
