"""
A2A Common Handlers (Task #44)

Pre-built handlers for common inter-agent communication patterns.

Patterns:
- request_data: Request data from another agent
- notify_completion: Notify that a task is complete
- broadcast_event: Broadcast an event to all agents
- delegate_task: Hand off a task to a specialist agent

Usage:
    from agents.a2a.handlers import request_data, delegate_task

    # Request emotional context from Journey agent
    context = await request_data(
        source="atlas_agent",
        target="journey_agent",
        action="get_emotional_context",
        payload={"user_id": user_id}
    )

    # Delegate analysis to specialist
    await delegate_task(
        source="coordinator",
        target="captacao_agent",
        task="analyze_edital",
        data={"document_id": doc_id}
    )
"""

import logging
from typing import Optional, Dict, Any, List, Callable, Awaitable

from .protocol import (
    A2AMessage,
    A2AResponse,
    MessageType,
    MessagePriority,
    A2AActions,
    create_request,
    create_event,
    create_notification,
)
from .message_bus import (
    MessageBus,
    get_message_bus,
    MessageHandler,
)

logger = logging.getLogger(__name__)


async def request_data(
    source: str,
    target: str,
    action: str,
    payload: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    timeout: float = 30.0
) -> A2AResponse:
    """
    Request data from another agent.

    Args:
        source: Source agent name
        target: Target agent name
        action: Action/data type to request
        payload: Request parameters
        user_id: Associated user ID
        timeout: Response timeout in seconds

    Returns:
        A2AResponse with requested data

    Examples:
        # Get emotional context from Journey
        response = await request_data(
            source="atlas_agent",
            target="journey_agent",
            action="get_emotional_context",
            payload={"user_id": "uuid"},
            timeout=10.0
        )
        if response.success:
            emotional_state = response.data["emotional_state"]
    """
    bus = get_message_bus()

    message = create_request(
        source_agent=source,
        target_agent=target,
        action=action,
        payload=payload or {},
        user_id=user_id,
        ttl_seconds=int(timeout),
    )

    try:
        response = await bus.request(message, timeout=timeout)
        return response
    except Exception as e:
        logger.error(f"Request to {target} failed: {e}")
        return A2AResponse(
            success=False,
            error=str(e),
            request_id=message.correlation_id,
            source_agent=source,
        )


async def notify_completion(
    source: str,
    target: str,
    task_name: str,
    result: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> bool:
    """
    Notify an agent that a task has been completed.

    Args:
        source: Source agent name
        target: Target agent name
        task_name: Name of completed task
        result: Task result data
        user_id: Associated user ID

    Returns:
        True if notification was sent

    Examples:
        # Notify Atlas that deadline analysis is complete
        await notify_completion(
            source="captacao_agent",
            target="atlas_agent",
            task_name="deadline_analysis",
            result={"deadlines": [...]}
        )
    """
    bus = get_message_bus()

    message = create_notification(
        source_agent=source,
        target_agent=target,
        action=A2AActions.TASK_COMPLETED,
        payload={
            "task_name": task_name,
            "result": result or {},
            "completed_at": __import__("datetime").datetime.utcnow().isoformat(),
        },
        user_id=user_id,
    )

    return await bus.send(message)


async def broadcast_event(
    source: str,
    event_name: str,
    payload: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    exclude_agents: Optional[List[str]] = None
) -> int:
    """
    Broadcast an event to all agents.

    Args:
        source: Source agent name
        event_name: Event name/type
        payload: Event data
        user_id: Associated user ID
        exclude_agents: Agents to exclude from broadcast

    Returns:
        Number of agents that received the event

    Examples:
        # Broadcast that user memory was updated
        await broadcast_event(
            source="coordinator",
            event_name="memory_updated",
            payload={"category": "preference", "key": "language"}
        )
    """
    bus = get_message_bus()

    # Get all subscribers except excluded
    subscribers = bus.get_subscribers() - {source}
    if exclude_agents:
        subscribers -= set(exclude_agents)

    message = create_event(
        source_agent=source,
        action=event_name,
        payload=payload or {},
        user_id=user_id,
    )

    # Send to all subscribers
    sent_count = 0
    for target in subscribers:
        target_message = A2AMessage(
            source_agent=source,
            target_agent=target,
            message_type=MessageType.EVENT,
            action=event_name,
            payload=payload or {},
            user_id=user_id,
        )
        if await bus.send(target_message):
            sent_count += 1

    return sent_count


async def delegate_task(
    source: str,
    target: str,
    task: str,
    data: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    wait_for_result: bool = False,
    timeout: float = 60.0
) -> Optional[A2AResponse]:
    """
    Delegate a task to a specialist agent.

    Args:
        source: Source agent name
        target: Target agent name
        task: Task identifier
        data: Task data/parameters
        user_id: Associated user ID
        wait_for_result: If True, wait for task completion
        timeout: Timeout for waiting (if wait_for_result)

    Returns:
        A2AResponse if wait_for_result, None otherwise

    Examples:
        # Delegate edital analysis to Captacao agent
        result = await delegate_task(
            source="coordinator",
            target="captacao_agent",
            task="analyze_edital",
            data={"document_id": "uuid"},
            wait_for_result=True,
            timeout=120.0
        )
    """
    bus = get_message_bus()

    message = create_request(
        source_agent=source,
        target_agent=target,
        action=A2AActions.DELEGATE_TASK,
        payload={
            "task": task,
            "data": data or {},
        },
        user_id=user_id,
        ttl_seconds=int(timeout),
        priority=MessagePriority.HIGH,
    )

    if wait_for_result:
        try:
            return await bus.request(message, timeout=timeout)
        except Exception as e:
            logger.error(f"Task delegation to {target} failed: {e}")
            return A2AResponse(success=False, error=str(e))
    else:
        await bus.send(message)
        return None


class A2AHandlers:
    """
    Handler registry for A2A communication.

    Provides a convenient way to register handlers for different
    action types within an agent.

    Usage:
        handlers = A2AHandlers("my_agent")

        @handlers.on("get_user_context")
        async def handle_context(message: A2AMessage) -> A2AResponse:
            user_id = message.payload.get("user_id")
            context = await fetch_context(user_id)
            return A2AResponse(success=True, data={"context": context})

        # Register with message bus
        handlers.register()
    """

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self._handlers: Dict[str, MessageHandler] = {}
        self._bus: Optional[MessageBus] = None

    def on(
        self,
        action: str
    ) -> Callable[[MessageHandler], MessageHandler]:
        """
        Decorator to register a handler for an action.

        Args:
            action: Action name to handle

        Returns:
            Decorator function
        """
        def decorator(handler: MessageHandler) -> MessageHandler:
            self._handlers[action] = handler
            return handler
        return decorator

    def add_handler(self, action: str, handler: MessageHandler) -> None:
        """Register a handler for an action."""
        self._handlers[action] = handler

    def remove_handler(self, action: str) -> None:
        """Remove a handler for an action."""
        self._handlers.pop(action, None)

    async def handle_message(self, message: A2AMessage) -> Optional[A2AResponse]:
        """
        Route message to appropriate handler.

        Args:
            message: Incoming A2A message

        Returns:
            A2AResponse if handler returns one
        """
        action = message.action
        handler = self._handlers.get(action)

        if not handler:
            logger.warning(f"No handler for action '{action}' in {self.agent_name}")
            return A2AResponse(
                success=False,
                error=f"Unknown action: {action}"
            )

        try:
            return await handler(message)
        except Exception as e:
            logger.error(f"Handler error for {action}: {e}", exc_info=True)
            return A2AResponse(
                success=False,
                error=str(e)
            )

    def register(self, bus: Optional[MessageBus] = None) -> None:
        """
        Register this handler with the message bus.

        Args:
            bus: Optional message bus (uses global if not provided)
        """
        self._bus = bus or get_message_bus()
        self._bus.subscribe(self.agent_name, self.handle_message)
        logger.info(f"Registered A2A handlers for {self.agent_name}")

    def unregister(self) -> None:
        """Unregister from the message bus."""
        if self._bus:
            self._bus.unsubscribe(self.agent_name)
            logger.info(f"Unregistered A2A handlers for {self.agent_name}")

    def get_registered_actions(self) -> List[str]:
        """Get list of registered action handlers."""
        return list(self._handlers.keys())


# Convenience function to get handlers for common patterns
def get_handlers() -> A2AHandlers:
    """Create a new A2AHandlers instance."""
    return A2AHandlers("generic")


# Pre-built handler factories for common patterns
def create_data_provider_handler(
    fetch_fn: Callable[[str, Dict[str, Any]], Awaitable[Dict[str, Any]]]
) -> MessageHandler:
    """
    Create a handler that provides data in response to requests.

    Args:
        fetch_fn: Async function(user_id, params) -> data

    Returns:
        MessageHandler function
    """
    async def handler(message: A2AMessage) -> A2AResponse:
        user_id = message.user_id or message.payload.get("user_id")
        if not user_id:
            return A2AResponse(success=False, error="user_id required")

        try:
            data = await fetch_fn(user_id, message.payload)
            return A2AResponse(success=True, data=data)
        except Exception as e:
            return A2AResponse(success=False, error=str(e))

    return handler


def create_notification_handler(
    notify_fn: Callable[[A2AMessage], Awaitable[None]]
) -> MessageHandler:
    """
    Create a handler for processing notifications.

    Args:
        notify_fn: Async function to process notification

    Returns:
        MessageHandler function
    """
    async def handler(message: A2AMessage) -> Optional[A2AResponse]:
        try:
            await notify_fn(message)
            return None  # Notifications don't require response
        except Exception as e:
            logger.error(f"Notification handler error: {e}")
            return None

    return handler


def create_task_handler(
    task_fn: Callable[[str, Dict[str, Any]], Awaitable[Dict[str, Any]]]
) -> MessageHandler:
    """
    Create a handler for delegated tasks.

    Args:
        task_fn: Async function(task_name, data) -> result

    Returns:
        MessageHandler function
    """
    async def handler(message: A2AMessage) -> A2AResponse:
        task = message.payload.get("task")
        data = message.payload.get("data", {})

        if not task:
            return A2AResponse(success=False, error="task name required")

        try:
            result = await task_fn(task, data)
            return A2AResponse(success=True, data=result)
        except Exception as e:
            return A2AResponse(success=False, error=str(e))

    return handler
