"""
AICA Life OS - Agent-to-Agent (A2A) Communication Module (Task #44)

Implements secure inter-agent communication for the multi-agent system.

Features:
- A2A message protocol with typed messages
- In-memory pub/sub message bus
- Request/response patterns with timeout
- Event broadcasting to all agents
- Task delegation between agents

Use Cases:
- Atlas requests emotional context from Journey
- Captacao notifies Atlas of deadline updates
- Studio requests contact info from Connections
- Cross-module insights broadcast to all agents

Usage:
    from agents.a2a import get_message_bus, A2AMessage, MessageType

    bus = get_message_bus()

    # Subscribe to messages
    async def handler(message: A2AMessage):
        print(f"Received: {message.payload}")

    bus.subscribe("journey_agent", handler)

    # Send a message
    await bus.send(A2AMessage(
        source_agent="atlas_agent",
        target_agent="journey_agent",
        message_type=MessageType.REQUEST,
        action="get_emotional_context",
        payload={"user_id": "uuid"}
    ))

References:
- Task #44: Observability, A2A Communication, and LGPD Compliance
"""

from .protocol import (
    A2AMessage,
    A2AResponse,
    MessageType,
    create_request,
    create_response,
    create_event,
)
from .message_bus import (
    MessageBus,
    get_message_bus,
    MessageHandler,
)
from .handlers import (
    A2AHandlers,
    request_data,
    notify_completion,
    broadcast_event,
    delegate_task,
    get_handlers,
)

__all__ = [
    # Protocol
    "A2AMessage",
    "A2AResponse",
    "MessageType",
    "create_request",
    "create_response",
    "create_event",
    # Message Bus
    "MessageBus",
    "get_message_bus",
    "MessageHandler",
    # Handlers
    "A2AHandlers",
    "request_data",
    "notify_completion",
    "broadcast_event",
    "delegate_task",
    "get_handlers",
]
