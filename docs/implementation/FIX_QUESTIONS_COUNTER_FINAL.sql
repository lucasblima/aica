-- =============================================================================
-- Fix: Sync total_questions_answered (CORRECTED - no 'skipped' column)
-- Issue: Previous SQL referenced non-existent 'skipped' column
-- Schema Reality: question_responses has NO 'skipped' column
-- Logic: If record exists in question_responses = question was answered
-- =============================================================================

-- Sync total_questions_answered for ALL users (CORRECTED)
UPDATE user_consciousness_stats ucs
SET total_questions_answered = COALESCE((
  SELECT COUNT(*)
  FROM question_responses qr
  WHERE qr.user_id = ucs.user_id
), 0),
updated_at = NOW();

-- Verify your stats
SELECT
  user_id,
  total_questions_answered as stats_questions,
  (SELECT COUNT(*) FROM question_responses WHERE user_id = auth.uid()) as actual_questions
FROM user_consciousness_stats
WHERE user_id = auth.uid();

-- Expected: stats_questions = actual_questions
