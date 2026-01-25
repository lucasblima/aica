-- ============================================================================
-- Migration: Gamification 2.0 - Unified Efficiency Score
-- Issue: Gamification 2.0 - Holistic productivity measurement
-- ============================================================================
--
-- The Unified Efficiency Score combines 5 components:
-- 1. Task Completion Rate (25%) - Quantity of tasks completed
-- 2. Focus Quality (25%) - Quality of attention during work
-- 3. Consistency Score (20%) - Daily activity regularity
-- 4. Priority Alignment (20%) - Completing high-priority tasks
-- 5. Time Efficiency (10%) - Completing tasks on time
--
-- Formula emphasizes QUALITY over raw QUANTITY to encourage
-- sustainable productivity without burnout.
-- ============================================================================

-- Step 1: Add efficiency_score JSONB column to user_stats
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS efficiency_score JSONB DEFAULT '{
  "total_score": 0,
  "level": "low",
  "components": {
    "completion_rate": 0,
    "focus_quality": 0,
    "consistency": 0,
    "priority_alignment": 0,
    "time_efficiency": 0
  },
  "strongest": null,
  "weakest": null,
  "suggested_focus": null,
  "trend": "stable",
  "delta": 0,
  "updated_at": null
}'::jsonb;

-- Step 2: Create efficiency_history table
CREATE TABLE IF NOT EXISTS public.efficiency_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_score INT NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  components JSONB NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint to prevent duplicates
  UNIQUE(user_id, date, period)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_efficiency_history_user_id
ON public.efficiency_history(user_id);

CREATE INDEX IF NOT EXISTS idx_efficiency_history_date
ON public.efficiency_history(date DESC);

CREATE INDEX IF NOT EXISTS idx_efficiency_history_user_date
ON public.efficiency_history(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_efficiency_history_period
ON public.efficiency_history(period);

CREATE INDEX IF NOT EXISTS idx_user_stats_efficiency_gin
ON public.user_stats USING GIN (efficiency_score);

-- Step 4: Enable RLS on efficiency_history
ALTER TABLE public.efficiency_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own history
CREATE POLICY "Users can read own efficiency history"
ON public.efficiency_history
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert/update their own history
CREATE POLICY "Users can upsert own efficiency history"
ON public.efficiency_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own efficiency history"
ON public.efficiency_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can do anything (for cron jobs)
CREATE POLICY "Service role full access to efficiency history"
ON public.efficiency_history
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Step 5: Create function to get efficiency stats
CREATE OR REPLACE FUNCTION public.get_efficiency_stats(
  p_user_id UUID,
  p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_avg_score NUMERIC;
  v_highest_score INT;
  v_highest_date DATE;
  v_days_above_70 INT;
  v_days_above_90 INT;
BEGIN
  -- Calculate average score
  SELECT AVG(total_score)
  INTO v_avg_score
  FROM efficiency_history
  WHERE user_id = p_user_id
    AND period = 'daily'
    AND date >= CURRENT_DATE - p_days;

  -- Get highest score
  SELECT total_score, date
  INTO v_highest_score, v_highest_date
  FROM efficiency_history
  WHERE user_id = p_user_id
    AND period = 'daily'
    AND date >= CURRENT_DATE - p_days
  ORDER BY total_score DESC
  LIMIT 1;

  -- Count days above thresholds
  SELECT COUNT(*)
  INTO v_days_above_70
  FROM efficiency_history
  WHERE user_id = p_user_id
    AND period = 'daily'
    AND date >= CURRENT_DATE - p_days
    AND total_score >= 70;

  SELECT COUNT(*)
  INTO v_days_above_90
  FROM efficiency_history
  WHERE user_id = p_user_id
    AND period = 'daily'
    AND date >= CURRENT_DATE - p_days
    AND total_score >= 90;

  -- Build result
  v_result := jsonb_build_object(
    'average_score', COALESCE(ROUND(v_avg_score), 0),
    'highest_score', COALESCE(v_highest_score, 0),
    'highest_date', v_highest_date,
    'days_above_70', COALESCE(v_days_above_70, 0),
    'days_above_90', COALESCE(v_days_above_90, 0),
    'period_days', p_days
  );

  RETURN v_result;
END;
$$;

-- Step 6: Create function to get efficiency trend
CREATE OR REPLACE FUNCTION public.get_efficiency_trend(
  p_user_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  date DATE,
  total_score INT,
  components JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    eh.date,
    eh.total_score,
    eh.components
  FROM efficiency_history eh
  WHERE eh.user_id = p_user_id
    AND eh.period = 'daily'
    AND eh.date >= CURRENT_DATE - p_days
  ORDER BY eh.date ASC;
END;
$$;

-- Step 7: Create view for efficiency leaderboard
CREATE OR REPLACE VIEW public.v_efficiency_leaderboard AS
SELECT
  us.user_id,
  COALESCE(p.display_name, p.email, 'Anonymous') as user_name,
  COALESCE((us.efficiency_score->>'total_score')::int, 0) as current_score,
  COALESCE((us.efficiency_score->>'level')::text, 'low') as current_level,
  (
    SELECT AVG(total_score)
    FROM efficiency_history eh
    WHERE eh.user_id = us.user_id
      AND eh.period = 'daily'
      AND eh.date >= CURRENT_DATE - 30
  ) as avg_score_30d
FROM user_stats us
LEFT JOIN profiles p ON p.id = us.user_id
WHERE us.efficiency_score IS NOT NULL
  AND (us.efficiency_score->>'total_score')::int > 0
ORDER BY current_score DESC;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_efficiency_stats(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_efficiency_trend(UUID, INT) TO authenticated;

-- Step 9: Add comments
COMMENT ON TABLE public.efficiency_history IS 'Gamification 2.0: Daily/weekly/monthly efficiency score history for trend tracking.';

COMMENT ON COLUMN public.user_stats.efficiency_score IS 'Gamification 2.0: Unified Efficiency Score. 5 components weighted to emphasize quality over quantity. Format: {total_score, level, components: {completion_rate, focus_quality, consistency, priority_alignment, time_efficiency}, strongest, weakest, suggested_focus, trend, delta, updated_at}';

-- Step 10: Initialize efficiency_score for existing users
UPDATE public.user_stats
SET efficiency_score = jsonb_build_object(
  'total_score', 0,
  'level', 'low',
  'components', jsonb_build_object(
    'completion_rate', 0,
    'focus_quality', 0,
    'consistency', 0,
    'priority_alignment', 0,
    'time_efficiency', 0
  ),
  'strongest', null,
  'weakest', null,
  'suggested_focus', 'completion_rate',
  'trend', 'stable',
  'delta', 0,
  'updated_at', now()::text
)
WHERE efficiency_score IS NULL
  OR efficiency_score = '{}'::jsonb
  OR efficiency_score->>'total_score' IS NULL;

-- ============================================================================
-- Rollback instructions (if needed):
-- ============================================================================
-- DROP VIEW IF EXISTS public.v_efficiency_leaderboard;
-- DROP FUNCTION IF EXISTS public.get_efficiency_stats(UUID, INT);
-- DROP FUNCTION IF EXISTS public.get_efficiency_trend(UUID, INT);
-- DROP TABLE IF EXISTS public.efficiency_history;
-- DROP INDEX IF EXISTS idx_efficiency_history_user_id;
-- DROP INDEX IF EXISTS idx_efficiency_history_date;
-- DROP INDEX IF EXISTS idx_efficiency_history_user_date;
-- DROP INDEX IF EXISTS idx_efficiency_history_period;
-- DROP INDEX IF EXISTS idx_user_stats_efficiency_gin;
-- ALTER TABLE public.user_stats DROP COLUMN IF EXISTS efficiency_score;
-- ============================================================================
