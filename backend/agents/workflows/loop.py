"""
Loop Workflow Agent for AICA Life OS (Task #42)

Implements the Loop Workflow pattern for iterative refinement processes.
Repeatedly executes a sequence of agents until a condition is met or
maximum iterations are reached.

Pattern: While(condition) { Step1 -> Step2 -> ... } -> Final Result

Key Features:
- Max iterations limit to prevent infinite loops
- Quality threshold-based exit conditions
- Escalate mechanism for early termination
- State accumulation across iterations
- Iteration tracking and logging

Use Cases:
- Content refinement (improve text until quality >= threshold)
- Grant proposal polishing (critique -> improve loop)
- Podcast pauta optimization (draft -> review -> refine)

References:
- ADK LoopAgent: https://google.github.io/adk-docs/agents/workflow-agents/loop-agents/
- Task #42: Workflow Agents

Known Limitation:
- When LoopAgent exits via escalate, it stops the entire parent SequentialAgent.
  For workflows that need to continue after the loop, consider using
  max_iterations instead of escalate, or wrap the loop in a custom agent.
"""

import os
import logging
from typing import List, Optional, Dict, Any, Callable

from google.adk.agents import LlmAgent, BaseAgent
from google.adk.agents.loop_agent import LoopAgent
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)

# Constants
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_MAX_ITERATIONS = 5
STATE_ITERATION_COUNT = "_loop_iteration_count"
STATE_QUALITY_SCORE = "_quality_score"


def exit_loop(tool_context: ToolContext) -> dict:
    """
    Tool to signal that the loop should terminate.

    When called, sets the escalate flag which causes the LoopAgent
    to stop iterating. Use when a quality threshold is met or
    when further iteration would not improve results.

    WARNING: Using escalate will also stop any parent SequentialAgent.
    Use max_iterations if you need the workflow to continue after the loop.

    Args:
        tool_context: ADK tool context (auto-injected)

    Returns:
        Status confirmation
    """
    logger.info("[Loop] exit_loop tool called - terminating loop")
    tool_context.actions.escalate = True
    tool_context.actions.skip_summarization = True

    return {
        "status": "success",
        "message": "Loop terminated successfully",
        "iteration_count": tool_context.state.get(STATE_ITERATION_COUNT, 0),
    }


def track_iteration(tool_context: ToolContext) -> dict:
    """
    Tool to increment and track loop iteration count.

    Should be called at the start of each loop iteration.
    Useful for agents that need to know the current iteration number.

    Args:
        tool_context: ADK tool context (auto-injected)

    Returns:
        Current iteration information
    """
    current = tool_context.state.get(STATE_ITERATION_COUNT, 0)
    new_count = current + 1
    tool_context.state[STATE_ITERATION_COUNT] = new_count

    logger.info(f"[Loop] Iteration {new_count}")

    return {
        "status": "success",
        "current_iteration": new_count,
        "message": f"Iteration {new_count} started",
    }


def set_quality_score(score: float, tool_context: ToolContext) -> dict:
    """
    Tool to set the current quality score for threshold-based exit.

    Agents can use this to track quality improvements across iterations.
    When combined with quality_threshold in the loop, enables automatic
    exit when quality is sufficient.

    Args:
        score: Quality score between 0.0 and 1.0
        tool_context: ADK tool context (auto-injected)

    Returns:
        Score update confirmation
    """
    score = max(0.0, min(1.0, float(score)))  # Clamp to [0, 1]
    previous = tool_context.state.get(STATE_QUALITY_SCORE, 0.0)
    tool_context.state[STATE_QUALITY_SCORE] = score

    improvement = score - previous
    logger.info(f"[Loop] Quality score: {score:.2f} (delta: {improvement:+.2f})")

    return {
        "status": "success",
        "quality_score": score,
        "previous_score": previous,
        "improvement": improvement,
    }


def create_critic_agent(
    name: str,
    instruction: str,
    output_key: str,
    completion_phrase: str = "Sem melhorias necessarias.",
    model: str = GEMINI_MODEL,
    tools: Optional[List] = None,
) -> LlmAgent:
    """
    Factory function to create a critic agent for loop evaluation.

    The critic evaluates the current state and provides feedback.
    If the work meets quality standards, it outputs the completion_phrase
    to signal the refiner to exit the loop.

    Args:
        name: Agent name (e.g., "proposal_critic")
        instruction: Critic instruction (should examine the work and provide feedback)
        output_key: State key for critique output
        completion_phrase: Phrase that signals work is complete
        model: Gemini model to use
        tools: Additional tools for evaluation

    Returns:
        Configured LlmAgent for critiquing

    Example:
        >>> critic = create_critic_agent(
        ...     name="grant_proposal_critic",
        ...     instruction="Avalie a proposta: {draft_proposal}. Se perfeita, responda: Sem melhorias necessarias.",
        ...     output_key="critique",
        ... )
    """
    full_instruction = f"""{instruction}

## Regras de Avaliacao
- Se o trabalho estiver BOM e pronto para uso, responda EXATAMENTE: "{completion_phrase}"
- Se houver melhorias necessarias, forneca criticas construtivas e especificas
- Seja objetivo e pratico nas sugestoes
"""

    def log_critique(callback_context: CallbackContext) -> None:
        critique = callback_context.state.get(output_key, "")
        if completion_phrase in critique:
            logger.info(f"[Loop] Critic {name}: Work approved!")
        else:
            logger.info(f"[Loop] Critic {name}: Improvements requested")

    return LlmAgent(
        name=name,
        model=model,
        description=f"Critic agent for iterative refinement: {name}",
        instruction=full_instruction,
        output_key=output_key,
        include_contents='none',
        tools=tools or [],
        after_agent_callback=log_critique,
    )


def create_refiner_agent(
    name: str,
    instruction: str,
    output_key: str,
    critique_key: str,
    completion_phrase: str = "Sem melhorias necessarias.",
    model: str = GEMINI_MODEL,
    tools: Optional[List] = None,
) -> LlmAgent:
    """
    Factory function to create a refiner agent for loop improvement.

    The refiner reads the critique and either:
    1. Calls exit_loop if the completion_phrase is detected
    2. Applies improvements and outputs refined work

    Args:
        name: Agent name (e.g., "proposal_refiner")
        instruction: Refiner instruction (should reference work and critique)
        output_key: State key for refined output (usually same as input)
        critique_key: State key where critique is stored
        completion_phrase: Phrase that signals work is complete (to detect)
        model: Gemini model to use
        tools: Additional tools (exit_loop is auto-added)

    Returns:
        Configured LlmAgent for refining

    Example:
        >>> refiner = create_refiner_agent(
        ...     name="grant_proposal_refiner",
        ...     instruction="Aplique as melhorias sugeridas em: {draft_proposal}",
        ...     output_key="draft_proposal",
        ...     critique_key="critique",
        ... )
    """
    full_instruction = f"""{instruction}

## Logica de Decisao
1. Primeiro, verifique a critica em {{{critique_key}}}
2. Se a critica contem "{completion_phrase}": chame a funcao exit_loop()
3. Caso contrario: aplique as melhorias sugeridas e produza versao refinada

Critica atual: {{{critique_key}}}
"""

    # Ensure exit_loop is in tools
    all_tools = [exit_loop] + (tools or [])

    def log_refinement(callback_context: CallbackContext) -> None:
        iteration = callback_context.state.get(STATE_ITERATION_COUNT, 0)
        logger.info(f"[Loop] Refiner {name}: Completed iteration {iteration}")

    return LlmAgent(
        name=name,
        model=model,
        description=f"Refiner agent for iterative improvement: {name}",
        instruction=full_instruction,
        output_key=output_key,
        include_contents='none',
        tools=all_tools,
        after_agent_callback=log_refinement,
    )


def create_loop_workflow(
    name: str,
    loop_agents: List[LlmAgent],
    max_iterations: int = DEFAULT_MAX_ITERATIONS,
    description: str = "",
) -> LoopAgent:
    """
    Factory function to create a loop workflow.

    The loop executes sub-agents in sequence, then repeats until:
    1. max_iterations is reached, OR
    2. A sub-agent calls exit_loop (triggers escalate)

    Args:
        name: Workflow name (e.g., "refinement_loop")
        loop_agents: Agents to execute in each iteration
        max_iterations: Maximum number of iterations
        description: Workflow description

    Returns:
        Configured LoopAgent

    Example:
        >>> loop = create_loop_workflow(
        ...     name="proposal_refinement_loop",
        ...     loop_agents=[critic_agent, refiner_agent],
        ...     max_iterations=5,
        ... )
    """
    logger.info(f"[Loop] Creating workflow: {name} with max {max_iterations} iterations")

    return LoopAgent(
        name=name,
        sub_agents=loop_agents,
        max_iterations=max_iterations,
        description=description or f"Loop workflow: {name}",
    )


def create_iterative_refinement_workflow(
    name: str,
    initial_agent: LlmAgent,
    critic_instruction: str,
    refiner_instruction: str,
    work_key: str,
    critique_key: str = "critique",
    completion_phrase: str = "Sem melhorias necessarias.",
    max_iterations: int = DEFAULT_MAX_ITERATIONS,
    description: str = "",
) -> SequentialAgent:
    """
    Factory function to create a complete iterative refinement workflow.

    This is the most common loop pattern:
    1. Initial agent creates first draft
    2. Loop: Critic evaluates -> Refiner improves (until done or max_iterations)
    3. Final result in work_key

    Pattern: Initial -> [Critic -> Refiner] x N -> Final

    Args:
        name: Workflow name
        initial_agent: Agent that creates the first draft
        critic_instruction: Instruction for the critic (should evaluate work_key)
        refiner_instruction: Instruction for the refiner (should improve work_key)
        work_key: State key for the work being refined
        critique_key: State key for critic feedback
        completion_phrase: Phrase that signals completion
        max_iterations: Maximum refinement iterations
        description: Workflow description

    Returns:
        SequentialAgent containing initial + refinement loop

    Example:
        >>> workflow = create_iterative_refinement_workflow(
        ...     name="pauta_refinement",
        ...     initial_agent=pauta_generator,
        ...     critic_instruction="Avalie a pauta: {pauta}",
        ...     refiner_instruction="Melhore a pauta baseado na critica",
        ...     work_key="pauta",
        ...     max_iterations=3,
        ... )
    """
    # Create critic agent
    critic = create_critic_agent(
        name=f"{name}_critic",
        instruction=critic_instruction,
        output_key=critique_key,
        completion_phrase=completion_phrase,
    )

    # Create refiner agent
    refiner = create_refiner_agent(
        name=f"{name}_refiner",
        instruction=refiner_instruction,
        output_key=work_key,
        critique_key=critique_key,
        completion_phrase=completion_phrase,
    )

    # Create the refinement loop
    refinement_loop = create_loop_workflow(
        name=f"{name}_loop",
        loop_agents=[critic, refiner],
        max_iterations=max_iterations,
        description=f"Refinement loop for {name}",
    )

    # Wrap with initial agent
    return SequentialAgent(
        name=name,
        sub_agents=[initial_agent, refinement_loop],
        description=description or f"Iterative refinement workflow: {name}",
    )


class LoopWorkflowBuilder:
    """
    Builder pattern for creating loop workflows with fluent API.

    Provides a more readable way to construct iterative refinement
    workflows with proper exit conditions.

    Example:
        >>> workflow = (
        ...     LoopWorkflowBuilder("grant_refinement")
        ...     .with_description("Refinamento iterativo de proposta de captacao")
        ...     .with_max_iterations(5)
        ...     .with_initial_step(
        ...         name="draft_generator",
        ...         instruction="Gere rascunho inicial para: {edital_requirements}",
        ...         output_key="draft_proposal"
        ...     )
        ...     .with_critic(
        ...         instruction="Avalie a proposta: {draft_proposal}",
        ...         output_key="critique"
        ...     )
        ...     .with_refiner(
        ...         instruction="Melhore a proposta baseado na critica",
        ...         output_key="draft_proposal",
        ...         critique_key="critique"
        ...     )
        ...     .with_completion_phrase("Proposta aprovada para submissao.")
        ...     .build()
        ... )
    """

    def __init__(self, name: str):
        """Initialize the builder with workflow name."""
        self.name = name
        self.description = ""
        self.max_iterations = DEFAULT_MAX_ITERATIONS
        self.completion_phrase = "Sem melhorias necessarias."
        self._model = GEMINI_MODEL
        self._initial_agent: Optional[LlmAgent] = None
        self._critic: Optional[LlmAgent] = None
        self._refiner: Optional[LlmAgent] = None
        self._custom_loop_agents: List[LlmAgent] = []
        self._critique_key = "critique"

    def with_description(self, description: str) -> "LoopWorkflowBuilder":
        """Set workflow description."""
        self.description = description
        return self

    def with_model(self, model: str) -> "LoopWorkflowBuilder":
        """Set default model for all agents."""
        self._model = model
        return self

    def with_max_iterations(self, max_iterations: int) -> "LoopWorkflowBuilder":
        """Set maximum loop iterations."""
        self.max_iterations = max_iterations
        return self

    def with_completion_phrase(self, phrase: str) -> "LoopWorkflowBuilder":
        """Set the phrase that signals loop completion."""
        self.completion_phrase = phrase
        return self

    def with_initial_step(
        self,
        name: str,
        instruction: str,
        output_key: str,
        description: str = "",
        tools: Optional[List] = None,
        model: Optional[str] = None,
    ) -> "LoopWorkflowBuilder":
        """
        Configure the initial step (runs once before the loop).

        Args:
            name: Agent name
            instruction: Initial generation instruction
            output_key: State key for initial output
            description: Agent description
            tools: Tools for initial generation
            model: Model override
        """
        self._initial_agent = LlmAgent(
            name=name,
            model=model or self._model,
            description=description or f"Initial step: {name}",
            instruction=instruction,
            output_key=output_key,
            include_contents='none',
            tools=tools or [],
        )
        return self

    def with_initial_agent(self, agent: LlmAgent) -> "LoopWorkflowBuilder":
        """Set a pre-configured agent as the initial step."""
        self._initial_agent = agent
        return self

    def with_critic(
        self,
        instruction: str,
        output_key: str = "critique",
        name: Optional[str] = None,
        description: str = "",
        tools: Optional[List] = None,
        model: Optional[str] = None,
    ) -> "LoopWorkflowBuilder":
        """
        Configure the critic agent.

        Args:
            instruction: Critic evaluation instruction
            output_key: State key for critique output
            name: Critic name (defaults to {workflow_name}_critic)
            description: Agent description
            tools: Additional evaluation tools
            model: Model override
        """
        self._critique_key = output_key
        self._critic = create_critic_agent(
            name=name or f"{self.name}_critic",
            instruction=instruction,
            output_key=output_key,
            completion_phrase=self.completion_phrase,
            model=model or self._model,
            tools=tools,
        )
        return self

    def with_refiner(
        self,
        instruction: str,
        output_key: str,
        critique_key: Optional[str] = None,
        name: Optional[str] = None,
        description: str = "",
        tools: Optional[List] = None,
        model: Optional[str] = None,
    ) -> "LoopWorkflowBuilder":
        """
        Configure the refiner agent.

        Args:
            instruction: Refinement instruction
            output_key: State key for refined output
            critique_key: State key to read critique from
            name: Refiner name (defaults to {workflow_name}_refiner)
            description: Agent description
            tools: Additional refinement tools
            model: Model override
        """
        self._refiner = create_refiner_agent(
            name=name or f"{self.name}_refiner",
            instruction=instruction,
            output_key=output_key,
            critique_key=critique_key or self._critique_key,
            completion_phrase=self.completion_phrase,
            model=model or self._model,
            tools=tools,
        )
        return self

    def add_loop_agent(self, agent: LlmAgent) -> "LoopWorkflowBuilder":
        """Add a custom agent to the loop sequence."""
        self._custom_loop_agents.append(agent)
        return self

    def build(self) -> BaseAgent:
        """Build and return the loop workflow."""
        # Determine loop agents
        if self._critic and self._refiner:
            loop_agents = [self._critic, self._refiner] + self._custom_loop_agents
        elif self._custom_loop_agents:
            loop_agents = self._custom_loop_agents
        else:
            raise ValueError("Loop must have either critic+refiner or custom loop agents")

        # Create the loop
        loop = create_loop_workflow(
            name=f"{self.name}_loop",
            loop_agents=loop_agents,
            max_iterations=self.max_iterations,
            description=f"Refinement loop for {self.name}",
        )

        # If we have an initial agent, wrap in sequential
        if self._initial_agent:
            return SequentialAgent(
                name=self.name,
                sub_agents=[self._initial_agent, loop],
                description=self.description or f"Iterative refinement: {self.name}",
            )
        else:
            # Just the loop
            loop.name = self.name
            loop.description = self.description or loop.description
            return loop


# ============================================================================
# QUALITY-BASED EXIT HELPERS
# ============================================================================

def create_quality_checker_agent(
    name: str,
    evaluation_instruction: str,
    quality_threshold: float = 0.85,
    model: str = GEMINI_MODEL,
) -> LlmAgent:
    """
    Create an agent that evaluates quality and exits loop if threshold met.

    This agent:
    1. Evaluates the current work
    2. Calls set_quality_score with the evaluation
    3. Calls exit_loop if quality >= threshold

    Args:
        name: Agent name
        evaluation_instruction: How to evaluate quality (should output score 0-1)
        quality_threshold: Minimum quality score to exit loop
        model: Gemini model to use

    Returns:
        Configured LlmAgent for quality checking

    Example:
        >>> checker = create_quality_checker_agent(
        ...     name="pauta_quality_checker",
        ...     evaluation_instruction="Avalie a pauta {pauta} de 0 a 1",
        ...     quality_threshold=0.85,
        ... )
    """
    instruction = f"""{evaluation_instruction}

## Instrucoes de Avaliacao
1. Avalie o trabalho e determine uma pontuacao de qualidade de 0.0 a 1.0
2. Chame set_quality_score(score) com sua avaliacao
3. Se a pontuacao >= {quality_threshold}, chame exit_loop()
4. Se a pontuacao < {quality_threshold}, forneca feedback para melhoria

Limiar de qualidade: {quality_threshold}
"""

    return LlmAgent(
        name=name,
        model=model,
        description=f"Quality checker with threshold {quality_threshold}",
        instruction=instruction,
        include_contents='none',
        tools=[set_quality_score, exit_loop],
    )


# Export public API
__all__ = [
    # Core tools
    "exit_loop",
    "track_iteration",
    "set_quality_score",
    # Agent factories
    "create_critic_agent",
    "create_refiner_agent",
    "create_loop_workflow",
    "create_iterative_refinement_workflow",
    "create_quality_checker_agent",
    # Builder
    "LoopWorkflowBuilder",
    # Constants
    "GEMINI_MODEL",
    "DEFAULT_MAX_ITERATIONS",
    "STATE_ITERATION_COUNT",
    "STATE_QUALITY_SCORE",
]
