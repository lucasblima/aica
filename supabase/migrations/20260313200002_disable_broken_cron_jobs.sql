-- =============================================================================
-- Fix: Disable 7 cron jobs that fail continuously due to missing vault secrets
--
-- These jobs reference vault.decrypted_secrets which is not configured,
-- causing them to fail on every scheduled run. Disable them until the
-- vault secrets are properly set up via Supabase Dashboard.
--
-- Re-enable after configuring vault.decrypted_secrets.
-- See: https://github.com/lucasblima/aica/issues/878
-- =============================================================================

-- Job 15: notification-scheduler (runs every 5 minutes)
SELECT cron.alter_job(15, active := false);

-- Job 24: telegram-send-notification (runs every 1 minute!)
SELECT cron.alter_job(24, active := false);

-- Job 25: credential-health-check (runs daily)
SELECT cron.alter_job(25, active := false);

-- Job 26: process-action-queue (runs every 5 minutes)
SELECT cron.alter_job(26, active := false);

-- Job 27: process-message-queue (runs every 5 minutes)
SELECT cron.alter_job(27, active := false);

-- Job 28: process-module-notifications (runs every 2 minutes)
SELECT cron.alter_job(28, active := false);

-- Job 29: process-workout-automations (runs every 5 minutes)
SELECT cron.alter_job(29, active := false);
