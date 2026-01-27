-- Migration: 20260127200127_fix_consciousness_stats_counters.sql
-- Description: Fix broken counters in user_consciousness_stats table
--
-- Problem: total_summaries_reflected and total_questions_answered are never updated
-- Solution: Create RPC functions + triggers + sync existing data
--
-- Affects:
-- - user_consciousness_stats (counters fixed)
-- - weekly_summaries (trigger on user_reflection update)
-- - question_responses (trigger on insert)

-- ============================================================================
-- 1. RPC FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Function: Increment summaries reflected counter
CREATE OR REPLACE FUNCTION public.increment_summaries_reflected(
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE user_consciousness_stats
  SET total_summaries_reflected = total_summaries_reflected + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.increment_summaries_reflected(UUID) IS
'Increments total_summaries_reflected counter for a user. Used by trigger on weekly_summaries.';

-- Function: Increment questions answered counter
CREATE OR REPLACE FUNCTION public.increment_questions_answered(
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE user_consciousness_stats
  SET total_questions_answered = total_questions_answered + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.increment_questions_answered(UUID) IS
'Increments total_questions_answered counter for a user. Used by trigger on question_responses.';

-- ============================================================================
-- 2. TRIGGER FUNCTIONS
-- ============================================================================

-- Trigger function: Update counter when user reflects on weekly summary
CREATE OR REPLACE FUNCTION public.trigger_increment_summaries_reflected()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if user_reflection changed from NULL to NOT NULL
  IF (OLD.user_reflection IS NULL OR OLD.user_reflection = '')
     AND NEW.user_reflection IS NOT NULL
     AND NEW.user_reflection != '' THEN
    PERFORM public.increment_summaries_reflected(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.trigger_increment_summaries_reflected() IS
'Trigger function that increments reflection counter when user adds reflection to weekly summary.';

-- Trigger function: Update counter when user answers a question
CREATE OR REPLACE FUNCTION public.trigger_increment_questions_answered()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.increment_questions_answered(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.trigger_increment_questions_answered() IS
'Trigger function that increments question counter when user answers a new question.';

-- ============================================================================
-- 3. CREATE TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS update_summaries_reflected_counter ON weekly_summaries;
DROP TRIGGER IF EXISTS update_questions_answered_counter ON question_responses;

-- Trigger: Update reflection counter on weekly_summaries UPDATE
CREATE TRIGGER update_summaries_reflected_counter
  AFTER UPDATE ON weekly_summaries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_summaries_reflected();

COMMENT ON TRIGGER update_summaries_reflected_counter ON weekly_summaries IS
'Automatically increments reflection counter when user adds reflection to weekly summary.';

-- Trigger: Update question counter on question_responses INSERT
CREATE TRIGGER update_questions_answered_counter
  AFTER INSERT ON question_responses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_questions_answered();

COMMENT ON TRIGGER update_questions_answered_counter ON question_responses IS
'Automatically increments question counter when user answers a new question.';

-- ============================================================================
-- 4. SYNC EXISTING DATA (CRITICAL - Run Once)
-- ============================================================================

-- Sync total_summaries_reflected for all users
UPDATE user_consciousness_stats ucs
SET total_summaries_reflected = (
  SELECT COUNT(*)
  FROM weekly_summaries ws
  WHERE ws.user_id = ucs.user_id
    AND ws.user_reflection IS NOT NULL
    AND ws.user_reflection != ''
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM weekly_summaries ws
  WHERE ws.user_id = ucs.user_id
    AND ws.user_reflection IS NOT NULL
    AND ws.user_reflection != ''
);

-- Sync total_questions_answered for all users
UPDATE user_consciousness_stats ucs
SET total_questions_answered = (
  SELECT COUNT(*)
  FROM question_responses qr
  WHERE qr.user_id = ucs.user_id
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM question_responses qr
  WHERE qr.user_id = ucs.user_id
);

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Verify reflection counts match
-- Run this to check sync worked correctly:
--
-- SELECT
--   ucs.user_id,
--   ucs.total_summaries_reflected AS stats_count,
--   COUNT(ws.id) AS actual_count,
--   (ucs.total_summaries_reflected = COUNT(ws.id)) AS counts_match
-- FROM user_consciousness_stats ucs
-- LEFT JOIN weekly_summaries ws
--   ON ws.user_id = ucs.user_id
--   AND ws.user_reflection IS NOT NULL
--   AND ws.user_reflection != ''
-- GROUP BY ucs.user_id, ucs.total_summaries_reflected
-- HAVING ucs.total_summaries_reflected != COUNT(ws.id);

-- Verify question counts match
-- Run this to check sync worked correctly:
--
-- SELECT
--   ucs.user_id,
--   ucs.total_questions_answered AS stats_count,
--   COUNT(qr.id) AS actual_count,
--   (ucs.total_questions_answered = COUNT(qr.id)) AS counts_match
-- FROM user_consciousness_stats ucs
-- LEFT JOIN question_responses qr ON qr.user_id = ucs.user_id
-- GROUP BY ucs.user_id, ucs.total_questions_answered
-- HAVING ucs.total_questions_answered != COUNT(qr.id);

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP TRIGGER IF EXISTS update_summaries_reflected_counter ON weekly_summaries;
-- DROP TRIGGER IF EXISTS update_questions_answered_counter ON question_responses;
-- DROP FUNCTION IF EXISTS trigger_increment_summaries_reflected();
-- DROP FUNCTION IF EXISTS trigger_increment_questions_answered();
-- DROP FUNCTION IF EXISTS increment_summaries_reflected(UUID);
-- DROP FUNCTION IF EXISTS increment_questions_answered(UUID);
