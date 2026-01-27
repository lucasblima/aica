-- =============================================================================
-- Detailed Verification: Check consciousness stats vs actual data
-- Execute to see exact counts and identify any discrepancies
-- =============================================================================

-- Check your current stats
SELECT
  'YOUR STATS' as section,
  ucs.user_id,
  ucs.total_moments as stats_moments,
  ucs.total_questions_answered as stats_questions,
  ucs.total_summaries_reflected as stats_summaries,
  ucs.updated_at as last_updated
FROM user_consciousness_stats ucs
WHERE ucs.user_id = auth.uid();

-- Check actual data in tables
SELECT
  'ACTUAL DATA' as section,
  (SELECT COUNT(*) FROM moments WHERE user_id = auth.uid()) as actual_moments,
  (SELECT COUNT(*) FROM question_responses WHERE user_id = auth.uid()) as actual_questions,
  (SELECT COUNT(*) FROM weekly_summaries WHERE user_id = auth.uid() AND user_reflection IS NOT NULL) as actual_summaries;

-- Side-by-side comparison
SELECT
  'COMPARISON' as section,
  ucs.total_moments as stats_moments,
  (SELECT COUNT(*) FROM moments WHERE user_id = auth.uid()) as actual_moments,
  ucs.total_moments - (SELECT COUNT(*) FROM moments WHERE user_id = auth.uid()) as moments_diff,

  ucs.total_questions_answered as stats_questions,
  (SELECT COUNT(*) FROM question_responses WHERE user_id = auth.uid()) as actual_questions,
  ucs.total_questions_answered - (SELECT COUNT(*) FROM question_responses WHERE user_id = auth.uid()) as questions_diff,

  ucs.total_summaries_reflected as stats_summaries,
  (SELECT COUNT(*) FROM weekly_summaries WHERE user_id = auth.uid() AND user_reflection IS NOT NULL) as actual_summaries,
  ucs.total_summaries_reflected - (SELECT COUNT(*) FROM weekly_summaries WHERE user_id = auth.uid() AND user_reflection IS NOT NULL) as summaries_diff
FROM user_consciousness_stats ucs
WHERE ucs.user_id = auth.uid();

-- =============================================================================
-- Expected Results:
-- - All *_diff columns should be 0 (zero)
-- - If any *_diff is NOT zero, there's a mismatch
-- =============================================================================
