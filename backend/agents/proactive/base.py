"""
Proactive Agent Base Class for AICA Life OS (Task #43)

Defines the abstract base class for all proactive agents. Proactive agents
run on schedules or triggers, not in response to user requests.

Key Features:
- Schedule definition (cron, interval, event-based)
- State persistence between runs
- Error handling with retry logic
- Execution tracking (last run, status, counts)

Usage:
    from backend.agents.proactive.base import ProactiveAgent, Schedule, ScheduleType

    class MyProactiveAgent(ProactiveAgent):
        def __init__(self):
            super().__init__(
                name="my_agent",
                schedule=Schedule(
                    type=ScheduleType.CRON,
                    cron_expression="0 7 * * *"  # Daily at 7 AM
                )
            )

        async def execute(self, user_id: str, context: dict) -> ProactiveResult:
            # Do the proactive work
            return ProactiveResult(
                success=True,
                message="Completed successfully",
                data={"key": "value"}
            )

References:
- Task #43: Proactive Agents (Scheduled Tasks and Triggers)
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict, field

# Supabase client
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Environment configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Default retry configuration
DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_DELAY_SECONDS = 60


class ScheduleType(Enum):
    """Types of schedule triggers for proactive agents."""
    CRON = "cron"           # Cron expression (e.g., "0 7 * * *")
    INTERVAL = "interval"   # Fixed interval in minutes
    EVENT = "event"         # Event-based trigger


@dataclass
class Schedule:
    """
    Schedule configuration for proactive agents.

    Attributes:
        type: Type of schedule (cron, interval, event)
        cron_expression: Cron expression for CRON type (e.g., "0 7 * * *")
        interval_minutes: Interval in minutes for INTERVAL type
        event_trigger: Event name for EVENT type (e.g., "user_login")
        timezone: Timezone for schedule evaluation (default: America/Sao_Paulo)
    """
    type: ScheduleType
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    event_trigger: Optional[str] = None
    timezone: str = "America/Sao_Paulo"

    def __post_init__(self):
        """Validate schedule configuration."""
        if self.type == ScheduleType.CRON and not self.cron_expression:
            raise ValueError("cron_expression required for CRON schedule type")
        if self.type == ScheduleType.INTERVAL and not self.interval_minutes:
            raise ValueError("interval_minutes required for INTERVAL schedule type")
        if self.type == ScheduleType.EVENT and not self.event_trigger:
            raise ValueError("event_trigger required for EVENT schedule type")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "type": self.type.value,
            "cron_expression": self.cron_expression,
            "interval_minutes": self.interval_minutes,
            "event_trigger": self.event_trigger,
            "timezone": self.timezone,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Schedule":
        """Create Schedule from dictionary."""
        return cls(
            type=ScheduleType(data["type"]),
            cron_expression=data.get("cron_expression"),
            interval_minutes=data.get("interval_minutes"),
            event_trigger=data.get("event_trigger"),
            timezone=data.get("timezone", "America/Sao_Paulo"),
        )


@dataclass
class ProactiveResult:
    """
    Result of a proactive agent execution.

    Attributes:
        success: Whether execution succeeded
        message: Human-readable result message
        data: Arbitrary result data
        alerts: List of alerts generated
        stored_memory_keys: List of memory keys that were stored
        error: Error message if success=False
    """
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    alerts: List[Dict[str, Any]] = field(default_factory=list)
    stored_memory_keys: List[str] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class ExecutionState:
    """
    Persistent state for a proactive agent execution.

    Attributes:
        last_run_at: Timestamp of last successful run
        last_run_status: Status of last run ("success", "failure", "skipped")
        run_count: Total number of runs
        consecutive_failures: Number of consecutive failures
        accumulated_state: Arbitrary state to persist between runs
        last_error: Error message from last failure
    """
    last_run_at: Optional[datetime] = None
    last_run_status: str = "never_run"
    run_count: int = 0
    consecutive_failures: int = 0
    accumulated_state: Dict[str, Any] = field(default_factory=dict)
    last_error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        if self.last_run_at:
            result["last_run_at"] = self.last_run_at.isoformat()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExecutionState":
        """Create ExecutionState from dictionary."""
        last_run = data.get("last_run_at")
        if last_run and isinstance(last_run, str):
            last_run = datetime.fromisoformat(last_run.replace("Z", "+00:00"))

        return cls(
            last_run_at=last_run,
            last_run_status=data.get("last_run_status", "never_run"),
            run_count=data.get("run_count", 0),
            consecutive_failures=data.get("consecutive_failures", 0),
            accumulated_state=data.get("accumulated_state", {}),
            last_error=data.get("last_error"),
        )


class ProactiveAgent(ABC):
    """
    Abstract base class for all proactive agents.

    Proactive agents run on schedules or triggers, not in response to
    direct user requests. They gather information, generate alerts,
    and store insights for later retrieval.

    Subclasses must implement:
    - execute(user_id, context) -> ProactiveResult

    Optional overrides:
    - should_run(user_id, state) -> bool
    - on_success(user_id, result, state)
    - on_failure(user_id, error, state)
    """

    def __init__(
        self,
        name: str,
        schedule: Schedule,
        description: str = "",
        max_retries: int = DEFAULT_MAX_RETRIES,
        retry_delay_seconds: int = DEFAULT_RETRY_DELAY_SECONDS,
    ):
        """
        Initialize ProactiveAgent.

        Args:
            name: Unique name for this agent
            schedule: Schedule configuration
            description: Human-readable description
            max_retries: Maximum retry attempts on failure
            retry_delay_seconds: Delay between retries
        """
        self.name = name
        self.schedule = schedule
        self.description = description
        self.max_retries = max_retries
        self.retry_delay_seconds = retry_delay_seconds

        # Initialize Supabase client
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            self.supabase: Optional[Client] = create_client(
                SUPABASE_URL, SUPABASE_SERVICE_KEY
            )
        else:
            self.supabase = None
            logger.warning(f"ProactiveAgent {name}: No Supabase credentials")

        logger.info(f"Initialized ProactiveAgent: {name}")

    @abstractmethod
    async def execute(
        self,
        user_id: str,
        context: Dict[str, Any]
    ) -> ProactiveResult:
        """
        Execute the proactive agent's main logic.

        This method must be implemented by subclasses.

        Args:
            user_id: User UUID to run for
            context: Execution context (schedule info, previous state, etc.)

        Returns:
            ProactiveResult with execution outcome
        """
        pass

    def should_run(
        self,
        user_id: str,
        state: ExecutionState
    ) -> bool:
        """
        Determine if the agent should run for this user.

        Override this method to add custom conditions.
        Default implementation always returns True.

        Args:
            user_id: User UUID
            state: Current execution state

        Returns:
            True if agent should run, False to skip
        """
        return True

    async def on_success(
        self,
        user_id: str,
        result: ProactiveResult,
        state: ExecutionState
    ) -> None:
        """
        Called after successful execution.

        Override to add custom post-execution logic.

        Args:
            user_id: User UUID
            result: Execution result
            state: Updated execution state
        """
        pass

    async def on_failure(
        self,
        user_id: str,
        error: Exception,
        state: ExecutionState
    ) -> None:
        """
        Called after failed execution (after all retries).

        Override to add custom error handling.

        Args:
            user_id: User UUID
            error: The exception that caused failure
            state: Updated execution state
        """
        pass

    async def run(
        self,
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ProactiveResult:
        """
        Main entry point to run the proactive agent.

        Handles:
        - State loading and persistence
        - should_run check
        - Retry logic
        - Success/failure callbacks

        Args:
            user_id: User UUID to run for
            context: Optional additional context

        Returns:
            ProactiveResult with execution outcome
        """
        context = context or {}

        # Load execution state
        state = await self._load_state(user_id)

        # Check if should run
        if not self.should_run(user_id, state):
            logger.info(f"Skipping {self.name} for user {user_id[:8]}...")
            return ProactiveResult(
                success=True,
                message="Skipped - conditions not met",
                data={"skipped": True}
            )

        # Prepare execution context
        execution_context = {
            **context,
            "agent_name": self.name,
            "schedule": self.schedule.to_dict(),
            "state": state.to_dict(),
            "run_at": datetime.utcnow().isoformat(),
        }

        # Execute with retries
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(
                    f"Running {self.name} for user {user_id[:8]}... "
                    f"(attempt {attempt}/{self.max_retries})"
                )

                result = await self.execute(user_id, execution_context)

                if result.success:
                    # Update state on success
                    state.last_run_at = datetime.utcnow()
                    state.last_run_status = "success"
                    state.run_count += 1
                    state.consecutive_failures = 0
                    state.last_error = None

                    await self._save_state(user_id, state)
                    await self.on_success(user_id, result, state)

                    logger.info(
                        f"{self.name} completed for user {user_id[:8]}...: "
                        f"{result.message}"
                    )
                    return result
                else:
                    # Treat as failure if result.success is False
                    last_error = Exception(result.error or result.message)
                    raise last_error

            except Exception as e:
                last_error = e
                logger.warning(
                    f"{self.name} attempt {attempt} failed for user {user_id[:8]}...: {e}"
                )

                if attempt < self.max_retries:
                    import asyncio
                    await asyncio.sleep(self.retry_delay_seconds)

        # All retries failed
        state.last_run_at = datetime.utcnow()
        state.last_run_status = "failure"
        state.run_count += 1
        state.consecutive_failures += 1
        state.last_error = str(last_error)

        await self._save_state(user_id, state)
        await self.on_failure(user_id, last_error, state)

        logger.error(
            f"{self.name} failed for user {user_id[:8]}... after {self.max_retries} "
            f"attempts: {last_error}"
        )

        return ProactiveResult(
            success=False,
            message=f"Failed after {self.max_retries} attempts",
            error=str(last_error)
        )

    def _get_session_id(self, user_id: str) -> str:
        """Generate consistent session ID for state storage."""
        return f"proactive_{self.name}_{user_id}"

    async def _load_state(self, user_id: str) -> ExecutionState:
        """
        Load execution state from database.

        Args:
            user_id: User UUID

        Returns:
            ExecutionState (existing or new)
        """
        if not self.supabase:
            return ExecutionState()

        session_id = self._get_session_id(user_id)

        try:
            result = self.supabase.table("agent_sessions") \
                .select("state") \
                .eq("session_id", session_id) \
                .eq("user_id", user_id) \
                .maybe_single() \
                .execute()

            if result.data and result.data.get("state"):
                return ExecutionState.from_dict(result.data["state"])

            return ExecutionState()

        except Exception as e:
            logger.error(f"Error loading state for {self.name}: {e}")
            return ExecutionState()

    async def _save_state(self, user_id: str, state: ExecutionState) -> None:
        """
        Save execution state to database.

        Args:
            user_id: User UUID
            state: State to save
        """
        if not self.supabase:
            return

        session_id = self._get_session_id(user_id)

        try:
            # Upsert the session with state
            self.supabase.table("agent_sessions") \
                .upsert({
                    "session_id": session_id,
                    "user_id": user_id,
                    "agent_name": f"proactive_{self.name}",
                    "state": state.to_dict(),
                    "messages": [],  # Proactive agents don't have conversation history
                    "updated_at": datetime.utcnow().isoformat(),
                    "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
                }) \
                .execute()

        except Exception as e:
            logger.error(f"Error saving state for {self.name}: {e}")

    async def store_in_memory(
        self,
        user_id: str,
        key: str,
        value: Any,
        category: str = "proactive",
        module: Optional[str] = None,
        confidence: float = 1.0
    ) -> bool:
        """
        Store a value in user_memory table.

        Args:
            user_id: User UUID
            key: Memory key
            value: Value to store (will be JSON serialized)
            category: Memory category (default: "proactive")
            module: Optional module association
            confidence: Confidence score (0-1)

        Returns:
            True if stored successfully
        """
        if not self.supabase:
            return False

        try:
            memory_data = {
                "user_id": user_id,
                "category": category,
                "module": module,
                "key": key,
                "value": json.dumps(value) if not isinstance(value, str) else value,
                "source": f"proactive_{self.name}",
                "confidence": confidence,
            }

            self.supabase.table("user_memory") \
                .upsert(memory_data, on_conflict="user_id,category,key,module") \
                .execute()

            return True

        except Exception as e:
            logger.error(f"Error storing memory for {self.name}: {e}")
            return False

    async def get_from_memory(
        self,
        user_id: str,
        key: str,
        category: str = "proactive",
        module: Optional[str] = None
    ) -> Optional[Any]:
        """
        Retrieve a value from user_memory table.

        Args:
            user_id: User UUID
            key: Memory key
            category: Memory category
            module: Optional module filter

        Returns:
            Stored value or None
        """
        if not self.supabase:
            return None

        try:
            query = self.supabase.table("user_memory") \
                .select("value") \
                .eq("user_id", user_id) \
                .eq("category", category) \
                .eq("key", key)

            if module:
                query = query.eq("module", module)
            else:
                query = query.is_("module", "null")

            result = query.maybe_single().execute()

            if result.data:
                value = result.data.get("value")
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value

            return None

        except Exception as e:
            logger.error(f"Error getting memory for {self.name}: {e}")
            return None

    def get_info(self) -> Dict[str, Any]:
        """Get agent information as dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "schedule": self.schedule.to_dict(),
            "max_retries": self.max_retries,
            "retry_delay_seconds": self.retry_delay_seconds,
        }
