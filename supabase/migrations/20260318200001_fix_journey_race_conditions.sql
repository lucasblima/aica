-- Journey Sprint 2: Fix database-level race conditions
-- P0-2: CP Award Race Condition — add FOR UPDATE lock
-- P0-3: Rate Limit Race Condition — BEFORE INSERT trigger with FOR UPDATE lock

-- ============================================================
-- P0-2: Fix award_consciousness_points race condition
-- Problem: Concurrent calls read stale total_points, causing lost points
-- Fix: Add FOR UPDATE lock on the SELECT that reads current level
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
  -- Insert into log (always succeeds)
  INSERT INTO consciousness_points_log (user_id, points, reason, reference_id, reference_type)
  VALUES (p_user_id, p_points, p_reason, p_reference_id, p_reference_type);

  -- Get current stats or create (upsert)
  INSERT INTO user_consciousness_stats (user_id, total_points)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row to prevent concurrent updates (FOR UPDATE)
  SELECT level INTO v_old_level
  FROM user_consciousness_stats
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Atomically update total points
  UPDATE user_consciousness_stats
  SET total_points = total_points + p_points,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_new_total;

  -- Calculate new level
  SELECT * INTO v_level, v_level_name FROM calculate_cp_level(v_new_total);

  -- Check if leveled up
  IF v_level > v_old_level THEN
    v_leveled_up := true;
  END IF;

  -- Update level
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
-- P0-3: Fix rate limit race condition on moments creation
-- Problem: Query-then-insert gap allows concurrent bypass
-- Fix: BEFORE INSERT trigger with FOR UPDATE lock (atomic)
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
  -- Lock the most recent moment row for this user to prevent race
  SELECT created_at INTO last_created
  FROM moments
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF last_created IS NOT NULL AND
     (NEW.created_at - last_created) < INTERVAL '1 second' THEN
    RAISE EXCEPTION 'Rate limit exceeded: minimum 1 second between moments'
      USING ERRCODE = 'P0429';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moment_rate_limit ON moments;
CREATE TRIGGER trg_moment_rate_limit
  BEFORE INSERT ON moments
  FOR EACH ROW
  EXECUTE FUNCTION check_moment_rate_limit();

COMMENT ON FUNCTION check_moment_rate_limit IS
  'Prevents race condition: atomic rate limit check via FOR UPDATE lock';
