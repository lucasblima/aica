-- Add calculate_athlete_adherence RPC for Flow module
-- Calculates overall adherence rate for an athlete across all active/completed microcycles

CREATE OR REPLACE FUNCTION public.calculate_athlete_adherence(p_athlete_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_slots INTEGER;
  v_completed_slots INTEGER;
BEGIN
  -- Count total slots across all active/completed microcycles
  SELECT COUNT(*) INTO v_total_slots
  FROM workout_slots ws
  INNER JOIN microcycles m ON m.id = ws.microcycle_id
  WHERE m.athlete_id = p_athlete_id
    AND m.status IN ('active', 'completed');

  -- If no slots exist, return 0
  IF v_total_slots = 0 THEN
    RETURN 0;
  END IF;

  -- Count completed slots
  SELECT COUNT(*) INTO v_completed_slots
  FROM workout_slots ws
  INNER JOIN microcycles m ON m.id = ws.microcycle_id
  WHERE m.athlete_id = p_athlete_id
    AND m.status IN ('active', 'completed')
    AND ws.is_completed = true;

  -- Return adherence percentage
  RETURN ROUND((v_completed_slots::NUMERIC / v_total_slots::NUMERIC) * 100)::INTEGER;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_athlete_adherence(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.calculate_athlete_adherence(UUID) IS
'Calculates overall adherence rate (%) for an athlete across all active/completed microcycles. Returns 0 if no slots exist.';
