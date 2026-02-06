# Task #34 Validation Checklist

Run these checks to verify the implementation is complete and working.

## ✅ 1. File Existence Check

```bash
# Migration file
ls -lh supabase/migrations/20260205160808_create_agent_sessions.sql
# Expected: ~9.5KB SQL file

# Service implementation
ls -lh backend/agents/services/supabase_session_service.py
# Expected: ~13KB Python file

# Test suite
ls -lh backend/agents/services/test_supabase_session_service.py
# Expected: ~12KB Python file

# Documentation
ls -lh backend/agents/SUPABASE_SESSION_SERVICE_README.md
ls -lh backend/agents/TASK_34_IMPLEMENTATION_SUMMARY.md
```

## ✅ 2. Migration Syntax Check

```bash
# Validate SQL syntax (local Supabase)
cd supabase
npx supabase db diff

# Should show:
# - create_agent_sessions migration detected
# - No syntax errors
```

## ✅ 3. Python Import Check

```bash
# Test Python imports
cd backend/agents
python -c "from services import SupabaseSessionService; print('✓ Import successful')"

# Expected output: ✓ Import successful
```

## ✅ 4. Environment Variables Check

```bash
# Verify required variables
python -c "import os; print('SUPABASE_URL:', os.getenv('SUPABASE_URL')[:30] if os.getenv('SUPABASE_URL') else 'MISSING')"
python -c "import os; print('SUPABASE_SERVICE_KEY:', 'SET' if os.getenv('SUPABASE_SERVICE_KEY') else 'MISSING')"

# Expected:
# SUPABASE_URL: https://uzywajqzbdbrfammshdg...
# SUPABASE_SERVICE_KEY: SET
```

## ✅ 5. Apply Migration (Local)

```bash
cd supabase
npx supabase db push

# Expected output:
# ✓ Migration 20260205160808_create_agent_sessions applied
```

## ✅ 6. Verify Migration Applied

```sql
-- Connect to Supabase (via psql or Supabase dashboard)

-- Check table exists
SELECT COUNT(*) FROM agent_sessions;
-- Expected: 0 (table exists, no rows yet)

-- Verify RLS enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'agent_sessions';
-- Expected: agent_sessions | t

-- List RLS policies
SELECT policyname FROM pg_policies
WHERE tablename = 'agent_sessions';
-- Expected: 5 policies
-- - Users can view own sessions
-- - Users can insert own sessions
-- - Users can update own sessions
-- - Users can delete own sessions
-- - Service role full access

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'agent_sessions';
-- Expected: 3 indexes
-- - agent_sessions_pkey
-- - idx_agent_sessions_lookup
-- - idx_agent_sessions_user
-- - idx_agent_sessions_expires

-- Check helper functions
SELECT proname FROM pg_proc
WHERE proname LIKE '%agent_session%';
-- Expected:
-- - cleanup_expired_agent_sessions
-- - extend_agent_session_expiration
-- - get_agent_session_stats
```

## ✅ 7. Run Unit Tests

```bash
cd backend/agents

# Run all tests
pytest services/test_supabase_session_service.py -v

# Expected output:
# test_create_new_session PASSED
# test_save_and_restore_session PASSED
# test_ephemeral_state_filtering PASSED
# test_message_history_persistence PASSED
# test_list_sessions PASSED
# test_extend_session_expiration PASSED
# test_delete_session PASSED
# test_cleanup_expired_sessions PASSED
# test_session_without_user_id PASSED
# ========== 9 passed ==========
```

## ✅ 8. Manual Integration Test

```bash
# Start ADK web interface
cd backend/agents
adk web

# In browser (http://localhost:8000):
# Step 1: Create session
User: "Crie uma tarefa chamada 'Test Session Persistence'"
Expected: Task created successfully

# Step 2: Add state
User: "Qual o meu nome?"
Expected: Session state empty, asks for name

# Step 3: Save state
User: "Meu nome é Lucas"
Expected: State saved

# Step 4: Restart server (Ctrl+C in terminal, then run 'adk web' again)

# Step 5: Verify persistence
User: "Qual o meu nome?"
Expected: "Seu nome é Lucas" (session restored from Supabase)

# Step 6: Verify task persisted
User: "Quais tarefas eu tenho?"
Expected: "Test Session Persistence" task listed
```

## ✅ 9. Database Query Test

```sql
-- After manual integration test above:

-- View created session
SELECT session_id, agent_name, created_at, updated_at
FROM agent_sessions
ORDER BY created_at DESC
LIMIT 1;

-- View session state
SELECT state FROM agent_sessions
WHERE session_id = (
    SELECT session_id FROM agent_sessions
    ORDER BY created_at DESC LIMIT 1
);
-- Expected: JSON with "user:name": "Lucas"

-- View session messages
SELECT jsonb_array_length(messages) as message_count
FROM agent_sessions
WHERE session_id = (
    SELECT session_id FROM agent_sessions
    ORDER BY created_at DESC LIMIT 1
);
-- Expected: message_count > 0
```

## ✅ 10. Performance Test

```sql
-- Test index performance
EXPLAIN ANALYZE
SELECT * FROM agent_sessions
WHERE session_id = 'test-session-id'
  AND user_id = 'user-uuid-here';

-- Expected: "Index Scan using idx_agent_sessions_lookup"
-- Execution time: < 5ms

-- Test user sessions list
EXPLAIN ANALYZE
SELECT session_id, agent_name, created_at
FROM agent_sessions
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: "Index Scan using idx_agent_sessions_user"
-- Execution time: < 10ms
```

## ✅ 11. Security Test

```sql
-- Test RLS enforcement
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-a-uuid';

-- Should only see user A's sessions
SELECT COUNT(*) FROM agent_sessions;

-- Try to access another user's session (should fail)
SELECT * FROM agent_sessions
WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows (RLS blocks access)

-- Reset role
RESET ROLE;
```

## ✅ 12. Helper Functions Test

```sql
-- Test cleanup function
SELECT cleanup_expired_agent_sessions();
-- Expected: Returns count (0 if no expired sessions)

-- Test extend expiration
SELECT extend_agent_session_expiration(
    p_session_id := 'your-session-id-here',
    p_user_id := 'your-user-uuid-here',
    p_days := 60
);
-- Expected: Returns new expiration timestamp

-- Test session stats
SELECT * FROM get_agent_session_stats('your-user-uuid-here');
-- Expected: Returns stats per agent
```

## ✅ 13. State Prefix Filtering Test

```python
# Run in Python console
import asyncio
from backend.agents.services import SupabaseSessionService

async def test_filtering():
    service = SupabaseSessionService()
    session_id = "test-filter"
    user_id = "test-user-uuid"

    # Create session with mixed state
    session = await service.get_session(session_id, user_id)
    session.state["user:name"] = "Alice"
    session.state["temp:cache"] = "should not persist"
    await service.save_session(session, user_id)

    # Restore and verify
    restored = await service.get_session(session_id, user_id)

    print(f"✓ user:name persisted: {'user:name' in restored.state}")
    print(f"✓ temp:cache filtered: {'temp:cache' not in restored.state}")

    # Cleanup
    await service.delete_session(session_id, user_id)

asyncio.run(test_filtering())

# Expected output:
# ✓ user:name persisted: True
# ✓ temp:cache filtered: True
```

## ✅ 14. Agent Integration Test

```python
# Test root_agent has session_service configured
import os
os.environ["GOOGLE_API_KEY"] = "test-key-not-needed-for-this-check"
os.environ["SUPABASE_URL"] = "https://uzywajqzbdbrfammshdg.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-key"

from backend.agents.agent import root_agent

print(f"✓ Root agent has session_service: {hasattr(root_agent, 'session_service')}")
print(f"✓ Session service type: {type(root_agent.session_service).__name__}")

# Expected output:
# ✓ Root agent has session_service: True
# ✓ Session service type: SupabaseSessionService
```

## ✅ 15. Documentation Check

```bash
# Verify all documentation files exist and are complete
wc -l backend/agents/SUPABASE_SESSION_SERVICE_README.md
# Expected: ~400+ lines

wc -l backend/agents/TASK_34_IMPLEMENTATION_SUMMARY.md
# Expected: ~400+ lines

# Check for key sections
grep -n "## Overview" backend/agents/SUPABASE_SESSION_SERVICE_README.md
grep -n "## Usage" backend/agents/SUPABASE_SESSION_SERVICE_README.md
grep -n "## Security" backend/agents/SUPABASE_SESSION_SERVICE_README.md
grep -n "## Troubleshooting" backend/agents/SUPABASE_SESSION_SERVICE_README.md
```

## ✅ 16. Rollback Test (Optional)

```sql
-- Test migration rollback capability
BEGIN;

-- Drop objects in reverse order
DROP TRIGGER IF EXISTS update_agent_sessions_updated_at ON agent_sessions;
DROP FUNCTION IF EXISTS cleanup_expired_agent_sessions();
DROP FUNCTION IF EXISTS extend_agent_session_expiration(TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS get_agent_session_stats(UUID);
DROP TABLE IF EXISTS agent_sessions CASCADE;

-- Verify dropped
SELECT COUNT(*) FROM agent_sessions;
-- Expected: ERROR: relation "agent_sessions" does not exist

ROLLBACK;

-- Verify restored
SELECT COUNT(*) FROM agent_sessions;
-- Expected: 0 (table exists again)
```

## Summary Checklist

Before marking Task #34 as complete, verify:

- [ ] ✅ Migration file created and validated
- [ ] ✅ Service implementation created with all methods
- [ ] ✅ Test suite created with 11+ test cases
- [ ] ✅ Documentation complete (README + Summary)
- [ ] ✅ Migration applied successfully (local)
- [ ] ✅ All RLS policies working
- [ ] ✅ All indexes created
- [ ] ✅ All helper functions working
- [ ] ✅ Unit tests passing (9/9)
- [ ] ✅ Integration test passing (manual ADK test)
- [ ] ✅ State prefix filtering working (temp: not persisted)
- [ ] ✅ Root agent integration complete
- [ ] ✅ Performance benchmarks acceptable (< 100ms)
- [ ] ✅ Security tests passing (RLS enforcement)
- [ ] ✅ Documentation complete and accurate

## Quick Start Guide

For a new developer validating this implementation:

```bash
# 1. Apply migration
cd supabase && npx supabase db push

# 2. Run tests
cd ../backend/agents && pytest services/test_supabase_session_service.py -v

# 3. Manual test
adk web
# Follow steps in "✅ 8. Manual Integration Test" above

# 4. Verify in Supabase dashboard
# Navigate to: Database > Tables > agent_sessions
# Should see: Table with RLS enabled, 3 indexes, 5 policies
```

---

**Validation Date:** 2026-02-05
**Status:** Ready for testing
**Next Step:** Apply migration and run validation tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
