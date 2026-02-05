"""
AICA Life OS - Observability Module (Task #44)

Comprehensive observability for the ADK multi-agent system using OpenTelemetry.

Features:
- Distributed tracing with span hierarchy for agent delegations
- Metrics collection (counters, histograms) for performance monitoring
- Structured JSON logging with correlation IDs
- Sensitive data masking for privacy compliance

Usage:
    from agents.observability import setup_observability, get_tracer, get_meter

    # In main_agents.py
    setup_observability(app)

    # In agent code
    tracer = get_tracer()
    with tracer.start_as_current_span("agent_invocation") as span:
        span.set_attribute("agent.name", "atlas")
        # ... agent execution

References:
- OpenTelemetry Python: https://opentelemetry.io/docs/languages/python/
- Task #44: Observability, A2A Communication, and LGPD Compliance
"""

from .tracing import (
    TracingService,
    get_tracer,
    get_tracer_provider,
    setup_tracing,
    trace_agent_invocation,
    trace_tool_call,
    AgentSpanAttributes,
)
from .metrics import (
    MetricsService,
    get_meter,
    setup_metrics,
    record_agent_invocation,
    record_tool_call,
    record_token_usage,
    record_memory_operation,
    AgentMetrics,
)
from .logging import (
    LoggingService,
    get_logger,
    setup_logging,
    StructuredLogger,
    mask_sensitive_data,
    LogLevel,
)

__all__ = [
    # Tracing
    "TracingService",
    "get_tracer",
    "get_tracer_provider",
    "setup_tracing",
    "trace_agent_invocation",
    "trace_tool_call",
    "AgentSpanAttributes",
    # Metrics
    "MetricsService",
    "get_meter",
    "setup_metrics",
    "record_agent_invocation",
    "record_tool_call",
    "record_token_usage",
    "record_memory_operation",
    "AgentMetrics",
    # Logging
    "LoggingService",
    "get_logger",
    "setup_logging",
    "StructuredLogger",
    "mask_sensitive_data",
    "LogLevel",
]


def setup_observability(app, service_name: str = "aica-agents") -> None:
    """
    Initialize all observability components for the FastAPI app.

    Sets up:
    - OpenTelemetry tracing with OTLP export
    - Metrics collection
    - Structured logging

    Args:
        app: FastAPI application instance
        service_name: Service name for telemetry (default: aica-agents)
    """
    # Setup components
    setup_tracing(service_name)
    setup_metrics(service_name)
    setup_logging(service_name)

    # Add middleware for automatic request tracing
    from .tracing import TracingMiddleware
    app.add_middleware(TracingMiddleware)

    # Log initialization
    logger = get_logger(__name__)
    logger.info(
        "Observability initialized",
        extra={"service_name": service_name}
    )
