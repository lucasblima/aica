"""
Structured Logging for AICA Agents (Task #44)

Provides JSON-structured logging with:
- Correlation IDs (trace_id, span_id) from OpenTelemetry
- Log levels (DEBUG, INFO, WARN, ERROR)
- Sensitive data masking (PII, passwords, tokens)
- Contextual fields (user_id, agent_name, session_id)

Usage:
    from agents.observability.logging import get_logger, mask_sensitive_data

    logger = get_logger(__name__)
    logger.info("Agent executed", extra={"agent": "atlas", "user_id": user_id})

    # Automatic PII masking
    safe_data = mask_sensitive_data({"email": "user@example.com"})

Environment Variables:
- LOG_LEVEL: Logging level (default: INFO)
- LOG_FORMAT: Format (json or text, default: json)
- AUDIT_LOG_ENABLED: Enable audit logging (default: true)
"""

import os
import sys
import json
import logging
import re
from typing import Optional, Dict, Any, List, Pattern
from datetime import datetime
from enum import Enum
from dataclasses import dataclass

# OpenTelemetry imports for correlation
try:
    from opentelemetry import trace
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False

logger = logging.getLogger(__name__)

# Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")
AUDIT_LOG_ENABLED = os.getenv("AUDIT_LOG_ENABLED", "true").lower() == "true"
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "aica-agents")


class LogLevel(Enum):
    """Standard log levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


# PII patterns for automatic masking
PII_PATTERNS: List[tuple] = [
    # Email addresses
    (re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'), "[EMAIL]"),
    # Phone numbers (Brazilian format)
    (re.compile(r'\+?55?\s?\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}'), "[PHONE]"),
    # CPF (Brazilian ID)
    (re.compile(r'\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}'), "[CPF]"),
    # Credit card numbers
    (re.compile(r'\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}'), "[CARD]"),
    # IP addresses
    (re.compile(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}'), "[IP]"),
    # UUIDs (partial mask - show first 8 chars)
    (re.compile(r'([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', re.I), r'\1-****-****-****-************'),
]

# Sensitive field names to mask entirely
SENSITIVE_FIELDS = {
    'password', 'senha', 'secret', 'token', 'api_key', 'apikey',
    'access_token', 'refresh_token', 'authorization', 'auth',
    'credit_card', 'card_number', 'cvv', 'ssn', 'cpf',
    'private_key', 'secret_key', 'encryption_key',
}

# Fields to partially mask (show only last 4 characters)
PARTIAL_MASK_FIELDS = {
    'phone', 'telefone', 'email', 'user_id',
}


def mask_sensitive_data(data: Any, depth: int = 0, max_depth: int = 10) -> Any:
    """
    Recursively mask sensitive data in a data structure.

    Handles:
    - Dictionary fields with sensitive names
    - String values matching PII patterns
    - Nested structures (lists, dicts)

    Args:
        data: Data to mask (dict, list, or primitive)
        depth: Current recursion depth
        max_depth: Maximum recursion depth

    Returns:
        Masked data structure
    """
    if depth > max_depth:
        return "[MAX_DEPTH]"

    if isinstance(data, dict):
        masked = {}
        for key, value in data.items():
            key_lower = key.lower()

            # Fully mask sensitive fields
            if key_lower in SENSITIVE_FIELDS:
                masked[key] = "[REDACTED]"
            # Partially mask certain fields
            elif key_lower in PARTIAL_MASK_FIELDS:
                if isinstance(value, str) and len(value) > 4:
                    masked[key] = f"****{value[-4:]}"
                else:
                    masked[key] = "[REDACTED]"
            else:
                masked[key] = mask_sensitive_data(value, depth + 1, max_depth)

        return masked

    elif isinstance(data, list):
        return [mask_sensitive_data(item, depth + 1, max_depth) for item in data]

    elif isinstance(data, str):
        return _mask_string(data)

    else:
        return data


def _mask_string(value: str) -> str:
    """Apply PII pattern masking to a string."""
    masked = value
    for pattern, replacement in PII_PATTERNS:
        masked = pattern.sub(replacement, masked)
    return masked


class JSONFormatter(logging.Formatter):
    """
    JSON log formatter with OpenTelemetry correlation.

    Produces structured JSON logs with:
    - Timestamp in ISO format
    - Log level
    - Message
    - Correlation IDs (trace_id, span_id)
    - Extra fields from record
    """

    def __init__(self, service_name: str = SERVICE_NAME):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record as JSON."""
        # Base log structure
        log_dict = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
        }

        # Add OpenTelemetry correlation IDs
        if OTEL_AVAILABLE:
            span = trace.get_current_span()
            if span:
                span_context = span.get_span_context()
                if span_context.is_valid:
                    log_dict["trace_id"] = format(span_context.trace_id, "032x")
                    log_dict["span_id"] = format(span_context.span_id, "016x")

        # Add exception info if present
        if record.exc_info:
            log_dict["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
            }

        # Add extra fields (masked for sensitive data)
        if hasattr(record, "__dict__"):
            extra = {}
            for key, value in record.__dict__.items():
                if key not in {
                    'name', 'msg', 'args', 'created', 'filename', 'funcName',
                    'levelname', 'levelno', 'lineno', 'module', 'msecs',
                    'pathname', 'process', 'processName', 'relativeCreated',
                    'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                    'message', 'asctime',
                }:
                    extra[key] = mask_sensitive_data(value)

            if extra:
                log_dict["context"] = extra

        return json.dumps(log_dict, default=str)


class TextFormatter(logging.Formatter):
    """
    Human-readable text formatter for development.

    Format: TIMESTAMP [LEVEL] LOGGER - MESSAGE (extra: {...})
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record as text."""
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        base = f"{timestamp} [{record.levelname:8}] {record.name} - {record.getMessage()}"

        # Add extra fields
        extra_fields = {}
        for key, value in getattr(record, '__dict__', {}).items():
            if key.startswith('_') or key in {
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'asctime',
            }:
                continue
            extra_fields[key] = mask_sensitive_data(value)

        if extra_fields:
            base += f" | {json.dumps(extra_fields, default=str)}"

        # Add exception if present
        if record.exc_info:
            base += f"\n{self.formatException(record.exc_info)}"

        return base


def setup_logging(service_name: str = SERVICE_NAME) -> None:
    """
    Initialize structured logging.

    Sets up:
    - Root logger with configured level
    - JSON or text formatter based on LOG_FORMAT
    - Stream handler for stdout

    Args:
        service_name: Service name for log context
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    # Set formatter based on config
    if LOG_FORMAT.lower() == "json":
        handler.setFormatter(JSONFormatter(service_name))
    else:
        handler.setFormatter(TextFormatter())

    root_logger.addHandler(handler)

    # Log initialization
    root_logger.info(f"Logging initialized: level={LOG_LEVEL}, format={LOG_FORMAT}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


class StructuredLogger:
    """
    Wrapper for structured logging with automatic context.

    Provides convenience methods for logging with:
    - Automatic trace correlation
    - User context injection
    - Sensitive data masking

    Usage:
        logger = StructuredLogger("atlas_agent", user_id="uuid")
        logger.info("Task created", task_id="123")
    """

    def __init__(
        self,
        name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        agent_name: Optional[str] = None
    ):
        self._logger = logging.getLogger(name)
        self._context = {}

        if user_id:
            # Mask user_id for privacy
            self._context["user_id"] = f"{user_id[:8]}..." if len(user_id) > 8 else user_id
        if session_id:
            self._context["session_id"] = session_id
        if agent_name:
            self._context["agent_name"] = agent_name

    def _merge_context(self, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Merge instance context with extra fields."""
        context = self._context.copy()
        if extra:
            context.update(mask_sensitive_data(extra))
        return context

    def debug(self, msg: str, **kwargs) -> None:
        """Log a debug message."""
        self._logger.debug(msg, extra=self._merge_context(kwargs))

    def info(self, msg: str, **kwargs) -> None:
        """Log an info message."""
        self._logger.info(msg, extra=self._merge_context(kwargs))

    def warning(self, msg: str, **kwargs) -> None:
        """Log a warning message."""
        self._logger.warning(msg, extra=self._merge_context(kwargs))

    def error(self, msg: str, exc_info: bool = False, **kwargs) -> None:
        """Log an error message."""
        self._logger.error(msg, exc_info=exc_info, extra=self._merge_context(kwargs))

    def critical(self, msg: str, exc_info: bool = False, **kwargs) -> None:
        """Log a critical message."""
        self._logger.critical(msg, exc_info=exc_info, extra=self._merge_context(kwargs))

    def with_context(self, **kwargs) -> "StructuredLogger":
        """Create a new logger with additional context."""
        new_logger = StructuredLogger(self._logger.name)
        new_logger._context = self._merge_context(kwargs)
        return new_logger


@dataclass
class AuditLogEntry:
    """Structure for audit log entries."""
    timestamp: datetime
    event_type: str
    user_id: str
    resource_type: str
    resource_id: Optional[str]
    action: str
    outcome: str  # "success" or "failure"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type,
            "user_id": mask_sensitive_data(self.user_id),
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "action": self.action,
            "outcome": self.outcome,
            "ip_address": mask_sensitive_data(self.ip_address) if self.ip_address else None,
            "user_agent": self.user_agent,
            "details": mask_sensitive_data(self.details) if self.details else None,
        }


class AuditLogger:
    """
    Specialized logger for audit trail entries.

    Logs security-relevant events for compliance:
    - Authentication events
    - Data access (read, write, delete)
    - Consent changes
    - Administrative actions

    Usage:
        audit = AuditLogger()
        audit.log_data_access(user_id, "agent", "user_memory", "read")
    """

    def __init__(self):
        self._logger = logging.getLogger("audit")
        self.enabled = AUDIT_LOG_ENABLED

    def log(self, entry: AuditLogEntry) -> None:
        """Log an audit entry."""
        if not self.enabled:
            return

        self._logger.info(
            f"AUDIT: {entry.event_type} - {entry.action} on {entry.resource_type}",
            extra={"audit": entry.to_dict()}
        )

    def log_data_access(
        self,
        user_id: str,
        accessor: str,  # "user", "agent", "admin", "system"
        resource: str,
        action: str,
        resource_id: Optional[str] = None,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a data access event."""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow(),
            event_type="data_access",
            user_id=user_id,
            resource_type=resource,
            resource_id=resource_id,
            action=action,
            outcome="success" if success else "failure",
            details={"accessor": accessor, **(details or {})}
        )
        self.log(entry)

    def log_authentication(
        self,
        user_id: str,
        action: str,  # "login", "logout", "token_refresh"
        success: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an authentication event."""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow(),
            event_type="authentication",
            user_id=user_id,
            resource_type="session",
            resource_id=None,
            action=action,
            outcome="success" if success else "failure",
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
        self.log(entry)

    def log_consent_change(
        self,
        user_id: str,
        consent_type: str,
        action: str,  # "grant", "revoke"
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a consent change event."""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow(),
            event_type="consent_change",
            user_id=user_id,
            resource_type="consent",
            resource_id=consent_type,
            action=action,
            outcome="success",
            details=details
        )
        self.log(entry)

    def log_data_export(
        self,
        user_id: str,
        export_type: str,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a data export event."""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow(),
            event_type="data_export",
            user_id=user_id,
            resource_type="user_data",
            resource_id=None,
            action=export_type,
            outcome="success" if success else "failure",
            details=details
        )
        self.log(entry)

    def log_data_deletion(
        self,
        user_id: str,
        deletion_type: str,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a data deletion event."""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow(),
            event_type="data_deletion",
            user_id=user_id,
            resource_type="user_data",
            resource_id=None,
            action=deletion_type,
            outcome="success" if success else "failure",
            details=details
        )
        self.log(entry)


class LoggingService:
    """
    Service class for managing logging operations.

    Provides a high-level API for logging patterns.
    """

    def __init__(self, service_name: str = SERVICE_NAME):
        self.service_name = service_name
        self.audit_logger = AuditLogger()

    def initialize(self) -> None:
        """Initialize the logging service."""
        setup_logging(self.service_name)

    def get_logger(self, name: str) -> logging.Logger:
        """Get a standard logger."""
        return get_logger(name)

    def get_structured_logger(
        self,
        name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        agent_name: Optional[str] = None
    ) -> StructuredLogger:
        """Get a structured logger with context."""
        return StructuredLogger(name, user_id, session_id, agent_name)

    def get_audit_logger(self) -> AuditLogger:
        """Get the audit logger."""
        return self.audit_logger


# Default service instance
_logging_service: Optional[LoggingService] = None


def get_logging_service() -> LoggingService:
    """Get the global logging service instance."""
    global _logging_service
    if _logging_service is None:
        _logging_service = LoggingService()
    return _logging_service
