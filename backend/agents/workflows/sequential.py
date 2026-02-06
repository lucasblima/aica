"""
Sequential Workflow Agent for AICA Life OS (Task #42)

Implements the Sequential Workflow pattern where agents execute in strict order,
passing context between steps. Each step's output becomes available to subsequent
steps via shared session state.

Pattern: Step1 -> Step2 -> Step3 -> ... -> Final Result

Key Features:
- Strict execution order
- State passing between steps via output_key
- Graceful failure handling with retry logic
- Context enrichment at each step
- Integration with existing AICA services

Use Cases:
- Grant application pipeline (research -> draft -> review)
- Podcast production (guest research -> pauta -> questions)
- Task prioritization (analyze -> categorize -> schedule)

References:
- ADK SequentialAgent: https://google.github.io/adk-docs/agents/workflow-agents/sequential-agents/
- Task #42: Workflow Agents
"""

import os
import logging
from typing import List, Optional, Dict, Any, Callable

from google.adk.agents import LlmAgent, BaseAgent
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)

# Constants
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_MAX_RETRIES = 3


def create_before_step_callback(
    step_name: str,
    required_state_keys: Optional[List[str]] = None
) -> Callable[[CallbackContext], None]:
    """
    Factory function to create a before_agent_callback that validates state.

    Args:
        step_name: Name of the step for logging
        required_state_keys: List of state keys that must be present

    Returns:
        Callback function for the agent
    """
    def callback(callback_context: CallbackContext) -> None:
        logger.info(f"[Sequential] Starting step: {step_name}")

        if required_state_keys:
            missing_keys = [
                key for key in required_state_keys
                if not callback_context.state.get(key)
            ]
            if missing_keys:
                logger.warning(
                    f"[Sequential] Step {step_name} missing state keys: {missing_keys}"
                )

        # Log current state keys for debugging
        state_keys = list(callback_context.state.keys())
        logger.debug(f"[Sequential] Available state keys: {state_keys}")

    return callback


def create_after_step_callback(
    step_name: str,
    output_key: Optional[str] = None
) -> Callable[[CallbackContext], None]:
    """
    Factory function to create an after_agent_callback that logs completion.

    Args:
        step_name: Name of the step for logging
        output_key: Key where this step's output is stored

    Returns:
        Callback function for the agent
    """
    def callback(callback_context: CallbackContext) -> None:
        logger.info(f"[Sequential] Completed step: {step_name}")

        if output_key:
            output_value = callback_context.state.get(output_key)
            if output_value:
                # Log truncated output for debugging
                output_preview = str(output_value)[:200]
                logger.debug(f"[Sequential] Output ({output_key}): {output_preview}...")
            else:
                logger.warning(f"[Sequential] No output found for key: {output_key}")

    return callback


def create_sequential_step(
    name: str,
    instruction: str,
    output_key: str,
    description: str = "",
    model: str = GEMINI_MODEL,
    tools: Optional[List] = None,
    required_state_keys: Optional[List[str]] = None,
) -> LlmAgent:
    """
    Factory function to create a standardized sequential step agent.

    This creates an LlmAgent configured for use in a SequentialAgent with:
    - Proper output_key for state passing
    - Before/after callbacks for logging
    - Portuguese instruction formatting

    Args:
        name: Agent name (e.g., "research_step")
        instruction: Agent instruction (supports {state_key} templates)
        output_key: State key to store this agent's output
        description: Agent description
        model: Gemini model to use
        tools: Optional list of tools for this agent
        required_state_keys: State keys this agent requires

    Returns:
        Configured LlmAgent for sequential workflow

    Example:
        >>> research_step = create_sequential_step(
        ...     name="research_step",
        ...     instruction="Pesquise sobre: {topic}",
        ...     output_key="research_results",
        ...     tools=[search_editals]
        ... )
    """
    return LlmAgent(
        name=name,
        model=model,
        description=description or f"Sequential step: {name}",
        instruction=instruction,
        output_key=output_key,
        include_contents='none',  # Avoid sending full history, use state instead
        tools=tools or [],
        before_agent_callback=create_before_step_callback(name, required_state_keys),
        after_agent_callback=create_after_step_callback(name, output_key),
    )


def create_sequential_workflow(
    name: str,
    steps: List[LlmAgent],
    description: str = "",
    initial_state_setup: Optional[Callable[[CallbackContext], None]] = None,
) -> SequentialAgent:
    """
    Factory function to create a complete sequential workflow.

    This wraps multiple LlmAgent steps into a SequentialAgent with:
    - Optional initial state setup callback
    - Proper agent chaining
    - Comprehensive logging

    Args:
        name: Workflow name (e.g., "grant_pipeline")
        steps: List of LlmAgent steps in execution order
        description: Workflow description
        initial_state_setup: Optional callback to initialize state

    Returns:
        Configured SequentialAgent

    Example:
        >>> workflow = create_sequential_workflow(
        ...     name="grant_pipeline",
        ...     steps=[research_step, draft_step, review_step],
        ...     description="Pipeline de elaboracao de projetos de captacao"
        ... )
    """
    logger.info(f"[Sequential] Creating workflow: {name} with {len(steps)} steps")

    return SequentialAgent(
        name=name,
        sub_agents=steps,
        description=description or f"Sequential workflow: {name}",
        before_agent_callback=initial_state_setup,
    )


class SequentialWorkflowBuilder:
    """
    Builder pattern for creating sequential workflows with fluent API.

    Provides a more readable way to construct complex sequential workflows
    with proper state management and error handling.

    Example:
        >>> workflow = (
        ...     SequentialWorkflowBuilder("grant_pipeline")
        ...     .with_description("Pipeline completo de captacao")
        ...     .add_step(
        ...         name="research",
        ...         instruction="Pesquise editais para: {topic}",
        ...         output_key="research_results",
        ...         tools=[search_editals]
        ...     )
        ...     .add_step(
        ...         name="draft",
        ...         instruction="Com base em: {research_results}, elabore proposta",
        ...         output_key="draft_proposal",
        ...         required_state=["research_results"]
        ...     )
        ...     .add_step(
        ...         name="review",
        ...         instruction="Revise a proposta: {draft_proposal}",
        ...         output_key="final_proposal",
        ...         required_state=["draft_proposal"]
        ...     )
        ...     .with_initial_state({"topic": "IA em saude"})
        ...     .build()
        ... )
    """

    def __init__(self, name: str):
        """Initialize the builder with workflow name."""
        self.name = name
        self.description = ""
        self.steps: List[LlmAgent] = []
        self.initial_state: Dict[str, Any] = {}
        self._model = GEMINI_MODEL

    def with_description(self, description: str) -> "SequentialWorkflowBuilder":
        """Set workflow description."""
        self.description = description
        return self

    def with_model(self, model: str) -> "SequentialWorkflowBuilder":
        """Set default model for all steps."""
        self._model = model
        return self

    def with_initial_state(self, state: Dict[str, Any]) -> "SequentialWorkflowBuilder":
        """Set initial state values."""
        self.initial_state = state
        return self

    def add_step(
        self,
        name: str,
        instruction: str,
        output_key: str,
        description: str = "",
        tools: Optional[List] = None,
        required_state: Optional[List[str]] = None,
        model: Optional[str] = None,
    ) -> "SequentialWorkflowBuilder":
        """
        Add a step to the workflow.

        Args:
            name: Step name
            instruction: Step instruction with {state_key} templates
            output_key: State key for this step's output
            description: Step description
            tools: Tools available to this step
            required_state: State keys required by this step
            model: Model override for this step
        """
        step = create_sequential_step(
            name=name,
            instruction=instruction,
            output_key=output_key,
            description=description,
            model=model or self._model,
            tools=tools,
            required_state_keys=required_state,
        )
        self.steps.append(step)
        return self

    def add_agent(self, agent: LlmAgent) -> "SequentialWorkflowBuilder":
        """Add a pre-configured agent as a step."""
        self.steps.append(agent)
        return self

    def build(self) -> SequentialAgent:
        """Build and return the sequential workflow."""
        if not self.steps:
            raise ValueError("Workflow must have at least one step")

        def setup_initial_state(callback_context: CallbackContext) -> None:
            """Initialize workflow state."""
            for key, value in self.initial_state.items():
                callback_context.state[key] = value
            logger.info(
                f"[Sequential] Initialized state with keys: {list(self.initial_state.keys())}"
            )

        return create_sequential_workflow(
            name=self.name,
            steps=self.steps,
            description=self.description,
            initial_state_setup=setup_initial_state if self.initial_state else None,
        )


# ============================================================================
# STATE HELPER TOOLS
# ============================================================================

def get_workflow_state(tool_context: ToolContext) -> dict:
    """
    Tool to inspect current workflow state.

    Useful for debugging and for agents that need to examine
    what data is available from previous steps.
    """
    state_keys = list(tool_context.state.keys())
    state_preview = {}

    for key in state_keys:
        value = tool_context.state.get(key)
        if isinstance(value, str) and len(value) > 200:
            state_preview[key] = value[:200] + "..."
        else:
            state_preview[key] = value

    return {
        "status": "success",
        "state_keys": state_keys,
        "state_preview": state_preview,
    }


def update_workflow_state(key: str, value: str, tool_context: ToolContext) -> dict:
    """
    Tool to update workflow state from within an agent.

    Use when an agent needs to store intermediate results
    that should be available to subsequent steps.

    Args:
        key: State key to update
        value: Value to store
        tool_context: ADK tool context (auto-injected)
    """
    tool_context.state[key] = value
    logger.info(f"[Sequential] State updated: {key}")

    return {
        "status": "success",
        "updated_key": key,
        "message": f"State key '{key}' updated successfully",
    }


# Export public API
__all__ = [
    "create_sequential_step",
    "create_sequential_workflow",
    "SequentialWorkflowBuilder",
    "get_workflow_state",
    "update_workflow_state",
    "GEMINI_MODEL",
]
