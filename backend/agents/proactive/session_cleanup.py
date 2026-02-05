"""
Session Cleanup Proactive Agent for AICA Life OS (Task #43)

Performs maintenance tasks on agent sessions and user memories.

Schedule: Daily at 3:00 AM
Actions:
- Clean expired agent_sessions
- Archive old memories (> 90 days)
- Optimize memory storage
- Generate cleanup report

This agent ensures the database stays clean and efficient by removing
stale data while preserving valuable long-term memories.

Usage:
    from backend.agents.proactive.session_cleanup import SessionCleanupAgent

    agent = SessionCleanupAgent()
    result = await agent.run(user_id)  # Can run for system-wide cleanup too

References:
- Task #43: Proactive Agents (Scheduled Tasks and Triggers)
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timedelta

from supabase import create_client, Client

from .base import (
    ProactiveAgent,
    ProactiveResult,
    Schedule,
    ScheduleType,
    ExecutionState,
)

logger = logging.getLogger(__name__)

# Environment configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Cleanup thresholds
SESSION_EXPIRY_DAYS = 30
MEMORY_ARCHIVE_DAYS = 90
PROACTIVE_STATE_RETAIN_DAYS = 365


class SessionCleanupAgent(ProactiveAgent):
    """
    Proactive agent that performs database maintenance tasks.

    Runs daily at 3:00 AM to:
    1. Delete expired agent_sessions
    2. Archive old user_memory entries
    3. Clean up stale proactive states
    4. Generate cleanup report

    This agent can run in two modes:
    - User mode: Cleanup for a specific user
    - System mode: Cleanup across all users (use special user_id "system")
    """

    def __init__(
        self,
        hour: int = 3,
        minute: int = 0,
        session_expiry_days: int = SESSION_EXPIRY_DAYS,
        memory_archive_days: int = MEMORY_ARCHIVE_DAYS,
    ):
        """
        Initialize SessionCleanupAgent.

        Args:
            hour: Hour to run (0-23)
            minute: Minute to run (0-59)
            session_expiry_days: Days after which sessions expire
            memory_archive_days: Days after which memories are archived
        """
        super().__init__(
            name="session_cleanup",
            schedule=Schedule(
                type=ScheduleType.CRON,
                cron_expression=f"{minute} {hour} * * *",
                timezone="America/Sao_Paulo",
            ),
            description="Limpa sessoes expiradas e otimiza armazenamento de memorias.",
            max_retries=2,
            retry_delay_seconds=30,
        )

        self.session_expiry_days = session_expiry_days
        self.memory_archive_days = memory_archive_days

    def should_run(self, user_id: str, state: ExecutionState) -> bool:
        """
        Check if cleanup should run.

        Cleanup runs daily, but skips if already ran today.

        Args:
            user_id: User UUID or "system"
            state: Current execution state

        Returns:
            True if should run
        """
        if state.last_run_at:
            today = date.today()
            last_run_date = state.last_run_at.date()
            if last_run_date == today:
                logger.debug(f"Cleanup already ran today")
                return False

        return True

    async def execute(
        self,
        user_id: str,
        context: Dict[str, Any]
    ) -> ProactiveResult:
        """
        Execute cleanup tasks.

        Args:
            user_id: User UUID or "system" for system-wide cleanup
            context: Execution context

        Returns:
            ProactiveResult with cleanup report
        """
        is_system_cleanup = user_id == "system"
        report = {
            "mode": "system" if is_system_cleanup else "user",
            "started_at": datetime.utcnow().isoformat(),
            "tasks": {},
        }

        errors = []

        # Task 1: Clean expired sessions
        try:
            sessions_result = await self._cleanup_expired_sessions(
                user_id if not is_system_cleanup else None
            )
            report["tasks"]["sessions"] = sessions_result
        except Exception as e:
            logger.error(f"Error cleaning sessions: {e}")
            errors.append(f"Sessions: {str(e)}")
            report["tasks"]["sessions"] = {"error": str(e)}

        # Task 2: Archive old memories (only for system cleanup)
        if is_system_cleanup:
            try:
                memories_result = await self._archive_old_memories()
                report["tasks"]["memories"] = memories_result
            except Exception as e:
                logger.error(f"Error archiving memories: {e}")
                errors.append(f"Memories: {str(e)}")
                report["tasks"]["memories"] = {"error": str(e)}

        # Task 3: Clean stale proactive states
        try:
            states_result = await self._cleanup_proactive_states(
                user_id if not is_system_cleanup else None
            )
            report["tasks"]["proactive_states"] = states_result
        except Exception as e:
            logger.error(f"Error cleaning proactive states: {e}")
            errors.append(f"Proactive states: {str(e)}")
            report["tasks"]["proactive_states"] = {"error": str(e)}

        # Task 4: Deduplicate memories (for user cleanup)
        if not is_system_cleanup:
            try:
                dedup_result = await self._deduplicate_memories(user_id)
                report["tasks"]["deduplication"] = dedup_result
            except Exception as e:
                logger.error(f"Error deduplicating memories: {e}")
                errors.append(f"Deduplication: {str(e)}")
                report["tasks"]["deduplication"] = {"error": str(e)}

        # Complete report
        report["completed_at"] = datetime.utcnow().isoformat()
        report["success"] = len(errors) == 0

        # Calculate totals
        total_cleaned = sum(
            task.get("deleted", 0) + task.get("archived", 0)
            for task in report["tasks"].values()
            if isinstance(task, dict) and "error" not in task
        )

        # Build message
        if errors:
            message = f"Cleanup parcial: {total_cleaned} itens processados, {len(errors)} erros"
        else:
            message = f"Cleanup completo: {total_cleaned} itens processados"

        # Store cleanup report
        report_key = f"cleanup_report_{date.today().isoformat()}"
        if not is_system_cleanup:
            await self.store_in_memory(
                user_id=user_id,
                key=report_key,
                value=report,
                category="proactive",
                confidence=1.0,
            )

        return ProactiveResult(
            success=len(errors) == 0,
            message=message,
            data=report,
            stored_memory_keys=[report_key] if not is_system_cleanup else [],
            error="; ".join(errors) if errors else None,
        )

    async def _cleanup_expired_sessions(
        self,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Delete expired agent sessions.

        Args:
            user_id: Optional user filter

        Returns:
            Cleanup result
        """
        if not self.supabase:
            return {"skipped": True, "reason": "no_database"}

        now = datetime.utcnow().isoformat()

        try:
            # Build query
            query = self.supabase.table("agent_sessions") \
                .delete() \
                .lt("expires_at", now)

            if user_id:
                query = query.eq("user_id", user_id)

            # Execute deletion
            result = query.execute()

            deleted_count = len(result.data) if result.data else 0

            logger.info(f"Cleaned {deleted_count} expired sessions")

            return {
                "deleted": deleted_count,
                "threshold": now,
            }

        except Exception as e:
            logger.error(f"Error in session cleanup: {e}")
            raise

    async def _archive_old_memories(self) -> Dict[str, Any]:
        """
        Archive old memories (mark as archived instead of delete).

        Returns:
            Archive result
        """
        if not self.supabase:
            return {"skipped": True, "reason": "no_database"}

        threshold = (datetime.utcnow() - timedelta(days=self.memory_archive_days)).isoformat()

        try:
            # Count memories to archive
            count_result = self.supabase.table("user_memory") \
                .select("id", count="exact") \
                .lt("updated_at", threshold) \
                .eq("is_archived", False) \
                .execute()

            total_to_archive = count_result.count if hasattr(count_result, 'count') else 0

            if total_to_archive == 0:
                return {
                    "archived": 0,
                    "threshold_date": threshold[:10],
                }

            # Archive in batches (mark is_archived = true)
            # Note: If is_archived column doesn't exist, this will fail gracefully
            try:
                self.supabase.table("user_memory") \
                    .update({"is_archived": True}) \
                    .lt("updated_at", threshold) \
                    .eq("is_archived", False) \
                    .execute()

                logger.info(f"Archived {total_to_archive} old memories")

                return {
                    "archived": total_to_archive,
                    "threshold_date": threshold[:10],
                }

            except Exception as e:
                # Column might not exist - try deletion instead
                if "is_archived" in str(e):
                    # Delete old low-confidence memories as fallback
                    delete_result = self.supabase.table("user_memory") \
                        .delete() \
                        .lt("updated_at", threshold) \
                        .lt("confidence", 0.5) \
                        .execute()

                    deleted = len(delete_result.data) if delete_result.data else 0

                    return {
                        "deleted": deleted,
                        "archived": 0,
                        "note": "Deleted low-confidence old memories (is_archived column not found)",
                    }
                raise

        except Exception as e:
            logger.error(f"Error archiving memories: {e}")
            raise

    async def _cleanup_proactive_states(
        self,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Clean up stale proactive agent states.

        Removes states for users who haven't been active in over a year.

        Args:
            user_id: Optional user filter

        Returns:
            Cleanup result
        """
        if not self.supabase:
            return {"skipped": True, "reason": "no_database"}

        threshold = (datetime.utcnow() - timedelta(days=PROACTIVE_STATE_RETAIN_DAYS)).isoformat()

        try:
            # Find proactive sessions that haven't been updated in a year
            query = self.supabase.table("agent_sessions") \
                .delete() \
                .like("session_id", "proactive_%") \
                .lt("updated_at", threshold)

            if user_id:
                query = query.eq("user_id", user_id)

            result = query.execute()
            deleted_count = len(result.data) if result.data else 0

            logger.info(f"Cleaned {deleted_count} stale proactive states")

            return {
                "deleted": deleted_count,
                "threshold_date": threshold[:10],
            }

        except Exception as e:
            logger.error(f"Error cleaning proactive states: {e}")
            raise

    async def _deduplicate_memories(self, user_id: str) -> Dict[str, Any]:
        """
        Remove duplicate memories for a user.

        Keeps the most recent memory for each category+key combination.

        Args:
            user_id: User UUID

        Returns:
            Deduplication result
        """
        if not self.supabase:
            return {"skipped": True, "reason": "no_database"}

        try:
            # Get all memories for user
            result = self.supabase.table("user_memory") \
                .select("id, category, key, module, updated_at") \
                .eq("user_id", user_id) \
                .order("updated_at", desc=True) \
                .execute()

            if not result.data:
                return {"duplicates_removed": 0}

            # Find duplicates (same category+key+module)
            seen = set()
            duplicates = []

            for memory in result.data:
                # Create unique key
                unique_key = (
                    memory.get("category", ""),
                    memory.get("key", ""),
                    memory.get("module") or "",
                )

                if unique_key in seen:
                    duplicates.append(memory["id"])
                else:
                    seen.add(unique_key)

            # Delete duplicates
            if duplicates:
                for dup_id in duplicates:
                    self.supabase.table("user_memory") \
                        .delete() \
                        .eq("id", dup_id) \
                        .execute()

            logger.info(f"Removed {len(duplicates)} duplicate memories for user {user_id[:8]}...")

            return {
                "duplicates_removed": len(duplicates),
                "total_checked": len(result.data),
            }

        except Exception as e:
            logger.error(f"Error deduplicating memories: {e}")
            raise

    async def run_system_cleanup(self) -> ProactiveResult:
        """
        Run system-wide cleanup (not user-specific).

        Returns:
            ProactiveResult with system cleanup report
        """
        return await self.run("system", context={"mode": "system"})


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_session_cleanup_agent(
    hour: int = 3,
    minute: int = 0
) -> SessionCleanupAgent:
    """
    Factory function to create SessionCleanupAgent.

    Args:
        hour: Hour to run (0-23)
        minute: Minute to run (0-59)

    Returns:
        Configured SessionCleanupAgent instance
    """
    return SessionCleanupAgent(hour=hour, minute=minute)
