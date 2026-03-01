-- Migration: Telegram Notifications Cron + Callback Handlers
-- Issue #574: Telegram Bot Integration — Phase 2
--
-- Sets up pg_cron job to invoke telegram-send-notification Edge Function every minute.
-- Also adds RPCs to handle notification callback actions (snooze, ack, done, mood).

-- ============================================================================
-- EXTENSION: pg_net (required for http_post from pg_cron)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- INDEX: Telegram notifications lookup (optimized for the cron query)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_telegram_pending
  ON scheduled_notifications(priority ASC, scheduled_for ASC)
  WHERE channel = 'telegram'
    AND status = 'scheduled'
    AND deleted_at IS NULL;

-- ============================================================================
-- CRON JOB: Process Telegram notifications every minute
-- ============================================================================

-- Remove existing job if re-running migration
SELECT cron.unschedule('process-telegram-notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-telegram-notifications'
);

SELECT cron.schedule(
  'process-telegram-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/telegram-send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- RPC: Handle notification snooze (reschedule)
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_telegram_notification_snooze(
  p_notification_id UUID,
  p_snooze_minutes INTEGER
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE scheduled_notifications
  SET
    status = 'scheduled',
    scheduled_for = now() + (p_snooze_minutes || ' minutes')::interval,
    attempts = 0,
    updated_at = now()
  WHERE id = p_notification_id
    AND status = 'sent';
END;
$$;

-- ============================================================================
-- RPC: Mark notification as acknowledged/done
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_telegram_notification_ack(
  p_notification_id UUID,
  p_action TEXT  -- 'done', 'ack'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Log the acknowledgment (update the notification metadata)
  UPDATE scheduled_notifications
  SET
    message_variables = message_variables || jsonb_build_object(
      'ack_action', p_action,
      'ack_at', now()::text
    ),
    updated_at = now()
  WHERE id = p_notification_id;
END;
$$;

-- ============================================================================
-- RPC: Record mood from notification inline keyboard
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_telegram_mood_response(
  p_user_id UUID,
  p_mood_score INTEGER,
  p_notification_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert a quick mood entry into moments (the active mood-tracking table)
  INSERT INTO moments (
    user_id,
    type,
    content,
    emotion,
    sentiment_data,
    tags,
    created_at
  ) VALUES (
    p_user_id,
    'text',
    'Check-in via Telegram',
    CASE p_mood_score
      WHEN 5 THEN 'muito_feliz'
      WHEN 4 THEN 'feliz'
      WHEN 3 THEN 'neutro'
      WHEN 2 THEN 'triste'
      WHEN 1 THEN 'muito_triste'
      ELSE 'neutro'
    END,
    jsonb_build_object(
      'score', p_mood_score::numeric / 5.0,
      'source', 'telegram_checkin',
      'label', CASE p_mood_score
        WHEN 5 THEN 'muito_feliz'
        WHEN 4 THEN 'feliz'
        WHEN 3 THEN 'neutro'
        WHEN 2 THEN 'triste'
        WHEN 1 THEN 'muito_triste'
        ELSE 'neutro'
      END
    ),
    ARRAY['telegram', 'mood_checkin'],
    now()
  );

  -- Mark the notification as acknowledged
  PERFORM handle_telegram_notification_ack(p_notification_id, 'mood_response');
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION handle_telegram_notification_snooze IS
  'Reschedules a sent Telegram notification by the given number of minutes';

COMMENT ON FUNCTION handle_telegram_notification_ack IS
  'Records acknowledgment of a Telegram notification (done, ack)';

COMMENT ON FUNCTION handle_telegram_mood_response IS
  'Records a mood check-in from a Telegram notification inline keyboard';
