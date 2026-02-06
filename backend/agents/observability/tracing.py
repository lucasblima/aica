"""
OpenTelemetry Tracing for AICA Agents (Task #44)

Provides distributed tracing for agent invocations, tool calls, and sub-agent
delegations. Traces are exported to console (dev) or OTLP endpoint (prod).

Features:
- Agent invocation spans with user_id, agent_name, session_id
- Tool call spans with tool_name, success status
- Parent-child spans for sub-agent delegation
- Automatic context propagation

Usage:
    from agents.observability.tracing import trace_agent_invocation, trace_tool_call

    @trace_agent_invocation("atlas_agent")
    async def execute_atlas(user_id, message):
        with trace_tool_call("get_pending_tasks") as span:
            result = await get_pending_tasks()
            span.set_attribute("tasks.count", len(result))

Environment Variables:
- OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint (e.g., http://localhost:4317)
- OTEL_SERVICE_NAME: Service name (default: aica-agents)
- OTEL_ENABLED: Enable/disable tracing (default: true)
"""

import os
import functools
import logging
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass
from contextvars import ContextVar
from datetime import datetime

# OpenTelemetry imports
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider, Span
    from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.semconv.resource import ResourceAttributes
    from opentelemetry.trace import Status, StatusCode, SpanKind
    from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    logging.warning("OpenTelemetry not installed. Tracing disabled.")

# Optional OTLP exporter
try:
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    OTLP_AVAILABLE = True
except ImportError:
    OTLP_AVAILABLE = False

# FastAPI middleware
try:
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    STARLETTE_AVAILABLE = True
except ImportError:
    STARLETTE_AVAILABLE = False

logger = logging.getLogger(__name__)

# Configuration
OTEL_ENABLED = os.getenv("OTEL_ENABLED", "true").lower() == "true"
OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "aica-agents")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Global tracer provider
_tracer_provider: Optional["TracerProvider"] = None
_tracer: Optional["trace.Tracer"] = None

# Context variable for current span
_current_span: ContextVar[Optional["Span"]] = ContextVar("current_span", default=None)


@dataclass
class AgentSpanAttributes:
    """Standard span attributes for agent operations."""
    AGENT_NAME = "agent.name"
    AGENT_TYPE = "agent.type"
    USER_ID = "user.id"
    SESSION_ID = "session.id"
    TOOL_NAME = "tool.name"
    TOOL_SUCCESS = "tool.success"
    TOOL_ERROR = "tool.error"
    TOKENS_INPUT = "tokens.input"
    TOKENS_OUTPUT = "tokens.output"
    MODEL_NAME = "model.name"
    DELEGATE_TO = "agent.delegate_to"
    INVOCATION_ID = "invocation.id"


def setup_tracing(service_name: str = SERVICE_NAME) -> None:
    """
    Initialize OpenTelemetry tracing.

    Sets up:
    - TracerProvider with service resource
    - Console exporter for development
    - OTLP exporter for production (if endpoint configured)

    Args:
        service_name: Service name for traces
    """
    global _tracer_provider, _tracer

    if not OTEL_AVAILABLE or not OTEL_ENABLED:
        logger.info("OpenTelemetry tracing disabled")
        return

    # Create resource with service info
    resource = Resource.create({
        ResourceAttributes.SERVICE_NAME: service_name,
        ResourceAttributes.DEPLOYMENT_ENVIRONMENT: ENVIRONMENT,
        ResourceAttributes.SERVICE_VERSION: "1.0.0",
    })

    # Create tracer provider
    _tracer_provider = TracerProvider(resource=resource)

    # Add console exporter for development
    if ENVIRONMENT == "development":
        console_exporter = ConsoleSpanExporter()
        _tracer_provider.add_span_processor(
            BatchSpanProcessor(console_exporter)
        )
        logger.info("Console span exporter configured")

    # Add OTLP exporter if endpoint configured
    if OTEL_ENDPOINT and OTLP_AVAILABLE:
        otlp_exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT)
        _tracer_provider.add_span_processor(
            BatchSpanProcessor(otlp_exporter)
        )
        logger.info(f"OTLP span exporter configured: {OTEL_ENDPOINT}")

    # Set global tracer provider
    trace.set_tracer_provider(_tracer_provider)
    _tracer = trace.get_tracer(__name__)

    logger.info(f"OpenTelemetry tracing initialized for {service_name}")


def get_tracer() -> Optional["trace.Tracer"]:
    """Get the global tracer instance."""
    global _tracer
    if _tracer is None and OTEL_AVAILABLE:
        _tracer = trace.get_tracer(__name__)
    return _tracer


def get_tracer_provider() -> Optional["TracerProvider"]:
    """Get the global tracer provider."""
    return _tracer_provider


def trace_agent_invocation(
    agent_name: str,
    extract_user_id: Optional[Callable] = None
) -> Callable:
    """
    Decorator to trace agent invocations.

    Creates a span for the entire agent invocation with attributes:
    - agent.name: Name of the agent
    - user.id: User ID (if extractable)
    - session.id: Session ID (if available)

    Usage:
        @trace_agent_invocation("atlas_agent")
        async def execute(user_id: str, message: str):
            ...

    Args:
        agent_name: Name of the agent being traced
        extract_user_id: Optional function to extract user_id from args

    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            tracer = get_tracer()
            if tracer is None:
                return await func(*args, **kwargs)

            # Extract user_id from first positional arg or kwargs
            user_id = None
            if extract_user_id:
                user_id = extract_user_id(*args, **kwargs)
            elif args:
                user_id = str(args[0]) if args[0] else None
            elif "user_id" in kwargs:
                user_id = str(kwargs["user_id"])

            # Get session_id from kwargs
            session_id = kwargs.get("session_id", "unknown")

            with tracer.start_as_current_span(
                f"agent.{agent_name}",
                kind=SpanKind.INTERNAL
            ) as span:
                span.set_attribute(AgentSpanAttributes.AGENT_NAME, agent_name)
                span.set_attribute(AgentSpanAttributes.AGENT_TYPE, "llm_agent")

                if user_id:
                    # Mask user_id for privacy (show only first 8 chars)
                    span.set_attribute(
                        AgentSpanAttributes.USER_ID,
                        f"{user_id[:8]}..." if len(user_id) > 8 else user_id
                    )

                if session_id:
                    span.set_attribute(AgentSpanAttributes.SESSION_ID, session_id)

                span.set_attribute(
                    AgentSpanAttributes.INVOCATION_ID,
                    datetime.utcnow().isoformat()
                )

                try:
                    result = await func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            tracer = get_tracer()
            if tracer is None:
                return func(*args, **kwargs)

            user_id = kwargs.get("user_id", args[0] if args else None)

            with tracer.start_as_current_span(
                f"agent.{agent_name}",
                kind=SpanKind.INTERNAL
            ) as span:
                span.set_attribute(AgentSpanAttributes.AGENT_NAME, agent_name)

                if user_id:
                    span.set_attribute(
                        AgentSpanAttributes.USER_ID,
                        f"{str(user_id)[:8]}..."
                    )

                try:
                    result = func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise

        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


class TraceToolCall:
    """
    Context manager for tracing tool calls.

    Usage:
        with trace_tool_call("get_pending_tasks") as span:
            result = await get_pending_tasks()
            span.set_attribute("tasks.count", len(result))
    """

    def __init__(
        self,
        tool_name: str,
        attributes: Optional[Dict[str, Any]] = None
    ):
        self.tool_name = tool_name
        self.attributes = attributes or {}
        self.span = None
        self.tracer = get_tracer()

    def __enter__(self) -> Optional["Span"]:
        if self.tracer is None:
            return None

        self.span = self.tracer.start_span(
            f"tool.{self.tool_name}",
            kind=SpanKind.INTERNAL
        )

        self.span.set_attribute(AgentSpanAttributes.TOOL_NAME, self.tool_name)

        for key, value in self.attributes.items():
            self.span.set_attribute(key, value)

        return self.span

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.span is None:
            return

        if exc_type is not None:
            self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
            self.span.set_attribute(AgentSpanAttributes.TOOL_SUCCESS, False)
            self.span.set_attribute(AgentSpanAttributes.TOOL_ERROR, str(exc_val))
            self.span.record_exception(exc_val)
        else:
            self.span.set_status(Status(StatusCode.OK))
            self.span.set_attribute(AgentSpanAttributes.TOOL_SUCCESS, True)

        self.span.end()


def trace_tool_call(
    tool_name: str,
    attributes: Optional[Dict[str, Any]] = None
) -> TraceToolCall:
    """
    Create a context manager for tracing tool calls.

    Args:
        tool_name: Name of the tool being called
        attributes: Optional additional span attributes

    Returns:
        TraceToolCall context manager
    """
    return TraceToolCall(tool_name, attributes)


def add_span_attribute(key: str, value: Any) -> None:
    """
    Add an attribute to the current span.

    Args:
        key: Attribute key
        value: Attribute value
    """
    span = trace.get_current_span() if OTEL_AVAILABLE else None
    if span:
        span.set_attribute(key, value)


def record_delegation(
    from_agent: str,
    to_agent: str,
    reason: Optional[str] = None
) -> None:
    """
    Record a sub-agent delegation in the current span.

    Args:
        from_agent: Source agent name
        to_agent: Target agent name
        reason: Optional delegation reason
    """
    span = trace.get_current_span() if OTEL_AVAILABLE else None
    if span:
        span.set_attribute(AgentSpanAttributes.DELEGATE_TO, to_agent)
        span.add_event(
            "agent.delegation",
            {
                "from": from_agent,
                "to": to_agent,
                "reason": reason or "intent_match",
            }
        )


if STARLETTE_AVAILABLE:
    class TracingMiddleware(BaseHTTPMiddleware):
        """
        FastAPI middleware for automatic request tracing.

        Adds spans for all HTTP requests with:
        - HTTP method and path
        - Response status code
        - Request duration
        """

        async def dispatch(self, request: Request, call_next):
            tracer = get_tracer()
            if tracer is None:
                return await call_next(request)

            # Extract path without query params
            path = request.url.path

            with tracer.start_as_current_span(
                f"HTTP {request.method} {path}",
                kind=SpanKind.SERVER
            ) as span:
                span.set_attribute("http.method", request.method)
                span.set_attribute("http.url", str(request.url))
                span.set_attribute("http.scheme", request.url.scheme)
                span.set_attribute("http.host", request.url.hostname or "")
                span.set_attribute("http.target", path)

                # Extract user_id from authorization header if present
                auth_header = request.headers.get("authorization", "")
                if auth_header.startswith("Bearer "):
                    # Don't log the actual token, just note that auth is present
                    span.set_attribute("http.auth", "bearer")

                try:
                    response = await call_next(request)
                    span.set_attribute("http.status_code", response.status_code)

                    if response.status_code >= 400:
                        span.set_status(
                            Status(StatusCode.ERROR, f"HTTP {response.status_code}")
                        )
                    else:
                        span.set_status(Status(StatusCode.OK))

                    return response

                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise
else:
    class TracingMiddleware:
        """Placeholder when Starlette is not available."""
        def __init__(self, app):
            self.app = app

        async def __call__(self, scope, receive, send):
            await self.app(scope, receive, send)


class TracingService:
    """
    Service class for managing tracing operations.

    Provides a high-level API for common tracing patterns.
    """

    def __init__(self, service_name: str = SERVICE_NAME):
        self.service_name = service_name
        self.tracer = None

    def initialize(self) -> None:
        """Initialize the tracing service."""
        setup_tracing(self.service_name)
        self.tracer = get_tracer()

    def start_span(
        self,
        name: str,
        attributes: Optional[Dict[str, Any]] = None
    ) -> Optional["Span"]:
        """Start a new span."""
        if self.tracer is None:
            return None

        span = self.tracer.start_span(name)
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        return span

    def trace_agent(self, agent_name: str) -> Callable:
        """Decorator for tracing agent methods."""
        return trace_agent_invocation(agent_name)

    def trace_tool(
        self,
        tool_name: str,
        attributes: Optional[Dict[str, Any]] = None
    ) -> TraceToolCall:
        """Context manager for tracing tool calls."""
        return trace_tool_call(tool_name, attributes)


# Default service instance
_tracing_service: Optional[TracingService] = None


def get_tracing_service() -> TracingService:
    """Get the global tracing service instance."""
    global _tracing_service
    if _tracing_service is None:
        _tracing_service = TracingService()
    return _tracing_service
