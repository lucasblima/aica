-- =============================================================================
-- COMPLETE FIX: Questions Counter Sync + Trigger (No 'skipped' column)
-- Execute este arquivo completo no Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Sync existing questions counter for ALL users
-- -----------------------------------------------------------------------------

UPDATE user_consciousness_stats ucs
SET total_questions_answered = COALESCE((
  SELECT COUNT(*)
  FROM question_responses qr
  WHERE qr.user_id = ucs.user_id
), 0),
updated_at = NOW();

-- -----------------------------------------------------------------------------
-- STEP 2: Fix trigger function (remove non-existent 'skipped' column check)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS update_consciousness_stats_on_question() CASCADE;

CREATE OR REPLACE FUNCTION update_consciousness_stats_on_question()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment total_questions_answered when a question is answered
  -- (If record exists in question_responses, it was answered)
  INSERT INTO user_consciousness_stats (user_id, total_questions_answered, updated_at)
  VALUES (NEW.user_id, 1, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_questions_answered = user_consciousness_stats.total_questions_answered + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_stats_on_question ON question_responses;
CREATE TRIGGER trigger_update_stats_on_question
  AFTER INSERT ON question_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_consciousness_stats_on_question();

-- -----------------------------------------------------------------------------
-- STEP 3: Verification - Check if counter matches reality
-- -----------------------------------------------------------------------------

SELECT
  user_id,
  total_questions_answered as stats_questions,
  (SELECT COUNT(*) FROM question_responses WHERE user_id = auth.uid()) as actual_questions,
  CASE
    WHEN total_questions_answered = (SELECT COUNT(*) FROM question_responses WHERE user_id = auth.uid())
    THEN '✅ CORRETO'
    ELSE '❌ DIVERGENTE'
  END as status
FROM user_consciousness_stats
WHERE user_id = auth.uid();

-- Expected: stats_questions = actual_questions, status = '✅ CORRETO'

-- =============================================================================
-- Instructions:
-- 1. Copy this entire file
-- 2. Paste in Supabase SQL Editor:
--    https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
-- 3. Click "RUN" button
-- 4. Check verification result (should show ✅ CORRETO)
-- 5. Reload Journey page (F5)
-- =============================================================================
