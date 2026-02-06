-- Migration: 20260206000001_proactive_agents_support.sql
-- Description: Add support for proactive agents system (Task #43)
--              - Add 'proactive' category to user_memory
--              - Add is_archived column for memory archival
--              - Add RPC function for session cleanup

-- ============================================================================
-- 1. Update user_memory category constraint to include 'proactive'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE user_memory DROP CONSTRAINT IF EXISTS user_memory_category_check;

-- Add updated constraint with 'proactive' category
ALTER TABLE user_memory
ADD CONSTRAINT user_memory_category_check
CHECK (category IN ('profile', 'preference', 'fact', 'insight', 'pattern', 'proactive'));

-- ============================================================================
-- 2. Add is_archived column for memory archival
-- ============================================================================

ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create index for archived filtering
CREATE INDEX IF NOT EXISTS idx_user_memory_archived
ON user_memory(is_archived)
WHERE is_archived = FALSE;

-- Update documentation
COMMENT ON COLUMN user_memory.is_archived IS
  'Whether this memory has been archived (old/low-priority memories)';

-- ============================================================================
-- 3. Create cleanup RPC function for expired sessions
-- ============================================================================

-- Drop if exists (for idempotency)
DROP FUNCTION IF EXISTS cleanup_expired_agent_sessions();

CREATE OR REPLACE FUNCTION cleanup_expired_agent_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all expired sessions
  WITH deleted AS (
    DELETE FROM agent_sessions
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION cleanup_expired_agent_sessions IS
  'Deletes all expired agent sessions. Called by proactive session_cleanup agent. Returns count of deleted sessions.';

-- ============================================================================
-- 4. Create function to extend session expiration
-- ============================================================================

-- Drop if exists (for idempotency)
DROP FUNCTION IF EXISTS extend_agent_session_expiration(TEXT, UUID, INTEGER);

CREATE OR REPLACE FUNCTION extend_agent_session_expiration(
  p_session_id TEXT,
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  new_expiration TIMESTAMPTZ;
BEGIN
  new_expiration := NOW() + (p_days || ' days')::INTERVAL;

  UPDATE agent_sessions
  SET expires_at = new_expiration,
      updated_at = NOW()
  WHERE session_id = p_session_id
    AND user_id = p_user_id;

  RETURN new_expiration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION extend_agent_session_expiration IS
  'Extends the expiration date of an agent session by specified days.';

-- ============================================================================
-- 5. Create index for proactive session ID pattern
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_sessions_proactive
ON agent_sessions(session_id)
WHERE session_id LIKE 'proactive_%';

-- ============================================================================
-- 6. Add source value for proactive agents
-- ============================================================================

-- Update source constraint to include proactive sources
-- First, check if the constraint exists
DO $$
BEGIN
  -- Try to drop the existing constraint
  ALTER TABLE user_memory DROP CONSTRAINT IF EXISTS user_memory_source_check;

  -- Add updated constraint
  ALTER TABLE user_memory
  ADD CONSTRAINT user_memory_source_check
  CHECK (source IN ('explicit', 'inferred', 'observed', 'proactive_trigger', 'proactive_morning_briefing', 'proactive_deadline_watcher', 'proactive_pattern_analyzer', 'proactive_session_cleanup'));

EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or can't be dropped, try adding without drop
    NULL;
END $$;

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION cleanup_expired_agent_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION extend_agent_session_expiration(TEXT, UUID, INTEGER) TO service_role;

-- ============================================================================
-- 8. Documentation
-- ============================================================================

COMMENT ON TABLE agent_sessions IS
  'Stores agent conversation sessions with persistent state. Used by interactive agents and proactive agents (proactive_* session IDs).';
