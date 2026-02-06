"""
Parallel Workflow Agent for AICA Life OS (Task #42)

Implements the Parallel Workflow pattern where multiple agents execute
concurrently and their results are merged. Dramatically speeds up workflows
where tasks can be performed independently.

Pattern: [Step1, Step2, Step3] -> (concurrent) -> Merge Results

Key Features:
- Concurrent execution of independent agents
- Result aggregation from multiple sources
- Partial failure handling (continues if some agents fail)
- State management for parallel outputs
- Integration with existing AICA modules

Use Cases:
- Cross-module data gathering (tasks, moments, finances in parallel)
- Multi-source research (search multiple databases)
- Daily briefing compilation (aggregate module summaries)

References:
- ADK ParallelAgent: https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/
- Task #42: Workflow Agents
"""

import os
import logging
from typing import List, Optional, Dict, Any, Callable

from google.adk.agents import LlmAgent, BaseAgent
from google.adk.agents.parallel_agent import ParallelAgent
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)

# Constants
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def create_parallel_step(
    name: str,
    instruction: str,
    output_key: str,
    description: str = "",
    model: str = GEMINI_MODEL,
    tools: Optional[List] = None,
) -> LlmAgent:
    """
    Factory function to create an agent for parallel execution.

    Unlike sequential steps, parallel agents don't share conversation history
    with each other. They run independently and store results via output_key.

    Args:
        name: Agent name (e.g., "atlas_gatherer")
        instruction: Agent instruction
        output_key: State key to store this agent's output
        description: Agent description
        model: Gemini model to use
        tools: Tools available to this agent

    Returns:
        Configured LlmAgent for parallel workflow

    Example:
        >>> atlas_gatherer = create_parallel_step(
        ...     name="atlas_gatherer",
        ...     instruction="Busque as tarefas pendentes do usuario",
        ...     output_key="atlas_data",
        ...     tools=[get_pending_tasks]
        ... )
    """
    def log_completion(callback_context: CallbackContext) -> None:
        output = callback_context.state.get(output_key)
        status = "completed" if output else "failed/empty"
        logger.info(f"[Parallel] Agent {name}: {status}")

    return LlmAgent(
        name=name,
        model=model,
        description=description or f"Parallel agent: {name}",
        instruction=instruction,
        output_key=output_key,
        include_contents='none',  # Parallel agents don't share history
        tools=tools or [],
        after_agent_callback=log_completion,
    )


def create_parallel_workflow(
    name: str,
    parallel_agents: List[LlmAgent],
    description: str = "",
) -> ParallelAgent:
    """
    Factory function to create a parallel workflow.

    All agents run concurrently. Results are stored in their respective
    output_keys in the shared session state.

    Args:
        name: Workflow name (e.g., "data_gatherer")
        parallel_agents: List of agents to run concurrently
        description: Workflow description

    Returns:
        Configured ParallelAgent

    Example:
        >>> gatherer = create_parallel_workflow(
        ...     name="module_data_gatherer",
        ...     parallel_agents=[atlas_agent, journey_agent, finance_agent],
        ...     description="Coleta dados de multiplos modulos em paralelo"
        ... )
    """
    logger.info(f"[Parallel] Creating workflow: {name} with {len(parallel_agents)} agents")

    return ParallelAgent(
        name=name,
        sub_agents=parallel_agents,
        description=description or f"Parallel workflow: {name}",
    )


def create_merger_agent(
    name: str,
    instruction: str,
    output_key: str,
    input_keys: List[str],
    description: str = "",
    model: str = GEMINI_MODEL,
) -> LlmAgent:
    """
    Factory function to create a merger agent that aggregates parallel results.

    The merger agent reads outputs from multiple parallel agents and
    synthesizes them into a unified result.

    Args:
        name: Agent name (e.g., "briefing_merger")
        instruction: Instruction for merging (should reference input_keys)
        output_key: State key for merged output
        input_keys: State keys to read from (from parallel agents)
        description: Agent description
        model: Gemini model to use

    Returns:
        Configured LlmAgent for merging results

    Example:
        >>> merger = create_merger_agent(
        ...     name="daily_briefing_merger",
        ...     instruction="Combine os dados: Atlas={atlas_data}, Journey={journey_data}",
        ...     output_key="daily_briefing",
        ...     input_keys=["atlas_data", "journey_data", "finance_data"]
        ... )
    """
    def validate_inputs(callback_context: CallbackContext) -> None:
        """Log which parallel results are available."""
        available = []
        missing = []
        for key in input_keys:
            if callback_context.state.get(key):
                available.append(key)
            else:
                missing.append(key)

        logger.info(f"[Parallel] Merger {name} - Available: {available}, Missing: {missing}")

        if missing:
            logger.warning(f"[Parallel] Some parallel agents did not produce results: {missing}")

    return LlmAgent(
        name=name,
        model=model,
        description=description or f"Merger agent: {name}",
        instruction=instruction,
        output_key=output_key,
        include_contents='none',
        before_agent_callback=validate_inputs,
    )


def create_parallel_then_merge_workflow(
    name: str,
    parallel_agents: List[LlmAgent],
    merger_agent: LlmAgent,
    description: str = "",
) -> SequentialAgent:
    """
    Factory function to create a complete parallel-then-merge workflow.

    This is the most common parallel pattern: run multiple agents concurrently,
    then merge their results with a dedicated merger agent.

    Pattern: [Agent1, Agent2, Agent3] -> (concurrent) -> Merger -> Result

    Args:
        name: Workflow name
        parallel_agents: Agents to run in parallel
        merger_agent: Agent that merges parallel results
        description: Workflow description

    Returns:
        SequentialAgent containing parallel phase and merge phase

    Example:
        >>> workflow = create_parallel_then_merge_workflow(
        ...     name="daily_briefing_workflow",
        ...     parallel_agents=[atlas_agent, journey_agent, finance_agent],
        ...     merger_agent=briefing_merger,
        ...     description="Gera briefing diario com dados de todos os modulos"
        ... )
    """
    # Create the parallel phase
    parallel_phase = create_parallel_workflow(
        name=f"{name}_parallel_phase",
        parallel_agents=parallel_agents,
        description=f"Parallel data gathering for {name}",
    )

    # Wrap in sequential to add merger
    return SequentialAgent(
        name=name,
        sub_agents=[parallel_phase, merger_agent],
        description=description or f"Parallel then merge workflow: {name}",
    )


class ParallelWorkflowBuilder:
    """
    Builder pattern for creating parallel workflows with fluent API.

    Provides a more readable way to construct parallel workflows
    with proper result merging.

    Example:
        >>> workflow = (
        ...     ParallelWorkflowBuilder("daily_briefing")
        ...     .with_description("Briefing diario personalizado")
        ...     .add_parallel_agent(
        ...         name="atlas_gatherer",
        ...         instruction="Liste tarefas urgentes",
        ...         output_key="atlas_data",
        ...         tools=[get_pending_tasks]
        ...     )
        ...     .add_parallel_agent(
        ...         name="journey_gatherer",
        ...         instruction="Liste momentos recentes",
        ...         output_key="journey_data",
        ...         tools=[get_recent_moments]
        ...     )
        ...     .add_parallel_agent(
        ...         name="finance_gatherer",
        ...         instruction="Resumo financeiro do mes",
        ...         output_key="finance_data",
        ...         tools=[get_finance_summary]
        ...     )
        ...     .with_merger(
        ...         instruction="Combine em briefing: {atlas_data}, {journey_data}, {finance_data}",
        ...         output_key="daily_briefing"
        ...     )
        ...     .build()
        ... )
    """

    def __init__(self, name: str):
        """Initialize the builder with workflow name."""
        self.name = name
        self.description = ""
        self.parallel_agents: List[LlmAgent] = []
        self.merger: Optional[LlmAgent] = None
        self._model = GEMINI_MODEL
        self._output_keys: List[str] = []

    def with_description(self, description: str) -> "ParallelWorkflowBuilder":
        """Set workflow description."""
        self.description = description
        return self

    def with_model(self, model: str) -> "ParallelWorkflowBuilder":
        """Set default model for all agents."""
        self._model = model
        return self

    def add_parallel_agent(
        self,
        name: str,
        instruction: str,
        output_key: str,
        description: str = "",
        tools: Optional[List] = None,
        model: Optional[str] = None,
    ) -> "ParallelWorkflowBuilder":
        """
        Add a parallel agent to the workflow.

        Args:
            name: Agent name
            instruction: Agent instruction
            output_key: State key for this agent's output
            description: Agent description
            tools: Tools available to this agent
            model: Model override for this agent
        """
        agent = create_parallel_step(
            name=name,
            instruction=instruction,
            output_key=output_key,
            description=description,
            model=model or self._model,
            tools=tools,
        )
        self.parallel_agents.append(agent)
        self._output_keys.append(output_key)
        return self

    def add_agent(self, agent: LlmAgent, output_key: str) -> "ParallelWorkflowBuilder":
        """Add a pre-configured agent to the parallel phase."""
        self.parallel_agents.append(agent)
        self._output_keys.append(output_key)
        return self

    def with_merger(
        self,
        instruction: str,
        output_key: str,
        name: Optional[str] = None,
        description: str = "",
        model: Optional[str] = None,
    ) -> "ParallelWorkflowBuilder":
        """
        Configure the merger agent.

        Args:
            instruction: Merger instruction (should reference parallel output keys)
            output_key: State key for merged output
            name: Merger name (defaults to {workflow_name}_merger)
            description: Merger description
            model: Model override for merger
        """
        self.merger = create_merger_agent(
            name=name or f"{self.name}_merger",
            instruction=instruction,
            output_key=output_key,
            input_keys=self._output_keys,
            description=description,
            model=model or self._model,
        )
        return self

    def build(self) -> BaseAgent:
        """Build and return the parallel workflow."""
        if not self.parallel_agents:
            raise ValueError("Workflow must have at least one parallel agent")

        if self.merger:
            # Parallel + Merge pattern
            return create_parallel_then_merge_workflow(
                name=self.name,
                parallel_agents=self.parallel_agents,
                merger_agent=self.merger,
                description=self.description,
            )
        else:
            # Pure parallel (no merger)
            return create_parallel_workflow(
                name=self.name,
                parallel_agents=self.parallel_agents,
                description=self.description,
            )


# ============================================================================
# PARTIAL FAILURE HANDLING
# ============================================================================

def create_resilient_parallel_workflow(
    name: str,
    parallel_agents: List[LlmAgent],
    merger_instruction: str,
    merger_output_key: str,
    description: str = "",
    fallback_values: Optional[Dict[str, str]] = None,
) -> SequentialAgent:
    """
    Create a parallel workflow that handles partial failures gracefully.

    When some parallel agents fail, the merger still receives fallback values
    for missing results, allowing the workflow to complete with partial data.

    Args:
        name: Workflow name
        parallel_agents: Agents to run in parallel
        merger_instruction: Instruction for merging results
        merger_output_key: State key for final output
        description: Workflow description
        fallback_values: Default values for failed agents {output_key: fallback}

    Returns:
        SequentialAgent with resilient parallel execution
    """
    fallback_values = fallback_values or {}

    # Extract output keys from agents
    output_keys = []
    for agent in parallel_agents:
        if hasattr(agent, 'output_key') and agent.output_key:
            output_keys.append(agent.output_key)

    # Create merger with fallback handling
    def apply_fallbacks(callback_context: CallbackContext) -> None:
        """Apply fallback values for missing parallel results."""
        for key in output_keys:
            if not callback_context.state.get(key):
                fallback = fallback_values.get(key, f"[Dados de {key} indisponiveis]")
                callback_context.state[key] = fallback
                logger.info(f"[Parallel] Applied fallback for: {key}")

    merger = LlmAgent(
        name=f"{name}_resilient_merger",
        model=GEMINI_MODEL,
        instruction=merger_instruction,
        output_key=merger_output_key,
        include_contents='none',
        before_agent_callback=apply_fallbacks,
    )

    return create_parallel_then_merge_workflow(
        name=name,
        parallel_agents=parallel_agents,
        merger_agent=merger,
        description=description,
    )


# ============================================================================
# STATE HELPER TOOLS
# ============================================================================

def get_parallel_results(tool_context: ToolContext) -> dict:
    """
    Tool to inspect results from parallel agents.

    Useful for merger agents to check what data is available
    before synthesizing results.
    """
    state_keys = list(tool_context.state.keys())
    results = {}

    for key in state_keys:
        value = tool_context.state.get(key)
        if value:
            if isinstance(value, str) and len(value) > 200:
                results[key] = {"status": "available", "preview": value[:200] + "..."}
            else:
                results[key] = {"status": "available", "data": value}
        else:
            results[key] = {"status": "missing"}

    return {
        "status": "success",
        "parallel_results": results,
        "available_keys": [k for k, v in results.items() if v.get("status") == "available"],
        "missing_keys": [k for k, v in results.items() if v.get("status") == "missing"],
    }


# Export public API
__all__ = [
    "create_parallel_step",
    "create_parallel_workflow",
    "create_merger_agent",
    "create_parallel_then_merge_workflow",
    "create_resilient_parallel_workflow",
    "ParallelWorkflowBuilder",
    "get_parallel_results",
    "GEMINI_MODEL",
]
