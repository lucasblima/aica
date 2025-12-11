-- Migration: Setup PostgreSQL Cron Jobs
-- This migration enables and configures cron jobs for:
-- 1. Cleanup of old embeddings
-- 2. Synchronization of contact network from message embeddings

-- ============================================================================
-- ENABLE pg_cron EXTENSION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- CRON JOB 1: Cleanup Old Embeddings
-- ============================================================================
-- Schedule: Daily at 2:00 AM UTC
-- Action: Delete message embeddings older than 30 days
-- Purpose: Reduce storage costs and maintain performance

SELECT cron.schedule(
  'cleanup-old-message-embeddings',
  '0 2 * * *',  -- Daily at 2 AM UTC
  $$
  DELETE FROM message_embeddings
  WHERE created_at < NOW() - INTERVAL '30 days'
  $$
);

COMMENT ON CRON JOB 'cleanup-old-message-embeddings' IS
  'Deletes message embeddings older than 30 days to reduce storage costs';

-- ============================================================================
-- CRON JOB 2: Synchronize Contact Network
-- ============================================================================
-- Schedule: Every 6 hours (0, 6, 12, 18 UTC)
-- Action: Update contact_network with recent message data
-- Purpose: Keep contact health scores current based on recent interactions

SELECT cron.schedule(
  'sync-contact-network-from-embeddings',
  '0 */6 * * *',  -- Every 6 hours
  $$
  INSERT INTO contact_network (user_id, phone, last_interaction, health_score, updated_at)
  SELECT
    me.user_id,
    me.remote_jid as phone,
    MAX(me.message_date) as last_interaction,
    AVG(
      CASE
        WHEN (me.sentiment->>'label') = 'positive' THEN 1.0
        WHEN (me.sentiment->>'label') = 'neutral' THEN 0.5
        WHEN (me.sentiment->>'label') = 'negative' THEN 0.0
        ELSE 0.5
      END
    ) as health_score,
    NOW() as updated_at
  FROM message_embeddings me
  WHERE me.created_at > NOW() - INTERVAL '6 hours'
  GROUP BY me.user_id, me.remote_jid
  ON CONFLICT (user_id, phone)
  DO UPDATE SET
    last_interaction = EXCLUDED.last_interaction,
    health_score = EXCLUDED.health_score,
    updated_at = NOW()
  $$
);

COMMENT ON CRON JOB 'sync-contact-network-from-embeddings' IS
  'Updates contact_network table with recent message interactions and sentiment scores every 6 hours';

-- ============================================================================
-- CRON JOB 3: Archive Old Memories
-- ============================================================================
-- Schedule: Weekly on Sunday at 3:00 AM UTC
-- Action: Mark memories older than 90 days as archived
-- Purpose: Keep the active memories table lightweight

SELECT cron.schedule(
  'archive-old-memories',
  '0 3 * * 0',  -- Weekly on Sunday at 3 AM UTC
  $$
  UPDATE memories
  SET archived_at = NOW()
  WHERE archived_at IS NULL
    AND created_at < NOW() - INTERVAL '90 days'
  $$
);

COMMENT ON CRON JOB 'archive-old-memories' IS
  'Archives memories older than 90 days to keep active table lightweight';

-- ============================================================================
-- CRON JOB 4: Update User Statistics
-- ============================================================================
-- Schedule: Daily at 4:00 AM UTC
-- Action: Update user stats based on recent activities
-- Purpose: Maintain fresh user analytics for dashboards

SELECT cron.schedule(
  'update-user-stats-from-embeddings',
  '0 4 * * *',  -- Daily at 4 AM UTC
  $$
  UPDATE users
  SET
    last_message_at = COALESCE(
      (SELECT MAX(message_date) FROM message_embeddings WHERE user_id = users.id),
      last_message_at
    ),
    total_messages = COALESCE(
      (SELECT COUNT(*) FROM message_embeddings WHERE user_id = users.id),
      0
    ),
    updated_at = NOW()
  WHERE updated_at < NOW() - INTERVAL '1 hour'
  $$
);

COMMENT ON CRON JOB 'update-user-stats-from-embeddings' IS
  'Updates user statistics with recent message counts and last activity timestamp';

-- ============================================================================
-- HELPER FUNCTION: Get Unscheduled Job Status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cron_jobs_status()
RETURNS TABLE(
  jobname TEXT,
  schedule TEXT,
  command TEXT
) AS $$
SELECT
  jobname,
  schedule,
  command
FROM cron.job
WHERE database = current_database()
ORDER BY jobname;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION get_cron_jobs_status IS
  'Returns the status of all scheduled cron jobs in this database';

-- ============================================================================
-- NOTES
-- ============================================================================

-- To monitor cron job execution:
-- SELECT * FROM cron.job_run_details WHERE jobname LIKE '%evolution%' OR jobname LIKE '%memories%' ORDER BY start_time DESC LIMIT 10;

-- To manually trigger a job:
-- SELECT cron.force_run('cleanup-old-message-embeddings');

-- To unschedule a job:
-- SELECT cron.unschedule('cleanup-old-message-embeddings');

-- To view all jobs:
-- SELECT * FROM cron.job;
