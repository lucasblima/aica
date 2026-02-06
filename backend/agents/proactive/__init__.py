"""
AICA Life OS - Proactive Agents Module (Task #43)

Provides proactive agents that run on schedules or triggers, not just
in response to user requests. These agents gather information, generate
alerts, and store insights for later retrieval.

Available Agents:
- MorningBriefingAgent: Daily personalized briefing (7:00 AM)
- DeadlineWatcherAgent: Monitors deadlines every 6 hours
- PatternAnalyzerAgent: Weekly cross-module pattern analysis (Sunday 21:00)
- SessionCleanupAgent: Daily maintenance tasks (3:00 AM)

Architecture:
- Agents inherit from ProactiveAgent base class
- Scheduler manages registration and triggering
- External triggers via pg_cron, Edge Function, or HTTP webhooks

Usage:
    from backend.agents.proactive import (
        # Scheduler
        ProactiveScheduler,
        get_scheduler,
        trigger_agent,
        register_agent,

        # Agents
        MorningBriefingAgent,
        DeadlineWatcherAgent,
        PatternAnalyzerAgent,
        SessionCleanupAgent,

        # Base classes
        ProactiveAgent,
        ProactiveResult,
        Schedule,
        ScheduleType,
    )

    # Register all agents at startup
    scheduler = get_scheduler()
    scheduler.register(MorningBriefingAgent())
    scheduler.register(DeadlineWatcherAgent())
    scheduler.register(PatternAnalyzerAgent())
    scheduler.register(SessionCleanupAgent())

    # Trigger agent for a user (called by external scheduler)
    result = await trigger_agent("morning_briefing", user_id)

    # Trigger for all users
    results = await trigger_agent_for_all("morning_briefing")

References:
- Task #43: Proactive Agents (Scheduled Tasks and Triggers)
"""

from .base import (
    ProactiveAgent,
    ProactiveResult,
    Schedule,
    ScheduleType,
    ExecutionState,
)

from .scheduler import (
    ProactiveScheduler,
    get_scheduler,
    trigger_agent,
    trigger_agent_for_all,
    register_agent,
    list_agents,
    get_due_agents,
)

from .morning_briefing import (
    MorningBriefingAgent,
    create_morning_briefing_agent,
)

from .deadline_watcher import (
    DeadlineWatcherAgent,
    create_deadline_watcher_agent,
    DeadlineAlert,
    AlertPriority,
)

from .pattern_analyzer import (
    PatternAnalyzerAgent,
    create_pattern_analyzer_agent,
    WeeklyPattern,
)

from .session_cleanup import (
    SessionCleanupAgent,
    create_session_cleanup_agent,
)


# =============================================================================
# AUTO-REGISTRATION
# =============================================================================

def register_all_agents() -> None:
    """
    Register all proactive agents with the scheduler.

    Call this at application startup to enable proactive features.

    Example:
        # In your main.py or __init__.py:
        from backend.agents.proactive import register_all_agents
        register_all_agents()
    """
    scheduler = get_scheduler()

    # Register all agents
    scheduler.register(MorningBriefingAgent())
    scheduler.register(DeadlineWatcherAgent())
    scheduler.register(PatternAnalyzerAgent())
    scheduler.register(SessionCleanupAgent())


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Base classes
    "ProactiveAgent",
    "ProactiveResult",
    "Schedule",
    "ScheduleType",
    "ExecutionState",

    # Scheduler
    "ProactiveScheduler",
    "get_scheduler",
    "trigger_agent",
    "trigger_agent_for_all",
    "register_agent",
    "list_agents",
    "get_due_agents",

    # Morning Briefing
    "MorningBriefingAgent",
    "create_morning_briefing_agent",

    # Deadline Watcher
    "DeadlineWatcherAgent",
    "create_deadline_watcher_agent",
    "DeadlineAlert",
    "AlertPriority",

    # Pattern Analyzer
    "PatternAnalyzerAgent",
    "create_pattern_analyzer_agent",
    "WeeklyPattern",

    # Session Cleanup
    "SessionCleanupAgent",
    "create_session_cleanup_agent",

    # Auto-registration
    "register_all_agents",
]
