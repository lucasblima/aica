"""
Supabase Session Service for ADK

Replaces InMemorySessionService with persistent Supabase storage.
Implements the ADK SessionService interface for production use.

Key Features:
- Persistent session storage across restarts
- Automatic state prefix handling (temp: not persisted)
- Session expiration (30 days default)
- RLS security (users only see their own sessions)
- Message history preservation
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from supabase import create_client, Client

# ADK imports
from google.adk.sessions import Session, SessionService

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Session configuration
DEFAULT_SESSION_TTL_DAYS = 30
EPHEMERAL_STATE_PREFIXES = ["temp:", "cache:", "_"]


class SupabaseSessionService(SessionService):
    """
    Production-ready SessionService that persists sessions in Supabase.

    Unlike InMemorySessionService, this service:
    - Survives server restarts
    - Supports distributed deployments
    - Implements proper session expiration
    - Filters ephemeral state (temp:, cache:, _) from persistence

    Usage:
        service = SupabaseSessionService()
        session = await service.get_session("session_id", user_id="user_uuid")
        session.state["user:name"] = "Alice"  # Persisted
        session.state["temp:cache"] = {...}    # Not persisted
        await service.save_session(session, user_id="user_uuid")
    """

    def __init__(
        self,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
        ttl_days: int = DEFAULT_SESSION_TTL_DAYS,
    ):
        """
        Initialize SupabaseSessionService.

        Args:
            supabase_url: Supabase project URL
            supabase_key: Service role key (has RLS bypass)
            ttl_days: Session expiration time in days
        """
        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required"
            )

        self.client: Client = create_client(supabase_url, supabase_key)
        self.ttl_days = ttl_days
        logger.info(f"Initialized SupabaseSessionService with {ttl_days} day TTL")

    def _is_ephemeral_key(self, key: str) -> bool:
        """
        Check if a state key should NOT be persisted.

        Ephemeral keys (not persisted):
        - temp:*
        - cache:*
        - _* (underscore prefix)

        All other keys are persisted.
        """
        return any(key.startswith(prefix) for prefix in EPHEMERAL_STATE_PREFIXES)

    def _filter_state_for_persistence(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter out ephemeral state keys before saving.

        Returns:
            Dictionary with only persistent state (user:, app:, etc)
        """
        return {k: v for k, v in state.items() if not self._is_ephemeral_key(k)}

    async def get_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        agent_name: str = "aica_coordinator",
    ) -> Session:
        """
        Retrieve session from Supabase or create new one.

        Args:
            session_id: Unique session identifier
            user_id: User UUID (required for RLS)
            agent_name: Name of the agent owning this session

        Returns:
            Session object with restored state and messages
        """
        if not user_id:
            logger.warning(
                f"get_session called without user_id for session {session_id}. "
                "Creating in-memory session only."
            )
            return Session(session_id=session_id)

        try:
            # Query Supabase for existing session
            response = (
                self.client.table("agent_sessions")
                .select("*")
                .eq("session_id", session_id)
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )

            if response.data:
                # Session exists - restore it
                row = response.data
                session = Session(session_id=session_id)

                # Restore state (excluding ephemeral keys)
                session.state = row.get("state", {})

                # Restore message history
                messages = row.get("messages", [])
                if messages:
                    # ADK expects messages as list of dicts
                    session.messages = messages

                logger.info(
                    f"Restored session {session_id} with {len(messages)} messages"
                )
                return session

            else:
                # Session doesn't exist - create new one
                logger.info(f"Creating new session {session_id} for user {user_id}")
                session = Session(session_id=session_id)

                # Initialize in database
                expires_at = datetime.utcnow() + timedelta(days=self.ttl_days)
                self.client.table("agent_sessions").insert(
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "agent_name": agent_name,
                        "state": {},
                        "messages": [],
                        "expires_at": expires_at.isoformat(),
                    }
                ).execute()

                return session

        except Exception as e:
            logger.error(f"Error retrieving session {session_id}: {e}")
            # Fallback to in-memory session on error
            return Session(session_id=session_id)

    async def save_session(
        self,
        session: Session,
        user_id: Optional[str] = None,
        agent_name: str = "aica_coordinator",
    ) -> None:
        """
        Persist session state and messages to Supabase.

        Only persistent state (user:, app:) is saved.
        Ephemeral state (temp:, cache:, _*) is filtered out.

        Args:
            session: Session object to save
            user_id: User UUID (required for RLS)
            agent_name: Name of the agent owning this session
        """
        if not user_id:
            logger.warning(
                f"save_session called without user_id for session {session.session_id}. "
                "Changes will not persist."
            )
            return

        try:
            # Filter out ephemeral state
            persistent_state = self._filter_state_for_persistence(session.state)

            # Convert messages to JSON-serializable format
            messages = session.messages if hasattr(session, "messages") else []

            # Update or insert session
            update_data = {
                "state": persistent_state,
                "messages": messages,
                "agent_name": agent_name,
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Try update first
            response = (
                self.client.table("agent_sessions")
                .update(update_data)
                .eq("session_id", session.session_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                # Session doesn't exist - insert it
                expires_at = datetime.utcnow() + timedelta(days=self.ttl_days)
                self.client.table("agent_sessions").insert(
                    {
                        "session_id": session.session_id,
                        "user_id": user_id,
                        **update_data,
                        "expires_at": expires_at.isoformat(),
                    }
                ).execute()

            logger.info(
                f"Saved session {session.session_id} with {len(messages)} messages"
            )

        except Exception as e:
            logger.error(f"Error saving session {session.session_id}: {e}")

    async def delete_session(
        self, session_id: str, user_id: Optional[str] = None
    ) -> None:
        """
        Delete session from Supabase.

        Args:
            session_id: Unique session identifier
            user_id: User UUID (required for RLS)
        """
        if not user_id:
            logger.warning(
                f"delete_session called without user_id for session {session_id}"
            )
            return

        try:
            self.client.table("agent_sessions").delete().eq(
                "session_id", session_id
            ).eq("user_id", user_id).execute()

            logger.info(f"Deleted session {session_id}")

        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")

    async def list_sessions(
        self, user_id: Optional[str] = None, agent_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List all sessions for a user.

        Args:
            user_id: User UUID (required for RLS)
            agent_name: Optional filter by agent name

        Returns:
            List of session metadata dictionaries
        """
        if not user_id:
            logger.warning("list_sessions called without user_id")
            return []

        try:
            query = (
                self.client.table("agent_sessions")
                .select("session_id, agent_name, created_at, updated_at, expires_at")
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
            )

            if agent_name:
                query = query.eq("agent_name", agent_name)

            response = query.execute()

            return response.data if response.data else []

        except Exception as e:
            logger.error(f"Error listing sessions for user {user_id}: {e}")
            return []

    async def cleanup_expired_sessions(self) -> int:
        """
        Delete all expired sessions across all users.

        Returns:
            Number of sessions deleted
        """
        try:
            # Call the SQL function created in migration
            response = self.client.rpc("cleanup_expired_agent_sessions").execute()

            deleted_count = response.data if response.data else 0
            logger.info(f"Cleaned up {deleted_count} expired sessions")

            return deleted_count

        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}")
            return 0

    async def extend_session_expiration(
        self, session_id: str, user_id: str, days: int = 30
    ) -> Optional[datetime]:
        """
        Extend session expiration by specified days.

        Args:
            session_id: Unique session identifier
            user_id: User UUID (required for RLS)
            days: Number of days to extend

        Returns:
            New expiration datetime, or None if error
        """
        try:
            response = (
                self.client.rpc(
                    "extend_agent_session_expiration",
                    {
                        "p_session_id": session_id,
                        "p_user_id": user_id,
                        "p_days": days,
                    },
                )
                .execute()
            )

            if response.data:
                new_expiration = datetime.fromisoformat(response.data)
                logger.info(
                    f"Extended session {session_id} until {new_expiration.isoformat()}"
                )
                return new_expiration

            return None

        except Exception as e:
            logger.error(f"Error extending session {session_id}: {e}")
            return None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def create_session_service(
    ttl_days: int = DEFAULT_SESSION_TTL_DAYS,
) -> SupabaseSessionService:
    """
    Factory function to create SupabaseSessionService with default config.

    Usage:
        session_service = create_session_service()
    """
    return SupabaseSessionService(ttl_days=ttl_days)
