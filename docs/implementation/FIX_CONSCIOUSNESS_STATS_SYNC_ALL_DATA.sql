-- =============================================================================
-- Fix: Resync ALL consciousness stats counters (including historical data)
-- Issue: Step 1 UPDATE only affected users with moments, missed existing stats
-- Solution: Update ALL users in user_consciousness_stats, not just those with new data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CRITICAL FIX: Sync counters for ALL USERS (not just those with new data)
-- -----------------------------------------------------------------------------

-- Sync total_moments for ALL users (including those with 0 moments)
UPDATE user_consciousness_stats ucs
SET total_moments = COALESCE((
  SELECT COUNT(*)
  FROM moments m
  WHERE m.user_id = ucs.user_id
), 0),
updated_at = NOW();

-- Sync total_questions_answered for ALL users
UPDATE user_consciousness_stats ucs
SET total_questions_answered = COALESCE((
  SELECT COUNT(*)
  FROM question_responses qr
  WHERE qr.user_id = ucs.user_id
    AND qr.response_text IS NOT NULL
    AND qr.skipped = FALSE
), 0),
updated_at = NOW();

-- Sync total_summaries_reflected for ALL users
UPDATE user_consciousness_stats ucs
SET total_summaries_reflected = COALESCE((
  SELECT COUNT(*)
  FROM weekly_summaries ws
  WHERE ws.user_id = ucs.user_id
    AND ws.user_reflection IS NOT NULL
    AND ws.user_reflection != ''
), 0),
updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Verification: Check your personal stats
-- -----------------------------------------------------------------------------

SELECT
  user_id,
  total_moments,
  (SELECT COUNT(*) FROM moments WHERE user_id = auth.uid()) as actual_moments,
  total_questions_answered,
  (SELECT COUNT(*) FROM question_responses WHERE user_id = auth.uid() AND skipped = FALSE) as actual_questions,
  total_summaries_reflected,
  (SELECT COUNT(*) FROM weekly_summaries WHERE user_id = auth.uid() AND user_reflection IS NOT NULL) as actual_summaries
FROM user_consciousness_stats
WHERE user_id = auth.uid();

-- Expected: All "total_*" should match "actual_*"

-- =============================================================================
-- Root Cause Analysis:
-- =============================================================================
-- The original Step 1 had:
--   WHERE user_id IN (SELECT DISTINCT user_id FROM moments)
-- This ONLY updated rows for users who HAVE moments.
--
-- If a user had user_consciousness_stats row but NO moments yet,
-- their row was NOT updated, keeping old/incorrect values.
--
-- This fix removes the WHERE filter, updating ALL rows.
-- =============================================================================
