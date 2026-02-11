-- ============================================================================
-- REPAIR: Ensure chat_sessions table and session_id column exist
-- Issue #194: Chat persistence requires these to work
-- Root cause: Migration 20260121000005 may have partially failed
-- ============================================================================

-- 1. Ensure chat_sessions table exists
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  message_count INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS on chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'chat_sessions_select_own') THEN
    CREATE POLICY "chat_sessions_select_own" ON chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'chat_sessions_insert_own') THEN
    CREATE POLICY "chat_sessions_insert_own" ON chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'chat_sessions_update_own') THEN
    CREATE POLICY "chat_sessions_update_own" ON chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'chat_sessions_delete_own') THEN
    CREATE POLICY "chat_sessions_delete_own" ON chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Ensure session_id column exists on chat_messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
  END IF;
END $$;

-- 4. Indexes on chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;

-- 6. Recreate trigger for session stats (uses tokens_input + tokens_output, not tokens_used)
CREATE OR REPLACE FUNCTION update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE chat_sessions
    SET
      message_count = message_count + 1,
      total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_input, 0) + COALESCE(NEW.tokens_output, 0),
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
