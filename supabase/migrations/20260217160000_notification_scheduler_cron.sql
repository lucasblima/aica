-- Migration: Update notification cron job to use notification-scheduler Edge Function
-- Updates the existing pg_cron job from notification-sender to notification-scheduler

-- ============================================================================
-- Update cron job to call the correct Edge Function name
-- ============================================================================

-- Remove old job pointing to notification-sender (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-notifications') THEN
    PERFORM cron.unschedule('process-scheduled-notifications');
  END IF;
END;
$$;

-- Schedule notification-scheduler every 5 minutes
SELECT cron.schedule(
  'process-scheduled-notifications',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notification-scheduler',
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

-- Update the manual trigger function to call notification-scheduler
CREATE OR REPLACE FUNCTION public.trigger_notification_processing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notification-scheduler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'mode', 'manual',
        'batch_size', 50
      )
    ) INTO result;

  RETURN result;
END;
$$;
