-- Migration: Scheduled Notifications for WhatsApp
-- Issue #12: WhatsApp Integration via Evolution API
--
-- This migration creates the notification scheduling system
-- with support for recurring notifications and rate limiting

-- ============================================================================
-- ENABLE pgmq EXTENSION (message queue)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgmq;

-- ============================================================================
-- TABLE: scheduled_notifications
-- ============================================================================
-- Main table for scheduling WhatsApp notifications

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Target information
  target_phone TEXT NOT NULL,  -- Phone number to send to
  target_name TEXT,  -- Optional display name

  -- Notification content
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'reminder',  -- Task/event reminders
    'daily_report',  -- Daily summary reports
    'weekly_summary',  -- Weekly emotional summaries
    'custom',  -- User-defined notifications
    'system',  -- System notifications
    'follow_up'  -- Conversation follow-ups
  )),

  message_template TEXT NOT NULL,  -- Message template with {{variables}}
  message_variables JSONB DEFAULT '{}',  -- Variables to replace in template

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

  -- Recurrence (optional)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN (
    'daily', 'weekly', 'monthly', 'weekdays', 'weekends', 'custom'
  )),
  recurrence_config JSONB,  -- e.g., {"days": [1,3,5], "time": "09:00"}
  recurrence_end_date DATE,

  -- Execution tracking
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',  -- Waiting to be sent
    'queued',  -- Added to pgmq queue
    'sending',  -- Currently being processed
    'sent',  -- Successfully sent
    'failed',  -- Failed to send
    'cancelled',  -- Cancelled by user
    'expired'  -- Past schedule without sending
  )),

  -- Execution details
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  evolution_message_id TEXT,  -- ID returned by Evolution API

  -- Priority and grouping
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),  -- 1 = highest
  notification_group TEXT,  -- For grouping related notifications

  -- Rate limiting metadata
  rate_limit_key TEXT,  -- For rate limiting per user/phone

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Main query: get pending notifications to process
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending
  ON scheduled_notifications(scheduled_for, priority)
  WHERE status = 'scheduled' AND deleted_at IS NULL;

-- User's notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user
  ON scheduled_notifications(user_id, scheduled_for DESC)
  WHERE deleted_at IS NULL;

-- Rate limiting
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_rate_limit
  ON scheduled_notifications(rate_limit_key, scheduled_for)
  WHERE status IN ('scheduled', 'queued', 'sending');

-- Recurring notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_recurring
  ON scheduled_notifications(is_recurring, recurrence_pattern)
  WHERE is_recurring = true AND deleted_at IS NULL;

-- Status tracking
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status
  ON scheduled_notifications(status, last_attempt_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own scheduled notifications"
  ON scheduled_notifications
  FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Users can create their own notifications
CREATE POLICY "Users can create scheduled notifications"
  ON scheduled_notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own notifications (cancel, reschedule)
CREATE POLICY "Users can update own scheduled notifications"
  ON scheduled_notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABLE: notification_templates
-- ============================================================================
-- Pre-defined notification templates

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  template_key TEXT NOT NULL UNIQUE,  -- e.g., 'daily_morning_motivation'
  template_name TEXT NOT NULL,
  template_description TEXT,

  -- Content
  message_template TEXT NOT NULL,
  required_variables TEXT[],  -- List of required {{variables}}
  sample_variables JSONB,  -- Example values for preview

  -- Configuration
  notification_type TEXT NOT NULL,
  default_priority INTEGER DEFAULT 5,
  is_system BOOLEAN DEFAULT false,  -- System templates can't be edited

  -- Ownership (NULL for system templates)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_key
  ON notification_templates(template_key);

CREATE INDEX IF NOT EXISTS idx_notification_templates_user
  ON notification_templates(user_id)
  WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and system templates"
  ON notification_templates
  FOR SELECT
  USING (user_id = auth.uid() OR is_system = true);

CREATE POLICY "Users can manage own templates"
  ON notification_templates
  FOR ALL
  USING (user_id = auth.uid() AND is_system = false)
  WITH CHECK (user_id = auth.uid() AND is_system = false);

-- ============================================================================
-- TABLE: notification_log
-- ============================================================================
-- Detailed log of all notification attempts

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  notification_id UUID REFERENCES scheduled_notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Target
  target_phone TEXT NOT NULL,

  -- Execution details
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited', 'invalid_phone')),
  error_message TEXT,
  error_code TEXT,

  -- Evolution API response
  evolution_response JSONB,
  evolution_message_id TEXT,

  -- Performance metrics
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_notification
  ON notification_log(notification_id, attempt_number);

CREATE INDEX IF NOT EXISTS idx_notification_log_user
  ON notification_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_status
  ON notification_log(status, created_at DESC);

-- RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON notification_log
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- PGMQ QUEUE SETUP
-- ============================================================================

-- Create the notification queue
SELECT pgmq.create('whatsapp_notifications');

-- ============================================================================
-- FUNCTION: Enqueue notification
-- ============================================================================

CREATE OR REPLACE FUNCTION enqueue_notification(notification_id UUID)
RETURNS BIGINT AS $$
DECLARE
  msg_id BIGINT;
  notif RECORD;
BEGIN
  -- Get notification details
  SELECT * INTO notif FROM scheduled_notifications WHERE id = notification_id;

  IF notif IS NULL THEN
    RAISE EXCEPTION 'Notification not found: %', notification_id;
  END IF;

  IF notif.status != 'scheduled' THEN
    RAISE EXCEPTION 'Notification is not in scheduled status: %', notif.status;
  END IF;

  -- Enqueue to pgmq
  SELECT pgmq.send(
    'whatsapp_notifications',
    jsonb_build_object(
      'notification_id', notification_id,
      'user_id', notif.user_id,
      'target_phone', notif.target_phone,
      'message_template', notif.message_template,
      'message_variables', notif.message_variables,
      'priority', notif.priority,
      'attempt', notif.attempts + 1
    )
  ) INTO msg_id;

  -- Update notification status
  UPDATE scheduled_notifications
  SET status = 'queued', updated_at = now()
  WHERE id = notification_id;

  RETURN msg_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Process due notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION process_due_notifications()
RETURNS INTEGER AS $$
DECLARE
  notif RECORD;
  processed INTEGER := 0;
BEGIN
  -- Find all due notifications
  FOR notif IN
    SELECT id
    FROM scheduled_notifications
    WHERE status = 'scheduled'
      AND scheduled_for <= now()
      AND deleted_at IS NULL
      AND attempts < max_attempts
    ORDER BY priority ASC, scheduled_for ASC
    LIMIT 100  -- Process in batches
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM enqueue_notification(notif.id);
    processed := processed + 1;
  END LOOP;

  RETURN processed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Create next recurring notification
-- ============================================================================

CREATE OR REPLACE FUNCTION create_next_recurring_notification(notification_id UUID)
RETURNS UUID AS $$
DECLARE
  original RECORD;
  next_schedule TIMESTAMPTZ;
  new_id UUID;
BEGIN
  SELECT * INTO original FROM scheduled_notifications WHERE id = notification_id;

  IF original IS NULL OR NOT original.is_recurring THEN
    RETURN NULL;
  END IF;

  -- Calculate next schedule based on pattern
  next_schedule := CASE original.recurrence_pattern
    WHEN 'daily' THEN original.scheduled_for + INTERVAL '1 day'
    WHEN 'weekly' THEN original.scheduled_for + INTERVAL '1 week'
    WHEN 'monthly' THEN original.scheduled_for + INTERVAL '1 month'
    WHEN 'weekdays' THEN
      CASE EXTRACT(DOW FROM original.scheduled_for)
        WHEN 5 THEN original.scheduled_for + INTERVAL '3 days'  -- Friday -> Monday
        WHEN 6 THEN original.scheduled_for + INTERVAL '2 days'  -- Saturday -> Monday
        ELSE original.scheduled_for + INTERVAL '1 day'
      END
    WHEN 'weekends' THEN
      CASE EXTRACT(DOW FROM original.scheduled_for)
        WHEN 0 THEN original.scheduled_for + INTERVAL '6 days'  -- Sunday -> Saturday
        WHEN 6 THEN original.scheduled_for + INTERVAL '1 day'   -- Saturday -> Sunday
        ELSE original.scheduled_for + INTERVAL '1 day'
      END
    ELSE original.scheduled_for + INTERVAL '1 day'
  END;

  -- Check if next schedule is within recurrence end date
  IF original.recurrence_end_date IS NOT NULL AND next_schedule::DATE > original.recurrence_end_date THEN
    RETURN NULL;
  END IF;

  -- Create new notification
  INSERT INTO scheduled_notifications (
    user_id, target_phone, target_name, notification_type,
    message_template, message_variables, scheduled_for, timezone,
    is_recurring, recurrence_pattern, recurrence_config, recurrence_end_date,
    priority, notification_group, rate_limit_key
  )
  SELECT
    user_id, target_phone, target_name, notification_type,
    message_template, message_variables, next_schedule, timezone,
    is_recurring, recurrence_pattern, recurrence_config, recurrence_end_date,
    priority, notification_group, rate_limit_key
  FROM scheduled_notifications
  WHERE id = notification_id
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON JOB: Process scheduled notifications
-- ============================================================================

SELECT cron.schedule(
  'process-whatsapp-notifications',
  '* * * * *',  -- Every minute
  $$SELECT process_due_notifications()$$
);

-- ============================================================================
-- DEFAULT TEMPLATES
-- ============================================================================

INSERT INTO notification_templates (template_key, template_name, template_description, message_template, required_variables, notification_type, is_system)
VALUES
  ('daily_morning_motivation', 'Motivacao Matinal', 'Mensagem motivacional para comecar o dia', 'Bom dia, {{name}}! Lembre-se: cada dia e uma nova oportunidade. Voce tem {{pending_tasks}} tarefas para hoje. Vamos la!', ARRAY['name', 'pending_tasks'], 'daily_report', true),
  ('task_reminder', 'Lembrete de Tarefa', 'Lembrete para tarefa especifica', 'Oi {{name}}, lembrete: "{{task_title}}" esta agendado para {{task_time}}. Nao esqueca!', ARRAY['name', 'task_title', 'task_time'], 'reminder', true),
  ('weekly_summary', 'Resumo Semanal', 'Resumo emocional da semana', 'Oi {{name}}! Seu resumo da semana:\n\nHumor predominante: {{mood}}\nMomentos registrados: {{moments_count}}\n\n{{insight}}', ARRAY['name', 'mood', 'moments_count', 'insight'], 'weekly_summary', true),
  ('follow_up_check', 'Check-in de Acompanhamento', 'Verificacao apos conversa importante', 'Oi {{name}}, como voce esta se sentindo apos nossa conversa sobre {{topic}}? Estou aqui se precisar.', ARRAY['name', 'topic'], 'follow_up', true)
ON CONFLICT (template_key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scheduled_notifications IS 'WhatsApp notifications scheduled for future delivery with support for recurring notifications';
COMMENT ON TABLE notification_templates IS 'Pre-defined message templates for notifications';
COMMENT ON TABLE notification_log IS 'Detailed log of all notification delivery attempts';

COMMENT ON FUNCTION enqueue_notification IS 'Adds a scheduled notification to the pgmq queue for processing';
COMMENT ON FUNCTION process_due_notifications IS 'Processes all notifications that are due for sending';
COMMENT ON FUNCTION create_next_recurring_notification IS 'Creates the next occurrence of a recurring notification';
