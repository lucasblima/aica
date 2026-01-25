-- ============================================================================
-- Migration: Gamification 2.0 - Consciousness Points (CP)
-- Issue: Gamification 2.0 - Meaningful Reward System
-- ============================================================================
--
-- CP is separate from XP - emphasizes quality over quantity:
-- - Presence: Being mindful and intentional
-- - Reflection: Self-awareness activities
-- - Connection: Relationship care (Health Score integration)
-- - Intention: Quality actions over mechanical completion
-- - Growth: Personal development milestones
-- ============================================================================

-- Step 1: Add consciousness_points JSONB column to user_stats
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS consciousness_points JSONB DEFAULT '{
  "user_id": "",
  "total_cp": 0,
  "current_cp": 0,
  "lifetime_cp": 0,
  "cp_by_category": {
    "presence": 0,
    "reflection": 0,
    "connection": 0,
    "intention": 0,
    "growth": 0
  },
  "cp_earned_today": 0,
  "cp_earned_this_week": 0,
  "cp_earned_this_month": 0,
  "last_earned_at": null,
  "updated_at": null
}'::jsonb;

-- Step 2: Create CP transactions table for history tracking
CREATE TABLE IF NOT EXISTS public.cp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('presence', 'reflection', 'connection', 'intention', 'growth')),
  source TEXT NOT NULL, -- Reward ID that triggered this
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cp_transactions_user_id
ON public.cp_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_cp_transactions_created_at
ON public.cp_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cp_transactions_category
ON public.cp_transactions(category);

CREATE INDEX IF NOT EXISTS idx_cp_transactions_user_date
ON public.cp_transactions(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_stats_consciousness_points_gin
ON public.user_stats USING GIN (consciousness_points);

-- Step 4: Enable RLS on cp_transactions
ALTER TABLE public.cp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own transactions
CREATE POLICY "Users can read own CP transactions"
ON public.cp_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own transactions
CREATE POLICY "Users can insert own CP transactions"
ON public.cp_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can do anything (for cron jobs)
CREATE POLICY "Service role full access to CP transactions"
ON public.cp_transactions
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Step 5: Create function to reset daily CP counters (for cron job)
CREATE OR REPLACE FUNCTION public.reset_daily_cp_counters()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INT;
BEGIN
  -- Reset daily counters in consciousness_points
  UPDATE user_stats
  SET consciousness_points = consciousness_points || jsonb_build_object(
    'cp_earned_today', 0,
    'updated_at', now()::text
  )
  WHERE consciousness_points IS NOT NULL
    AND (consciousness_points->>'cp_earned_today')::int > 0;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Step 6: Create function to reset weekly CP counters (for cron job)
CREATE OR REPLACE FUNCTION public.reset_weekly_cp_counters()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INT;
BEGIN
  -- Reset weekly counters in consciousness_points
  UPDATE user_stats
  SET consciousness_points = consciousness_points || jsonb_build_object(
    'cp_earned_this_week', 0,
    'updated_at', now()::text
  )
  WHERE consciousness_points IS NOT NULL
    AND (consciousness_points->>'cp_earned_this_week')::int > 0;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Step 7: Create function to reset monthly CP counters (for cron job)
CREATE OR REPLACE FUNCTION public.reset_monthly_cp_counters()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INT;
BEGIN
  -- Reset monthly counters in consciousness_points
  UPDATE user_stats
  SET consciousness_points = consciousness_points || jsonb_build_object(
    'cp_earned_this_month', 0,
    'updated_at', now()::text
  )
  WHERE consciousness_points IS NOT NULL
    AND (consciousness_points->>'cp_earned_this_month')::int > 0;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Step 8: Create function to get CP leaderboard
CREATE OR REPLACE FUNCTION public.get_cp_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  user_name TEXT,
  total_cp INT,
  lifetime_cp INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY (us.consciousness_points->>'total_cp')::int DESC) as rank,
    us.user_id,
    COALESCE(p.display_name, p.email, 'Anonymous') as user_name,
    COALESCE((us.consciousness_points->>'total_cp')::int, 0) as total_cp,
    COALESCE((us.consciousness_points->>'lifetime_cp')::int, 0) as lifetime_cp
  FROM user_stats us
  LEFT JOIN profiles p ON p.id = us.user_id
  WHERE us.consciousness_points IS NOT NULL
    AND (us.consciousness_points->>'total_cp')::int > 0
  ORDER BY (us.consciousness_points->>'total_cp')::int DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reset_daily_cp_counters() TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_weekly_cp_counters() TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_monthly_cp_counters() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cp_leaderboard(INT) TO authenticated;

-- Step 9: Add comments for documentation
COMMENT ON TABLE public.cp_transactions IS 'Consciousness Points transaction history. Records all CP earned by users.';

COMMENT ON COLUMN public.user_stats.consciousness_points IS 'Gamification 2.0: CP balance and stats. Separate from XP - rewards quality over quantity. Format: {total_cp, current_cp, lifetime_cp, cp_by_category: {presence, reflection, connection, intention, growth}, cp_earned_today, cp_earned_this_week, cp_earned_this_month, last_earned_at, updated_at}';

-- Step 10: Initialize consciousness_points for existing users
UPDATE public.user_stats
SET consciousness_points = jsonb_build_object(
  'user_id', user_id::text,
  'total_cp', 0,
  'current_cp', 0,
  'lifetime_cp', 0,
  'cp_by_category', jsonb_build_object(
    'presence', 0,
    'reflection', 0,
    'connection', 0,
    'intention', 0,
    'growth', 0
  ),
  'cp_earned_today', 0,
  'cp_earned_this_week', 0,
  'cp_earned_this_month', 0,
  'last_earned_at', null,
  'updated_at', now()::text
)
WHERE consciousness_points IS NULL
  OR consciousness_points = '{}'::jsonb
  OR consciousness_points->>'total_cp' IS NULL;

-- ============================================================================
-- Rollback instructions (if needed):
-- ============================================================================
-- DROP TABLE IF EXISTS public.cp_transactions;
-- DROP FUNCTION IF EXISTS public.reset_daily_cp_counters();
-- DROP FUNCTION IF EXISTS public.reset_weekly_cp_counters();
-- DROP FUNCTION IF EXISTS public.reset_monthly_cp_counters();
-- DROP FUNCTION IF EXISTS public.get_cp_leaderboard(INT);
-- ALTER TABLE public.user_stats DROP COLUMN IF EXISTS consciousness_points;
-- ============================================================================
