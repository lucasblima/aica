-- ============================================================================
-- BACKFILL usage_logs FROM HISTORICAL AI ACTIVITY
-- ============================================================================
-- Populates usage_logs with estimated usage from tables that prove AI was called
-- before log_interaction was wired up (pre-2026-02-16).
--
-- Sources (in order of confidence):
--   1. ai_usage_analytics  — has actual token counts & USD costs
--   2. daily_council_insights — has total_tokens_used & model_used
--   3. conversation_threads — message_count available, estimate tokens
--   4. whatsapp_extracted_entities — fixed estimate per entity
--   5. user_patterns — fixed estimate per embedding
--   6. contact_network dossiers — dossier_updated_at proves AI ran
--
-- Cost formula (same as log_interaction):
--   cost_brl = ((tokens_in * 0.00000015) + (tokens_out * 0.0000006)) * 5.0
--
-- Safety:
--   - All inserts use created_at < '2026-02-16' cutoff
--   - Idempotent: checks for existing rows via NOT EXISTS
--   - Wrapped in transaction (implicit per migration)
-- ============================================================================

-- ============================================================================
-- PHASE 1: Migrate from ai_usage_analytics (highest confidence)
-- ============================================================================
-- This table has actual token counts and USD costs from the old tracking system.
-- Convert USD to BRL and map column names to usage_logs schema.

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  a.user_id,
  -- Map old operation_type to new action names
  CASE a.operation_type
    WHEN 'text_generation' THEN 'chat'
    WHEN 'file_indexing' THEN 'file_indexing'
    WHEN 'file_search_query' THEN 'file_search_query'
    WHEN 'image_analysis' THEN 'image_analysis'
    WHEN 'embedding' THEN 'text_embedding'
    ELSE a.operation_type
  END AS action,
  -- Map old module_type to module
  CASE a.module_type
    WHEN 'podcast' THEN 'studio'
    WHEN 'chat' THEN 'journey'
    ELSE a.module_type
  END AS module,
  a.ai_model AS model_used,
  COALESCE(a.input_tokens, 0)::BIGINT AS tokens_input,
  COALESCE(a.output_tokens, 0)::BIGINT AS tokens_output,
  -- Convert USD to BRL (rate ~5.0)
  ROUND(COALESCE(a.total_cost_usd, 0) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'ai_usage_analytics',
    'original_id', a.id::TEXT,
    'original_cost_usd', a.total_cost_usd
  ) AS metadata,
  a.created_at
FROM ai_usage_analytics a
WHERE a.created_at < '2026-02-16'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = a.id::TEXT
      AND ul.metadata->>'backfill_source' = 'ai_usage_analytics'
  );

-- ============================================================================
-- PHASE 2: Backfill from daily_council_insights
-- ============================================================================
-- Life Council runs 4 AI calls (3 personas + synthesis). total_tokens_used is available.
-- Split tokens roughly: 60% input, 40% output (prompt-heavy for context injection).

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  dci.user_id,
  'life_council' AS action,
  'journey' AS module,
  COALESCE(dci.model_used, 'gemini-2.5-pro') AS model_used,
  -- 60% of total tokens as input
  ROUND(COALESCE(dci.total_tokens_used, 4000) * 0.6)::BIGINT AS tokens_input,
  -- 40% of total tokens as output
  ROUND(COALESCE(dci.total_tokens_used, 4000) * 0.4)::BIGINT AS tokens_output,
  -- Cost formula: use Pro pricing for life_council ($1.25/M in, $5.00/M out, * 5.0 BRL)
  ROUND(
    (
      (ROUND(COALESCE(dci.total_tokens_used, 4000) * 0.6)::NUMERIC / 1000000.0 * 1.25)
      + (ROUND(COALESCE(dci.total_tokens_used, 4000) * 0.4)::NUMERIC / 1000000.0 * 5.00)
    ) * 5.0,
    4
  ) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'daily_council_insights',
    'original_id', dci.id::TEXT,
    'insight_date', dci.insight_date::TEXT,
    'total_tokens_used', dci.total_tokens_used,
    'processing_time_ms', dci.processing_time_ms
  ) AS metadata,
  dci.created_at
FROM daily_council_insights dci
WHERE dci.created_at < '2026-02-16'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = dci.id::TEXT
      AND ul.metadata->>'backfill_source' = 'daily_council_insights'
  );

-- ============================================================================
-- PHASE 3: Backfill from conversation_threads
-- ============================================================================
-- Each thread = 1 AI call to build-conversation-threads Edge Function.
-- Estimate: message_count * 50 tokens input + 500 tokens output.
-- Model: gemini-2.5-flash (default for WhatsApp processing).

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  ct.user_id,
  'build_conversation_threads' AS action,
  'connections' AS module,
  'gemini-2.5-flash' AS model_used,
  (COALESCE(ct.message_count, 10) * 50)::BIGINT AS tokens_input,
  500::BIGINT AS tokens_output,
  -- Flash pricing: $0.15/M in, $0.60/M out, * 5.0 BRL
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
WHERE ct.created_at < '2026-02-16'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = ct.id::TEXT
      AND ul.metadata->>'backfill_source' = 'conversation_threads'
  );

-- ============================================================================
-- PHASE 4: Backfill from whatsapp_extracted_entities
-- ============================================================================
-- Each entity = 1 AI call to route-entities-to-modules Edge Function.
-- Fixed estimate: 200 tokens input, 100 tokens output.

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  we.user_id,
  'route_entities_to_modules' AS action,
  COALESCE(we.routed_to_module, 'connections') AS module,
  'gemini-2.5-flash' AS model_used,
  200::BIGINT AS tokens_input,
  100::BIGINT AS tokens_output,
  -- Flash pricing: (200 * 0.15 + 100 * 0.60) / 1M * 5.0 BRL
  ROUND(((200.0 / 1000000.0 * 0.15) + (100.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'whatsapp_extracted_entities',
    'original_id', we.id::TEXT,
    'entity_type', we.entity_type,
    'routing_status', we.routing_status
  ) AS metadata,
  we.created_at
FROM whatsapp_extracted_entities we
WHERE we.created_at < '2026-02-16'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = we.id::TEXT
      AND ul.metadata->>'backfill_source' = 'whatsapp_extracted_entities'
  );

-- ============================================================================
-- PHASE 5: Backfill from user_patterns (embeddings)
-- ============================================================================
-- Each pattern with embedding = 1 text-embedding-004 call.
-- Fixed estimate: 500 tokens input, 0 output (embeddings produce vectors, not tokens).

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  up.user_id,
  'text_embedding' AS action,
  'journey' AS module,
  'text-embedding-004' AS model_used,
  500::BIGINT AS tokens_input,
  0::BIGINT AS tokens_output,
  -- Embedding pricing: $0.00001/M tokens * 500 * 5.0 BRL ≈ negligible
  ROUND((500.0 / 1000000.0 * 0.00001) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'user_patterns',
    'original_id', up.id::TEXT,
    'pattern_type', up.pattern_type,
    'pattern_key', up.pattern_key
  ) AS metadata,
  up.created_at
FROM user_patterns up
WHERE up.embedding IS NOT NULL
  AND up.created_at < '2026-02-16'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = up.id::TEXT
      AND ul.metadata->>'backfill_source' = 'user_patterns'
  );

-- ============================================================================
-- PHASE 6: Backfill from contact_network dossiers
-- ============================================================================
-- Each contact with dossier_updated_at = at least 1 build-contact-dossier call.
-- Estimate: 1500 tokens input (intent summaries), 500 tokens output (dossier).

INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, metadata, created_at)
SELECT
  cn.user_id,
  'build_contact_dossier' AS action,
  'connections' AS module,
  'gemini-2.5-flash' AS model_used,
  1500::BIGINT AS tokens_input,
  500::BIGINT AS tokens_output,
  -- Flash pricing: (1500 * 0.15 + 500 * 0.60) / 1M * 5.0 BRL
  ROUND(((1500.0 / 1000000.0 * 0.15) + (500.0 / 1000000.0 * 0.60)) * 5.0, 4) AS cost_brl,
  jsonb_build_object(
    'backfill_source', 'contact_network_dossier',
    'original_id', cn.id::TEXT,
    'contact_name', cn.name,
    'dossier_version', cn.dossier_version
  ) AS metadata,
  cn.dossier_updated_at
FROM contact_network cn
WHERE cn.dossier_updated_at IS NOT NULL
  AND cn.dossier_updated_at < '2026-02-16'::TIMESTAMPTZ
  AND NOT EXISTS (
    SELECT 1 FROM usage_logs ul
    WHERE ul.metadata->>'original_id' = cn.id::TEXT
      AND ul.metadata->>'backfill_source' = 'contact_network_dossier'
  );

-- ============================================================================
-- VERIFICATION: Log counts per source
-- ============================================================================
DO $$
DECLARE
  v_total BIGINT;
  v_phase1 BIGINT;
  v_phase2 BIGINT;
  v_phase3 BIGINT;
  v_phase4 BIGINT;
  v_phase5 BIGINT;
  v_phase6 BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM usage_logs WHERE metadata->>'backfill_source' IS NOT NULL;
  SELECT COUNT(*) INTO v_phase1 FROM usage_logs WHERE metadata->>'backfill_source' = 'ai_usage_analytics';
  SELECT COUNT(*) INTO v_phase2 FROM usage_logs WHERE metadata->>'backfill_source' = 'daily_council_insights';
  SELECT COUNT(*) INTO v_phase3 FROM usage_logs WHERE metadata->>'backfill_source' = 'conversation_threads';
  SELECT COUNT(*) INTO v_phase4 FROM usage_logs WHERE metadata->>'backfill_source' = 'whatsapp_extracted_entities';
  SELECT COUNT(*) INTO v_phase5 FROM usage_logs WHERE metadata->>'backfill_source' = 'user_patterns';
  SELECT COUNT(*) INTO v_phase6 FROM usage_logs WHERE metadata->>'backfill_source' = 'contact_network_dossier';

  RAISE NOTICE 'Backfill complete: % total rows', v_total;
  RAISE NOTICE '  Phase 1 (ai_usage_analytics): % rows', v_phase1;
  RAISE NOTICE '  Phase 2 (daily_council_insights): % rows', v_phase2;
  RAISE NOTICE '  Phase 3 (conversation_threads): % rows', v_phase3;
  RAISE NOTICE '  Phase 4 (whatsapp_extracted_entities): % rows', v_phase4;
  RAISE NOTICE '  Phase 5 (user_patterns): % rows', v_phase5;
  RAISE NOTICE '  Phase 6 (contact_network_dossier): % rows', v_phase6;
END $$;
