"""
Deadline Watcher Proactive Agent for AICA Life OS (Task #43)

Monitors deadlines across all modules and generates timely alerts.

Schedule: Every 6 hours
Actions:
- Check grant deadlines (Captacao module)
- Check task due dates (Atlas module)
- Check scheduled events (Calendar)
- Generate alerts for upcoming deadlines
- Store alerts in user_memory

Alert Categories:
- CRITICAL: Within 24 hours
- HIGH: Within 3 days
- MEDIUM: Within 7 days
- LOW: Within 14 days

Usage:
    from backend.agents.proactive.deadline_watcher import DeadlineWatcherAgent

    agent = DeadlineWatcherAgent()
    result = await agent.run(user_id)

    # Alerts are stored in user_memory:
    # key: "deadline_alerts"
    # category: "proactive"

References:
- Task #43: Proactive Agents (Scheduled Tasks and Triggers)
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

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


class AlertPriority(Enum):
    """Priority levels for deadline alerts."""
    CRITICAL = "critical"   # Within 24 hours
    HIGH = "high"           # Within 3 days
    MEDIUM = "medium"       # Within 7 days
    LOW = "low"             # Within 14 days


@dataclass
class DeadlineAlert:
    """
    Represents a deadline alert.

    Attributes:
        module: Source module (atlas, captacao, calendar)
        item_id: UUID of the item
        title: Item title
        deadline: Deadline datetime
        days_until: Days until deadline
        priority: Alert priority level
        item_type: Type of item (task, grant, event)
        additional_info: Extra context
    """
    module: str
    item_id: str
    title: str
    deadline: datetime
    days_until: int
    priority: AlertPriority
    item_type: str
    additional_info: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        result["deadline"] = self.deadline.isoformat() if self.deadline else None
        result["priority"] = self.priority.value
        return result


class DeadlineWatcherAgent(ProactiveAgent):
    """
    Proactive agent that monitors deadlines across all modules.

    Runs every 6 hours to:
    1. Check grant deadlines (Captacao)
    2. Check task due dates (Atlas)
    3. Check scheduled events (Calendar)
    4. Generate prioritized alerts
    5. Store alerts in user_memory

    Alert thresholds are configurable.
    """

    # Default thresholds (in days)
    CRITICAL_DAYS = 1
    HIGH_DAYS = 3
    MEDIUM_DAYS = 7
    LOW_DAYS = 14

    def __init__(
        self,
        interval_hours: int = 6,
        critical_days: int = CRITICAL_DAYS,
        high_days: int = HIGH_DAYS,
        medium_days: int = MEDIUM_DAYS,
        low_days: int = LOW_DAYS,
    ):
        """
        Initialize DeadlineWatcherAgent.

        Args:
            interval_hours: Hours between runs
            critical_days: Days threshold for CRITICAL alerts
            high_days: Days threshold for HIGH alerts
            medium_days: Days threshold for MEDIUM alerts
            low_days: Days threshold for LOW alerts
        """
        super().__init__(
            name="deadline_watcher",
            schedule=Schedule(
                type=ScheduleType.INTERVAL,
                interval_minutes=interval_hours * 60,
                timezone="America/Sao_Paulo",
            ),
            description="Monitora deadlines em todos os modulos e gera alertas priorizados.",
            max_retries=2,
            retry_delay_seconds=30,
        )

        self.critical_days = critical_days
        self.high_days = high_days
        self.medium_days = medium_days
        self.low_days = low_days

    def _get_priority(self, days_until: int) -> Optional[AlertPriority]:
        """
        Determine alert priority based on days until deadline.

        Args:
            days_until: Days until deadline

        Returns:
            AlertPriority or None if too far out
        """
        if days_until < 0:
            return AlertPriority.CRITICAL  # Overdue
        elif days_until <= self.critical_days:
            return AlertPriority.CRITICAL
        elif days_until <= self.high_days:
            return AlertPriority.HIGH
        elif days_until <= self.medium_days:
            return AlertPriority.MEDIUM
        elif days_until <= self.low_days:
            return AlertPriority.LOW
        return None

    def should_run(self, user_id: str, state: ExecutionState) -> bool:
        """
        Check if watcher should run.

        Enforces minimum interval between runs.

        Args:
            user_id: User UUID
            state: Current execution state

        Returns:
            True if should run
        """
        if state.last_run_at:
            hours_since_last = (datetime.utcnow() - state.last_run_at).total_seconds() / 3600
            # Allow some buffer (run if at least 5 hours since last run)
            if hours_since_last < 5:
                logger.debug(
                    f"Deadline watcher ran {hours_since_last:.1f}h ago, skipping"
                )
                return False

        return True

    async def execute(
        self,
        user_id: str,
        context: Dict[str, Any]
    ) -> ProactiveResult:
        """
        Execute deadline checking.

        Args:
            user_id: User UUID
            context: Execution context

        Returns:
            ProactiveResult with alerts
        """
        alerts: List[DeadlineAlert] = []
        errors: List[str] = []

        # Check Atlas tasks
        try:
            task_alerts = await self._check_atlas_deadlines(user_id)
            alerts.extend(task_alerts)
        except Exception as e:
            logger.error(f"Error checking Atlas deadlines: {e}")
            errors.append(f"Atlas: {str(e)}")

        # Check Captacao grants
        try:
            grant_alerts = await self._check_captacao_deadlines(user_id)
            alerts.extend(grant_alerts)
        except Exception as e:
            logger.error(f"Error checking Captacao deadlines: {e}")
            errors.append(f"Captacao: {str(e)}")

        # Check Calendar events
        try:
            event_alerts = await self._check_calendar_deadlines(user_id)
            alerts.extend(event_alerts)
        except Exception as e:
            logger.error(f"Error checking Calendar deadlines: {e}")
            errors.append(f"Calendar: {str(e)}")

        # Sort alerts by priority and days_until
        priority_order = {
            AlertPriority.CRITICAL: 0,
            AlertPriority.HIGH: 1,
            AlertPriority.MEDIUM: 2,
            AlertPriority.LOW: 3,
        }
        alerts.sort(key=lambda a: (priority_order[a.priority], a.days_until))

        # Store alerts in user_memory
        alert_data = {
            "alerts": [a.to_dict() for a in alerts],
            "generated_at": datetime.utcnow().isoformat(),
            "summary": {
                "critical": len([a for a in alerts if a.priority == AlertPriority.CRITICAL]),
                "high": len([a for a in alerts if a.priority == AlertPriority.HIGH]),
                "medium": len([a for a in alerts if a.priority == AlertPriority.MEDIUM]),
                "low": len([a for a in alerts if a.priority == AlertPriority.LOW]),
                "total": len(alerts),
            }
        }

        stored = await self.store_in_memory(
            user_id=user_id,
            key="deadline_alerts",
            value=alert_data,
            category="proactive",
            confidence=1.0,
        )

        # Also store overdue items separately for quick access
        overdue = [a for a in alerts if a.days_until < 0]
        if overdue:
            await self.store_in_memory(
                user_id=user_id,
                key="overdue_items",
                value={
                    "items": [a.to_dict() for a in overdue],
                    "count": len(overdue),
                    "checked_at": datetime.utcnow().isoformat(),
                },
                category="proactive",
                confidence=1.0,
            )

        # Build result message
        critical_count = alert_data["summary"]["critical"]
        high_count = alert_data["summary"]["high"]

        if critical_count > 0:
            message = f"ATENCAO: {critical_count} deadlines criticos! {len(alerts)} alertas no total."
        elif high_count > 0:
            message = f"{high_count} deadlines importantes. {len(alerts)} alertas no total."
        elif alerts:
            message = f"{len(alerts)} deadlines monitorados."
        else:
            message = "Nenhum deadline proximo."

        return ProactiveResult(
            success=len(errors) == 0,
            message=message,
            data=alert_data,
            alerts=[a.to_dict() for a in alerts if a.priority in [AlertPriority.CRITICAL, AlertPriority.HIGH]],
            stored_memory_keys=["deadline_alerts"] + (["overdue_items"] if overdue else []),
            error="; ".join(errors) if errors else None,
        )

    async def _check_atlas_deadlines(self, user_id: str) -> List[DeadlineAlert]:
        """
        Check Atlas tasks for upcoming deadlines.

        Args:
            user_id: User UUID

        Returns:
            List of DeadlineAlert for tasks with due dates
        """
        if not self.supabase:
            return []

        alerts = []
        today = date.today()
        threshold = (today + timedelta(days=self.low_days)).isoformat()

        try:
            result = self.supabase.table("work_items") \
                .select("id, title, priority, priority_quadrant, due_date, status") \
                .eq("user_id", user_id) \
                .eq("status", "todo") \
                .not_.is_("due_date", "null") \
                .lte("due_date", threshold) \
                .order("due_date", desc=False) \
                .execute()

            for task in (result.data or []):
                due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00"))
                days_until = (due_date.date() - today).days

                priority = self._get_priority(days_until)
                if priority:
                    alerts.append(DeadlineAlert(
                        module="atlas",
                        item_id=task["id"],
                        title=task["title"],
                        deadline=due_date,
                        days_until=days_until,
                        priority=priority,
                        item_type="task",
                        additional_info={
                            "task_priority": task.get("priority"),
                            "quadrant": task.get("priority_quadrant"),
                            "overdue": days_until < 0,
                        }
                    ))

        except Exception as e:
            logger.error(f"Error fetching Atlas tasks: {e}")
            raise

        return alerts

    async def _check_captacao_deadlines(self, user_id: str) -> List[DeadlineAlert]:
        """
        Check Captacao grants for upcoming deadlines.

        Args:
            user_id: User UUID

        Returns:
            List of DeadlineAlert for grants with deadlines
        """
        if not self.supabase:
            return []

        alerts = []
        today = date.today()
        threshold = (today + timedelta(days=self.low_days)).isoformat()

        try:
            result = self.supabase.table("grant_projects") \
                .select("id, project_name, deadline, status, agency, completion_percentage") \
                .eq("user_id", user_id) \
                .in_("status", ["draft", "briefing", "generating", "review", "active"]) \
                .not_.is_("deadline", "null") \
                .lte("deadline", threshold) \
                .order("deadline", desc=False) \
                .execute()

            for grant in (result.data or []):
                deadline_str = grant["deadline"]
                if "T" in deadline_str:
                    deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                else:
                    deadline = datetime.fromisoformat(f"{deadline_str}T23:59:59")

                days_until = (deadline.date() - today).days

                priority = self._get_priority(days_until)
                if priority:
                    # Bump priority for low completion
                    completion = grant.get("completion_percentage", 0) or 0
                    if completion < 50 and priority != AlertPriority.CRITICAL:
                        if priority == AlertPriority.HIGH:
                            priority = AlertPriority.CRITICAL
                        elif priority == AlertPriority.MEDIUM:
                            priority = AlertPriority.HIGH
                        elif priority == AlertPriority.LOW:
                            priority = AlertPriority.MEDIUM

                    alerts.append(DeadlineAlert(
                        module="captacao",
                        item_id=grant["id"],
                        title=grant["project_name"],
                        deadline=deadline,
                        days_until=days_until,
                        priority=priority,
                        item_type="grant",
                        additional_info={
                            "agency": grant.get("agency"),
                            "status": grant.get("status"),
                            "completion": completion,
                            "overdue": days_until < 0,
                        }
                    ))

        except Exception as e:
            logger.error(f"Error fetching Captacao grants: {e}")
            raise

        return alerts

    async def _check_calendar_deadlines(self, user_id: str) -> List[DeadlineAlert]:
        """
        Check Calendar events for upcoming items.

        Args:
            user_id: User UUID

        Returns:
            List of DeadlineAlert for important calendar events
        """
        if not self.supabase:
            return []

        alerts = []
        today = date.today()
        threshold = (today + timedelta(days=self.low_days)).isoformat()

        try:
            # Check calendar_events table if it exists
            result = self.supabase.table("calendar_events") \
                .select("id, title, start_time, event_type, is_important") \
                .eq("user_id", user_id) \
                .eq("is_important", True) \
                .gte("start_time", today.isoformat()) \
                .lte("start_time", threshold) \
                .order("start_time", desc=False) \
                .limit(20) \
                .execute()

            for event in (result.data or []):
                start_time = datetime.fromisoformat(event["start_time"].replace("Z", "+00:00"))
                days_until = (start_time.date() - today).days

                priority = self._get_priority(days_until)
                if priority:
                    alerts.append(DeadlineAlert(
                        module="calendar",
                        item_id=event["id"],
                        title=event["title"],
                        deadline=start_time,
                        days_until=days_until,
                        priority=priority,
                        item_type="event",
                        additional_info={
                            "event_type": event.get("event_type"),
                        }
                    ))

        except Exception as e:
            # Calendar might not exist for all users
            logger.debug(f"Calendar check skipped or failed: {e}")

        return alerts

    async def on_success(
        self,
        user_id: str,
        result: ProactiveResult,
        state: ExecutionState
    ) -> None:
        """
        Called after successful deadline check.

        Could be used to:
        - Send push notification for critical alerts
        - Update dashboard counters
        """
        if result.data:
            summary = result.data.get("summary", {})
            critical = summary.get("critical", 0)
            if critical > 0:
                logger.warning(
                    f"User {user_id[:8]}... has {critical} critical deadlines!"
                )


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_deadline_watcher_agent(
    interval_hours: int = 6
) -> DeadlineWatcherAgent:
    """
    Factory function to create DeadlineWatcherAgent.

    Args:
        interval_hours: Hours between checks

    Returns:
        Configured DeadlineWatcherAgent instance
    """
    return DeadlineWatcherAgent(interval_hours=interval_hours)
