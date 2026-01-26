-- =============================================================================
-- Fix: Sync consciousness stats counters with real data
-- Issue: total_moments shows 0 but moments exist in database
-- Root Cause: No triggers update user_consciousness_stats when moments/questions created
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Sync existing data (one-time fix)
-- -----------------------------------------------------------------------------

-- Sync total_moments counter
UPDATE user_consciousness_stats ucs
SET total_moments = (
  SELECT COUNT(*)
  FROM moments m
  WHERE m.user_id = ucs.user_id
),
updated_at = NOW()
WHERE user_id IN (
  SELECT DISTINCT user_id FROM moments
);

-- Sync total_questions_answered counter
UPDATE user_consciousness_stats ucs
SET total_questions_answered = (
  SELECT COUNT(*)
  FROM question_responses qr
  WHERE qr.user_id = ucs.user_id
    AND qr.response_text IS NOT NULL
    AND qr.skipped = FALSE
),
updated_at = NOW()
WHERE user_id IN (
  SELECT DISTINCT user_id FROM question_responses
);

-- Sync total_summaries_reflected counter
UPDATE user_consciousness_stats ucs
SET total_summaries_reflected = (
  SELECT COUNT(*)
  FROM weekly_summaries ws
  WHERE ws.user_id = ucs.user_id
    AND ws.user_reflection IS NOT NULL
    AND ws.user_reflection != ''
),
updated_at = NOW()
WHERE user_id IN (
  SELECT DISTINCT user_id FROM weekly_summaries
);

-- -----------------------------------------------------------------------------
-- Step 2: Create trigger function to auto-update total_moments
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_consciousness_stats_on_moment()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment total_moments when a moment is created
  INSERT INTO user_consciousness_stats (user_id, total_moments, updated_at)
  VALUES (NEW.user_id, 1, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_moments = user_consciousness_stats.total_moments + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on moments INSERT
DROP TRIGGER IF EXISTS trigger_update_stats_on_moment ON moments;
CREATE TRIGGER trigger_update_stats_on_moment
  AFTER INSERT ON moments
  FOR EACH ROW
  EXECUTE FUNCTION update_consciousness_stats_on_moment();

-- -----------------------------------------------------------------------------
-- Step 3: Create trigger function to auto-update total_questions_answered
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_consciousness_stats_on_question()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if question was answered (not skipped)
  IF NEW.response_text IS NOT NULL AND NEW.skipped = FALSE THEN
    INSERT INTO user_consciousness_stats (user_id, total_questions_answered, updated_at)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_questions_answered = user_consciousness_stats.total_questions_answered + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on question_responses INSERT
DROP TRIGGER IF EXISTS trigger_update_stats_on_question ON question_responses;
CREATE TRIGGER trigger_update_stats_on_question
  AFTER INSERT ON question_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_consciousness_stats_on_question();

-- -----------------------------------------------------------------------------
-- Step 4: Create trigger function to auto-update total_summaries_reflected
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_consciousness_stats_on_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment when user adds reflection to weekly summary
  IF NEW.user_reflection IS NOT NULL AND NEW.user_reflection != '' THEN
    -- Only increment if this is a new reflection (UPDATE from NULL or empty)
    IF (OLD.user_reflection IS NULL OR OLD.user_reflection = '') THEN
      INSERT INTO user_consciousness_stats (user_id, total_summaries_reflected, updated_at)
      VALUES (NEW.user_id, 1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        total_summaries_reflected = user_consciousness_stats.total_summaries_reflected + 1,
        updated_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on weekly_summaries UPDATE
DROP TRIGGER IF EXISTS trigger_update_stats_on_summary ON weekly_summaries;
CREATE TRIGGER trigger_update_stats_on_summary
  AFTER UPDATE ON weekly_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_consciousness_stats_on_summary();

-- -----------------------------------------------------------------------------
-- Step 5: Verification queries (run after applying)
-- -----------------------------------------------------------------------------

-- Verify counts are correct
SELECT
  ucs.user_id,
  ucs.total_moments as stats_moments,
  (SELECT COUNT(*) FROM moments m WHERE m.user_id = ucs.user_id) as actual_moments,
  ucs.total_questions_answered as stats_questions,
  (SELECT COUNT(*) FROM question_responses qr WHERE qr.user_id = ucs.user_id AND qr.skipped = FALSE) as actual_questions,
  ucs.total_summaries_reflected as stats_summaries,
  (SELECT COUNT(*) FROM weekly_summaries ws WHERE ws.user_id = ucs.user_id AND ws.user_reflection IS NOT NULL) as actual_summaries
FROM user_consciousness_stats ucs
LIMIT 10;

-- =============================================================================
-- Testing: Create a test moment and verify counter increments
-- =============================================================================
-- INSERT INTO moments (user_id, content) VALUES ('YOUR_USER_ID', 'Test moment');
-- SELECT total_moments FROM user_consciousness_stats WHERE user_id = 'YOUR_USER_ID';
-- Expected: total_moments should increment by 1

-- =============================================================================
-- Rollback (if needed):
-- =============================================================================
-- DROP TRIGGER IF EXISTS trigger_update_stats_on_moment ON moments;
-- DROP TRIGGER IF EXISTS trigger_update_stats_on_question ON question_responses;
-- DROP TRIGGER IF EXISTS trigger_update_stats_on_summary ON weekly_summaries;
-- DROP FUNCTION IF EXISTS update_consciousness_stats_on_moment();
-- DROP FUNCTION IF EXISTS update_consciousness_stats_on_question();
-- DROP FUNCTION IF EXISTS update_consciousness_stats_on_summary();
-- =============================================================================
