"""
OpenTelemetry Metrics for AICA Agents (Task #44)

Provides metrics collection for agent performance monitoring including:
- Agent invocation counts (by agent, status)
- Tool call counts (by tool, success/failure)
- Response latency (p50, p95, p99)
- Token usage per request
- Memory operations (read, write, search)
- Active sessions count

Usage:
    from agents.observability.metrics import record_agent_invocation, record_token_usage

    record_agent_invocation("atlas_agent", success=True)
    record_token_usage(input_tokens=100, output_tokens=50, model="gemini-2.5-flash")

Environment Variables:
- OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint for metrics export
- OTEL_SERVICE_NAME: Service name (default: aica-agents)
- METRICS_ENABLED: Enable/disable metrics (default: true)
"""

import os
import time
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

# OpenTelemetry imports
try:
    from opentelemetry import metrics
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import (
        PeriodicExportingMetricReader,
        ConsoleMetricExporter,
    )
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.semconv.resource import ResourceAttributes
    OTEL_METRICS_AVAILABLE = True
except ImportError:
    OTEL_METRICS_AVAILABLE = False
    logging.warning("OpenTelemetry metrics not installed.")

# Optional OTLP exporter
try:
    from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
    OTLP_METRICS_AVAILABLE = True
except ImportError:
    OTLP_METRICS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Configuration
METRICS_ENABLED = os.getenv("METRICS_ENABLED", "true").lower() == "true"
OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "aica-agents")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
EXPORT_INTERVAL_MS = int(os.getenv("METRICS_EXPORT_INTERVAL_MS", "60000"))

# Global meter provider and meter
_meter_provider: Optional["MeterProvider"] = None
_meter: Optional["metrics.Meter"] = None

# Metrics instances (lazily initialized)
_agent_invocations = None
_tool_calls = None
_response_latency = None
_token_usage_input = None
_token_usage_output = None
_memory_operations = None
_active_sessions = None


class OperationType(Enum):
    """Types of memory operations."""
    READ = "read"
    WRITE = "write"
    SEARCH = "search"
    DELETE = "delete"


@dataclass
class AgentMetrics:
    """Container for agent performance metrics."""
    agent_name: str
    total_invocations: int = 0
    successful_invocations: int = 0
    failed_invocations: int = 0
    total_latency_ms: float = 0.0
    total_tokens_input: int = 0
    total_tokens_output: int = 0
    tool_calls: Dict[str, int] = field(default_factory=dict)
    last_invocation: Optional[datetime] = None

    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total_invocations == 0:
            return 0.0
        return (self.successful_invocations / self.total_invocations) * 100

    @property
    def avg_latency_ms(self) -> float:
        """Calculate average latency in milliseconds."""
        if self.total_invocations == 0:
            return 0.0
        return self.total_latency_ms / self.total_invocations


def setup_metrics(service_name: str = SERVICE_NAME) -> None:
    """
    Initialize OpenTelemetry metrics collection.

    Sets up:
    - MeterProvider with service resource
    - Console exporter for development
    - OTLP exporter for production

    Args:
        service_name: Service name for metrics
    """
    global _meter_provider, _meter

    if not OTEL_METRICS_AVAILABLE or not METRICS_ENABLED:
        logger.info("OpenTelemetry metrics disabled")
        return

    # Create resource
    resource = Resource.create({
        ResourceAttributes.SERVICE_NAME: service_name,
        ResourceAttributes.DEPLOYMENT_ENVIRONMENT: ENVIRONMENT,
    })

    # Create metric readers
    readers = []

    # Console exporter for development
    if ENVIRONMENT == "development":
        console_reader = PeriodicExportingMetricReader(
            ConsoleMetricExporter(),
            export_interval_millis=EXPORT_INTERVAL_MS
        )
        readers.append(console_reader)
        logger.info("Console metric exporter configured")

    # OTLP exporter if endpoint configured
    if OTEL_ENDPOINT and OTLP_METRICS_AVAILABLE:
        otlp_reader = PeriodicExportingMetricReader(
            OTLPMetricExporter(endpoint=OTEL_ENDPOINT),
            export_interval_millis=EXPORT_INTERVAL_MS
        )
        readers.append(otlp_reader)
        logger.info(f"OTLP metric exporter configured: {OTEL_ENDPOINT}")

    # Create meter provider
    if readers:
        _meter_provider = MeterProvider(resource=resource, metric_readers=readers)
        metrics.set_meter_provider(_meter_provider)
    else:
        _meter_provider = MeterProvider(resource=resource)
        metrics.set_meter_provider(_meter_provider)

    _meter = metrics.get_meter(__name__)
    _initialize_metrics()

    logger.info(f"OpenTelemetry metrics initialized for {service_name}")


def get_meter() -> Optional["metrics.Meter"]:
    """Get the global meter instance."""
    global _meter
    if _meter is None and OTEL_METRICS_AVAILABLE:
        _meter = metrics.get_meter(__name__)
        _initialize_metrics()
    return _meter


def _initialize_metrics() -> None:
    """Initialize all metric instruments."""
    global _agent_invocations, _tool_calls, _response_latency
    global _token_usage_input, _token_usage_output, _memory_operations, _active_sessions

    meter = get_meter()
    if meter is None:
        return

    # Counter: Agent invocations
    _agent_invocations = meter.create_counter(
        name="agent.invocations",
        description="Number of agent invocations",
        unit="1"
    )

    # Counter: Tool calls
    _tool_calls = meter.create_counter(
        name="tool.calls",
        description="Number of tool calls",
        unit="1"
    )

    # Histogram: Response latency
    _response_latency = meter.create_histogram(
        name="agent.response_latency_ms",
        description="Agent response latency in milliseconds",
        unit="ms"
    )

    # Histogram: Token usage
    _token_usage_input = meter.create_histogram(
        name="agent.tokens_input",
        description="Input tokens per request",
        unit="tokens"
    )

    _token_usage_output = meter.create_histogram(
        name="agent.tokens_output",
        description="Output tokens per request",
        unit="tokens"
    )

    # Counter: Memory operations
    _memory_operations = meter.create_counter(
        name="memory.operations",
        description="Number of memory operations",
        unit="1"
    )

    # UpDownCounter: Active sessions
    _active_sessions = meter.create_up_down_counter(
        name="sessions.active",
        description="Number of active sessions",
        unit="1"
    )


def record_agent_invocation(
    agent_name: str,
    success: bool,
    latency_ms: Optional[float] = None,
    user_id: Optional[str] = None,
    model: Optional[str] = None
) -> None:
    """
    Record an agent invocation.

    Args:
        agent_name: Name of the agent
        success: Whether invocation succeeded
        latency_ms: Optional response latency in milliseconds
        user_id: Optional user ID (masked for privacy)
        model: Optional model name used
    """
    if _agent_invocations is None:
        return

    attributes = {
        "agent.name": agent_name,
        "status": "success" if success else "failure",
    }

    if model:
        attributes["model.name"] = model

    _agent_invocations.add(1, attributes)

    if latency_ms is not None and _response_latency:
        _response_latency.record(latency_ms, attributes)


def record_tool_call(
    tool_name: str,
    success: bool,
    agent_name: Optional[str] = None,
    duration_ms: Optional[float] = None
) -> None:
    """
    Record a tool call.

    Args:
        tool_name: Name of the tool
        success: Whether call succeeded
        agent_name: Optional agent that called the tool
        duration_ms: Optional call duration in milliseconds
    """
    if _tool_calls is None:
        return

    attributes = {
        "tool.name": tool_name,
        "status": "success" if success else "failure",
    }

    if agent_name:
        attributes["agent.name"] = agent_name

    _tool_calls.add(1, attributes)


def record_token_usage(
    input_tokens: int,
    output_tokens: int,
    model: str,
    agent_name: Optional[str] = None
) -> None:
    """
    Record token usage for a request.

    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model: Model name
        agent_name: Optional agent name
    """
    attributes = {"model.name": model}
    if agent_name:
        attributes["agent.name"] = agent_name

    if _token_usage_input:
        _token_usage_input.record(input_tokens, attributes)

    if _token_usage_output:
        _token_usage_output.record(output_tokens, attributes)


def record_memory_operation(
    operation: OperationType,
    success: bool,
    user_id: Optional[str] = None,
    category: Optional[str] = None
) -> None:
    """
    Record a memory operation.

    Args:
        operation: Type of operation (read, write, search, delete)
        success: Whether operation succeeded
        user_id: Optional user ID
        category: Optional memory category
    """
    if _memory_operations is None:
        return

    attributes = {
        "operation.type": operation.value,
        "status": "success" if success else "failure",
    }

    if category:
        attributes["memory.category"] = category

    _memory_operations.add(1, attributes)


def record_session_change(delta: int) -> None:
    """
    Record a change in active sessions count.

    Args:
        delta: Change amount (+1 for new session, -1 for ended session)
    """
    if _active_sessions is None:
        return

    _active_sessions.add(delta)


class LatencyTracker:
    """
    Context manager for tracking operation latency.

    Usage:
        with LatencyTracker("atlas_agent") as tracker:
            result = await execute_agent()
            tracker.set_success(True)
    """

    def __init__(self, agent_name: str, model: Optional[str] = None):
        self.agent_name = agent_name
        self.model = model
        self.start_time: Optional[float] = None
        self.success: bool = True

    def __enter__(self) -> "LatencyTracker":
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time is None:
            return

        latency_ms = (time.perf_counter() - self.start_time) * 1000
        success = exc_type is None and self.success

        record_agent_invocation(
            agent_name=self.agent_name,
            success=success,
            latency_ms=latency_ms,
            model=self.model
        )

    def set_success(self, success: bool) -> None:
        """Set the success status."""
        self.success = success


class MetricsService:
    """
    Service class for managing metrics operations.

    Provides a high-level API for common metrics patterns.
    """

    def __init__(self, service_name: str = SERVICE_NAME):
        self.service_name = service_name
        self.meter = None
        self._agent_metrics: Dict[str, AgentMetrics] = {}

    def initialize(self) -> None:
        """Initialize the metrics service."""
        setup_metrics(self.service_name)
        self.meter = get_meter()

    def track_latency(
        self,
        agent_name: str,
        model: Optional[str] = None
    ) -> LatencyTracker:
        """Create a latency tracker for an agent."""
        return LatencyTracker(agent_name, model)

    def record_invocation(
        self,
        agent_name: str,
        success: bool,
        latency_ms: Optional[float] = None
    ) -> None:
        """Record an agent invocation."""
        record_agent_invocation(agent_name, success, latency_ms)

        # Update local metrics cache
        if agent_name not in self._agent_metrics:
            self._agent_metrics[agent_name] = AgentMetrics(agent_name=agent_name)

        metrics = self._agent_metrics[agent_name]
        metrics.total_invocations += 1
        if success:
            metrics.successful_invocations += 1
        else:
            metrics.failed_invocations += 1
        if latency_ms:
            metrics.total_latency_ms += latency_ms
        metrics.last_invocation = datetime.utcnow()

    def record_tool(
        self,
        tool_name: str,
        success: bool,
        agent_name: Optional[str] = None
    ) -> None:
        """Record a tool call."""
        record_tool_call(tool_name, success, agent_name)

        # Update local metrics cache
        if agent_name and agent_name in self._agent_metrics:
            metrics = self._agent_metrics[agent_name]
            metrics.tool_calls[tool_name] = metrics.tool_calls.get(tool_name, 0) + 1

    def record_tokens(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str,
        agent_name: Optional[str] = None
    ) -> None:
        """Record token usage."""
        record_token_usage(input_tokens, output_tokens, model, agent_name)

        # Update local metrics cache
        if agent_name and agent_name in self._agent_metrics:
            metrics = self._agent_metrics[agent_name]
            metrics.total_tokens_input += input_tokens
            metrics.total_tokens_output += output_tokens

    def get_agent_metrics(self, agent_name: str) -> Optional[AgentMetrics]:
        """Get metrics for a specific agent."""
        return self._agent_metrics.get(agent_name)

    def get_all_metrics(self) -> Dict[str, AgentMetrics]:
        """Get metrics for all agents."""
        return self._agent_metrics.copy()

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of all agent metrics."""
        total_invocations = sum(m.total_invocations for m in self._agent_metrics.values())
        total_successful = sum(m.successful_invocations for m in self._agent_metrics.values())
        total_failed = sum(m.failed_invocations for m in self._agent_metrics.values())
        total_tokens = sum(
            m.total_tokens_input + m.total_tokens_output
            for m in self._agent_metrics.values()
        )

        return {
            "total_invocations": total_invocations,
            "successful_invocations": total_successful,
            "failed_invocations": total_failed,
            "success_rate": (total_successful / total_invocations * 100) if total_invocations > 0 else 0,
            "total_tokens": total_tokens,
            "agents": {
                name: {
                    "invocations": m.total_invocations,
                    "success_rate": m.success_rate,
                    "avg_latency_ms": m.avg_latency_ms,
                }
                for name, m in self._agent_metrics.items()
            }
        }


# Default service instance
_metrics_service: Optional[MetricsService] = None


def get_metrics_service() -> MetricsService:
    """Get the global metrics service instance."""
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service
