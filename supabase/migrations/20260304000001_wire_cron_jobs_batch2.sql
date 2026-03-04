-- Migration: Wire 5 Edge Functions to pg_cron schedules (Batch 2)
--
-- Schedules the following Edge Functions via pg_cron + pg_net:
--   1. credential-health-check    — Daily at midnight UTC
--   2. process-action-queue       — Every 5 minutes
--   3. process-message-queue      — Every 5 minutes
--   4. process-module-notifications — Every 2 minutes
--   5. process-workout-automations — Every 5 minutes

-- ============================================================================
-- EXTENSION: pg_net (required for http_post from pg_cron)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- JOB 1: credential-health-check — Daily at midnight UTC
-- ============================================================================

SELECT cron.unschedule('check-credential-health')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-credential-health'
);

SELECT cron.schedule(
  'check-credential-health',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/credential-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- check-credential-health: Runs credential-health-check Edge Function daily at midnight UTC

-- ============================================================================
-- JOB 2: process-action-queue — Every 5 minutes
-- ============================================================================

SELECT cron.unschedule('process-action-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-action-queue'
);

SELECT cron.schedule(
  'process-action-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/process-action-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- process-action-queue: Processes pending action queue items every 5 minutes

-- ============================================================================
-- JOB 3: process-message-queue — Every 5 minutes
-- ============================================================================

SELECT cron.unschedule('process-message-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-message-queue'
);

SELECT cron.schedule(
  'process-message-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/process-message-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- process-message-queue: Processes pending message queue items every 5 minutes

-- ============================================================================
-- JOB 4: process-module-notifications — Every 2 minutes
-- ============================================================================

SELECT cron.unschedule('process-module-notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-module-notifications'
);

SELECT cron.schedule(
  'process-module-notifications',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/process-module-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- process-module-notifications: Processes cross-module notifications every 2 minutes

-- ============================================================================
-- JOB 5: process-workout-automations — Every 5 minutes
-- ============================================================================

SELECT cron.unschedule('process-workout-automations')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-workout-automations'
);

SELECT cron.schedule(
  'process-workout-automations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/process-workout-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- process-workout-automations: Processes Flux workout automations every 5 minutes
