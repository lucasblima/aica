-- ============================================================================
-- BACKFILL: Moments + Daily Question Responses
-- ============================================================================
-- Each moment triggers up to 3 AI calls in gemini-chat:
--   1. analyze_moment_sentiment (sentiment analysis, fast model)
--   2. analyze_moment (tags, mood, depth analysis, fast model)
--   3. evaluate_quality (CP scoring, fast model)
--
-- Each AI-generated daily question triggers:
--   1. generate_daily_question (fast model)
--
-- Each question response does NOT trigger an AI call by itself
-- (the response is just stored; AI analysis happens via Life Council).
--
-- However, question responses provide evidence that the question was
-- generated/served, which implies the system was active.
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC: Count source data (temporary function)
-- ============================================================================

CREATE OR REPLACE FUNCTION public._diag_journey_counts()
RETURNS TABLE (
  source_table TEXT,
  total_rows BIGINT,
  sample_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT 'moments'::TEXT, COUNT(*)::BIGINT, MAX(created_at) FROM moments;
  RETURN QUERY SELECT 'question_responses'::TEXT, COUNT(*)::BIGINT, MAX(responded_at) FROM question_responses;
  RETURN QUERY SELECT 'daily_questions (ai-generated)'::TEXT, COUNT(*)::BIGINT, MAX(created_at) FROM daily_questions WHERE created_by_ai = true;
  RETURN QUERY SELECT 'daily_questions (total)'::TEXT, COUNT(*)::BIGINT, MAX(created_at) FROM daily_questions;
  RETURN QUERY SELECT 'daily_reports'::TEXT, COUNT(*)::BIGINT, MAX(created_at) FROM daily_reports;
END;
$$;

GRANT EXECUTE ON FUNCTION public._diag_journey_counts() TO anon;

-- ============================================================================
-- PHASE 7: Backfill from moments (3 AI calls per moment)
-- ============================================================================
-- analyze_moment_sentiment: ~300 tokens input (moment content), ~200 output (JSON)
-- analyze_moment: ~500 tokens input (content + context), ~300 output (tags/mood)
-- evaluate_quality: ~400 tokens input (content + analysis), ~150 output (score)
-- All use gemini-2.5-flash (MODELS.fast in gemini-chat)

-- 7a: analyze_moment_sentiment
INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  m.user_id,
  'analyze_moment_sentiment' AS action,
  'journey' AS module,
  'gemini-2.5-flash' AS model_used,
  300::BIGINT AS tokens_input,
  200::BIGINT AS tokens_output,
  ROUND(((300.0 / 1000000.0 * 0.15) + (200.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'moments_sentiment',
    'original_id', m.id::TEXT,
    'emotion', m.emotion
  ) AS metadata,
  m.created_at
FROM moments m
WHERE m.created_at < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = m.id::TEXT
      AND ul.metadata->>'backfill_source' = 'moments_sentiment'
  );

-- 7b: analyze_moment (tags + mood)
INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  m.user_id,
  'analyze_moment' AS action,
  'journey' AS module,
  'gemini-2.5-flash' AS model_used,
  500::BIGINT AS tokens_input,
  300::BIGINT AS tokens_output,
  ROUND(((500.0 / 1000000.0 * 0.15) + (300.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'moments_analyze',
    'original_id', m.id::TEXT,
    'emotion', m.emotion
  ) AS metadata,
  -- Offset by 1 second to avoid duplicate timestamps
  m.created_at + INTERVAL '1 second'
FROM moments m
WHERE m.created_at < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = m.id::TEXT
      AND ul.metadata->>'backfill_source' = 'moments_analyze'
  );

-- 7c: evaluate_quality (CP scoring)
INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  m.user_id,
  'evaluate_quality' AS action,
  'journey' AS module,
  'gemini-2.5-flash' AS model_used,
  400::BIGINT AS tokens_input,
  150::BIGINT AS tokens_output,
  ROUND(((400.0 / 1000000.0 * 0.15) + (150.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'moments_quality',
    'original_id', m.id::TEXT,
    'emotion', m.emotion
  ) AS metadata,
  -- Offset by 2 seconds
  m.created_at + INTERVAL '2 seconds'
FROM moments m
WHERE m.created_at < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = m.id::TEXT
      AND ul.metadata->>'backfill_source' = 'moments_quality'
  );

-- ============================================================================
-- PHASE 8: Backfill from AI-generated daily questions
-- ============================================================================
-- Each AI-generated question = 1 call to generate_daily_question
-- Estimate: 800 tokens input (context bank + history), 200 tokens output (question)

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  dq.user_id,
  'generate_daily_question' AS action,
  'journey' AS module,
  'gemini-2.5-flash' AS model_used,
  800::BIGINT AS tokens_input,
  200::BIGINT AS tokens_output,
  ROUND(((800.0 / 1000000.0 * 0.15) + (200.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'daily_questions_ai',
    'original_id', dq.id::TEXT,
    'question_text', LEFT(dq.question_text, 100)
  ) AS metadata,
  dq.created_at
FROM daily_questions dq
WHERE dq.created_by_ai = true
  AND dq.user_id IS NOT NULL
  AND dq.created_at < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = dq.id::TEXT
      AND ul.metadata->>'backfill_source' = 'daily_questions_ai'
  );

-- ============================================================================
-- PHASE 9: Backfill from daily_reports (AI-generated summaries)
-- ============================================================================
-- Each daily report = 1 call to generate_daily_report or generate_weekly_summary
-- Estimate: 1500 tokens input (moments + context), 800 tokens output (report)

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  dr.user_id,
  'generate_report' AS action,
  'journey' AS module,
  'gemini-2.5-flash' AS model_used,
  1500::BIGINT AS tokens_input,
  800::BIGINT AS tokens_output,
  ROUND(((1500.0 / 1000000.0 * 0.15) + (800.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'daily_reports',
    'original_id', dr.id::TEXT,
    'report_type', dr.report_type,
    'report_date', dr.report_date::TEXT
  ) AS metadata,
  dr.created_at
FROM daily_reports dr
WHERE dr.created_at < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = dr.id::TEXT
      AND ul.metadata->>'backfill_source' = 'daily_reports'
  );

-- ============================================================================
-- CLEANUP + VERIFICATION
-- ============================================================================
DROP FUNCTION IF EXISTS public._diag_journey_counts();

DO $$
DECLARE
  v_total BIGINT;
  v_backfill BIGINT;
  v_moments_sentiment BIGINT;
  v_moments_analyze BIGINT;
  v_moments_quality BIGINT;
  v_questions_ai BIGINT;
  v_reports BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM usage_logs;
  SELECT COUNT(*) INTO v_backfill FROM usage_logs WHERE metadata->>'backfill_source' IS NOT NULL;
  SELECT COUNT(*) INTO v_moments_sentiment FROM usage_logs WHERE metadata->>'backfill_source' = 'moments_sentiment';
  SELECT COUNT(*) INTO v_moments_analyze FROM usage_logs WHERE metadata->>'backfill_source' = 'moments_analyze';
  SELECT COUNT(*) INTO v_moments_quality FROM usage_logs WHERE metadata->>'backfill_source' = 'moments_quality';
  SELECT COUNT(*) INTO v_questions_ai FROM usage_logs WHERE metadata->>'backfill_source' = 'daily_questions_ai';
  SELECT COUNT(*) INTO v_reports FROM usage_logs WHERE metadata->>'backfill_source' = 'daily_reports';

  RAISE NOTICE 'usage_logs: % total (% backfilled)', v_total, v_backfill;
  RAISE NOTICE '  moments_sentiment: %', v_moments_sentiment;
  RAISE NOTICE '  moments_analyze: %', v_moments_analyze;
  RAISE NOTICE '  moments_quality: %', v_moments_quality;
  RAISE NOTICE '  daily_questions_ai: %', v_questions_ai;
  RAISE NOTICE '  daily_reports: %', v_reports;
END $$;
