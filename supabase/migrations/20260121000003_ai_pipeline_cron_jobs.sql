-- ============================================================================
-- MIGRATION: AI Pipeline Cron Jobs
-- Issues: #142-4, #143-3
-- Date: 2026-01-21
--
-- PURPOSE:
-- Schedule automated AI processing and embedding generation using pg_cron
-- ============================================================================

-- ============================================================================
-- TASK #142-4: pg_cron Job for AI Processing (every 15 minutes)
-- ============================================================================

DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Check if pg_net extension is available for HTTP calls
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      -- Unschedule if exists (for idempotency)
      PERFORM cron.unschedule('whatsapp-ai-processing');

      -- Schedule AI processing every 15 minutes
      PERFORM cron.schedule(
        'whatsapp-ai-processing',
        '*/15 * * * *',  -- Every 15 minutes
        $$
          SELECT net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/process-whatsapp-ai',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
              'Content-Type', 'application/json'
            ),
            body := jsonb_build_object('batch_size', 50)
          );
        $$
      );

      RAISE NOTICE 'pg_cron job scheduled: whatsapp-ai-processing (every 15 minutes)';
    ELSE
      RAISE NOTICE 'pg_net extension not available. HTTP-based cron jobs cannot be scheduled.';
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please enable it in Supabase dashboard.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule AI processing cron job: %. Manual setup required.', SQLERRM;
END;
$$;

-- ============================================================================
-- TASK #143-3: pg_cron Job for Embedding Generation (every hour at :30)
-- ============================================================================

DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Check if pg_net extension is available for HTTP calls
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      -- Unschedule if exists (for idempotency)
      PERFORM cron.unschedule('generate-contact-embeddings');

      -- Schedule embedding generation every hour at :30
      PERFORM cron.schedule(
        'generate-contact-embeddings',
        '30 * * * *',  -- Every hour at minute 30
        $$
          SELECT net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-contact-embeddings',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
              'Content-Type', 'application/json'
            ),
            body := jsonb_build_object('batch_size', 100)
          );
        $$
      );

      RAISE NOTICE 'pg_cron job scheduled: generate-contact-embeddings (every hour at :30)';
    ELSE
      RAISE NOTICE 'pg_net extension not available. HTTP-based cron jobs cannot be scheduled.';
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please enable it in Supabase dashboard.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule embedding generation cron job: %. Manual setup required.', SQLERRM;
END;
$$;

-- ============================================================================
-- ALTERNATIVE: Direct SQL-based scheduling (if pg_net not available)
-- Uses database triggers instead of HTTP calls
-- ============================================================================

-- Note: If pg_net is not available, you can use Supabase's built-in
-- Edge Function invocation via webhooks or external schedulers like:
-- - Supabase Database Webhooks
-- - External cron services (Railway, Render, etc.)
-- - GitHub Actions scheduled workflows

-- ============================================================================
-- MONITORING VIEW: AI Pipeline Processing Stats
-- ============================================================================

CREATE OR REPLACE VIEW ai_pipeline_stats AS
SELECT
  DATE_TRUNC('day', processed_at) AS processing_date,
  COUNT(*) AS total_insights,
  COUNT(DISTINCT user_id) AS users_processed,
  COUNT(DISTINCT contact_phone) AS contacts_processed,
  SUM(messages_analyzed) AS total_messages_analyzed,
  AVG(processing_time_ms)::INTEGER AS avg_processing_time_ms,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) AS failed_insights
FROM contact_insights
GROUP BY DATE_TRUNC('day', processed_at)
ORDER BY processing_date DESC;

COMMENT ON VIEW ai_pipeline_stats IS
  'Daily aggregated statistics for AI pipeline processing. Used for monitoring and debugging.';

-- ============================================================================
-- MONITORING VIEW: Embedding Generation Stats
-- ============================================================================

CREATE OR REPLACE VIEW embedding_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS embedding_date,
  embedding_type,
  COUNT(*) AS total_embeddings,
  COUNT(DISTINCT user_id) AS users_with_embeddings,
  COUNT(DISTINCT contact_phone) AS contacts_with_embeddings
FROM contact_embeddings
GROUP BY DATE_TRUNC('day', created_at), embedding_type
ORDER BY embedding_date DESC, embedding_type;

COMMENT ON VIEW embedding_stats IS
  'Daily aggregated statistics for embedding generation by type.';

-- ============================================================================
-- HELPER: Get AI Pipeline Health Status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ai_pipeline_health()
RETURNS TABLE (
  metric TEXT,
  value BIGINT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY

  -- Messages pending AI processing
  SELECT
    'messages_pending_ai'::TEXT,
    COUNT(*)::BIGINT,
    CASE
      WHEN COUNT(*) > 1000 THEN 'warning'
      WHEN COUNT(*) > 5000 THEN 'critical'
      ELSE 'healthy'
    END
  FROM whatsapp_messages
  WHERE ai_processed = false
    AND processing_status = 'completed'
    AND purged_at IS NULL
    AND deleted_at IS NULL

  UNION ALL

  -- Insights created in last 24h
  SELECT
    'insights_last_24h'::TEXT,
    COUNT(*)::BIGINT,
    CASE
      WHEN COUNT(*) = 0 THEN 'warning'
      ELSE 'healthy'
    END
  FROM contact_insights
  WHERE processed_at > NOW() - INTERVAL '24 hours'

  UNION ALL

  -- Embeddings created in last 24h
  SELECT
    'embeddings_last_24h'::TEXT,
    COUNT(*)::BIGINT,
    CASE
      WHEN COUNT(*) = 0 THEN 'warning'
      ELSE 'healthy'
    END
  FROM contact_embeddings
  WHERE created_at > NOW() - INTERVAL '24 hours'

  UNION ALL

  -- Failed insights in last 24h
  SELECT
    'failed_insights_24h'::TEXT,
    COUNT(*)::BIGINT,
    CASE
      WHEN COUNT(*) > 10 THEN 'warning'
      WHEN COUNT(*) > 50 THEN 'critical'
      ELSE 'healthy'
    END
  FROM contact_insights
  WHERE error_message IS NOT NULL
    AND processed_at > NOW() - INTERVAL '24 hours';
END;
$$;

COMMENT ON FUNCTION get_ai_pipeline_health IS
  'Returns health status metrics for the AI pipeline';

GRANT EXECUTE ON FUNCTION get_ai_pipeline_health TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check cron jobs:
-- SELECT * FROM cron.job WHERE jobname LIKE '%whatsapp%' OR jobname LIKE '%embedding%';

-- Check pipeline health:
-- SELECT * FROM get_ai_pipeline_health();

-- Check AI stats:
-- SELECT * FROM ai_pipeline_stats LIMIT 7;

-- Check embedding stats:
-- SELECT * FROM embedding_stats LIMIT 14;
