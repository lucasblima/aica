"""
AICA Life OS - Workflow Agents Registry (Task #42)

This module provides workflow patterns for orchestrating complex multi-step
operations in the ADK agent system. Three core patterns are available:

1. Sequential: Step1 -> Step2 -> Step3
   Use for strict order dependencies (grant pipeline)

2. Parallel: [Step1, Step2, Step3] -> Merge
   Use for independent concurrent tasks (data gathering)

3. Loop: While(condition) { Steps } -> Result
   Use for iterative refinement (content improvement)

Usage:
    from backend.agents.workflows import (
        # Sequential pattern
        SequentialWorkflowBuilder,
        create_sequential_workflow,

        # Parallel pattern
        ParallelWorkflowBuilder,
        create_parallel_then_merge_workflow,

        # Loop pattern
        LoopWorkflowBuilder,
        create_iterative_refinement_workflow,

        # Factory
        get_workflow,
        WorkflowType,
    )

    # Example: Create a sequential workflow
    workflow = (
        SequentialWorkflowBuilder("my_pipeline")
        .add_step("step1", "Faca X", "result_x")
        .add_step("step2", "Faca Y com {result_x}", "result_y")
        .build()
    )

References:
- ADK Workflow Agents: https://google.github.io/adk-docs/agents/workflow-agents/
- Task #42: Workflow Agents (Sequential, Parallel, Loop)
"""

from enum import Enum
from typing import Optional, Dict, Any, List

from google.adk.agents import BaseAgent

# Sequential imports
from .sequential import (
    create_sequential_step,
    create_sequential_workflow,
    SequentialWorkflowBuilder,
    get_workflow_state,
    update_workflow_state,
)

# Parallel imports
from .parallel import (
    create_parallel_step,
    create_parallel_workflow,
    create_merger_agent,
    create_parallel_then_merge_workflow,
    create_resilient_parallel_workflow,
    ParallelWorkflowBuilder,
    get_parallel_results,
)

# Loop imports
from .loop import (
    exit_loop,
    track_iteration,
    set_quality_score,
    create_critic_agent,
    create_refiner_agent,
    create_loop_workflow,
    create_iterative_refinement_workflow,
    create_quality_checker_agent,
    LoopWorkflowBuilder,
    DEFAULT_MAX_ITERATIONS,
    STATE_ITERATION_COUNT,
    STATE_QUALITY_SCORE,
)


class WorkflowType(Enum):
    """Enum of available workflow patterns."""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    LOOP = "loop"


# ============================================================================
# WORKFLOW FACTORY
# ============================================================================

def get_workflow_builder(workflow_type: WorkflowType, name: str):
    """
    Factory function to get the appropriate workflow builder.

    Args:
        workflow_type: Type of workflow pattern
        name: Name for the workflow

    Returns:
        Appropriate workflow builder instance

    Example:
        >>> builder = get_workflow_builder(WorkflowType.SEQUENTIAL, "my_pipeline")
        >>> workflow = builder.add_step(...).build()
    """
    builders = {
        WorkflowType.SEQUENTIAL: SequentialWorkflowBuilder,
        WorkflowType.PARALLEL: ParallelWorkflowBuilder,
        WorkflowType.LOOP: LoopWorkflowBuilder,
    }

    builder_class = builders.get(workflow_type)
    if not builder_class:
        raise ValueError(f"Unknown workflow type: {workflow_type}")

    return builder_class(name)


# ============================================================================
# PRE-BUILT WORKFLOW REGISTRY
# ============================================================================

_REGISTERED_WORKFLOWS: Dict[str, BaseAgent] = {}


def register_workflow(name: str, workflow: BaseAgent) -> None:
    """
    Register a pre-built workflow for later retrieval.

    Args:
        name: Unique name for the workflow
        workflow: The workflow agent to register
    """
    _REGISTERED_WORKFLOWS[name] = workflow


def get_workflow(name: str) -> Optional[BaseAgent]:
    """
    Retrieve a registered workflow by name.

    Args:
        name: Name of the registered workflow

    Returns:
        The workflow agent, or None if not found
    """
    return _REGISTERED_WORKFLOWS.get(name)


def list_workflows() -> List[str]:
    """
    List all registered workflow names.

    Returns:
        List of registered workflow names
    """
    return list(_REGISTERED_WORKFLOWS.keys())


# ============================================================================
# COMMON WORKFLOW PATTERNS
# ============================================================================

def create_data_gathering_workflow(
    name: str,
    data_sources: List[Dict[str, Any]],
    merger_instruction: str,
    output_key: str = "gathered_data",
) -> BaseAgent:
    """
    Create a common pattern: parallel data gathering + merge.

    This is frequently used in AICA for cross-module data collection.

    Args:
        name: Workflow name
        data_sources: List of dicts with {name, instruction, output_key, tools}
        merger_instruction: How to merge gathered data
        output_key: Final output state key

    Returns:
        Parallel-then-merge workflow

    Example:
        >>> workflow = create_data_gathering_workflow(
        ...     name="module_gatherer",
        ...     data_sources=[
        ...         {"name": "atlas", "instruction": "Get tasks", "output_key": "tasks", "tools": [get_pending_tasks]},
        ...         {"name": "journey", "instruction": "Get moments", "output_key": "moments", "tools": [get_recent_moments]},
        ...     ],
        ...     merger_instruction="Combine: {tasks}, {moments}",
        ...     output_key="combined_data",
        ... )
    """
    builder = ParallelWorkflowBuilder(name)

    for source in data_sources:
        builder.add_parallel_agent(
            name=source.get("name", "unnamed"),
            instruction=source.get("instruction", ""),
            output_key=source.get("output_key", ""),
            tools=source.get("tools"),
        )

    builder.with_merger(
        instruction=merger_instruction,
        output_key=output_key,
    )

    return builder.build()


def create_refinement_pipeline(
    name: str,
    initial_instruction: str,
    work_key: str,
    critic_instruction: str,
    refiner_instruction: str,
    max_iterations: int = 5,
    quality_threshold: Optional[float] = None,
) -> BaseAgent:
    """
    Create a common pattern: initial draft + iterative refinement.

    This is frequently used in AICA for content generation and improvement.

    Args:
        name: Workflow name
        initial_instruction: Instruction for initial draft
        work_key: State key for the work being refined
        critic_instruction: How to critique the work
        refiner_instruction: How to improve based on critique
        max_iterations: Maximum refinement cycles
        quality_threshold: Optional quality score threshold for early exit

    Returns:
        Iterative refinement workflow

    Example:
        >>> workflow = create_refinement_pipeline(
        ...     name="pauta_generator",
        ...     initial_instruction="Gere pauta para: {topic}",
        ...     work_key="pauta",
        ...     critic_instruction="Avalie a pauta: {pauta}",
        ...     refiner_instruction="Melhore a pauta com base na critica",
        ...     max_iterations=3,
        ... )
    """
    from google.adk.agents import LlmAgent

    initial_agent = LlmAgent(
        name=f"{name}_initial",
        model="gemini-2.5-flash",
        instruction=initial_instruction,
        output_key=work_key,
        include_contents='none',
    )

    if quality_threshold:
        # Use quality-based exit
        return LoopWorkflowBuilder(name) \
            .with_max_iterations(max_iterations) \
            .with_initial_agent(initial_agent) \
            .add_loop_agent(create_quality_checker_agent(
                name=f"{name}_quality_checker",
                evaluation_instruction=critic_instruction,
                quality_threshold=quality_threshold,
            )) \
            .add_loop_agent(create_refiner_agent(
                name=f"{name}_refiner",
                instruction=refiner_instruction,
                output_key=work_key,
                critique_key="critique",
            )) \
            .build()
    else:
        # Use phrase-based exit
        return create_iterative_refinement_workflow(
            name=name,
            initial_agent=initial_agent,
            critic_instruction=critic_instruction,
            refiner_instruction=refiner_instruction,
            work_key=work_key,
            max_iterations=max_iterations,
        )


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Enums
    "WorkflowType",

    # Factory
    "get_workflow_builder",
    "get_workflow",
    "register_workflow",
    "list_workflows",

    # Common patterns
    "create_data_gathering_workflow",
    "create_refinement_pipeline",

    # Sequential
    "create_sequential_step",
    "create_sequential_workflow",
    "SequentialWorkflowBuilder",
    "get_workflow_state",
    "update_workflow_state",

    # Parallel
    "create_parallel_step",
    "create_parallel_workflow",
    "create_merger_agent",
    "create_parallel_then_merge_workflow",
    "create_resilient_parallel_workflow",
    "ParallelWorkflowBuilder",
    "get_parallel_results",

    # Loop
    "exit_loop",
    "track_iteration",
    "set_quality_score",
    "create_critic_agent",
    "create_refiner_agent",
    "create_loop_workflow",
    "create_iterative_refinement_workflow",
    "create_quality_checker_agent",
    "LoopWorkflowBuilder",
    "DEFAULT_MAX_ITERATIONS",
    "STATE_ITERATION_COUNT",
    "STATE_QUALITY_SCORE",
]
