-- ============================================================================
-- DIAGNOSTIC: Count rows in backfill source tables (bypasses RLS)
-- This is a temporary diagnostic RPC — will be dropped after verification.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._diag_backfill_counts()
RETURNS TABLE (
  source_table TEXT,
  total_rows BIGINT,
  eligible_rows BIGINT,
  sample_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- conversation_threads
  RETURN QUERY
  SELECT
    'conversation_threads'::TEXT,
    (SELECT COUNT(*) FROM conversation_threads)::BIGINT,
    (SELECT COUNT(*) FROM conversation_threads WHERE created_at < '2026-02-16')::BIGINT,
    (SELECT MAX(created_at) FROM conversation_threads);

  -- whatsapp_extracted_entities
  RETURN QUERY
  SELECT
    'whatsapp_extracted_entities'::TEXT,
    (SELECT COUNT(*) FROM whatsapp_extracted_entities)::BIGINT,
    (SELECT COUNT(*) FROM whatsapp_extracted_entities WHERE created_at < '2026-02-16')::BIGINT,
    (SELECT MAX(created_at) FROM whatsapp_extracted_entities);

  -- user_patterns (all, not just with embedding)
  RETURN QUERY
  SELECT
    'user_patterns (all)'::TEXT,
    (SELECT COUNT(*) FROM user_patterns)::BIGINT,
    (SELECT COUNT(*) FROM user_patterns WHERE created_at < '2026-02-16')::BIGINT,
    (SELECT MAX(created_at) FROM user_patterns);

  -- user_patterns with embedding
  RETURN QUERY
  SELECT
    'user_patterns (with embedding)'::TEXT,
    (SELECT COUNT(*) FROM user_patterns WHERE embedding IS NOT NULL)::BIGINT,
    (SELECT COUNT(*) FROM user_patterns WHERE embedding IS NOT NULL AND created_at < '2026-02-16')::BIGINT,
    (SELECT MAX(created_at) FROM user_patterns WHERE embedding IS NOT NULL);

  -- contact_network with dossier
  RETURN QUERY
  SELECT
    'contact_network (with dossier)'::TEXT,
    (SELECT COUNT(*) FROM contact_network WHERE dossier_updated_at IS NOT NULL)::BIGINT,
    (SELECT COUNT(*) FROM contact_network WHERE dossier_updated_at IS NOT NULL AND dossier_updated_at < '2026-02-16')::BIGINT,
    (SELECT MAX(dossier_updated_at) FROM contact_network WHERE dossier_updated_at IS NOT NULL);

  -- contact_network total
  RETURN QUERY
  SELECT
    'contact_network (total)'::TEXT,
    (SELECT COUNT(*) FROM contact_network)::BIGINT,
    0::BIGINT,
    (SELECT MAX(updated_at) FROM contact_network);

  -- ai_usage_analytics
  RETURN QUERY
  SELECT
    'ai_usage_analytics'::TEXT,
    (SELECT COUNT(*) FROM ai_usage_analytics)::BIGINT,
    (SELECT COUNT(*) FROM ai_usage_analytics WHERE created_at < '2026-02-16')::BIGINT,
    (SELECT MAX(created_at) FROM ai_usage_analytics);

  -- daily_council_insights
  RETURN QUERY
  SELECT
    'daily_council_insights'::TEXT,
    (SELECT COUNT(*) FROM daily_council_insights)::BIGINT,
    (SELECT COUNT(*) FROM daily_council_insights WHERE created_at < '2026-02-16')::BIGINT,
    (SELECT MAX(created_at) FROM daily_council_insights);

  -- usage_logs (current state)
  RETURN QUERY
  SELECT
    'usage_logs (current)'::TEXT,
    (SELECT COUNT(*) FROM usage_logs)::BIGINT,
    (SELECT COUNT(*) FROM usage_logs WHERE metadata->>'backfill_source' IS NOT NULL)::BIGINT,
    (SELECT MAX(created_at) FROM usage_logs);
END;
$$;

GRANT EXECUTE ON FUNCTION public._diag_backfill_counts() TO anon;
GRANT EXECUTE ON FUNCTION public._diag_backfill_counts() TO authenticated;
