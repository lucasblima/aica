-- ============================================================================
-- Migration: Gamification 2.0 - Compassionate Streak Trends
-- Issue: Gamification 2.0 - Replace rigid streaks with trend-based tracking
-- ============================================================================
--
-- Changes:
-- 1. Add streak_trend JSONB column to user_stats
-- 2. Add gamification_intensity column for user preferences
-- 3. Migrate existing streak data to trend format
-- 4. Add indexes for performance
--
-- Key principles:
-- - Compassion > Punishment
-- - Grace periods for life's unpredictability
-- - Recovery through effort, not money
-- - Celebrate comebacks, not shame breaks
-- ============================================================================

-- Step 1: Add streak_trend JSONB column
-- Stores the compassionate streak data as JSON for flexibility
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS streak_trend JSONB DEFAULT '{
  "activeDays": [],
  "currentTrend": 0,
  "trendWindow": 50,
  "gracePeriodActive": false,
  "lastGracePeriodDate": null,
  "gracePeriodUsedThisMonth": 0,
  "recoveryProgress": 0,
  "isRecovering": false,
  "recoveryStartDate": null
}'::jsonb;

-- Step 2: Add gamification_intensity for user preferences
-- Values: 'minimal', 'moderate', 'full'
-- Default 'moderate' - balanced experience
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS gamification_intensity TEXT DEFAULT 'moderate'
CHECK (gamification_intensity IN ('minimal', 'moderate', 'full'));

-- Step 3: Add comment for documentation
COMMENT ON COLUMN public.user_stats.streak_trend IS 'Gamification 2.0: Compassionate streak data with grace periods and recovery. Format: {activeDays: string[], currentTrend: number, trendWindow: number, gracePeriodActive: boolean, lastGracePeriodDate: string|null, gracePeriodUsedThisMonth: number, recoveryProgress: number, isRecovering: boolean, recoveryStartDate: string|null}';

COMMENT ON COLUMN public.user_stats.gamification_intensity IS 'User gamification preference: minimal (essentials only), moderate (balanced), full (all features)';

-- Step 4: Create index for JSONB queries on streak_trend
CREATE INDEX IF NOT EXISTS idx_user_stats_streak_trend_gin
ON public.user_stats USING GIN (streak_trend);

-- Step 5: Migrate existing users with current_streak > 0 to trend format
-- This generates activeDays based on their current_streak and last_activity_date
UPDATE public.user_stats
SET streak_trend = jsonb_build_object(
  'activeDays', (
    SELECT jsonb_agg(to_char(generate_series, 'YYYY-MM-DD'))
    FROM generate_series(
      (last_activity_date::date - (current_streak - 1)::int),
      last_activity_date::date,
      '1 day'::interval
    )
  ),
  'currentTrend', LEAST(current_streak, 50),
  'trendWindow', 50,
  'gracePeriodActive', false,
  'lastGracePeriodDate', null,
  'gracePeriodUsedThisMonth', 0,
  'recoveryProgress', 0,
  'isRecovering', false,
  'recoveryStartDate', null
)
WHERE current_streak > 0
  AND last_activity_date IS NOT NULL
  AND (streak_trend IS NULL OR streak_trend = '{}'::jsonb OR (streak_trend->>'activeDays')::jsonb = '[]'::jsonb);

-- Step 6: Create function to get streak trend stats for analytics
CREATE OR REPLACE FUNCTION public.get_streak_trend_stats(p_user_id UUID)
RETURNS TABLE (
  current_trend INT,
  trend_percentage INT,
  trend_quality TEXT,
  is_in_grace_period BOOLEAN,
  grace_periods_remaining INT,
  is_recovering BOOLEAN,
  recovery_progress INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak_trend JSONB;
  v_trend INT;
  v_window INT;
  v_percentage INT;
  v_grace_used INT;
BEGIN
  -- Get streak_trend for user
  SELECT us.streak_trend INTO v_streak_trend
  FROM user_stats us
  WHERE us.user_id = p_user_id;

  IF v_streak_trend IS NULL THEN
    RETURN QUERY SELECT 0, 0, 'needs_attention'::TEXT, FALSE, 4, FALSE, 0;
    RETURN;
  END IF;

  -- Extract values
  v_trend := COALESCE((v_streak_trend->>'currentTrend')::INT, 0);
  v_window := COALESCE((v_streak_trend->>'trendWindow')::INT, 50);
  v_grace_used := COALESCE((v_streak_trend->>'gracePeriodUsedThisMonth')::INT, 0);

  -- Calculate percentage
  IF v_window > 0 THEN
    v_percentage := ROUND((v_trend::NUMERIC / v_window::NUMERIC) * 100);
  ELSE
    v_percentage := 0;
  END IF;

  RETURN QUERY SELECT
    v_trend,
    v_percentage,
    CASE
      WHEN v_percentage >= 90 THEN 'excellent'
      WHEN v_percentage >= 70 THEN 'good'
      WHEN v_percentage >= 50 THEN 'moderate'
      ELSE 'needs_attention'
    END::TEXT,
    COALESCE((v_streak_trend->>'gracePeriodActive')::BOOLEAN, FALSE),
    4 - v_grace_used,
    COALESCE((v_streak_trend->>'isRecovering')::BOOLEAN, FALSE),
    COALESCE((v_streak_trend->>'recoveryProgress')::INT, 0);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_streak_trend_stats(UUID) TO authenticated;

-- Step 7: Create RLS policy for streak_trend column access
-- (Already covered by existing user_stats RLS policies)

-- ============================================================================
-- Rollback instructions (if needed):
-- ============================================================================
-- ALTER TABLE public.user_stats DROP COLUMN IF EXISTS streak_trend;
-- ALTER TABLE public.user_stats DROP COLUMN IF EXISTS gamification_intensity;
-- DROP FUNCTION IF EXISTS public.get_streak_trend_stats(UUID);
-- DROP INDEX IF EXISTS idx_user_stats_streak_trend_gin;
-- ============================================================================
