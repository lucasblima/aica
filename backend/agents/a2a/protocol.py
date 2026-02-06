"""
A2A Communication Protocol (Task #44)

Defines the message format and types for inter-agent communication.

Message Types:
- REQUEST: Request data or action from another agent
- RESPONSE: Response to a request
- EVENT: Broadcast event to all or specific agents
- NOTIFICATION: One-way notification (no response expected)

Security:
- Messages include source/target validation
- Correlation IDs for request-response matching
- Timestamp for ordering and expiration
"""

import uuid
import json
from typing import Optional, Dict, Any, Literal, Union
from datetime import datetime
from dataclasses import dataclass, asdict, field
from enum import Enum


class MessageType(Enum):
    """Types of A2A messages."""
    REQUEST = "request"      # Request data or action
    RESPONSE = "response"    # Response to a request
    EVENT = "event"          # Broadcast event
    NOTIFICATION = "notification"  # One-way notification


class MessagePriority(Enum):
    """Priority levels for messages."""
    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


@dataclass
class A2AMessage:
    """
    Message format for inter-agent communication.

    Attributes:
        message_id: Unique identifier for this message
        source_agent: Name of the sending agent
        target_agent: Name of the receiving agent ("*" for broadcast)
        message_type: Type of message (request, response, event, notification)
        action: The action being requested or performed
        payload: Message data (JSON-serializable)
        correlation_id: ID linking request to response
        timestamp: Message creation time
        ttl_seconds: Time-to-live (0 = no expiration)
        priority: Message priority
        user_id: Associated user ID (for context)
        session_id: Associated session ID
        metadata: Additional metadata
    """
    source_agent: str
    target_agent: str
    message_type: MessageType
    action: str
    payload: Dict[str, Any] = field(default_factory=dict)
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    ttl_seconds: int = 30  # Default 30 second TTL
    priority: MessagePriority = MessagePriority.NORMAL
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate message after initialization."""
        if not self.source_agent:
            raise ValueError("source_agent is required")
        if not self.target_agent:
            raise ValueError("target_agent is required")
        if not self.action:
            raise ValueError("action is required")

        # Convert enums if needed
        if isinstance(self.message_type, str):
            self.message_type = MessageType(self.message_type)
        if isinstance(self.priority, int):
            self.priority = MessagePriority(self.priority)

    @property
    def is_broadcast(self) -> bool:
        """Check if this is a broadcast message."""
        return self.target_agent == "*"

    @property
    def is_expired(self) -> bool:
        """Check if message has expired."""
        if self.ttl_seconds <= 0:
            return False
        age = (datetime.utcnow() - self.timestamp).total_seconds()
        return age > self.ttl_seconds

    @property
    def is_request(self) -> bool:
        """Check if this is a request message."""
        return self.message_type == MessageType.REQUEST

    @property
    def is_response(self) -> bool:
        """Check if this is a response message."""
        return self.message_type == MessageType.RESPONSE

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "message_id": self.message_id,
            "source_agent": self.source_agent,
            "target_agent": self.target_agent,
            "message_type": self.message_type.value,
            "action": self.action,
            "payload": self.payload,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp.isoformat(),
            "ttl_seconds": self.ttl_seconds,
            "priority": self.priority.value,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "metadata": self.metadata,
        }

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), default=str)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "A2AMessage":
        """Create message from dictionary."""
        # Parse timestamp
        timestamp = data.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        elif timestamp is None:
            timestamp = datetime.utcnow()

        return cls(
            message_id=data.get("message_id", str(uuid.uuid4())),
            source_agent=data["source_agent"],
            target_agent=data["target_agent"],
            message_type=MessageType(data["message_type"]),
            action=data["action"],
            payload=data.get("payload", {}),
            correlation_id=data.get("correlation_id"),
            timestamp=timestamp,
            ttl_seconds=data.get("ttl_seconds", 30),
            priority=MessagePriority(data.get("priority", 1)),
            user_id=data.get("user_id"),
            session_id=data.get("session_id"),
            metadata=data.get("metadata", {}),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "A2AMessage":
        """Create message from JSON string."""
        return cls.from_dict(json.loads(json_str))


@dataclass
class A2AResponse:
    """
    Response to an A2A request.

    Attributes:
        success: Whether the request was successful
        data: Response data
        error: Error message if not successful
        request_id: ID of the original request
        source_agent: Agent that sent the response
    """
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    request_id: Optional[str] = None
    source_agent: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "request_id": self.request_id,
            "source_agent": self.source_agent,
        }

    @classmethod
    def from_message(cls, message: A2AMessage) -> "A2AResponse":
        """Create response from a response message."""
        return cls(
            success=message.payload.get("success", True),
            data=message.payload.get("data"),
            error=message.payload.get("error"),
            request_id=message.correlation_id,
            source_agent=message.source_agent,
        )


def create_request(
    source_agent: str,
    target_agent: str,
    action: str,
    payload: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    ttl_seconds: int = 30,
    priority: MessagePriority = MessagePriority.NORMAL
) -> A2AMessage:
    """
    Create a request message.

    Args:
        source_agent: Sending agent name
        target_agent: Target agent name
        action: Action to request
        payload: Request data
        user_id: Associated user ID
        session_id: Associated session ID
        ttl_seconds: Request timeout
        priority: Message priority

    Returns:
        A2AMessage configured as a request
    """
    message_id = str(uuid.uuid4())
    return A2AMessage(
        message_id=message_id,
        source_agent=source_agent,
        target_agent=target_agent,
        message_type=MessageType.REQUEST,
        action=action,
        payload=payload or {},
        correlation_id=message_id,  # Use message_id for correlation
        user_id=user_id,
        session_id=session_id,
        ttl_seconds=ttl_seconds,
        priority=priority,
    )


def create_response(
    request: A2AMessage,
    success: bool,
    data: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
) -> A2AMessage:
    """
    Create a response message for a request.

    Args:
        request: Original request message
        success: Whether request was successful
        data: Response data
        error: Error message if not successful

    Returns:
        A2AMessage configured as a response
    """
    return A2AMessage(
        source_agent=request.target_agent,  # Responder is original target
        target_agent=request.source_agent,  # Send back to requester
        message_type=MessageType.RESPONSE,
        action=f"{request.action}_response",
        payload={
            "success": success,
            "data": data,
            "error": error,
        },
        correlation_id=request.correlation_id,
        user_id=request.user_id,
        session_id=request.session_id,
        ttl_seconds=10,  # Responses have shorter TTL
    )


def create_event(
    source_agent: str,
    action: str,
    payload: Optional[Dict[str, Any]] = None,
    target_agent: str = "*",  # Broadcast by default
    user_id: Optional[str] = None,
    priority: MessagePriority = MessagePriority.NORMAL
) -> A2AMessage:
    """
    Create an event message.

    Args:
        source_agent: Sending agent name
        action: Event type/name
        payload: Event data
        target_agent: Target agent or "*" for broadcast
        user_id: Associated user ID
        priority: Message priority

    Returns:
        A2AMessage configured as an event
    """
    return A2AMessage(
        source_agent=source_agent,
        target_agent=target_agent,
        message_type=MessageType.EVENT,
        action=action,
        payload=payload or {},
        user_id=user_id,
        priority=priority,
        ttl_seconds=60,  # Events have longer TTL for late subscribers
    )


def create_notification(
    source_agent: str,
    target_agent: str,
    action: str,
    payload: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> A2AMessage:
    """
    Create a notification message (no response expected).

    Args:
        source_agent: Sending agent name
        target_agent: Target agent name
        action: Notification type
        payload: Notification data
        user_id: Associated user ID

    Returns:
        A2AMessage configured as a notification
    """
    return A2AMessage(
        source_agent=source_agent,
        target_agent=target_agent,
        message_type=MessageType.NOTIFICATION,
        action=action,
        payload=payload or {},
        user_id=user_id,
        ttl_seconds=0,  # Notifications don't expire
    )


# Predefined action names for common patterns
class A2AActions:
    """Standard A2A action names."""
    # Data requests
    GET_USER_CONTEXT = "get_user_context"
    GET_EMOTIONAL_STATE = "get_emotional_state"
    GET_TASK_STATUS = "get_task_status"
    GET_FINANCIAL_CONTEXT = "get_financial_context"
    GET_CONTACT_INFO = "get_contact_info"
    GET_GRANT_DEADLINES = "get_grant_deadlines"

    # Notifications
    TASK_COMPLETED = "task_completed"
    DEADLINE_APPROACHING = "deadline_approaching"
    PATTERN_DETECTED = "pattern_detected"
    INSIGHT_GENERATED = "insight_generated"

    # Events
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"
    USER_ACTIVE = "user_active"
    MEMORY_UPDATED = "memory_updated"

    # Delegations
    DELEGATE_TASK = "delegate_task"
    DELEGATE_ANALYSIS = "delegate_analysis"
