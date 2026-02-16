-- ============================================================================
-- FIX: Backfill rows missed by 20260216100000
-- ============================================================================
-- Two issues found:
--   1. conversation_threads: 25 rows created at 2026-02-16T03:31 UTC were
--      excluded by cutoff < '2026-02-16'. These were created by the cron
--      job BEFORE the Edge Function deploy at ~04:05 UTC, so they were
--      NOT tracked by log_interaction.
--   2. user_patterns: 7 rows have embedding IS NULL because
--      synthesize-user-patterns doesn't populate the embedding column.
--      The original backfill filtered on embedding IS NOT NULL.
--
-- Fix: Use cutoff < '2026-02-16T04:05:00+00' (before EF deploys went live)
--      and remove the embedding filter.
-- ============================================================================

-- The Edge Functions were deployed at approximately 2026-02-16T04:05 UTC.
-- Anything created before that was NOT tracked by log_interaction.
-- We use 04:05 as the cutoff to capture the cron-created data.

-- ============================================================================
-- FIX 1: conversation_threads (25 rows at 2026-02-16T03:31)
-- ============================================================================

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  ct.user_id,
  'build_conversation_threads' AS action,
  'connections' AS module,
  'gemini-2.5-flash' AS model_used,
  (COALESCE(ct.message_count, 10) * 50)::BIGINT AS tokens_input,
  500::BIGINT AS tokens_output,
  ROUND(
    (
      ((COALESCE(ct.message_count, 10) * 50)::NUMERIC / 1000000.0 * 0.15)
      + (500.0 / 1000000.0 * 0.60)
    ) * 5.0,
    4
  ) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'conversation_threads',
    'original_id', ct.id::TEXT,
    'message_count', ct.message_count,
    'topic', ct.topic
  ) AS metadata,
  ct.created_at
FROM conversation_threads ct
WHERE ct.created_at < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = ct.id::TEXT
      AND ul.metadata->>'backfill_source' = 'conversation_threads'
  );

-- ============================================================================
-- FIX 2: user_patterns (7 rows, all with embedding IS NULL)
-- ============================================================================
-- Each pattern = 1 synthesize-user-patterns AI call (gemini-2.5-flash).
-- The pattern text is the output; input is the user's moments/data.
-- Estimate: 2000 tokens input (context), 300 tokens output (pattern).

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  up.user_id,
  'pattern_synthesis' AS action,
  'journey' AS module,
  'gemini-2.5-flash' AS model_used,
  2000::BIGINT AS tokens_input,
  300::BIGINT AS tokens_output,
  ROUND(
    (
      (2000.0 / 1000000.0 * 0.15)
      + (300.0 / 1000000.0 * 0.60)
    ) * 5.0,
    4
  ) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'user_patterns',
    'original_id', up.id::TEXT,
    'pattern_type', up.pattern_type,
    'pattern_key', up.pattern_key
  ) AS metadata,
  up.created_at
FROM user_patterns up
WHERE up.created_at < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = up.id::TEXT
      AND ul.metadata->>'backfill_source' = 'user_patterns'
  );

-- ============================================================================
-- FIX 3: contact_network dossiers with relaxed check
-- ============================================================================
-- dossier_updated_at is NULL for all contacts currently, but dossier_summary
-- or dossier_version > 0 might indicate a dossier was built.
-- Check dossier_version > 0 as alternative evidence.

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  cn.user_id,
  'build_contact_dossier' AS action,
  'connections' AS module,
  'gemini-2.5-flash' AS model_used,
  1500::BIGINT AS tokens_input,
  500::BIGINT AS tokens_output,
  ROUND(((1500.0 / 1000000.0 * 0.15) + (500.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'contact_network_dossier',
    'original_id', cn.id::TEXT,
    'contact_name', cn.name,
    'dossier_version', cn.dossier_version
  ) AS metadata,
  COALESCE(cn.dossier_updated_at, cn.updated_at)
FROM contact_network cn
WHERE (cn.dossier_updated_at IS NOT NULL OR COALESCE(cn.dossier_version, 0) > 0)
  AND COALESCE(cn.dossier_updated_at, cn.updated_at) < '2026-02-16T04:05:00+00'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = cn.id::TEXT
      AND ul.metadata->>'backfill_source' = 'contact_network_dossier'
  );

-- ============================================================================
-- CLEANUP: Drop diagnostic function
-- ============================================================================
DROP FUNCTION IF EXISTS public._diag_backfill_counts();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_total BIGINT;
  v_backfill BIGINT;
  v_live BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM usage_logs;
  SELECT COUNT(*) INTO v_backfill FROM usage_logs WHERE metadata->>'backfill_source' IS NOT NULL;
  v_live := v_total - v_backfill;

  RAISE NOTICE 'usage_logs: % total (% backfilled + % live)', v_total, v_backfill, v_live;
  RAISE NOTICE '  conversation_threads: %', (SELECT COUNT(*) FROM usage_logs WHERE metadata->>'backfill_source' = 'conversation_threads');
  RAISE NOTICE '  user_patterns: %', (SELECT COUNT(*) FROM usage_logs WHERE metadata->>'backfill_source' = 'user_patterns');
  RAISE NOTICE '  contact_network_dossier: %', (SELECT COUNT(*) FROM usage_logs WHERE metadata->>'backfill_source' = 'contact_network_dossier');
  RAISE NOTICE '  daily_council_insights: %', (SELECT COUNT(*) FROM usage_logs WHERE metadata->>'backfill_source' = 'daily_council_insights');
END $$;
