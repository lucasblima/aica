-- Migration: Telegram Integration — Phase 1 Base
-- Issue #574: Telegram Bot Integration
--
-- Creates tables for account linking, conversation tracking, and message logging.
-- Follows privacy-first principles: raw text NEVER stored, only intent_summary.
-- Extends scheduled_notifications for multi-channel support.

-- ============================================================================
-- TABLE: user_telegram_links — Account Linking (Telegram ↔ AICA User)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_telegram_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_photo_url TEXT,
  linked_at TIMESTAMPTZ,

  -- Linking flow
  link_code TEXT,                     -- 6-char code for /vincular flow
  code_expires_at TIMESTAMPTZ,       -- Code expiry (10 min)

  -- LGPD consent
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  consent_scope TEXT[] DEFAULT '{}',  -- ['messages', 'notifications', 'ai_processing']

  -- Status
  status TEXT NOT NULL DEFAULT 'unlinked' CHECK (status IN ('active', 'pending', 'paused', 'unlinked')),

  -- Channel preferences
  notification_enabled BOOLEAN DEFAULT TRUE,
  preferred_language TEXT DEFAULT 'pt-BR',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE user_telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own telegram link"
  ON user_telegram_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on telegram links"
  ON user_telegram_links FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE: telegram_conversations — Multi-turn Context for Gemini
-- ============================================================================

CREATE TABLE IF NOT EXISTS telegram_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,

  -- Sliding window context (last N messages for Gemini)
  context JSONB DEFAULT '[]',         -- Array of {role, text, timestamp}
  context_token_count INTEGER DEFAULT 0,

  -- State
  active_flow TEXT,                    -- 'onboarding', 'task_creation', 'expense_log', null
  flow_state JSONB DEFAULT '{}',

  -- Timestamps
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, telegram_chat_id)
);

ALTER TABLE telegram_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own conversations"
  ON telegram_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on telegram conversations"
  ON telegram_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TABLE: telegram_message_log — Reliability Monitoring (Service-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS telegram_message_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_update_id BIGINT,
  telegram_chat_id BIGINT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL,         -- 'text', 'voice', 'command', 'callback'

  -- Content (privacy: store only intent, not raw text)
  intent_summary TEXT,                -- max 200 chars
  command TEXT,                       -- '/start', '/help', etc.

  -- Processing
  processing_status TEXT DEFAULT 'received' CHECK (processing_status IN (
    'received', 'processing', 'completed', 'failed', 'skipped'
  )),
  processing_duration_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- AI metadata
  ai_action TEXT,                     -- Gemini function called
  ai_model TEXT,                      -- 'fast' or 'smart'
  ai_tokens_used INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE telegram_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only on message log"
  ON telegram_message_log FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for monitoring queries
CREATE INDEX idx_telegram_msg_log_status ON telegram_message_log(processing_status, created_at);
CREATE INDEX idx_telegram_msg_log_user ON telegram_message_log(user_id, created_at);
CREATE INDEX idx_telegram_msg_log_chat ON telegram_message_log(telegram_chat_id, created_at);

-- ============================================================================
-- EXTEND: scheduled_notifications — Multi-channel Support
-- ============================================================================

ALTER TABLE scheduled_notifications
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'telegram', 'email', 'push')),
  ADD COLUMN IF NOT EXISTS channel_user_id TEXT;

-- ============================================================================
-- INDEX: Link code lookup for /vincular flow
-- ============================================================================

CREATE INDEX idx_telegram_links_code ON user_telegram_links(link_code)
  WHERE link_code IS NOT NULL AND status = 'pending';

-- ============================================================================
-- RPCs
-- ============================================================================

-- Look up AICA user by Telegram ID
CREATE OR REPLACE FUNCTION get_telegram_user(p_telegram_id BIGINT)
RETURNS TABLE(user_id UUID, telegram_username TEXT, status TEXT, consent_given BOOLEAN)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT user_id, telegram_username, status, consent_given
  FROM user_telegram_links
  WHERE telegram_id = p_telegram_id AND status = 'active';
$$;

-- Look up user by link code (for /vincular flow)
CREATE OR REPLACE FUNCTION get_telegram_link_by_code(p_code TEXT)
RETURNS TABLE(
  id UUID, user_id UUID, link_code TEXT, code_expires_at TIMESTAMPTZ, status TEXT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, user_id, link_code, code_expires_at, status
  FROM user_telegram_links
  WHERE link_code = p_code
    AND status = 'pending'
    AND code_expires_at > now();
$$;

-- Link Telegram account (called after /vincular validation)
CREATE OR REPLACE FUNCTION link_telegram_account(
  p_user_id UUID,
  p_telegram_id BIGINT,
  p_username TEXT,
  p_first_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  UPDATE user_telegram_links
  SET
    telegram_id = p_telegram_id,
    telegram_username = p_username,
    telegram_first_name = p_first_name,
    status = 'active',
    linked_at = now(),
    link_code = NULL,
    code_expires_at = NULL,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO user_telegram_links (
      user_id, telegram_id, telegram_username, telegram_first_name,
      status, linked_at
    )
    VALUES (
      p_user_id, p_telegram_id, p_username, p_first_name,
      'active', now()
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Update conversation context (sliding window of last 20 messages)
CREATE OR REPLACE FUNCTION update_telegram_conversation_context(
  p_user_id UUID,
  p_chat_id BIGINT,
  p_new_messages JSONB
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO telegram_conversations (user_id, telegram_chat_id, context, last_message_at)
  VALUES (p_user_id, p_chat_id, p_new_messages, now())
  ON CONFLICT (user_id, telegram_chat_id) DO UPDATE SET
    context = (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem FROM jsonb_array_elements(
          telegram_conversations.context || p_new_messages
        ) elem
        ORDER BY (elem->>'timestamp')::timestamptz DESC
        LIMIT 20
      ) sub
    ),
    last_message_at = now(),
    updated_at = now();
END;
$$;

-- Grant consent for Telegram usage
CREATE OR REPLACE FUNCTION grant_telegram_consent(
  p_user_id UUID,
  p_scope TEXT[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_telegram_links
  SET
    consent_given = TRUE,
    consent_timestamp = now(),
    consent_scope = p_scope,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
