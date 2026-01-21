-- Migration: Privacy Purge Infrastructure
-- Issue #146: [WhatsApp AI] feat: Privacy Purge - Auto-delete Raw Messages After Processing
--
-- LGPD/GDPR Compliance: Automatically deletes raw message content after AI processing
-- while retaining valuable metadata and insights.
--
-- Components:
-- 1. purged_at column on whatsapp_messages
-- 2. privacy_purge_log audit table
-- 3. Optimized index for purge candidates
-- 4. purge_processed_message_content() function
-- 5. Hourly pg_cron job
-- 6. Monitoring view

-- ============================================================================
-- TASK #146-1: Add purged_at column to whatsapp_messages
-- ============================================================================

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;

COMMENT ON COLUMN whatsapp_messages.purged_at IS
  'Timestamp when raw content (content_text, content_transcription, content_ocr) was purged for LGPD compliance';

-- ============================================================================
-- TASK #146-2: Create privacy_purge_log audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS privacy_purge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Execution metadata
  execution_id UUID NOT NULL,  -- Groups messages purged in same batch
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Statistics
  messages_purged INTEGER NOT NULL DEFAULT 0,
  bytes_freed_estimate BIGINT NOT NULL DEFAULT 0,  -- Estimated based on content length

  -- User breakdown (for LGPD reporting)
  users_affected INTEGER NOT NULL DEFAULT 0,
  user_counts JSONB DEFAULT '{}'::jsonb,  -- {user_id: count, ...}

  -- Execution details
  retention_hours INTEGER NOT NULL,  -- Retention period used
  duration_ms INTEGER,  -- How long the purge took
  error_message TEXT,  -- If any errors occurred

  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Only service role can access audit log (compliance evidence)
ALTER TABLE privacy_purge_log ENABLE ROW LEVEL SECURITY;

-- No user policies - only service role can access
-- This prevents users from tampering with compliance evidence

COMMENT ON TABLE privacy_purge_log IS
  'Audit log for LGPD/GDPR compliance tracking of message content purges';

-- Index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_privacy_purge_log_executed_at
  ON privacy_purge_log(executed_at DESC);

-- ============================================================================
-- TASK #146-3: Add optimized index for purge candidates
-- ============================================================================

-- Partial index for efficient purge candidate queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_purge_candidates
  ON whatsapp_messages(processing_status, created_at)
  WHERE purged_at IS NULL
    AND processing_status = 'completed'
    AND deleted_at IS NULL;

COMMENT ON INDEX idx_whatsapp_messages_purge_candidates IS
  'Optimized partial index for finding messages ready to be purged';

-- ============================================================================
-- TASK #146-4: Create purge_processed_message_content() function
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_processed_message_content(
  p_retention_hours INTEGER DEFAULT 24,
  p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE(
  execution_id UUID,
  messages_purged INTEGER,
  bytes_freed_estimate BIGINT,
  users_affected INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution_id UUID := gen_random_uuid();
  v_messages_purged INTEGER := 0;
  v_bytes_freed BIGINT := 0;
  v_users_affected INTEGER := 0;
  v_user_counts JSONB := '{}'::jsonb;
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_cutoff_time TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff time
  v_cutoff_time := NOW() - (p_retention_hours || ' hours')::INTERVAL;

  -- Calculate stats before purge
  WITH candidates AS (
    SELECT
      id,
      user_id,
      COALESCE(LENGTH(content_text), 0) +
      COALESCE(LENGTH(content_transcription), 0) +
      COALESCE(LENGTH(content_ocr), 0) AS content_bytes
    FROM whatsapp_messages
    WHERE processing_status = 'completed'
      AND purged_at IS NULL
      AND deleted_at IS NULL
      AND created_at < v_cutoff_time
    LIMIT p_batch_size
  ),
  user_stats AS (
    SELECT
      user_id::text,
      COUNT(*)::integer as msg_count
    FROM candidates
    GROUP BY user_id
  )
  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(content_bytes), 0)::bigint,
    COUNT(DISTINCT user_id)::integer,
    COALESCE(jsonb_object_agg(user_id, msg_count), '{}'::jsonb)
  INTO v_messages_purged, v_bytes_freed, v_users_affected, v_user_counts
  FROM candidates
  LEFT JOIN user_stats ON candidates.user_id::text = user_stats.user_id;

  -- Skip if no candidates found
  IF v_messages_purged = 0 THEN
    -- Log empty execution
    INSERT INTO privacy_purge_log (
      execution_id,
      messages_purged,
      bytes_freed_estimate,
      users_affected,
      user_counts,
      retention_hours,
      duration_ms
    ) VALUES (
      v_execution_id,
      0,
      0,
      0,
      '{}'::jsonb,
      p_retention_hours,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
    );

    RETURN QUERY SELECT v_execution_id, 0, 0::BIGINT, 0;
    RETURN;
  END IF;

  -- Purge the content
  UPDATE whatsapp_messages
  SET
    content_text = NULL,
    content_transcription = NULL,
    content_ocr = NULL,
    purged_at = NOW(),
    updated_at = NOW()
  WHERE id IN (
    SELECT id FROM whatsapp_messages
    WHERE processing_status = 'completed'
      AND purged_at IS NULL
      AND deleted_at IS NULL
      AND created_at < v_cutoff_time
    LIMIT p_batch_size
  );

  -- Get actual count of purged messages
  GET DIAGNOSTICS v_messages_purged = ROW_COUNT;

  -- Log the operation
  INSERT INTO privacy_purge_log (
    execution_id,
    messages_purged,
    bytes_freed_estimate,
    users_affected,
    user_counts,
    retention_hours,
    duration_ms
  ) VALUES (
    v_execution_id,
    v_messages_purged,
    v_bytes_freed,
    v_users_affected,
    v_user_counts,
    p_retention_hours,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
  );

  RETURN QUERY SELECT v_execution_id, v_messages_purged, v_bytes_freed, v_users_affected;

EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO privacy_purge_log (
    execution_id,
    messages_purged,
    bytes_freed_estimate,
    users_affected,
    retention_hours,
    duration_ms,
    error_message
  ) VALUES (
    v_execution_id,
    0,
    0,
    0,
    p_retention_hours,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
    SQLERRM
  );

  RETURN QUERY SELECT v_execution_id, 0, 0::BIGINT, 0;
END;
$$;

COMMENT ON FUNCTION purge_processed_message_content IS
  'LGPD/GDPR compliance function: Purges raw message content after AI processing is complete.
   Retains metadata (timestamps, direction, contact, sentiment) while removing content_text,
   content_transcription, and content_ocr. Default retention: 24 hours after processing.';

-- Grant execute to service role only
REVOKE ALL ON FUNCTION purge_processed_message_content FROM PUBLIC;

-- ============================================================================
-- TASK #146-5: Schedule pg_cron job (hourly)
-- ============================================================================

-- Note: pg_cron must be enabled in the Supabase dashboard first
-- Project Settings > Database > Extensions > pg_cron

DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule if exists (for idempotency)
    PERFORM cron.unschedule('privacy-purge-whatsapp-messages');

    -- Schedule hourly purge
    PERFORM cron.schedule(
      'privacy-purge-whatsapp-messages',
      '0 * * * *',  -- Every hour at minute 0
      $$SELECT purge_processed_message_content(24, 1000)$$
    );

    RAISE NOTICE 'pg_cron job scheduled: privacy-purge-whatsapp-messages (hourly)';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please enable it in Supabase dashboard and run: SELECT cron.schedule(''privacy-purge-whatsapp-messages'', ''0 * * * *'', $$SELECT purge_processed_message_content(24, 1000)$$);';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cron job: %. Manual setup required.', SQLERRM;
END;
$$;

-- ============================================================================
-- TASK #146-7: Create monitoring view
-- ============================================================================

CREATE OR REPLACE VIEW privacy_purge_stats AS
SELECT
  DATE_TRUNC('day', executed_at) AS purge_date,
  COUNT(*) AS executions,
  SUM(messages_purged) AS total_messages_purged,
  SUM(bytes_freed_estimate) AS total_bytes_freed,
  SUM(users_affected) AS total_users_affected,
  AVG(duration_ms)::INTEGER AS avg_duration_ms,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) AS failed_executions,
  MIN(executed_at) AS first_execution,
  MAX(executed_at) AS last_execution
FROM privacy_purge_log
GROUP BY DATE_TRUNC('day', executed_at)
ORDER BY purge_date DESC;

COMMENT ON VIEW privacy_purge_stats IS
  'Daily aggregated statistics for privacy purge operations. Used for LGPD/GDPR compliance monitoring.';

-- ============================================================================
-- HELPER: Manual purge trigger function (for admin use)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_privacy_purge_now(
  p_retention_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  execution_id UUID,
  messages_purged INTEGER,
  bytes_freed_estimate BIGINT,
  users_affected INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Run purge with specified retention, larger batch for manual trigger
  RETURN QUERY SELECT * FROM purge_processed_message_content(p_retention_hours, 5000);
END;
$$;

COMMENT ON FUNCTION trigger_privacy_purge_now IS
  'Admin function to manually trigger privacy purge with custom retention period';

-- Grant execute to service role only
REVOKE ALL ON FUNCTION trigger_privacy_purge_now FROM PUBLIC;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Check purge candidates:
-- SELECT COUNT(*), SUM(LENGTH(content_text)) as text_bytes
-- FROM whatsapp_messages
-- WHERE processing_status = 'completed'
--   AND purged_at IS NULL
--   AND created_at < NOW() - INTERVAL '24 hours';

-- Check purge history:
-- SELECT * FROM privacy_purge_stats LIMIT 10;

-- Check recent purge logs:
-- SELECT * FROM privacy_purge_log ORDER BY executed_at DESC LIMIT 10;

-- Manual purge test (use with caution):
-- SELECT * FROM trigger_privacy_purge_now(24);
