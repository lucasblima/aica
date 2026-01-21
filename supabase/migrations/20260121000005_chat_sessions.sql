-- ============================================================================
-- MIGRATION: Chat Sessions
-- Issue #132: AICA Billing, Rate Limiting & Unified Chat System
-- Date: 2026-01-21
--
-- PURPOSE:
-- Add chat sessions table for organizing conversations
-- ============================================================================

-- ============================================================================
-- PART 1: CHAT SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session info
  title TEXT NOT NULL DEFAULT 'Nova conversa',

  -- Statistics
  message_count INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,

  -- Status
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE chat_sessions IS
  'Chat sessions for organizing Aica conversations';

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_select_own" ON chat_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_insert_own" ON chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_sessions_update_own" ON chat_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_delete_own" ON chat_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
  ON chat_sessions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_pinned
  ON chat_sessions(user_id, is_pinned, updated_at DESC)
  WHERE is_archived = false;

-- ============================================================================
-- PART 2: ADD SESSION_ID TO CHAT_MESSAGES
-- ============================================================================

-- Add session_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE chat_messages
      ADD COLUMN session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session
      ON chat_messages(session_id, created_at);
  END IF;
END;
$$;

-- ============================================================================
-- PART 3: TRIGGER TO UPDATE SESSION STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE chat_sessions
    SET
      message_count = message_count + 1,
      total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
      updated_at = now()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chat_session_stats ON chat_messages;

CREATE TRIGGER trg_update_chat_session_stats
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_stats();

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Get user's active sessions
CREATE OR REPLACE FUNCTION get_active_chat_sessions(p_limit INTEGER DEFAULT 20)
RETURNS SETOF chat_sessions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM chat_sessions
  WHERE user_id = auth.uid()
    AND is_archived = false
  ORDER BY is_pinned DESC, updated_at DESC
  LIMIT p_limit;
$$;

-- Archive old sessions (can be called by cron)
CREATE OR REPLACE FUNCTION archive_old_chat_sessions(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived INTEGER;
BEGIN
  UPDATE chat_sessions
  SET is_archived = true
  WHERE is_archived = false
    AND is_pinned = false
    AND updated_at < now() - (p_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_archived = ROW_COUNT;
  RETURN v_archived;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_chat_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_chat_sessions TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- SELECT * FROM chat_sessions WHERE user_id = auth.uid() LIMIT 5;
-- SELECT * FROM get_active_chat_sessions(10);
