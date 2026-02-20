-- =============================================================================
-- Broaden streak calculation to count ALL consciousness interactions
-- (moments + daily question answers + Journey chat), not just moments
-- =============================================================================

-- Rename column to reflect broader scope
ALTER TABLE user_consciousness_stats
  RENAME COLUMN last_moment_date TO last_activity_date;

-- Replace the moment-only streak function with a consciousness-aware one
CREATE OR REPLACE FUNCTION update_consciousness_streak(
  p_user_id UUID,
  p_interaction_type TEXT DEFAULT 'moment'
)
RETURNS JSONB AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_today DATE := CURRENT_DATE;
  v_streak_bonus BOOLEAN := false;
BEGIN
  -- Get current stats
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM user_consciousness_stats
  WHERE user_id = p_user_id;

  -- If no stats row exists, skip (will be created by award_consciousness_points)
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'streak_bonus_awarded', false
    );
  END IF;

  -- If first activity ever
  IF v_last_date IS NULL THEN
    v_current_streak := 1;
    v_longest_streak := 1;
  -- If last activity was yesterday, increment streak
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    -- Award bonus at 7 days
    IF v_current_streak = 7 THEN
      v_streak_bonus := true;
      PERFORM award_consciousness_points(p_user_id, 50, 'streak_7_days', NULL, NULL);
    END IF;
  -- If last activity was today, no change to streak
  ELSIF v_last_date = v_today THEN
    NULL;
  -- If streak broken (more than 1 day gap)
  ELSE
    v_current_streak := 1;
  END IF;

  -- Update stats — increment the right counter based on interaction type
  UPDATE user_consciousness_stats
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = v_today,
      total_moments = CASE WHEN p_interaction_type = 'moment' THEN total_moments + 1 ELSE total_moments END,
      total_questions_answered = CASE WHEN p_interaction_type = 'question' THEN total_questions_answered + 1 ELSE total_questions_answered END,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'streak_bonus_awarded', v_streak_bonus,
    'interaction_type', p_interaction_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the old function name as a wrapper for backward compatibility
CREATE OR REPLACE FUNCTION update_moment_streak(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN update_consciousness_streak(p_user_id, 'moment');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
