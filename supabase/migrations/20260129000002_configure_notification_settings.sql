-- Migration: Configure Notification Scheduler Settings
-- Issue #173: Notification Scheduler System
--
-- IMPORTANT: This migration requires manual configuration after running
-- Replace placeholders with actual values in Supabase Dashboard

-- ============================================================================
-- STEP 1: Enable http extension (required for net.http_post)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- STEP 2: Configure database settings for CRON jobs
-- ============================================================================

-- Note: These ALTER DATABASE commands need to be executed with proper permissions
-- You may need to run these manually via Supabase Dashboard or psql

-- IMPORTANT: Replace these values with actual credentials
-- DO NOT COMMIT ACTUAL SECRETS TO GIT

-- Template (uncomment and replace values):
/*
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uzywajqzbdbrfammshdg.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
*/

-- ============================================================================
-- STEP 3: Grant permissions for net.http_post
-- ============================================================================

-- Grant usage on pg_net schema to postgres role
GRANT USAGE ON SCHEMA net TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA net TO postgres;

-- ============================================================================
-- STEP 4: Create helper function to test configuration
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_notification_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_check jsonb;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Try to get configuration
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    supabase_url := NULL;
    service_role_key := NULL;
  END;

  -- Build status object
  config_check := jsonb_build_object(
    'supabase_url_configured', (supabase_url IS NOT NULL),
    'service_role_key_configured', (service_role_key IS NOT NULL),
    'pg_cron_installed', (
      SELECT COUNT(*) > 0
      FROM pg_extension
      WHERE extname = 'pg_cron'
    ),
    'http_extension_installed', (
      SELECT COUNT(*) > 0
      FROM pg_extension
      WHERE extname = 'http'
    ),
    'cron_job_exists', (
      SELECT COUNT(*) > 0
      FROM cron.job
      WHERE jobname = 'process-scheduled-notifications'
    ),
    'test_timestamp', now()
  );

  RETURN config_check;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_notification_config() TO authenticated;

COMMENT ON FUNCTION public.test_notification_config() IS
  'Test if notification scheduler configuration is complete';

-- ============================================================================
-- STEP 5: Create manual setup instructions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_setup_instructions (
  id SERIAL PRIMARY KEY,
  step_number INTEGER NOT NULL,
  step_title TEXT NOT NULL,
  step_description TEXT NOT NULL,
  sql_command TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO notification_setup_instructions (step_number, step_title, step_description, sql_command)
VALUES
  (1, 'Enable Extensions', 'Enable required PostgreSQL extensions (pg_cron, http, pg_net)', 'SELECT test_notification_config();'),
  (2, 'Configure Supabase URL', 'Set database parameter for Supabase project URL', 'ALTER DATABASE postgres SET app.settings.supabase_url = ''https://uzywajqzbdbrfammshdg.supabase.co'';'),
  (3, 'Configure Service Role Key', 'Set database parameter for service role key (get from Supabase Dashboard)', 'ALTER DATABASE postgres SET app.settings.service_role_key = ''YOUR_SERVICE_ROLE_KEY'';'),
  (4, 'Verify CRON Job', 'Check that CRON job is scheduled', 'SELECT * FROM cron.job WHERE jobname = ''process-scheduled-notifications'';'),
  (5, 'Test Manual Processing', 'Manually trigger notification processing', 'SELECT trigger_notification_processing();'),
  (6, 'Verify Edge Function', 'Check that notification-sender Edge Function is deployed', NULL);

-- ============================================================================
-- STEP 6: Create view to check system health
-- ============================================================================

CREATE OR REPLACE VIEW notification_system_health AS
SELECT
  -- Configuration
  (SELECT test_notification_config()) AS config_status,

  -- CRON jobs
  (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%notification%') AS cron_jobs_count,

  -- Pending notifications
  (SELECT COUNT(*) FROM scheduled_notifications WHERE status = 'scheduled' AND scheduled_for <= now()) AS pending_notifications,

  -- Recent failures
  (SELECT COUNT(*) FROM notification_log WHERE status = 'failed' AND created_at > now() - INTERVAL '1 hour') AS recent_failures,

  -- Last successful send
  (SELECT MAX(completed_at) FROM notification_log WHERE status = 'success') AS last_successful_send,

  -- Success rate (last 24h)
  (
    SELECT
      CASE
        WHEN COUNT(*) FILTER (WHERE status IN ('success', 'failed')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE status = 'success')::numeric /
          COUNT(*) FILTER (WHERE status IN ('success', 'failed'))::numeric * 100,
          2
        )
        ELSE NULL
      END
    FROM notification_log
    WHERE created_at > now() - INTERVAL '24 hours'
  ) AS success_rate_24h;

COMMENT ON VIEW notification_system_health IS
  'Overall health status of notification scheduler system';

-- ============================================================================
-- STEP 7: Create admin function to check configuration
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_notification_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(nsh.*)
  INTO result
  FROM notification_system_health nsh;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notification_system_status() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notification_setup_instructions IS
  'Step-by-step setup instructions for notification scheduler system';

COMMENT ON FUNCTION public.get_notification_system_status() IS
  'Get comprehensive status of notification scheduler system including health metrics';

-- ============================================================================
-- POST-MIGRATION INSTRUCTIONS
-- ============================================================================

-- After running this migration, execute the following in Supabase SQL Editor:

-- 1. Check configuration status:
SELECT test_notification_config();

-- 2. If supabase_url or service_role_key is not configured, run:
/*
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uzywajqzbdbrfammshdg.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
*/

-- 3. Verify system health:
SELECT * FROM notification_system_health;

-- 4. Check CRON jobs:
SELECT * FROM cron.job WHERE jobname LIKE '%notification%';

-- 5. Test manual processing:
SELECT trigger_notification_processing();

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If CRON jobs are not running:
-- 1. Check pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Check CRON job configuration
SELECT * FROM cron.job;

-- 3. Check CRON job history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- If Edge Function is not responding:
-- 1. Check Edge Function logs in Supabase Dashboard
-- 2. Verify environment variables are set in Edge Functions → Secrets
-- 3. Test Edge Function manually:
/*
curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/notification-sender \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"mode": "auto", "batch_size": 10}'
*/
