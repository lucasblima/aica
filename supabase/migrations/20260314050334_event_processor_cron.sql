-- Event Processor Cron Job
-- Runs event-processor Edge Function every minute to process module_events queue
-- Spec: docs/superpowers/specs/2026-03-13-agent-ecosystem-design.md

SELECT cron.schedule(
  'process-module-events',
  '* * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/event-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  )$$
);
