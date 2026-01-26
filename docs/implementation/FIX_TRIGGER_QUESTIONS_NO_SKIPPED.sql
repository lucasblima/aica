-- =============================================================================
-- Fix: Update trigger for questions (remove 'skipped' column check)
-- Issue: Trigger referenced non-existent 'skipped' column
-- =============================================================================

-- Drop and recreate trigger function WITHOUT skipped check
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

-- Test verification
SELECT
  'Trigger recreated successfully. Answer a new question to test.' as status;
