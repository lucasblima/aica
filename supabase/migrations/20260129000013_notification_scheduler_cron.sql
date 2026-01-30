-- Migration: Notification Scheduler with pg_cron
-- Issue #173: Implement notification scheduler system
--
-- This migration creates the scheduled task to process notifications
-- every 5 minutes using pg_cron extension

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- CRON JOB: Process scheduled notifications every 5 minutes
-- ============================================================================

-- Remove existing cron job if it exists (to allow re-running migration)
SELECT cron.unschedule('process-scheduled-notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-notifications'
);

-- Schedule notification processing every 5 minutes
-- Calls the notification-sender Edge Function via HTTP POST
SELECT cron.schedule(
  'process-scheduled-notifications',  -- Job name
  '*/5 * * * *',                      -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notification-sender',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'mode', 'auto',
        'batch_size', 50
      )
    ) AS request_id;
  $$
);

-- ============================================================================
-- FUNCTION: Manual trigger for immediate processing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_notification_processing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the Edge Function to process notifications
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notification-sender',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'mode', 'auto',
        'batch_size', 50
      )
    ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.trigger_notification_processing() TO authenticated;

-- ============================================================================
-- FUNCTION: Get notification processing stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_notification_stats(user_uuid UUID DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'total_queued', COUNT(*) FILTER (WHERE status = 'queued'),
    'total_sending', COUNT(*) FILTER (WHERE status = 'sending'),
    'total_sent', COUNT(*) FILTER (WHERE status = 'sent'),
    'total_failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'total_cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'next_scheduled', MIN(scheduled_for) FILTER (WHERE status = 'scheduled' AND scheduled_for > now()),
    'last_sent', MAX(sent_at),
    'success_rate',
      CASE
        WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'failed')) > 0
        THEN ROUND(
          (COUNT(*) FILTER (WHERE status = 'sent')::numeric /
           COUNT(*) FILTER (WHERE status IN ('sent', 'failed'))::numeric) * 100,
          2
        )
        ELSE 0
      END
  )
  INTO stats
  FROM scheduled_notifications
  WHERE user_id = user_uuid
    AND deleted_at IS NULL;

  RETURN stats;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_notification_stats(UUID) TO authenticated;

-- ============================================================================
-- FUNCTION: Clean up old notification logs (older than 90 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than 90 days
  DELETE FROM notification_log
  WHERE created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Schedule cleanup to run daily at 3 AM
SELECT cron.schedule(
  'cleanup-notification-logs',
  '0 3 * * *',  -- Daily at 3 AM
  $$SELECT public.cleanup_old_notification_logs()$$
);

-- ============================================================================
-- FUNCTION: Mark expired notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark notifications as expired if they're more than 24 hours past scheduled time
  -- and still in 'scheduled' status
  UPDATE scheduled_notifications
  SET
    status = 'expired',
    updated_at = now()
  WHERE
    status = 'scheduled'
    AND scheduled_for < now() - INTERVAL '24 hours'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

-- Schedule expiration check to run every hour
SELECT cron.schedule(
  'mark-expired-notifications',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT public.mark_expired_notifications()$$
);

-- ============================================================================
-- SETTINGS: Configure app settings for cron jobs
-- ============================================================================

-- Note: These settings need to be configured via Supabase Dashboard or CLI
-- Settings → Database → Custom Postgres Configuration

-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uzywajqzbdbrfammshdg.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.trigger_notification_processing() IS
  'Manually trigger notification processing outside of scheduled cron job';

COMMENT ON FUNCTION public.get_notification_stats(UUID) IS
  'Get notification statistics for a user including success rate and next scheduled time';

COMMENT ON FUNCTION public.cleanup_old_notification_logs() IS
  'Delete notification logs older than 90 days to reduce database size';

COMMENT ON FUNCTION public.mark_expired_notifications() IS
  'Mark notifications as expired if they are more than 24 hours past scheduled time';
