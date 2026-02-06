# Supabase Session Service for ADK

## Overview

This implementation replaces ADK's `InMemorySessionService` with a production-ready, Supabase-backed session storage system. Sessions now persist across server restarts and support distributed deployments.

## Architecture

### Database Schema

**Table:** `agent_sessions`

| Column       | Type        | Description                                    |
|--------------|-------------|------------------------------------------------|
| `id`         | UUID        | Primary key                                    |
| `session_id` | TEXT        | Unique ADK session identifier                  |
| `user_id`    | UUID        | Foreign key to `auth.users` (RLS enforcement)  |
| `agent_name` | TEXT        | Name of agent (e.g., 'aica_coordinator')       |
| `state`      | JSONB       | Session state with prefix filtering            |
| `messages`   | JSONB       | Full conversation history                      |
| `created_at` | TIMESTAMPTZ | Session creation timestamp                     |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp (auto-updated)     |
| `expires_at` | TIMESTAMPTZ | Expiration date (30 days default)              |

### State Prefix System

The service implements intelligent state filtering based on key prefixes:

| Prefix   | Persisted? | Use Case                                  |
|----------|------------|-------------------------------------------|
| `user:`  | ✅ Yes     | User-specific data (name, preferences)    |
| `app:`   | ✅ Yes     | Application state (current module, etc)   |
| `temp:`  | ❌ No      | Temporary caching (LLM intermediate data) |
| `cache:` | ❌ No      | Short-term cache (API responses)          |
| `_*`     | ❌ No      | Private/internal state (underscore prefix)|

**Example:**

```python
session.state["user:name"] = "Alice"          # ✅ Persisted
session.state["app:current_module"] = "atlas" # ✅ Persisted
session.state["temp:llm_cache"] = {...}       # ❌ Not persisted
session.state["_internal_counter"] = 5        # ❌ Not persisted
```

## Usage

### Basic Usage

```python
from backend.agents.services import SupabaseSessionService

# Initialize service (typically done once in agent.py)
session_service = SupabaseSessionService(ttl_days=30)

# Get or create session
session = await session_service.get_session(
    session_id="user_123_session_1",
    user_id="user-uuid-here",
    agent_name="aica_coordinator"
)

# Modify state (only persistent prefixes will be saved)
session.state["user:timezone"] = "America/Sao_Paulo"
session.state["temp:cache"] = {"data": "..."}  # Won't persist

# Save session (temp: keys filtered out automatically)
await session_service.save_session(
    session,
    user_id="user-uuid-here"
)

# List user's sessions
sessions = await session_service.list_sessions(
    user_id="user-uuid-here",
    agent_name="aica_coordinator"  # Optional filter
)

# Delete session
await session_service.delete_session(
    session_id="user_123_session_1",
    user_id="user-uuid-here"
)
```

### Integrated with Root Agent

The root agent (`agent.py`) automatically uses SupabaseSessionService:

```python
from .services import SupabaseSessionService

session_service = SupabaseSessionService(ttl_days=30)

root_agent = LlmAgent(
    name="aica_coordinator",
    model="gemini-2.5-flash",
    instruction=COORDINATOR_INSTRUCTION,
    sub_agents=[...],
    session_service=session_service,  # ✅ Persistent sessions enabled
)
```

## Session Lifecycle

### 1. Session Creation

```python
# First call creates session in database
session = await session_service.get_session(
    session_id="new_session_id",
    user_id="user-uuid"
)
# Session expires in 30 days by default
```

### 2. Session Restoration

```python
# Subsequent calls restore existing session
session = await session_service.get_session(
    session_id="existing_session_id",
    user_id="user-uuid"
)
# session.state and session.messages are restored
```

### 3. Session Extension

```python
# Extend expiration by 30 more days
new_expiration = await session_service.extend_session_expiration(
    session_id="session_id",
    user_id="user-uuid",
    days=30
)
```

### 4. Automatic Cleanup

```python
# Run periodically via cron job or scheduled task
deleted_count = await session_service.cleanup_expired_sessions()
print(f"Cleaned up {deleted_count} expired sessions")
```

## Security

### Row-Level Security (RLS)

All sessions are protected by RLS policies:

1. **User Isolation:** Users can only access their own sessions
2. **Service Role Bypass:** Backend operations use service role key
3. **Authenticated Access:** Only authenticated users can create sessions

### RLS Policies

```sql
-- Users can only view their own sessions
CREATE POLICY "Users can view own sessions"
    ON agent_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role has full access for backend operations
CREATE POLICY "Service role full access"
    ON agent_sessions FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
```

## Helper Functions

### Cleanup Expired Sessions

```sql
SELECT cleanup_expired_agent_sessions();
-- Returns: number of sessions deleted
```

### Extend Session Expiration

```sql
SELECT extend_agent_session_expiration(
    p_session_id := 'session_id',
    p_user_id := 'user-uuid',
    p_days := 30
);
-- Returns: new expiration timestamp
```

### Get Session Statistics

```sql
SELECT * FROM get_agent_session_stats('user-uuid');
-- Returns: session count, message count, date ranges per agent
```

## Migration Guide

### Apply Database Migration

```bash
# Apply the migration
cd supabase
npx supabase db push

# Or apply manually
psql $DATABASE_URL -f migrations/20260205160808_create_agent_sessions.sql
```

### Verify Migration

```sql
-- Check table exists
SELECT COUNT(*) FROM agent_sessions;

-- Verify RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'agent_sessions';

-- List RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'agent_sessions';
```

### Update Application Code

1. ✅ Import `SupabaseSessionService` in `agent.py`
2. ✅ Initialize service with desired TTL
3. ✅ Pass `session_service` to `LlmAgent` constructor
4. ❌ Remove any `InMemorySessionService` imports (if present)

## Testing

### Manual Test (ADK CLI)

```bash
# Start ADK web interface
cd backend/agents
adk web

# In browser console, create session:
# 1. Send message: "Crie uma tarefa teste"
# 2. Restart server
# 3. Send message: "Quais tarefas eu tenho?"
# Expected: Session restored with conversation history
```

### Python Unit Test

```python
import pytest
from backend.agents.services import SupabaseSessionService

@pytest.mark.asyncio
async def test_session_persistence():
    service = SupabaseSessionService()
    user_id = "test-user-uuid"
    session_id = "test-session-1"

    # Create session
    session = await service.get_session(session_id, user_id)
    session.state["user:name"] = "Test User"
    session.state["temp:cache"] = {"data": "should not persist"}
    await service.save_session(session, user_id)

    # Restore session
    restored = await service.get_session(session_id, user_id)

    assert restored.state["user:name"] == "Test User"
    assert "temp:cache" not in restored.state  # Ephemeral filtered
```

### Database Query Test

```sql
-- Insert test session
INSERT INTO agent_sessions (session_id, user_id, agent_name, state, messages)
VALUES (
    'test-session-1',
    'user-uuid-here',
    'aica_coordinator',
    '{"user:name": "Alice", "temp:cache": "should not persist"}',
    '[{"role": "user", "content": "Hello"}]'
);

-- Verify RLS (should only see own sessions)
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM agent_sessions;

-- Cleanup
DELETE FROM agent_sessions WHERE session_id = 'test-session-1';
```

## Troubleshooting

### Issue: Sessions not persisting

**Symptom:** Session state resets after server restart

**Check:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
2. Confirm migration applied: `SELECT COUNT(*) FROM agent_sessions;`
3. Check logs for errors: `grep "Error saving session" backend.log`

**Solution:**
```bash
# Verify environment variables
python -c "import os; print(os.getenv('SUPABASE_URL'))"

# Re-apply migration if needed
npx supabase db reset --local
npx supabase db push
```

### Issue: RLS blocking access

**Symptom:** `User not authenticated` errors

**Check:**
1. Verify `user_id` is passed to all service methods
2. Confirm service role key is correct (not anon key)
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'agent_sessions';`

**Solution:**
```python
# Always pass user_id
session = await service.get_session(
    session_id="...",
    user_id="USER-UUID-HERE"  # ✅ Required
)
```

### Issue: Expired sessions not cleaning up

**Symptom:** Old sessions accumulate in database

**Setup Cron Job:**
```sql
-- Using pg_cron extension
SELECT cron.schedule(
    'cleanup-expired-sessions',
    '0 2 * * *',  -- Daily at 2 AM
    $$SELECT cleanup_expired_agent_sessions();$$
);
```

**Manual Cleanup:**
```sql
SELECT cleanup_expired_agent_sessions();
```

## Performance Considerations

### Indexes

Three indexes optimize common queries:

```sql
-- Lookup by session_id + user_id (primary access pattern)
idx_agent_sessions_lookup ON (session_id, user_id)

-- List sessions by user (UI display)
idx_agent_sessions_user ON (user_id, created_at DESC)

-- Cleanup expired sessions (cron job)
idx_agent_sessions_expires ON (expires_at)
```

### Query Patterns

**Fast:**
```python
# Indexed lookup
session = await service.get_session(session_id, user_id)
```

**Slow (avoid):**
```python
# Full table scan - don't do this
sessions = await service.list_sessions()  # No user_id filter
```

### JSONB State Size

- **Recommended:** < 100 KB per session
- **Maximum:** 1 MB (PostgreSQL JSONB limit)
- **Optimization:** Filter ephemeral keys, compress large state

## Roadmap

### Future Enhancements

- [ ] **Session Compression:** Gzip large message histories
- [ ] **Incremental Saves:** Only save changed state keys
- [ ] **Session Analytics:** Track usage patterns per agent
- [ ] **Multi-tenant Support:** Partition tables by organization
- [ ] **Redis Cache Layer:** Hot session cache for ultra-low latency

## References

- **ADK SessionService Interface:** [google.adk.sessions](https://google.github.io/adk-docs/sessions/)
- **Migration File:** `supabase/migrations/20260205160808_create_agent_sessions.sql`
- **Implementation:** `backend/agents/services/supabase_session_service.py`
- **Root Agent Integration:** `backend/agents/agent.py`

---

**Maintainers:** Lucas Boscacci Lima + Claude
**Last Updated:** 2026-02-05
**Status:** ✅ Production Ready
