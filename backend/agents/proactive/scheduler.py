"""
Proactive Agent Scheduler for AICA Life OS (Task #43)

Registry and scheduler for proactive agents. Provides:
- Agent registration
- Schedule management
- Trigger mechanism for external schedulers
- Timezone handling (America/Sao_Paulo)

Since ADK runs as a web server, proactive agents need external triggers:
- Option 1: Supabase pg_cron (recommended for MVP)
- Option 2: Edge Function + Cloud Scheduler
- Option 3: HTTP webhooks

This module provides the registry and trigger endpoints.

Usage:
    from backend.agents.proactive import (
        ProactiveScheduler,
        get_scheduler,
        trigger_agent,
    )

    # Register agents (done at startup)
    scheduler = get_scheduler()
    scheduler.register(MorningBriefingAgent())

    # Trigger agent execution (called by external scheduler)
    result = await trigger_agent("morning_briefing", user_id)

References:
- Task #43: Proactive Agents (Scheduled Tasks and Triggers)
"""

import os
import logging
from typing import Optional, Dict, Any, List, Type
from datetime import datetime, timedelta
import pytz

from supabase import create_client, Client

from .base import ProactiveAgent, ProactiveResult, Schedule, ScheduleType

logger = logging.getLogger(__name__)

# Environment configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Default timezone
DEFAULT_TIMEZONE = "America/Sao_Paulo"


class ProactiveScheduler:
    """
    Registry and scheduler for proactive agents.

    Manages registration, scheduling, and execution of proactive agents.
    Works with external schedulers (pg_cron, Cloud Scheduler, cron-job.org).

    Usage:
        scheduler = ProactiveScheduler()

        # Register agents
        scheduler.register(MorningBriefingAgent())
        scheduler.register(DeadlineWatcherAgent())

        # Trigger execution
        result = await scheduler.trigger("morning_briefing", user_id)

        # Get all users for scheduled run
        users = await scheduler.get_users_for_schedule("morning_briefing")
        for user_id in users:
            await scheduler.trigger("morning_briefing", user_id)
    """

    def __init__(self):
        """Initialize ProactiveScheduler."""
        self._agents: Dict[str, ProactiveAgent] = {}
        self._timezone = pytz.timezone(DEFAULT_TIMEZONE)

        # Initialize Supabase client
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            self.supabase: Optional[Client] = create_client(
                SUPABASE_URL, SUPABASE_SERVICE_KEY
            )
        else:
            self.supabase = None
            logger.warning("ProactiveScheduler: No Supabase credentials")

        logger.info("Initialized ProactiveScheduler")

    def register(self, agent: ProactiveAgent) -> None:
        """
        Register a proactive agent.

        Args:
            agent: ProactiveAgent instance to register
        """
        if agent.name in self._agents:
            logger.warning(f"Overwriting existing agent: {agent.name}")

        self._agents[agent.name] = agent
        logger.info(f"Registered proactive agent: {agent.name}")

    def unregister(self, name: str) -> bool:
        """
        Unregister a proactive agent.

        Args:
            name: Agent name to unregister

        Returns:
            True if agent was found and removed
        """
        if name in self._agents:
            del self._agents[name]
            logger.info(f"Unregistered proactive agent: {name}")
            return True
        return False

    def get_agent(self, name: str) -> Optional[ProactiveAgent]:
        """
        Get a registered agent by name.

        Args:
            name: Agent name

        Returns:
            ProactiveAgent or None if not found
        """
        return self._agents.get(name)

    def list_agents(self) -> List[Dict[str, Any]]:
        """
        List all registered agents with their info.

        Returns:
            List of agent info dictionaries
        """
        return [agent.get_info() for agent in self._agents.values()]

    async def trigger(
        self,
        agent_name: str,
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ProactiveResult:
        """
        Trigger execution of a proactive agent for a user.

        Args:
            agent_name: Name of the agent to trigger
            user_id: User UUID to run for
            context: Optional additional context

        Returns:
            ProactiveResult from agent execution
        """
        agent = self._agents.get(agent_name)
        if not agent:
            logger.error(f"Agent not found: {agent_name}")
            return ProactiveResult(
                success=False,
                message=f"Agent not found: {agent_name}",
                error="AGENT_NOT_FOUND"
            )

        return await agent.run(user_id, context)

    async def trigger_for_all_users(
        self,
        agent_name: str,
        context: Optional[Dict[str, Any]] = None,
        batch_size: int = 10
    ) -> Dict[str, Any]:
        """
        Trigger execution of a proactive agent for all active users.

        Args:
            agent_name: Name of the agent to trigger
            context: Optional additional context
            batch_size: Number of concurrent executions

        Returns:
            Summary of execution results
        """
        import asyncio

        agent = self._agents.get(agent_name)
        if not agent:
            return {
                "success": False,
                "error": f"Agent not found: {agent_name}",
                "results": []
            }

        # Get all active users
        users = await self._get_active_users()
        if not users:
            return {
                "success": True,
                "message": "No active users found",
                "results": []
            }

        results = []
        errors = []

        # Process in batches
        for i in range(0, len(users), batch_size):
            batch = users[i:i + batch_size]

            # Run batch concurrently
            tasks = [
                self.trigger(agent_name, user_id, context)
                for user_id in batch
            ]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for user_id, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    errors.append({
                        "user_id": user_id,
                        "error": str(result)
                    })
                else:
                    results.append({
                        "user_id": user_id,
                        "success": result.success,
                        "message": result.message
                    })

        return {
            "success": len(errors) == 0,
            "total_users": len(users),
            "successful": len([r for r in results if r["success"]]),
            "failed": len(errors) + len([r for r in results if not r["success"]]),
            "results": results,
            "errors": errors
        }

    async def _get_active_users(self) -> List[str]:
        """
        Get list of active user IDs.

        Returns:
            List of user UUIDs
        """
        if not self.supabase:
            return []

        try:
            # Get users who have been active in the last 30 days
            threshold = (datetime.utcnow() - timedelta(days=30)).isoformat()

            result = self.supabase.table("profiles") \
                .select("id") \
                .gte("updated_at", threshold) \
                .execute()

            return [row["id"] for row in (result.data or [])]

        except Exception as e:
            logger.error(f"Error getting active users: {e}")
            return []

    async def get_users_for_schedule(
        self,
        agent_name: str,
        schedule_override: Optional[Schedule] = None
    ) -> List[str]:
        """
        Get users who should receive this agent's execution.

        Considers:
        - User preferences (e.g., preferred briefing time)
        - User timezone settings
        - User activity status

        Args:
            agent_name: Agent name
            schedule_override: Optional schedule override

        Returns:
            List of user UUIDs eligible for this run
        """
        agent = self._agents.get(agent_name)
        if not agent:
            return []

        schedule = schedule_override or agent.schedule

        # For simple implementation, return all active users
        # Future: Filter by user preferences and timezone
        return await self._get_active_users()

    def get_due_agents(self, current_time: Optional[datetime] = None) -> List[str]:
        """
        Get list of agents that should run at the current time.

        This is useful for external schedulers that check every minute.

        Args:
            current_time: Optional time to check (default: now)

        Returns:
            List of agent names that should run
        """
        if current_time is None:
            current_time = datetime.now(self._timezone)
        elif current_time.tzinfo is None:
            current_time = self._timezone.localize(current_time)

        due_agents = []

        for name, agent in self._agents.items():
            if self._is_due(agent.schedule, current_time):
                due_agents.append(name)

        return due_agents

    def _is_due(self, schedule: Schedule, current_time: datetime) -> bool:
        """
        Check if a schedule is due at the given time.

        Args:
            schedule: Schedule to check
            current_time: Time to check against

        Returns:
            True if schedule is due
        """
        if schedule.type == ScheduleType.CRON:
            return self._matches_cron(schedule.cron_expression, current_time)
        elif schedule.type == ScheduleType.INTERVAL:
            # Interval-based schedules need state tracking
            # For simplicity, return True (let should_run handle it)
            return True
        elif schedule.type == ScheduleType.EVENT:
            # Event-based schedules are triggered externally
            return False

        return False

    def _matches_cron(self, cron_expr: str, current_time: datetime) -> bool:
        """
        Check if current time matches a cron expression.

        Supports standard cron format: minute hour day_of_month month day_of_week

        Args:
            cron_expr: Cron expression (e.g., "0 7 * * *")
            current_time: Time to check

        Returns:
            True if cron expression matches current time
        """
        try:
            parts = cron_expr.split()
            if len(parts) != 5:
                logger.warning(f"Invalid cron expression: {cron_expr}")
                return False

            minute, hour, day, month, dow = parts

            # Check each field
            if not self._matches_cron_field(minute, current_time.minute):
                return False
            if not self._matches_cron_field(hour, current_time.hour):
                return False
            if not self._matches_cron_field(day, current_time.day):
                return False
            if not self._matches_cron_field(month, current_time.month):
                return False
            if not self._matches_cron_field(dow, current_time.weekday()):
                return False

            return True

        except Exception as e:
            logger.error(f"Error parsing cron expression: {e}")
            return False

    def _matches_cron_field(self, pattern: str, value: int) -> bool:
        """
        Check if a value matches a cron field pattern.

        Supports:
        - * (any value)
        - N (exact value)
        - */N (every N)
        - N-M (range)
        - N,M,O (list)

        Args:
            pattern: Cron field pattern
            value: Value to check

        Returns:
            True if value matches pattern
        """
        if pattern == "*":
            return True

        # Handle */N (every N)
        if pattern.startswith("*/"):
            try:
                step = int(pattern[2:])
                return value % step == 0
            except ValueError:
                return False

        # Handle N-M (range)
        if "-" in pattern and "," not in pattern:
            try:
                start, end = pattern.split("-")
                return int(start) <= value <= int(end)
            except ValueError:
                return False

        # Handle N,M,O (list)
        if "," in pattern:
            try:
                values = [int(v.strip()) for v in pattern.split(",")]
                return value in values
            except ValueError:
                return False

        # Handle exact value
        try:
            return int(pattern) == value
        except ValueError:
            return False

    def get_schedule_info(self) -> Dict[str, Any]:
        """
        Get schedule information for all agents.

        Returns:
            Dictionary with schedule details
        """
        return {
            "timezone": DEFAULT_TIMEZONE,
            "current_time": datetime.now(self._timezone).isoformat(),
            "agents": {
                name: {
                    **agent.get_info(),
                    "is_due": self._is_due(
                        agent.schedule,
                        datetime.now(self._timezone)
                    )
                }
                for name, agent in self._agents.items()
            }
        }


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_scheduler: Optional[ProactiveScheduler] = None


def get_scheduler() -> ProactiveScheduler:
    """
    Get singleton instance of ProactiveScheduler.

    Returns:
        ProactiveScheduler instance
    """
    global _scheduler

    if _scheduler is None:
        _scheduler = ProactiveScheduler()

    return _scheduler


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================


async def trigger_agent(
    agent_name: str,
    user_id: str,
    context: Optional[Dict[str, Any]] = None
) -> ProactiveResult:
    """
    Convenience function to trigger a proactive agent.

    Args:
        agent_name: Name of the agent to trigger
        user_id: User UUID to run for
        context: Optional additional context

    Returns:
        ProactiveResult from agent execution
    """
    scheduler = get_scheduler()
    return await scheduler.trigger(agent_name, user_id, context)


async def trigger_agent_for_all(
    agent_name: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Convenience function to trigger a proactive agent for all users.

    Args:
        agent_name: Name of the agent to trigger
        context: Optional additional context

    Returns:
        Summary of execution results
    """
    scheduler = get_scheduler()
    return await scheduler.trigger_for_all_users(agent_name, context)


def register_agent(agent: ProactiveAgent) -> None:
    """
    Convenience function to register a proactive agent.

    Args:
        agent: ProactiveAgent instance to register
    """
    scheduler = get_scheduler()
    scheduler.register(agent)


def list_agents() -> List[Dict[str, Any]]:
    """
    Convenience function to list all registered agents.

    Returns:
        List of agent info dictionaries
    """
    scheduler = get_scheduler()
    return scheduler.list_agents()


def get_due_agents() -> List[str]:
    """
    Convenience function to get agents that should run now.

    Returns:
        List of agent names that are due
    """
    scheduler = get_scheduler()
    return scheduler.get_due_agents()
