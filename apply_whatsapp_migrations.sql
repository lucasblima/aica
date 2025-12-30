-- Migration: WhatsApp Messages - Core table for Evolution API integration
-- Issue #12: WhatsApp Integration via Evolution API
--
-- This migration creates the main table for storing WhatsApp messages
-- with support for different message types (text, audio, image, document)

-- ============================================================================
-- TABLE: whatsapp_messages
-- ============================================================================
-- Primary table for all incoming/outgoing WhatsApp messages

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference (owner of the WhatsApp connection)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Evolution API identifiers
  instance_name TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,  -- Evolution API message ID

  -- Contact information
  remote_jid TEXT NOT NULL,  -- WhatsApp ID (5521965564006@s.whatsapp.net)
  contact_name TEXT,  -- Push name from WhatsApp
  contact_phone TEXT NOT NULL,  -- Normalized phone (5521965564006)

  -- Message direction and type
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document', 'sticker', 'location', 'contact', 'reaction')),

  -- Content fields
  content_text TEXT,  -- Text content or caption
  content_transcription TEXT,  -- Audio transcription via Gemini
  content_ocr TEXT,  -- Image OCR text via Gemini

  -- Media information
  media_url TEXT,  -- Supabase Storage URL
  media_mimetype TEXT,
  media_filename TEXT,
  media_size_bytes INTEGER,
  media_duration_seconds INTEGER,  -- For audio/video

  -- AI Analysis
  sentiment_score DECIMAL(4,3) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_label TEXT CHECK (sentiment_label IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
  detected_intent TEXT,  -- e.g., 'question', 'complaint', 'gratitude', 'request', 'information'
  detected_topics TEXT[],  -- Array of topics/tags

  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  processing_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Timestamps
  message_timestamp TIMESTAMPTZ NOT NULL,  -- Original WhatsApp timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Soft delete for LGPD compliance
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_timestamp
  ON whatsapp_messages(user_id, message_timestamp DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_contact
  ON whatsapp_messages(user_id, contact_phone, message_timestamp DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance
  ON whatsapp_messages(instance_name, message_timestamp DESC);

-- Processing queue
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processing
  ON whatsapp_messages(processing_status, created_at)
  WHERE processing_status IN ('pending', 'processing');

-- Search by content
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_content_gin
  ON whatsapp_messages USING gin(to_tsvector('portuguese', COALESCE(content_text, '') || ' ' || COALESCE(content_transcription, '')));

-- Direction and type filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction_type
  ON whatsapp_messages(user_id, direction, message_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own whatsapp messages"
  ON whatsapp_messages
  FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Users can soft-delete their own messages (LGPD right to erasure)
CREATE POLICY "Users can delete own whatsapp messages"
  ON whatsapp_messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND deleted_at IS NOT NULL
    AND deletion_reason IS NOT NULL
  );

-- Service role bypasses RLS for webhook processing

-- ============================================================================
-- TABLE: whatsapp_conversations
-- ============================================================================
-- Aggregated view of conversations per contact

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,

  -- Conversation stats
  total_messages INTEGER DEFAULT 0,
  messages_incoming INTEGER DEFAULT 0,
  messages_outgoing INTEGER DEFAULT 0,

  -- Sentiment tracking
  average_sentiment DECIMAL(4,3),
  last_sentiment_label TEXT,

  -- Timestamps
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_incoming_at TIMESTAMPTZ,
  last_outgoing_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint
  CONSTRAINT unique_user_contact UNIQUE(user_id, contact_phone)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user
  ON whatsapp_conversations(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_sentiment
  ON whatsapp_conversations(user_id, average_sentiment);

-- RLS
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON whatsapp_conversations
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTION: Update conversation stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whatsapp_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO whatsapp_conversations (
    user_id,
    contact_phone,
    contact_name,
    total_messages,
    messages_incoming,
    messages_outgoing,
    average_sentiment,
    last_sentiment_label,
    first_message_at,
    last_message_at,
    last_incoming_at,
    last_outgoing_at
  )
  VALUES (
    NEW.user_id,
    NEW.contact_phone,
    NEW.contact_name,
    1,
    CASE WHEN NEW.direction = 'incoming' THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 'outgoing' THEN 1 ELSE 0 END,
    NEW.sentiment_score,
    NEW.sentiment_label,
    NEW.message_timestamp,
    NEW.message_timestamp,
    CASE WHEN NEW.direction = 'incoming' THEN NEW.message_timestamp ELSE NULL END,
    CASE WHEN NEW.direction = 'outgoing' THEN NEW.message_timestamp ELSE NULL END
  )
  ON CONFLICT (user_id, contact_phone) DO UPDATE SET
    contact_name = COALESCE(NEW.contact_name, whatsapp_conversations.contact_name),
    total_messages = whatsapp_conversations.total_messages + 1,
    messages_incoming = whatsapp_conversations.messages_incoming + CASE WHEN NEW.direction = 'incoming' THEN 1 ELSE 0 END,
    messages_outgoing = whatsapp_conversations.messages_outgoing + CASE WHEN NEW.direction = 'outgoing' THEN 1 ELSE 0 END,
    average_sentiment = CASE
      WHEN NEW.sentiment_score IS NOT NULL THEN
        (COALESCE(whatsapp_conversations.average_sentiment, 0) * whatsapp_conversations.total_messages + NEW.sentiment_score) / (whatsapp_conversations.total_messages + 1)
      ELSE whatsapp_conversations.average_sentiment
    END,
    last_sentiment_label = COALESCE(NEW.sentiment_label, whatsapp_conversations.last_sentiment_label),
    last_message_at = NEW.message_timestamp,
    last_incoming_at = CASE WHEN NEW.direction = 'incoming' THEN NEW.message_timestamp ELSE whatsapp_conversations.last_incoming_at END,
    last_outgoing_at = CASE WHEN NEW.direction = 'outgoing' THEN NEW.message_timestamp ELSE whatsapp_conversations.last_outgoing_at END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_stats ON whatsapp_messages;
CREATE TRIGGER trigger_update_conversation_stats
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION update_whatsapp_conversation_stats();

-- ============================================================================
-- FUNCTION: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whatsapp_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER trigger_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_messages_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_messages IS 'Stores all WhatsApp messages received/sent via Evolution API integration';
COMMENT ON TABLE whatsapp_conversations IS 'Aggregated conversation stats per contact for quick access';

COMMENT ON COLUMN whatsapp_messages.message_id IS 'Unique message ID from Evolution API for deduplication';
COMMENT ON COLUMN whatsapp_messages.remote_jid IS 'Full WhatsApp JID (phone@s.whatsapp.net or group@g.us)';
COMMENT ON COLUMN whatsapp_messages.content_transcription IS 'Audio transcription generated by Gemini API';
COMMENT ON COLUMN whatsapp_messages.content_ocr IS 'Text extracted from images via Gemini Vision OCR';
COMMENT ON COLUMN whatsapp_messages.processing_status IS 'Status of AI processing pipeline (sentiment, transcription, etc)';
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
-- Migration: LGPD Consent Records for WhatsApp Integration
-- Issue #12: WhatsApp Integration via Evolution API
--
-- This migration creates the consent management system for LGPD compliance
-- including opt-in/opt-out tracking and data processing consent

-- ============================================================================
-- TABLE: whatsapp_consent_records
-- ============================================================================
-- Tracks user consent for WhatsApp data processing (LGPD compliance)

CREATE TABLE IF NOT EXISTS whatsapp_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contact who gave consent (may be different from user)
  contact_phone TEXT NOT NULL,
  contact_name TEXT,

  -- Consent details
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'data_collection',  -- Permission to collect message data
    'ai_processing',  -- Permission to process with AI
    'sentiment_analysis',  -- Permission for sentiment analysis
    'notifications',  -- Permission to send notifications
    'data_retention',  -- Permission for extended data retention
    'third_party_sharing'  -- Permission to share with third parties (future)
  )),

  -- Consent status
  status TEXT NOT NULL CHECK (status IN ('granted', 'revoked', 'pending')),

  -- How consent was obtained
  consent_method TEXT NOT NULL CHECK (consent_method IN (
    'whatsapp_keyword',  -- Via keyword like "ACEITO"
    'web_form',  -- Via web interface
    'api',  -- Via API call
    'verbal',  -- Recorded verbal consent
    'implied'  -- Implied from continued use (with notice)
  )),

  -- Evidence
  consent_message TEXT,  -- Original message if via WhatsApp
  consent_ip_address TEXT,  -- IP if via web
  consent_user_agent TEXT,  -- Browser/device info if via web

  -- Legal basis (LGPD Article 7)
  legal_basis TEXT CHECK (legal_basis IN (
    'consent',  -- Explicit consent (Art. 7, I)
    'legitimate_interest',  -- Legitimate interest (Art. 7, IX)
    'contract_execution',  -- Contract execution (Art. 7, V)
    'legal_obligation'  -- Legal obligation (Art. 7, II)
  )),

  -- Timestamps
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,  -- Optional expiration

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Version tracking (for consent policy changes)
  policy_version TEXT DEFAULT '1.0',

  -- Unique constraint per user/contact/consent_type
  CONSTRAINT unique_consent_record UNIQUE(user_id, contact_phone, consent_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_consent_records_user
  ON whatsapp_consent_records(user_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_records_contact
  ON whatsapp_consent_records(contact_phone, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_records_status
  ON whatsapp_consent_records(status, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_records_expiration
  ON whatsapp_consent_records(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'granted';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE whatsapp_consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent records"
  ON whatsapp_consent_records
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage consent via service"
  ON whatsapp_consent_records
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABLE: whatsapp_opt_keywords
-- ============================================================================
-- Keywords for opt-in/opt-out via WhatsApp

CREATE TABLE IF NOT EXISTS whatsapp_opt_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  keyword TEXT NOT NULL,
  keyword_normalized TEXT NOT NULL,  -- Lowercase, trimmed
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  consent_type TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',

  -- Response message
  response_message TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_keyword UNIQUE(keyword_normalized, language)
);

-- Default keywords
INSERT INTO whatsapp_opt_keywords (keyword, keyword_normalized, action, consent_type, response_message, language)
VALUES
  -- Portuguese opt-in keywords
  ('ACEITO', 'aceito', 'opt_in', 'data_collection', 'Obrigado! Seu consentimento foi registrado. Voce pode revogar a qualquer momento enviando CANCELAR.', 'pt-BR'),
  ('SIM', 'sim', 'opt_in', 'data_collection', 'Perfeito! Consentimento registrado. Para cancelar, envie CANCELAR.', 'pt-BR'),
  ('CONCORDO', 'concordo', 'opt_in', 'data_collection', 'Consentimento registrado com sucesso! Envie CANCELAR para revogar.', 'pt-BR'),
  ('ATIVAR', 'ativar', 'opt_in', 'notifications', 'Notificacoes ativadas! Envie DESATIVAR para parar de receber.', 'pt-BR'),

  -- Portuguese opt-out keywords
  ('CANCELAR', 'cancelar', 'opt_out', 'data_collection', 'Seu consentimento foi revogado. Seus dados serao removidos em ate 72 horas conforme LGPD.', 'pt-BR'),
  ('PARAR', 'parar', 'opt_out', 'notifications', 'Notificacoes desativadas. Envie ATIVAR para reativar.', 'pt-BR'),
  ('SAIR', 'sair', 'opt_out', 'data_collection', 'Consentimento revogado. Seus dados serao removidos conforme LGPD.', 'pt-BR'),
  ('DESATIVAR', 'desativar', 'opt_out', 'notifications', 'Notificacoes desativadas com sucesso.', 'pt-BR'),
  ('NAO', 'nao', 'opt_out', 'data_collection', 'Entendido. Nenhum dado sera coletado.', 'pt-BR'),

  -- English opt-in keywords
  ('ACCEPT', 'accept', 'opt_in', 'data_collection', 'Thank you! Your consent has been recorded. Send STOP to revoke.', 'en'),
  ('YES', 'yes', 'opt_in', 'data_collection', 'Consent recorded. Send STOP to opt out.', 'en'),

  -- English opt-out keywords
  ('STOP', 'stop', 'opt_out', 'data_collection', 'Your consent has been revoked. Data will be deleted within 72 hours per LGPD.', 'en'),
  ('CANCEL', 'cancel', 'opt_out', 'data_collection', 'Consent revoked. Your data will be removed.', 'en'),
  ('NO', 'no', 'opt_out', 'data_collection', 'Understood. No data will be collected.', 'en')
ON CONFLICT (keyword_normalized, language) DO NOTHING;

-- Index for keyword lookup
CREATE INDEX IF NOT EXISTS idx_opt_keywords_lookup
  ON whatsapp_opt_keywords(keyword_normalized, language, is_active);

-- ============================================================================
-- TABLE: data_deletion_requests
-- ============================================================================
-- Tracks LGPD data deletion requests

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT,  -- If deletion is for a specific contact

  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN (
    'full_deletion',  -- Delete all data
    'partial_deletion',  -- Delete specific data types
    'anonymization',  -- Anonymize instead of delete
    'export'  -- Export before deletion
  )),

  data_types_requested TEXT[],  -- e.g., ['messages', 'media', 'analytics']

  -- Processing
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),

  -- Execution details
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- What was deleted
  deletion_summary JSONB,  -- e.g., {"messages": 150, "media_files": 25, "bytes_freed": 52428800}

  -- Audit
  requested_via TEXT NOT NULL CHECK (requested_via IN ('whatsapp', 'web', 'api', 'support')),
  request_ip TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user
  ON data_deletion_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_pending
  ON data_deletion_requests(scheduled_for)
  WHERE status = 'pending';

-- RLS
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTION: Check consent status
-- ============================================================================

CREATE OR REPLACE FUNCTION check_whatsapp_consent(
  p_user_id UUID,
  p_contact_phone TEXT,
  p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  consent_status TEXT;
BEGIN
  SELECT status INTO consent_status
  FROM whatsapp_consent_records
  WHERE user_id = p_user_id
    AND contact_phone = p_contact_phone
    AND consent_type = p_consent_type
    AND (expires_at IS NULL OR expires_at > now());

  RETURN COALESCE(consent_status = 'granted', false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Record consent from keyword
-- ============================================================================

CREATE OR REPLACE FUNCTION process_consent_keyword(
  p_user_id UUID,
  p_contact_phone TEXT,
  p_message TEXT,
  p_language TEXT DEFAULT 'pt-BR'
)
RETURNS TABLE(
  matched BOOLEAN,
  action TEXT,
  consent_type TEXT,
  response_message TEXT
) AS $$
DECLARE
  keyword_record RECORD;
  normalized_message TEXT;
BEGIN
  -- Normalize message
  normalized_message := lower(trim(p_message));

  -- Look for matching keyword
  SELECT * INTO keyword_record
  FROM whatsapp_opt_keywords
  WHERE keyword_normalized = normalized_message
    AND (language = p_language OR language = 'pt-BR')
    AND is_active = true
  LIMIT 1;

  IF keyword_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Process the consent
  IF keyword_record.action = 'opt_in' THEN
    INSERT INTO whatsapp_consent_records (
      user_id, contact_phone, consent_type, status,
      consent_method, consent_message, legal_basis, granted_at
    )
    VALUES (
      p_user_id, p_contact_phone, keyword_record.consent_type, 'granted',
      'whatsapp_keyword', p_message, 'consent', now()
    )
    ON CONFLICT (user_id, contact_phone, consent_type) DO UPDATE SET
      status = 'granted',
      granted_at = now(),
      revoked_at = NULL,
      consent_message = p_message,
      updated_at = now();
  ELSE
    UPDATE whatsapp_consent_records
    SET status = 'revoked',
        revoked_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id
      AND contact_phone = p_contact_phone
      AND consent_type = keyword_record.consent_type;

    -- Also create deletion request for data_collection opt-out
    IF keyword_record.consent_type = 'data_collection' THEN
      INSERT INTO data_deletion_requests (
        user_id, contact_phone, request_type, data_types_requested, requested_via
      )
      VALUES (
        p_user_id, p_contact_phone, 'partial_deletion',
        ARRAY['messages', 'media'], 'whatsapp'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT
    true,
    keyword_record.action,
    keyword_record.consent_type,
    keyword_record.response_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Execute data deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_data_deletion(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  req RECORD;
  deleted_counts JSONB := '{}';
  msg_count INTEGER;
  media_count INTEGER;
BEGIN
  SELECT * INTO req FROM data_deletion_requests WHERE id = p_request_id;

  IF req IS NULL THEN
    RAISE EXCEPTION 'Deletion request not found';
  END IF;

  IF req.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not in pending status';
  END IF;

  -- Update status
  UPDATE data_deletion_requests
  SET status = 'processing', started_at = now(), updated_at = now()
  WHERE id = p_request_id;

  -- Delete messages
  IF req.contact_phone IS NOT NULL THEN
    -- Delete specific contact's data
    UPDATE whatsapp_messages
    SET deleted_at = now(), deletion_reason = 'lgpd_request'
    WHERE user_id = req.user_id AND contact_phone = req.contact_phone;

    GET DIAGNOSTICS msg_count = ROW_COUNT;
  ELSE
    -- Delete all user's data
    UPDATE whatsapp_messages
    SET deleted_at = now(), deletion_reason = 'lgpd_request'
    WHERE user_id = req.user_id;

    GET DIAGNOSTICS msg_count = ROW_COUNT;
  END IF;

  deleted_counts := jsonb_build_object('messages', msg_count);

  -- Update completion
  UPDATE data_deletion_requests
  SET status = 'completed',
      completed_at = now(),
      deletion_summary = deleted_counts,
      updated_at = now()
  WHERE id = p_request_id;

  RETURN deleted_counts;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON JOB: Process pending deletion requests
-- ============================================================================

SELECT cron.schedule(
  'process-lgpd-deletion-requests',
  '0 */6 * * *',  -- Every 6 hours
  $$
  SELECT execute_data_deletion(id)
  FROM data_deletion_requests
  WHERE status = 'pending'
    AND scheduled_for <= now()
  LIMIT 10
  $$
);

-- ============================================================================
-- CRON JOB: Expire old consent records
-- ============================================================================

SELECT cron.schedule(
  'expire-whatsapp-consent',
  '0 3 * * *',  -- Daily at 3 AM
  $$
  UPDATE whatsapp_consent_records
  SET status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND status = 'granted'
  $$
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_consent_records IS 'LGPD compliant consent tracking for WhatsApp data processing';
COMMENT ON TABLE whatsapp_opt_keywords IS 'Keywords for opt-in/opt-out via WhatsApp messages';
COMMENT ON TABLE data_deletion_requests IS 'LGPD right to erasure request tracking';

COMMENT ON FUNCTION check_whatsapp_consent IS 'Check if user has valid consent for specific data processing';
COMMENT ON FUNCTION process_consent_keyword IS 'Process opt-in/opt-out keywords from WhatsApp messages';
COMMENT ON FUNCTION execute_data_deletion IS 'Execute LGPD data deletion request';
-- Migration: WhatsApp Media Storage Bucket
-- Issue #12: WhatsApp Integration via Evolution API
--
-- This migration creates the Storage bucket for WhatsApp media files
-- with appropriate security policies and retention settings

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

-- Create the whatsapp-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  false,  -- Private bucket
  52428800,  -- 50MB max file size
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    -- Audio
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/opus',
    'audio/aac',
    'audio/wav',
    -- Video
    'video/mp4',
    'video/3gpp',
    'video/webm',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Policy: Users can view their own media files
CREATE POLICY "Users can view own whatsapp media"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Service role can upload (for webhook processing)
-- Note: Service role bypasses RLS by default

-- Policy: Users can delete their own media (LGPD)
CREATE POLICY "Users can delete own whatsapp media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- TABLE: whatsapp_media_metadata
-- ============================================================================
-- Additional metadata for media files stored in the bucket

CREATE TABLE IF NOT EXISTS whatsapp_media_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,

  -- Storage info
  storage_path TEXT NOT NULL UNIQUE,  -- Path in bucket: {user_id}/{date}/{filename}
  original_url TEXT,  -- Original Evolution API media URL (temporary)

  -- File info
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT,  -- SHA-256 for deduplication

  -- Media type specific
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video', 'document', 'sticker')),
  duration_seconds INTEGER,  -- For audio/video
  dimensions JSONB,  -- For images/video: {"width": 1920, "height": 1080}

  -- Processing
  transcription TEXT,  -- Audio transcription
  ocr_text TEXT,  -- Image OCR result
  thumbnail_path TEXT,  -- Path to thumbnail if generated
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  processing_error TEXT,

  -- Retention
  retention_days INTEGER DEFAULT 30,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_metadata_user
  ON whatsapp_media_metadata(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_metadata_message
  ON whatsapp_media_metadata(message_id);

CREATE INDEX IF NOT EXISTS idx_media_metadata_processing
  ON whatsapp_media_metadata(processing_status, created_at)
  WHERE processing_status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_media_metadata_expiration
  ON whatsapp_media_metadata(expires_at)
  WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_metadata_hash
  ON whatsapp_media_metadata(file_hash)
  WHERE file_hash IS NOT NULL;

-- RLS
ALTER TABLE whatsapp_media_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media metadata"
  ON whatsapp_media_metadata
  FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- ============================================================================
-- FUNCTION: Generate storage path
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_whatsapp_media_path(
  p_user_id UUID,
  p_filename TEXT,
  p_media_type TEXT
)
RETURNS TEXT AS $$
DECLARE
  date_folder TEXT;
  safe_filename TEXT;
  unique_id TEXT;
BEGIN
  -- Date folder format: YYYY/MM/DD
  date_folder := to_char(now(), 'YYYY/MM/DD');

  -- Sanitize filename
  safe_filename := regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');

  -- Generate unique ID
  unique_id := substr(gen_random_uuid()::text, 1, 8);

  -- Return path: {user_id}/{media_type}/{date}/{unique_id}_{filename}
  RETURN format('%s/%s/%s/%s_%s',
    p_user_id,
    p_media_type,
    date_folder,
    unique_id,
    safe_filename
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Set media expiration
-- ============================================================================

CREATE OR REPLACE FUNCTION set_media_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.retention_days IS NOT NULL AND NEW.retention_days > 0 THEN
    NEW.expires_at := NEW.created_at + (NEW.retention_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_media_expiration ON whatsapp_media_metadata;
CREATE TRIGGER trigger_set_media_expiration
  BEFORE INSERT ON whatsapp_media_metadata
  FOR EACH ROW
  EXECUTE FUNCTION set_media_expiration();

-- ============================================================================
-- FUNCTION: Cleanup expired media
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_whatsapp_media()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  media_record RECORD;
BEGIN
  FOR media_record IN
    SELECT id, storage_path, thumbnail_path
    FROM whatsapp_media_metadata
    WHERE expires_at IS NOT NULL
      AND expires_at < now()
      AND deleted_at IS NULL
    LIMIT 100
  LOOP
    -- Mark as deleted (actual file deletion should be done by Edge Function)
    UPDATE whatsapp_media_metadata
    SET deleted_at = now(), updated_at = now()
    WHERE id = media_record.id;

    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON JOB: Cleanup expired media
-- ============================================================================

SELECT cron.schedule(
  'cleanup-expired-whatsapp-media',
  '0 4 * * *',  -- Daily at 4 AM
  $$SELECT cleanup_expired_whatsapp_media()$$
);

-- ============================================================================
-- VIEW: Media statistics per user
-- ============================================================================

CREATE OR REPLACE VIEW whatsapp_media_stats AS
SELECT
  user_id,
  media_type,
  COUNT(*) as file_count,
  SUM(file_size_bytes) as total_bytes,
  AVG(file_size_bytes) as avg_file_size,
  COUNT(*) FILTER (WHERE processing_status = 'completed') as processed_count,
  COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
  MIN(created_at) as first_upload,
  MAX(created_at) as last_upload
FROM whatsapp_media_metadata
WHERE deleted_at IS NULL
GROUP BY user_id, media_type;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_media_metadata IS 'Metadata for WhatsApp media files stored in Supabase Storage';
COMMENT ON FUNCTION generate_whatsapp_media_path IS 'Generates unique storage path for WhatsApp media files';
COMMENT ON FUNCTION cleanup_expired_whatsapp_media IS 'Marks expired media files as deleted based on retention policy';
COMMENT ON VIEW whatsapp_media_stats IS 'Aggregated statistics of WhatsApp media per user';
