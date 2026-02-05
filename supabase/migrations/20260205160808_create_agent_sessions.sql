-- =============================================================================
-- Migration: Create agent_sessions table for ADK session persistence
-- Issue #34: Replace InMemorySessionService with Supabase-backed storage
-- =============================================================================

-- =============================================================================
-- PART 1: CREATE agent_sessions TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,  -- ADK session identifier
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_name TEXT NOT NULL DEFAULT 'aica_coordinator',
    state JSONB DEFAULT '{}',  -- Session state with prefixes (user:, app:, temp:)
    messages JSONB DEFAULT '[]',  -- Message history
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

COMMENT ON TABLE agent_sessions IS
'Persistent storage for ADK agent sessions. Replaces InMemorySessionService for production use.';

COMMENT ON COLUMN agent_sessions.session_id IS
'Unique ADK session identifier. Used for session lookups and resumption.';

COMMENT ON COLUMN agent_sessions.state IS
'Session state object. Supports prefixes: user: (persisted), app: (persisted), temp: (ephemeral, not persisted).';

COMMENT ON COLUMN agent_sessions.messages IS
'Full conversation message history for session continuity.';

COMMENT ON COLUMN agent_sessions.expires_at IS
'Automatic session expiration (30 days default). Used by cleanup jobs.';

-- =============================================================================
-- PART 2: CREATE INDEXES
-- =============================================================================

-- Primary lookup pattern: session_id + user_id for security
CREATE INDEX IF NOT EXISTS idx_agent_sessions_lookup
    ON agent_sessions(session_id, user_id);

-- List sessions by user (for UI display)
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user
    ON agent_sessions(user_id, created_at DESC);

-- Cleanup job: find expired sessions
CREATE INDEX IF NOT EXISTS idx_agent_sessions_expires
    ON agent_sessions(expires_at)
    WHERE expires_at IS NOT NULL;

-- =============================================================================
-- PART 3: ENABLE ROW-LEVEL SECURITY
-- =============================================================================

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
    ON agent_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON agent_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON agent_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON agent_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Service role has full access for backend operations
CREATE POLICY "Service role full access"
    ON agent_sessions FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- =============================================================================
-- PART 4: CREATE TRIGGER FOR updated_at
-- =============================================================================

-- Drop existing trigger if exists (idempotent)
DROP TRIGGER IF EXISTS update_agent_sessions_updated_at ON agent_sessions;

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_agent_sessions_updated_at
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_agent_sessions_updated_at ON agent_sessions IS
'Auto-updates updated_at timestamp on every session modification.';

-- =============================================================================
-- PART 5: CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_agent_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _deleted_count INTEGER;
BEGIN
    DELETE FROM agent_sessions
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS _deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleaned up % expired agent sessions', _deleted_count;
    RETURN _deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_agent_sessions IS
'Deletes sessions past their expiration date. Run via pg_cron or scheduled job.';

-- Function to extend session expiration
CREATE OR REPLACE FUNCTION extend_agent_session_expiration(
    p_session_id TEXT,
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _new_expiration TIMESTAMPTZ;
BEGIN
    UPDATE agent_sessions
    SET expires_at = NOW() + (p_days || ' days')::INTERVAL
    WHERE session_id = p_session_id
      AND user_id = p_user_id
    RETURNING expires_at INTO _new_expiration;

    IF _new_expiration IS NULL THEN
        RAISE EXCEPTION 'Session not found or unauthorized';
    END IF;

    RETURN _new_expiration;
END;
$$;

COMMENT ON FUNCTION extend_agent_session_expiration IS
'Extends session expiration by specified days (default 30). Requires user_id for security.';

-- Function to get session count by agent
CREATE OR REPLACE FUNCTION get_agent_session_stats(p_user_id UUID)
RETURNS TABLE(
    agent_name TEXT,
    session_count BIGINT,
    total_messages BIGINT,
    oldest_session TIMESTAMPTZ,
    newest_session TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        agent_name,
        COUNT(*) as session_count,
        SUM(jsonb_array_length(messages)) as total_messages,
        MIN(created_at) as oldest_session,
        MAX(created_at) as newest_session
    FROM agent_sessions
    WHERE user_id = p_user_id
    GROUP BY agent_name
    ORDER BY session_count DESC;
$$;

COMMENT ON FUNCTION get_agent_session_stats IS
'Returns session usage statistics grouped by agent for a specific user.';

-- =============================================================================
-- PART 6: GRANT PERMISSIONS
-- =============================================================================

-- Service role needs full access for backend operations
GRANT ALL ON agent_sessions TO service_role;

-- Authenticated users can manage their own sessions via RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_sessions TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION cleanup_expired_agent_sessions TO service_role;
GRANT EXECUTE ON FUNCTION extend_agent_session_expiration TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_agent_session_stats TO authenticated, service_role;

-- =============================================================================
-- PART 7: ENABLE REALTIME (OPTIONAL)
-- =============================================================================

-- Enable realtime subscriptions for session updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'agent_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE agent_sessions;
        RAISE NOTICE 'Added agent_sessions to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'agent_sessions already in supabase_realtime publication';
    END IF;
END $$;

-- =============================================================================
-- PART 8: VERIFICATION
-- =============================================================================

DO $$
DECLARE
    _table_exists BOOLEAN;
    _rls_enabled BOOLEAN;
    _policy_count INTEGER;
BEGIN
    -- Verify table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'agent_sessions'
    ) INTO _table_exists;

    IF NOT _table_exists THEN
        RAISE EXCEPTION 'Table agent_sessions not created';
    END IF;

    -- Verify RLS is enabled
    SELECT relrowsecurity
    INTO _rls_enabled
    FROM pg_class
    WHERE relname = 'agent_sessions';

    IF NOT _rls_enabled THEN
        RAISE EXCEPTION 'RLS not enabled on agent_sessions';
    END IF;

    -- Count policies (should have at least 5: 4 user policies + 1 service role)
    SELECT COUNT(*) INTO _policy_count
    FROM pg_policies
    WHERE tablename = 'agent_sessions';

    IF _policy_count < 5 THEN
        RAISE WARNING 'Expected at least 5 RLS policies, found %', _policy_count;
    END IF;

    RAISE NOTICE '=== Migration 20260205160808_create_agent_sessions completed ===';
    RAISE NOTICE '- Created agent_sessions table with proper constraints';
    RAISE NOTICE '- Enabled RLS with % policies', _policy_count;
    RAISE NOTICE '- Created 3 indexes for efficient lookups';
    RAISE NOTICE '- Created 3 helper functions (cleanup, extend, stats)';
    RAISE NOTICE '- Enabled realtime subscriptions';
    RAISE NOTICE 'Next step: Implement SupabaseSessionService in Python';
END $$;
