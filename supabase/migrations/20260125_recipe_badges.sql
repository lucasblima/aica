-- ============================================================================
-- Migration: Gamification 2.0 - RECIPE Framework & Badges
-- Issue: Gamification 2.0 - RECIPE-based meaningful achievements
-- ============================================================================
--
-- RECIPE Framework pillars:
-- - Reflection: Self-awareness activities
-- - Exposition: Learning and skill development
-- - Choice: Player agency and autonomy
-- - Information: Progress tracking and feedback
-- - Play: Fun and experimentation
-- - Engagement: Social connection and collaboration
--
-- Badge categories:
-- - reflection: Self-awareness and mindfulness
-- - flow: Deep work and productivity
-- - comeback: Recovery from setbacks
-- - connection: Relationship care and social
-- - mastery: Skill development and expertise
--
-- Hat types:
-- - white_hat: Sustainable, intrinsic motivation (ENABLED by default)
-- - black_hat: Urgency, external pressure (DISABLED by default)
-- ============================================================================

-- Step 1: Add RECIPE engagement profile to user_stats
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS recipe_profile JSONB DEFAULT '{
  "pillar_scores": {
    "reflection": 50,
    "exposition": 50,
    "choice": 50,
    "information": 50,
    "play": 50,
    "engagement": 50
  },
  "dominant_pillars": [],
  "growth_pillars": [],
  "preferred_drives": ["epic_meaning", "accomplishment", "empowerment", "ownership", "social_influence"],
  "black_hat_enabled": false,
  "gamification_intensity": "moderate",
  "last_assessed_at": null,
  "updated_at": null
}'::jsonb;

-- Step 2: Add black_hat_enabled to streak_trend if not exists
-- This ensures Black Hat is DISABLED by default
DO $$
BEGIN
  -- Update existing users to have black_hat_enabled = false
  UPDATE user_stats
  SET streak_trend = COALESCE(streak_trend, '{}'::jsonb) || jsonb_build_object(
    'black_hat_enabled', false
  )
  WHERE streak_trend IS NULL
    OR streak_trend->>'black_hat_enabled' IS NULL;
END $$;

-- Step 3: Add metadata column to user_achievements for badge-specific data
ALTER TABLE public.user_achievements
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Step 4: Add displayed and favorite columns to user_achievements
ALTER TABLE public.user_achievements
ADD COLUMN IF NOT EXISTS displayed BOOLEAN DEFAULT true;

ALTER TABLE public.user_achievements
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

-- Step 5: Create index for faster badge lookups
CREATE INDEX IF NOT EXISTS idx_user_achievements_badge_lookup
ON public.user_achievements(user_id, achievement_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at
ON public.user_achievements(earned_at DESC);

-- Step 6: Create function to get user badge stats
CREATE OR REPLACE FUNCTION public.get_user_badge_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total INT;
  v_earned INT;
  v_total_xp INT;
  v_total_cp INT;
BEGIN
  -- Count earned badges
  SELECT COUNT(*)
  INTO v_earned
  FROM user_achievements
  WHERE user_id = p_user_id;

  -- Calculate totals from metadata
  SELECT
    COALESCE(SUM((metadata->>'xp_reward')::int), 0),
    COALESCE(SUM((metadata->>'cp_reward')::int), 0)
  INTO v_total_xp, v_total_cp
  FROM user_achievements
  WHERE user_id = p_user_id
    AND metadata IS NOT NULL;

  -- Build result
  v_result := jsonb_build_object(
    'earned', v_earned,
    'total_xp_from_badges', v_total_xp,
    'total_cp_from_badges', v_total_cp
  );

  RETURN v_result;
END;
$$;

-- Step 7: Create function to update RECIPE pillar scores
CREATE OR REPLACE FUNCTION public.update_recipe_pillar_score(
  p_user_id UUID,
  p_pillar TEXT,
  p_delta INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile JSONB;
  v_current_score INT;
  v_new_score INT;
BEGIN
  -- Get current profile
  SELECT recipe_profile
  INTO v_profile
  FROM user_stats
  WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN
    v_profile := '{
      "pillar_scores": {
        "reflection": 50,
        "exposition": 50,
        "choice": 50,
        "information": 50,
        "play": 50,
        "engagement": 50
      }
    }'::jsonb;
  END IF;

  -- Calculate new score (capped at 0-100)
  v_current_score := COALESCE((v_profile->'pillar_scores'->>p_pillar)::int, 50);
  v_new_score := GREATEST(0, LEAST(100, v_current_score + p_delta));

  -- Update pillar score
  v_profile := jsonb_set(
    v_profile,
    ARRAY['pillar_scores', p_pillar],
    to_jsonb(v_new_score)
  );

  -- Update timestamp
  v_profile := v_profile || jsonb_build_object(
    'updated_at', now()::text
  );

  -- Save to database
  UPDATE user_stats
  SET recipe_profile = v_profile
  WHERE user_id = p_user_id;

  RETURN v_profile;
END;
$$;

-- Step 8: Create function to toggle Black Hat badges
CREATE OR REPLACE FUNCTION public.toggle_black_hat_badges(
  p_user_id UUID,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update in streak_trend
  UPDATE user_stats
  SET streak_trend = COALESCE(streak_trend, '{}'::jsonb) || jsonb_build_object(
    'black_hat_enabled', p_enabled,
    'updated_at', now()::text
  )
  WHERE user_id = p_user_id;

  -- Also update in recipe_profile for consistency
  UPDATE user_stats
  SET recipe_profile = COALESCE(recipe_profile, '{}'::jsonb) || jsonb_build_object(
    'black_hat_enabled', p_enabled,
    'updated_at', now()::text
  )
  WHERE user_id = p_user_id;
END;
$$;

-- Step 9: Create view for badge leaderboard
CREATE OR REPLACE VIEW public.v_badge_leaderboard AS
SELECT
  us.user_id,
  COALESCE(p.display_name, p.email, 'Anonymous') as user_name,
  COUNT(ua.id) as badges_earned,
  COALESCE(SUM((ua.metadata->>'xp_reward')::int), 0) as total_xp_from_badges,
  COALESCE(SUM((ua.metadata->>'cp_reward')::int), 0) as total_cp_from_badges,
  MAX(ua.earned_at) as last_badge_at
FROM user_stats us
LEFT JOIN user_achievements ua ON ua.user_id = us.user_id
LEFT JOIN profiles p ON p.id = us.user_id
GROUP BY us.user_id, p.display_name, p.email
ORDER BY badges_earned DESC, total_cp_from_badges DESC;

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_badge_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_recipe_pillar_score(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_black_hat_badges(UUID, BOOLEAN) TO authenticated;

-- Step 11: Add comments
COMMENT ON COLUMN public.user_stats.recipe_profile IS 'Gamification 2.0: RECIPE Framework engagement profile. Contains pillar_scores, dominant/growth pillars, drive preferences, and black_hat_enabled (default: false).';

COMMENT ON FUNCTION public.toggle_black_hat_badges(UUID, BOOLEAN) IS 'Toggle Black Hat badges for a user. Black Hat badges are DISABLED by default for sustainable engagement.';

-- Step 12: Initialize recipe_profile for existing users
UPDATE public.user_stats
SET recipe_profile = jsonb_build_object(
  'user_id', user_id::text,
  'pillar_scores', jsonb_build_object(
    'reflection', 50,
    'exposition', 50,
    'choice', 50,
    'information', 50,
    'play', 50,
    'engagement', 50
  ),
  'dominant_pillars', '[]'::jsonb,
  'growth_pillars', '[]'::jsonb,
  'preferred_drives', '["epic_meaning", "accomplishment", "empowerment", "ownership", "social_influence"]'::jsonb,
  'black_hat_enabled', false,
  'gamification_intensity', 'moderate',
  'last_assessed_at', null,
  'updated_at', now()::text
)
WHERE recipe_profile IS NULL
  OR recipe_profile = '{}'::jsonb
  OR recipe_profile->>'pillar_scores' IS NULL;

-- ============================================================================
-- Rollback instructions (if needed):
-- ============================================================================
-- DROP VIEW IF EXISTS public.v_badge_leaderboard;
-- DROP FUNCTION IF EXISTS public.get_user_badge_stats(UUID);
-- DROP FUNCTION IF EXISTS public.update_recipe_pillar_score(UUID, TEXT, INT);
-- DROP FUNCTION IF EXISTS public.toggle_black_hat_badges(UUID, BOOLEAN);
-- DROP INDEX IF EXISTS idx_user_achievements_badge_lookup;
-- DROP INDEX IF EXISTS idx_user_achievements_earned_at;
-- ALTER TABLE public.user_achievements DROP COLUMN IF EXISTS metadata;
-- ALTER TABLE public.user_achievements DROP COLUMN IF EXISTS displayed;
-- ALTER TABLE public.user_achievements DROP COLUMN IF EXISTS favorite;
-- ALTER TABLE public.user_stats DROP COLUMN IF EXISTS recipe_profile;
-- ============================================================================
