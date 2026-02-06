"""
A2A Message Bus (Task #44)

In-memory pub/sub message bus for inter-agent communication.

Features:
- Agent subscription by name
- Message routing by target agent
- Request-response pattern with timeout
- Broadcast support
- Dead letter queue for failed deliveries

Architecture:
- Single-process: In-memory queues with asyncio
- Distributed: Can be extended with Supabase Realtime (future)
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List, Callable, Awaitable, Set
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

from .protocol import (
    A2AMessage,
    A2AResponse,
    MessageType,
    create_response,
)

logger = logging.getLogger(__name__)

# Type alias for message handlers
MessageHandler = Callable[[A2AMessage], Awaitable[Optional[A2AResponse]]]


@dataclass
class PendingRequest:
    """Tracks a pending request awaiting response."""
    request: A2AMessage
    future: asyncio.Future
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Subscription:
    """Agent subscription to the message bus."""
    agent_name: str
    handler: MessageHandler
    filters: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


class MessageBus:
    """
    In-memory message bus for A2A communication.

    Provides:
    - Agent registration and subscription
    - Message routing (targeted and broadcast)
    - Request-response correlation
    - Error handling and dead letter queue

    Usage:
        bus = MessageBus()

        # Subscribe to messages
        async def my_handler(message: A2AMessage) -> Optional[A2AResponse]:
            return A2AResponse(success=True, data={"result": "ok"})

        bus.subscribe("my_agent", my_handler)

        # Send a request and wait for response
        response = await bus.request(message, timeout=10.0)
    """

    def __init__(self):
        # Subscriptions by agent name
        self._subscriptions: Dict[str, List[Subscription]] = defaultdict(list)

        # Pending requests awaiting responses
        self._pending_requests: Dict[str, PendingRequest] = {}

        # Dead letter queue for failed messages
        self._dead_letters: List[A2AMessage] = []

        # Message history (for debugging)
        self._message_history: List[A2AMessage] = []
        self._max_history = 1000

        # Statistics
        self._stats = {
            "messages_sent": 0,
            "messages_delivered": 0,
            "messages_failed": 0,
            "broadcasts_sent": 0,
            "requests_sent": 0,
            "responses_received": 0,
        }

        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

        logger.info("MessageBus initialized")

    def subscribe(
        self,
        agent_name: str,
        handler: MessageHandler,
        filters: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Subscribe an agent to receive messages.

        Args:
            agent_name: Unique name of the agent
            handler: Async function to handle messages
            filters: Optional filters (e.g., {"action": "get_*"})
        """
        subscription = Subscription(
            agent_name=agent_name,
            handler=handler,
            filters=filters,
        )
        self._subscriptions[agent_name].append(subscription)
        logger.info(f"Agent '{agent_name}' subscribed to message bus")

    def unsubscribe(self, agent_name: str) -> None:
        """
        Unsubscribe an agent from the message bus.

        Args:
            agent_name: Name of the agent to unsubscribe
        """
        if agent_name in self._subscriptions:
            del self._subscriptions[agent_name]
            logger.info(f"Agent '{agent_name}' unsubscribed from message bus")

    def get_subscribers(self) -> Set[str]:
        """Get list of all subscribed agent names."""
        return set(self._subscriptions.keys())

    async def send(
        self,
        message: A2AMessage,
        wait_for_delivery: bool = False
    ) -> bool:
        """
        Send a message to the target agent(s).

        Args:
            message: Message to send
            wait_for_delivery: If True, wait for handler completion

        Returns:
            True if message was delivered, False otherwise
        """
        async with self._lock:
            self._stats["messages_sent"] += 1
            self._add_to_history(message)

        # Check for expiration
        if message.is_expired:
            logger.warning(f"Message {message.message_id} expired, not delivered")
            self._add_to_dead_letter(message)
            return False

        # Handle broadcast
        if message.is_broadcast:
            return await self._broadcast(message, wait_for_delivery)

        # Handle targeted message
        return await self._deliver(message, wait_for_delivery)

    async def request(
        self,
        message: A2AMessage,
        timeout: float = 30.0
    ) -> A2AResponse:
        """
        Send a request and wait for response.

        Args:
            message: Request message
            timeout: Response timeout in seconds

        Returns:
            A2AResponse from the target agent

        Raises:
            asyncio.TimeoutError: If no response within timeout
            ValueError: If target agent not found
        """
        if message.message_type != MessageType.REQUEST:
            message.message_type = MessageType.REQUEST

        # Create future for response
        loop = asyncio.get_event_loop()
        future = loop.create_future()

        # Track pending request
        self._pending_requests[message.correlation_id] = PendingRequest(
            request=message,
            future=future,
        )

        async with self._lock:
            self._stats["requests_sent"] += 1

        try:
            # Send the request
            delivered = await self.send(message)
            if not delivered:
                raise ValueError(f"Failed to deliver request to {message.target_agent}")

            # Wait for response with timeout
            response = await asyncio.wait_for(future, timeout=timeout)
            return response

        except asyncio.TimeoutError:
            logger.warning(
                f"Request {message.correlation_id} to {message.target_agent} "
                f"timed out after {timeout}s"
            )
            raise

        finally:
            # Clean up pending request
            self._pending_requests.pop(message.correlation_id, None)

    async def respond(
        self,
        request: A2AMessage,
        success: bool,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> bool:
        """
        Send a response to a request message.

        Args:
            request: Original request message
            success: Whether request was handled successfully
            data: Response data
            error: Error message if not successful

        Returns:
            True if response was sent
        """
        response_message = create_response(request, success, data, error)
        return await self.send(response_message)

    async def broadcast(
        self,
        source_agent: str,
        action: str,
        payload: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> int:
        """
        Broadcast a message to all agents.

        Args:
            source_agent: Sending agent name
            action: Event/action name
            payload: Message data
            user_id: Associated user ID

        Returns:
            Number of agents that received the message
        """
        from .protocol import create_event
        message = create_event(
            source_agent=source_agent,
            action=action,
            payload=payload,
            user_id=user_id,
        )
        await self._broadcast(message, wait_for_delivery=False)

        async with self._lock:
            self._stats["broadcasts_sent"] += 1

        return len(self._subscriptions)

    async def _deliver(
        self,
        message: A2AMessage,
        wait_for_delivery: bool
    ) -> bool:
        """Deliver message to a specific agent."""
        target = message.target_agent

        if target not in self._subscriptions:
            logger.warning(f"No subscribers for agent '{target}'")
            self._add_to_dead_letter(message)
            return False

        subscriptions = self._subscriptions[target]
        delivered = False

        for subscription in subscriptions:
            # Check filters
            if not self._matches_filter(message, subscription.filters):
                continue

            try:
                if wait_for_delivery:
                    result = await subscription.handler(message)
                else:
                    # Fire and forget
                    asyncio.create_task(
                        self._safe_handle(subscription, message)
                    )
                    result = None

                delivered = True

                # Handle response for request messages
                if message.is_response and message.correlation_id:
                    await self._handle_response(message)

            except Exception as e:
                logger.error(
                    f"Error delivering message to {target}: {e}",
                    exc_info=True
                )

        if delivered:
            async with self._lock:
                self._stats["messages_delivered"] += 1
        else:
            async with self._lock:
                self._stats["messages_failed"] += 1
            self._add_to_dead_letter(message)

        return delivered

    async def _broadcast(
        self,
        message: A2AMessage,
        wait_for_delivery: bool
    ) -> bool:
        """Broadcast message to all agents except sender."""
        source = message.source_agent
        tasks = []

        for agent_name, subscriptions in self._subscriptions.items():
            # Don't send to self
            if agent_name == source:
                continue

            for subscription in subscriptions:
                if self._matches_filter(message, subscription.filters):
                    if wait_for_delivery:
                        tasks.append(
                            self._safe_handle(subscription, message)
                        )
                    else:
                        asyncio.create_task(
                            self._safe_handle(subscription, message)
                        )

        if wait_for_delivery and tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        async with self._lock:
            self._stats["messages_delivered"] += len(self._subscriptions) - 1

        return True

    async def _safe_handle(
        self,
        subscription: Subscription,
        message: A2AMessage
    ) -> Optional[A2AResponse]:
        """Safely invoke a message handler."""
        try:
            result = await subscription.handler(message)

            # If handler returned a response for a request, send it
            if result and message.is_request:
                await self.respond(
                    message,
                    success=result.success,
                    data=result.data,
                    error=result.error
                )

            return result

        except Exception as e:
            logger.error(
                f"Handler error for {subscription.agent_name}: {e}",
                exc_info=True
            )
            # Send error response for requests
            if message.is_request:
                await self.respond(
                    message,
                    success=False,
                    error=str(e)
                )
            return None

    async def _handle_response(self, message: A2AMessage) -> None:
        """Handle incoming response message."""
        correlation_id = message.correlation_id

        if correlation_id in self._pending_requests:
            pending = self._pending_requests[correlation_id]

            if not pending.future.done():
                response = A2AResponse.from_message(message)
                pending.future.set_result(response)

                async with self._lock:
                    self._stats["responses_received"] += 1

    def _matches_filter(
        self,
        message: A2AMessage,
        filters: Optional[Dict[str, Any]]
    ) -> bool:
        """Check if message matches subscription filters."""
        if not filters:
            return True

        # Check action filter (supports wildcards)
        if "action" in filters:
            action_filter = filters["action"]
            if action_filter.endswith("*"):
                if not message.action.startswith(action_filter[:-1]):
                    return False
            elif message.action != action_filter:
                return False

        # Check message type filter
        if "message_type" in filters:
            if message.message_type.value != filters["message_type"]:
                return False

        # Check user_id filter
        if "user_id" in filters:
            if message.user_id != filters["user_id"]:
                return False

        return True

    def _add_to_history(self, message: A2AMessage) -> None:
        """Add message to history (for debugging)."""
        self._message_history.append(message)
        if len(self._message_history) > self._max_history:
            self._message_history = self._message_history[-self._max_history:]

    def _add_to_dead_letter(self, message: A2AMessage) -> None:
        """Add undeliverable message to dead letter queue."""
        self._dead_letters.append(message)
        # Limit dead letter queue size
        if len(self._dead_letters) > 100:
            self._dead_letters = self._dead_letters[-100:]

    def get_stats(self) -> Dict[str, Any]:
        """Get message bus statistics."""
        return {
            **self._stats,
            "subscribers": len(self._subscriptions),
            "pending_requests": len(self._pending_requests),
            "dead_letters": len(self._dead_letters),
        }

    def get_dead_letters(self) -> List[A2AMessage]:
        """Get dead letter queue contents."""
        return self._dead_letters.copy()

    def clear_dead_letters(self) -> int:
        """Clear dead letter queue and return count."""
        count = len(self._dead_letters)
        self._dead_letters.clear()
        return count


# Global message bus instance
_message_bus: Optional[MessageBus] = None


def get_message_bus() -> MessageBus:
    """Get the global message bus instance."""
    global _message_bus
    if _message_bus is None:
        _message_bus = MessageBus()
    return _message_bus


def reset_message_bus() -> None:
    """Reset the global message bus (for testing)."""
    global _message_bus
    _message_bus = None
