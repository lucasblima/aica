-- Code review fixes for Journey Sprint 2 race conditions
-- I1: Use NOW() instead of NEW.created_at to prevent timestamp spoofing
-- I3: Add SET search_path = public to SECURITY DEFINER functions

-- ============================================================
-- Fix award_consciousness_points: add SET search_path
-- ============================================================

CREATE OR REPLACE FUNCTION award_consciousness_points(
  p_user_id UUID,
  p_points INT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total INT;
  v_level INT;
  v_level_name TEXT;
  v_leveled_up BOOLEAN := false;
  v_old_level INT;
BEGIN
  -- Guard: reject negative points (SECURITY DEFINER — defensive coding)
  IF p_points < 0 THEN
    RAISE EXCEPTION 'p_points must be non-negative: %', p_points
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO consciousness_points_log (user_id, points, reason, reference_id, reference_type)
  VALUES (p_user_id, p_points, p_reason, p_reference_id, p_reference_type);

  INSERT INTO user_consciousness_stats (user_id, total_points)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT level INTO v_old_level
  FROM user_consciousness_stats
  WHERE user_id = p_user_id
  FOR UPDATE;

  UPDATE user_consciousness_stats
  SET total_points = total_points + p_points,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_new_total;

  SELECT * INTO v_level, v_level_name FROM calculate_cp_level(v_new_total);

  IF v_level > v_old_level THEN
    v_leveled_up := true;
  END IF;

  UPDATE user_consciousness_stats
  SET level = v_level,
      level_name = v_level_name
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_total', v_new_total,
    'level', v_level,
    'level_name', v_level_name,
    'leveled_up', v_leveled_up
  );
END;
$$;

-- ============================================================
-- Fix check_moment_rate_limit: use NOW() + SET search_path
-- ============================================================

CREATE OR REPLACE FUNCTION check_moment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_created TIMESTAMPTZ;
BEGIN
  -- Advisory lock serializes concurrent inserts per user.
  -- FOR UPDATE alone cannot lock rows that don't exist yet.
  PERFORM pg_advisory_xact_lock(hashtext('moment_rate_limit_' || NEW.user_id::text));

  SELECT created_at INTO last_created
  FROM moments
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Use NOW() instead of NEW.created_at to prevent timestamp spoofing
  IF last_created IS NOT NULL AND
     (NOW() - last_created) < INTERVAL '1 second' THEN
    RAISE EXCEPTION 'Rate limit exceeded: minimum 1 second between moments'
      USING ERRCODE = 'P0429';
  END IF;

  RETURN NEW;
END;
$$;
