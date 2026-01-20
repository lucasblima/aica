-- Award User XP Function
-- Integrates with gamification system for contact analysis rewards
--
-- Issue #100: Process with Aica feature

-- =============================================================================
-- AWARD XP FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION award_user_xp(
  p_user_id UUID,
  p_xp_amount INT,
  p_source TEXT DEFAULT 'general',
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_total_xp INT,
  new_level INT,
  leveled_up BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp INT;
  v_current_level INT;
  v_new_total_xp INT;
  v_new_level INT;
  v_xp_per_level INT := 1000;
  v_xp_growth NUMERIC := 1.15;
BEGIN
  -- Get or create user stats
  INSERT INTO user_stats (user_id, total_xp, level, current_xp, created_at, updated_at)
  VALUES (p_user_id, 0, 1, 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row for update
  SELECT total_xp, level INTO v_current_xp, v_current_level
  FROM user_stats
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Calculate new totals
  v_new_total_xp := v_current_xp + p_xp_amount;

  -- Calculate new level (simplified formula)
  v_new_level := 1;
  DECLARE
    v_xp_threshold INT := 0;
    v_level_xp INT;
  BEGIN
    LOOP
      v_level_xp := FLOOR(v_xp_per_level * POWER(v_xp_growth, v_new_level - 1));
      v_xp_threshold := v_xp_threshold + v_level_xp;

      IF v_new_total_xp < v_xp_threshold THEN
        EXIT;
      END IF;

      v_new_level := v_new_level + 1;

      -- Safety cap at level 100
      IF v_new_level > 100 THEN
        EXIT;
      END IF;
    END LOOP;
  END;

  -- Update user stats
  UPDATE user_stats
  SET
    total_xp = v_new_total_xp,
    level = v_new_level,
    current_xp = v_new_total_xp - (
      SELECT COALESCE(SUM(FLOOR(v_xp_per_level * POWER(v_xp_growth, generate_series - 1))), 0)::INT
      FROM generate_series(1, v_new_level - 1)
    ),
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log the XP award
  INSERT INTO xp_history (user_id, xp_amount, source, description, created_at)
  VALUES (p_user_id, p_xp_amount, p_source, p_description, NOW())
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT
    TRUE AS success,
    v_new_total_xp AS new_total_xp,
    v_new_level AS new_level,
    (v_new_level > v_current_level) AS leveled_up,
    CASE
      WHEN v_new_level > v_current_level THEN 'Level up! You are now level ' || v_new_level
      ELSE 'Awarded ' || p_xp_amount || ' XP'
    END AS message;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    FALSE AS success,
    0 AS new_total_xp,
    1 AS new_level,
    FALSE AS leveled_up,
    SQLERRM AS message;
END;
$$;

-- =============================================================================
-- XP HISTORY TABLE (for tracking awards)
-- =============================================================================

CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  source TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_xp_history_user_id ON xp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_created_at ON xp_history(created_at DESC);

-- RLS for xp_history
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP history" ON xp_history
  FOR SELECT USING (auth.uid() = user_id);

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION award_user_xp TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION award_user_xp IS 'Awards XP to a user and handles level progression. Used by Edge Functions for gamification rewards.';
COMMENT ON TABLE xp_history IS 'Tracks all XP awards for audit and analytics purposes.';
