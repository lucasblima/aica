-- =============================================================================
-- Verify ALL users stats (not just auth.uid())
-- This will show ALL users in the database
-- =============================================================================

-- 1. Show ALL users with their stats
SELECT
  'ALL USERS STATS' as section,
  ucs.user_id,
  ucs.total_moments,
  ucs.total_questions_answered,
  ucs.total_summaries_reflected,
  ucs.current_streak,
  ucs.longest_streak,
  ucs.updated_at
FROM user_consciousness_stats ucs
ORDER BY ucs.updated_at DESC
LIMIT 20;

-- 2. Show ALL users with actual data counts
SELECT
  'ALL USERS ACTUAL DATA' as section,
  u.id as user_id,
  u.email,
  (SELECT COUNT(*) FROM moments WHERE user_id = u.id) as actual_moments,
  (SELECT COUNT(*) FROM question_responses WHERE user_id = u.id) as actual_questions,
  (SELECT COUNT(*) FROM weekly_summaries WHERE user_id = u.id AND user_reflection IS NOT NULL) as actual_summaries
FROM auth.users u
WHERE
  (SELECT COUNT(*) FROM moments WHERE user_id = u.id) > 0
  OR (SELECT COUNT(*) FROM question_responses WHERE user_id = u.id) > 0
ORDER BY u.created_at DESC
LIMIT 20;

-- 3. Find mismatches (stats != actual data)
SELECT
  'MISMATCHES' as section,
  u.id as user_id,
  u.email,
  COALESCE(ucs.total_moments, 0) as stats_moments,
  (SELECT COUNT(*) FROM moments WHERE user_id = u.id) as actual_moments,
  COALESCE(ucs.total_questions_answered, 0) as stats_questions,
  (SELECT COUNT(*) FROM question_responses WHERE user_id = u.id) as actual_questions
FROM auth.users u
LEFT JOIN user_consciousness_stats ucs ON ucs.user_id = u.id
WHERE
  COALESCE(ucs.total_moments, 0) != (SELECT COUNT(*) FROM moments WHERE user_id = u.id)
  OR COALESCE(ucs.total_questions_answered, 0) != (SELECT COUNT(*) FROM question_responses WHERE user_id = u.id)
ORDER BY u.created_at DESC
LIMIT 20;

-- =============================================================================
-- Instructions:
-- Execute these 3 queries and send me the results
-- This will show which user has data and if stats are correct
-- =============================================================================
