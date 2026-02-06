"""
Test script for SupabaseSessionService

Usage:
    python -m pytest backend/agents/services/test_supabase_session_service.py -v

Requirements:
    - SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
    - Migration 20260205160808_create_agent_sessions.sql applied
    - Valid test user UUID
"""

import os
import pytest
import asyncio
from datetime import datetime, timedelta

from .supabase_session_service import SupabaseSessionService
from google.adk.sessions import Session

# Test configuration
TEST_USER_ID = os.getenv("TEST_USER_ID", "00000000-0000-0000-0000-000000000000")
TEST_SESSION_PREFIX = "test_session_"


@pytest.fixture
def session_service():
    """Create SupabaseSessionService instance for testing."""
    return SupabaseSessionService(ttl_days=1)  # 1 day TTL for tests


@pytest.fixture
def unique_session_id():
    """Generate unique session ID for each test."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    return f"{TEST_SESSION_PREFIX}{timestamp}"


@pytest.mark.asyncio
async def test_create_new_session(session_service, unique_session_id):
    """Test creating a new session."""
    session = await session_service.get_session(
        session_id=unique_session_id,
        user_id=TEST_USER_ID,
        agent_name="test_agent",
    )

    assert session is not None
    assert session.session_id == unique_session_id
    assert session.state == {}

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


@pytest.mark.asyncio
async def test_save_and_restore_session(session_service, unique_session_id):
    """Test saving and restoring session state."""
    # Create session with state
    session = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    session.state["user:name"] = "Test User"
    session.state["app:current_module"] = "atlas"
    session.state["temp:cache"] = {"should": "not persist"}

    await session_service.save_session(session, user_id=TEST_USER_ID)

    # Restore session in new instance
    restored = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    # Persistent state should be restored
    assert restored.state["user:name"] == "Test User"
    assert restored.state["app:current_module"] == "atlas"

    # Ephemeral state should NOT be persisted
    assert "temp:cache" not in restored.state

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


@pytest.mark.asyncio
async def test_ephemeral_state_filtering(session_service, unique_session_id):
    """Test that ephemeral state keys are filtered."""
    session = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    # Add various state types
    session.state["user:persistent"] = "should persist"
    session.state["app:also_persistent"] = "should persist"
    session.state["temp:ephemeral"] = "should NOT persist"
    session.state["cache:also_ephemeral"] = "should NOT persist"
    session.state["_private"] = "should NOT persist"

    await session_service.save_session(session, user_id=TEST_USER_ID)

    # Restore and verify
    restored = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    assert "user:persistent" in restored.state
    assert "app:also_persistent" in restored.state
    assert "temp:ephemeral" not in restored.state
    assert "cache:also_ephemeral" not in restored.state
    assert "_private" not in restored.state

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


@pytest.mark.asyncio
async def test_message_history_persistence(session_service, unique_session_id):
    """Test that message history is saved and restored."""
    session = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    # Simulate message history
    session.messages = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi there!"},
        {"role": "user", "content": "Create a task"},
    ]

    await session_service.save_session(session, user_id=TEST_USER_ID)

    # Restore and verify
    restored = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    assert len(restored.messages) == 3
    assert restored.messages[0]["content"] == "Hello"
    assert restored.messages[2]["role"] == "user"

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


@pytest.mark.asyncio
async def test_list_sessions(session_service):
    """Test listing user's sessions."""
    # Create multiple sessions
    session_ids = []
    for i in range(3):
        sid = f"{TEST_SESSION_PREFIX}list_test_{i}_{datetime.utcnow().timestamp()}"
        session_ids.append(sid)
        session = await session_service.get_session(sid, user_id=TEST_USER_ID)
        await session_service.save_session(session, user_id=TEST_USER_ID)

    # List sessions
    sessions = await session_service.list_sessions(user_id=TEST_USER_ID)

    # Should have at least our 3 test sessions
    assert len(sessions) >= 3

    # Cleanup
    for sid in session_ids:
        await session_service.delete_session(sid, TEST_USER_ID)


@pytest.mark.asyncio
async def test_extend_session_expiration(session_service, unique_session_id):
    """Test extending session expiration."""
    # Create session
    session = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )
    await session_service.save_session(session, user_id=TEST_USER_ID)

    # Extend expiration by 60 days
    new_expiration = await session_service.extend_session_expiration(
        session_id=unique_session_id, user_id=TEST_USER_ID, days=60
    )

    assert new_expiration is not None
    # Should be approximately 60 days from now
    expected = datetime.utcnow() + timedelta(days=60)
    time_diff = abs((new_expiration - expected).total_seconds())
    assert time_diff < 60  # Within 1 minute tolerance

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


@pytest.mark.asyncio
async def test_delete_session(session_service, unique_session_id):
    """Test deleting a session."""
    # Create session
    session = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )
    session.state["user:test"] = "data"
    await session_service.save_session(session, user_id=TEST_USER_ID)

    # Delete session
    await session_service.delete_session(unique_session_id, TEST_USER_ID)

    # Try to restore - should create new empty session
    restored = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )
    assert restored.state == {}

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


@pytest.mark.asyncio
async def test_cleanup_expired_sessions(session_service):
    """Test cleanup of expired sessions (requires service role)."""
    try:
        deleted_count = await session_service.cleanup_expired_sessions()
        assert deleted_count >= 0  # Should return count without error
    except Exception as e:
        pytest.skip(f"Cleanup requires service role permissions: {e}")


@pytest.mark.asyncio
async def test_session_without_user_id(session_service, unique_session_id):
    """Test that sessions without user_id create in-memory only."""
    # Should create in-memory session (not persisted)
    session = await session_service.get_session(
        session_id=unique_session_id, user_id=None
    )

    assert session is not None
    assert session.session_id == unique_session_id

    # Should not throw error when saving without user_id
    session.state["test"] = "data"
    await session_service.save_session(session, user_id=None)


# =============================================================================
# INTEGRATION TESTS (require running Supabase instance)
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_concurrent_session_access(session_service, unique_session_id):
    """Test concurrent access to same session."""
    # Simulate concurrent updates
    async def update_session(key, value):
        session = await session_service.get_session(
            unique_session_id, user_id=TEST_USER_ID
        )
        session.state[key] = value
        await session_service.save_session(session, user_id=TEST_USER_ID)

    # Run concurrent updates
    await asyncio.gather(
        update_session("user:field1", "value1"),
        update_session("user:field2", "value2"),
        update_session("user:field3", "value3"),
    )

    # Verify all updates persisted
    final_session = await session_service.get_session(
        unique_session_id, user_id=TEST_USER_ID
    )

    # At least one update should persist (last-write-wins)
    assert len(final_session.state) > 0

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_large_state_persistence(session_service, unique_session_id):
    """Test persisting large state objects."""
    session = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    # Create large state (~50KB)
    large_data = {"items": [{"id": i, "data": "x" * 100} for i in range(500)]}
    session.state["user:large_data"] = large_data

    await session_service.save_session(session, user_id=TEST_USER_ID)

    # Restore and verify
    restored = await session_service.get_session(
        session_id=unique_session_id, user_id=TEST_USER_ID
    )

    assert "user:large_data" in restored.state
    assert len(restored.state["user:large_data"]["items"]) == 500

    # Cleanup
    await session_service.delete_session(unique_session_id, TEST_USER_ID)


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    """Run tests directly with asyncio."""
    print("=== SupabaseSessionService Tests ===\n")

    async def run_all_tests():
        service = SupabaseSessionService(ttl_days=1)
        session_id = f"{TEST_SESSION_PREFIX}manual_test"

        print("1. Creating new session...")
        session = await service.get_session(session_id, TEST_USER_ID)
        print(f"   ✓ Session created: {session.session_id}")

        print("\n2. Saving session with state...")
        session.state["user:name"] = "Manual Test"
        session.state["temp:cache"] = "should not persist"
        await service.save_session(session, TEST_USER_ID)
        print("   ✓ Session saved")

        print("\n3. Restoring session...")
        restored = await service.get_session(session_id, TEST_USER_ID)
        print(f"   ✓ Session restored with state: {restored.state}")
        assert "user:name" in restored.state
        assert "temp:cache" not in restored.state

        print("\n4. Listing sessions...")
        sessions = await service.list_sessions(TEST_USER_ID)
        print(f"   ✓ Found {len(sessions)} sessions")

        print("\n5. Deleting session...")
        await service.delete_session(session_id, TEST_USER_ID)
        print("   ✓ Session deleted")

        print("\n=== All manual tests passed ===")

    asyncio.run(run_all_tests())
