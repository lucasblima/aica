-- Migration: Setup Proactive Agent Cron Jobs
-- Task #43: Configure pg_cron triggers for proactive agents
--
-- This migration sets up pg_cron jobs to automatically trigger proactive agents:
-- 1. morning_briefing - Daily at 7:00 AM (São Paulo time)
-- 2. deadline_watcher - Every 6 hours
-- 3. pattern_analyzer - Weekly on Sunday at 21:00
-- 4. session_cleanup - Daily at 3:00 AM
--
-- All jobs call the proactive-trigger Edge Function with the x-proactive-secret header
--
-- IMPORTANT: Requires app.settings.proactive_secret to be configured:
-- ALTER DATABASE postgres SET app.settings.proactive_secret = 'your-secret-here';

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- SETTINGS VALIDATION
-- ============================================================================

-- Create a helper function to validate required settings exist
CREATE OR REPLACE FUNCTION validate_proactive_settings()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if required settings exist
  PERFORM current_setting('app.settings.supabase_url', true);
  PERFORM current_setting('app.settings.proactive_secret', true);

  RETURN true;
EXCEPTION
  WHEN undefined_object THEN
    RAISE WARNING 'Required app settings not configured. Please set:';
    RAISE WARNING '  ALTER DATABASE postgres SET app.settings.supabase_url = ''https://uzywajqzbdbrfammshdg.supabase.co'';';
    RAISE WARNING '  ALTER DATABASE postgres SET app.settings.proactive_secret = ''your-secret-here'';';
    RETURN false;
END;
$$;

-- Validate settings (shows warnings but doesn't block migration)
SELECT validate_proactive_settings();

-- ============================================================================
-- HELPER FUNCTION: Call proactive-trigger Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION call_proactive_agent(
  agent_name TEXT,
  target_user_id TEXT DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  response_id bigint;
BEGIN
  -- Call the proactive-trigger Edge Function
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/proactive-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-proactive-secret', current_setting('app.settings.proactive_secret', true)
      ),
      body := jsonb_build_object(
        'agent_name', agent_name,
        'user_id', target_user_id
      )
    ) INTO response_id;

  -- Return the response
  RETURN jsonb_build_object(
    'agent_name', agent_name,
    'user_id', target_user_id,
    'request_id', response_id,
    'triggered_at', now()
  );
EXCEPTION
  WHEN undefined_object THEN
    RAISE WARNING 'Settings not configured for proactive agents. Agent % not triggered.', agent_name;
    RETURN jsonb_build_object(
      'error', 'settings_not_configured',
      'agent_name', agent_name
    );
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger proactive agent %: %', agent_name, SQLERRM;
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'agent_name', agent_name
    );
END;
$$;

COMMENT ON FUNCTION call_proactive_agent(TEXT, TEXT) IS
  'Helper function to call the proactive-trigger Edge Function for a specific agent';

-- ============================================================================
-- CRON JOB 1: Morning Briefing (Daily at 7:00 AM São Paulo time)
-- ============================================================================
-- São Paulo (UTC-3): 7:00 AM = 10:00 AM UTC

-- Remove existing job if it exists
SELECT cron.unschedule('proactive-morning-briefing')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'proactive-morning-briefing'
);

SELECT cron.schedule(
  'proactive-morning-briefing',
  '0 10 * * *',  -- 7 AM São Paulo = 10 AM UTC (Triggers morning briefing agent daily for all active users)
  $$SELECT call_proactive_agent('morning_briefing', 'all')$$
);

-- ============================================================================
-- CRON JOB 2: Deadline Watcher (Every 6 hours)
-- ============================================================================

-- Remove existing job if it exists
SELECT cron.unschedule('proactive-deadline-watcher')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'proactive-deadline-watcher'
);

SELECT cron.schedule(
  'proactive-deadline-watcher',
  '0 */6 * * *',  -- Every 6 hours (Triggers deadline watcher agent to monitor upcoming deadlines)
  $$SELECT call_proactive_agent('deadline_watcher', 'all')$$
);

-- ============================================================================
-- CRON JOB 3: Pattern Analyzer (Weekly on Sunday at 21:00 São Paulo time)
-- ============================================================================
-- São Paulo (UTC-3): Sunday 21:00 = Monday 00:00 UTC

-- Remove existing job if it exists
SELECT cron.unschedule('proactive-pattern-analyzer')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'proactive-pattern-analyzer'
);

SELECT cron.schedule(
  'proactive-pattern-analyzer',
  '0 0 * * 1',  -- Sunday 21:00 São Paulo = Monday 00:00 UTC (Triggers pattern analyzer weekly)
  $$SELECT call_proactive_agent('pattern_analyzer', 'all')$$
);

-- ============================================================================
-- CRON JOB 4: Session Cleanup (Daily at 3:00 AM São Paulo time)
-- ============================================================================
-- São Paulo (UTC-3): 3:00 AM = 6:00 AM UTC

-- Remove existing job if it exists
SELECT cron.unschedule('proactive-session-cleanup')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'proactive-session-cleanup'
);

SELECT cron.schedule(
  'proactive-session-cleanup',
  '0 6 * * *',  -- 3 AM São Paulo = 6 AM UTC (Triggers session cleanup agent daily for system-level cleanup)
  $$SELECT call_proactive_agent('session_cleanup', 'system')$$
);

-- ============================================================================
-- HELPER FUNCTION: Get Proactive Cron Jobs Status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_proactive_cron_status()
RETURNS TABLE(
  jobname TEXT,
  schedule TEXT,
  command TEXT,
  description TEXT
) AS $$
SELECT
  j.jobname,
  j.schedule,
  j.command,
  obj_description(('cron.job'::regclass), 'cron job') as description
FROM cron.job j
WHERE j.database = current_database()
  AND j.jobname LIKE 'proactive-%'
ORDER BY j.jobname;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION get_proactive_cron_status IS
  'Returns the status and schedule of all proactive agent cron jobs';

-- ============================================================================
-- HELPER FUNCTION: Manual Trigger for Testing
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_proactive_agent_manually(
  agent_name TEXT,
  target_user_id TEXT DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate agent_name
  IF agent_name NOT IN ('morning_briefing', 'deadline_watcher', 'pattern_analyzer', 'session_cleanup') THEN
    RAISE EXCEPTION 'Invalid agent_name. Must be one of: morning_briefing, deadline_watcher, pattern_analyzer, session_cleanup';
  END IF;

  -- Validate user access (only service role or specific users can trigger)
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper = true
  ) AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only authenticated users or service role can manually trigger agents';
  END IF;

  -- Call the agent
  result := call_proactive_agent(agent_name, target_user_id);

  RETURN result;
END;
$$;

-- Grant execute to authenticated users (for testing)
GRANT EXECUTE ON FUNCTION trigger_proactive_agent_manually(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION trigger_proactive_agent_manually(TEXT, TEXT) IS
  'Manually trigger a proactive agent for testing. Requires authentication.';

-- ============================================================================
-- VIEW: Proactive Agent Execution History (from cron logs)
-- ============================================================================

CREATE OR REPLACE VIEW proactive_agent_execution_history AS
SELECT
  jr.jobid,
  j.jobname,
  jr.runid,
  jr.job_pid,
  jr.database,
  jr.username,
  jr.command,
  jr.status,
  jr.return_message,
  jr.start_time,
  jr.end_time,
  EXTRACT(EPOCH FROM (jr.end_time - jr.start_time)) AS duration_seconds
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.jobid
WHERE j.jobname LIKE 'proactive-%'
  AND j.database = current_database()
ORDER BY jr.start_time DESC
LIMIT 100;

COMMENT ON VIEW proactive_agent_execution_history IS
  'Shows the last 100 executions of proactive agent cron jobs with timing and status';

-- ============================================================================
-- NOTES AND USAGE EXAMPLES
-- ============================================================================

-- Configuration (run via Supabase Dashboard or CLI):
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uzywajqzbdbrfammshdg.supabase.co';
-- ALTER DATABASE postgres SET app.settings.proactive_secret = 'your-proactive-trigger-secret-here';

-- View all proactive cron jobs:
-- SELECT * FROM get_proactive_cron_status();

-- View recent execution history:
-- SELECT * FROM proactive_agent_execution_history;

-- Manually trigger an agent for testing:
-- SELECT trigger_proactive_agent_manually('morning_briefing', 'specific-user-id');
-- SELECT trigger_proactive_agent_manually('deadline_watcher', 'all');

-- Force run a specific cron job immediately:
-- SELECT cron.force_run('proactive-morning-briefing');

-- Unschedule a job (if needed):
-- SELECT cron.unschedule('proactive-morning-briefing');

-- Monitor cron job execution (detailed logs):
-- SELECT * FROM cron.job_run_details
-- WHERE jobname LIKE 'proactive-%'
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Check if settings are configured:
-- SELECT
--   current_setting('app.settings.supabase_url', true) AS supabase_url,
--   CASE
--     WHEN current_setting('app.settings.proactive_secret', true) IS NOT NULL
--     THEN '[CONFIGURED]'
--     ELSE '[NOT CONFIGURED]'
--   END AS proactive_secret_status;
