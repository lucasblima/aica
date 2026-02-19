-- ============================================================================
-- MIGRATION: Add module column to chat_sessions
-- Date: 2026-02-19
--
-- PURPOSE:
-- Add a 'module' column to chat_sessions so each session can be scoped to a
-- specific AICA module (journey, atlas, studio, etc.). NULL = global chat
-- (AicaChatFAB), non-NULL = module-specific chat history.
-- ============================================================================

-- ============================================================================
-- PART 1: ADD MODULE COLUMN (idempotent)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_sessions'
      AND column_name = 'module'
  ) THEN
    ALTER TABLE public.chat_sessions
      ADD COLUMN module VARCHAR(50) DEFAULT NULL;

    COMMENT ON COLUMN public.chat_sessions.module IS
      'AICA module scope: NULL = global chat, ''journey''/''atlas''/''studio''/etc. = module-specific chat';
  END IF;
END;
$$;

-- ============================================================================
-- PART 2: INDEX FOR MODULE-SCOPED QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_chat_sessions_module
  ON chat_sessions(user_id, module)
  WHERE module IS NOT NULL;
