-- =============================================================================
-- Fix: Disable cron jobs that fail continuously due to missing vault secrets
--
-- These jobs reference vault.decrypted_secrets which is not configured,
-- causing them to fail on every scheduled run. Disable them until the
-- vault secrets are properly set up via Supabase Dashboard.
--
-- Re-enable after configuring vault.decrypted_secrets.
-- Rollback: Run the same statements with `active := true`.
-- See: https://github.com/lucasblima/aica/issues/878
-- =============================================================================

-- Lookup jobs by name (not hardcoded IDs) to be environment-safe
DO $$
DECLARE
  _job RECORD;
  _jobs_to_disable TEXT[] := ARRAY[
    'notification-scheduler',
    'telegram-send-notification',
    'credential-health-check',
    'process-action-queue',
    'process-message-queue',
    'process-module-notifications',
    'process-workout-automations'
  ];
  _job_name TEXT;
BEGIN
  FOREACH _job_name IN ARRAY _jobs_to_disable
  LOOP
    SELECT jobid INTO _job FROM cron.job WHERE jobname = _job_name;
    IF FOUND THEN
      PERFORM cron.alter_job(_job.jobid, active := false);
      RAISE NOTICE 'Disabled cron job: % (id=%)', _job_name, _job.jobid;
    ELSE
      RAISE NOTICE 'Cron job not found (skipped): %', _job_name;
    END IF;
  END LOOP;
END $$;
