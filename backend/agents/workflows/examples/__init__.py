"""
AICA Life OS - Workflow Examples

Pre-built workflow examples demonstrating the three workflow patterns
(Sequential, Parallel, Loop) with real AICA use cases.

Usage:
    # Import specific workflow
    from backend.agents.workflows.examples import grant_pipeline
    from backend.agents.workflows.examples import daily_briefing
    from backend.agents.workflows.examples import pauta_refinement

    # Or import all
    from backend.agents.workflows.examples import (
        # Sequential
        grant_pipeline,

        # Parallel
        daily_briefing,
        resilient_daily_briefing,

        # Loop
        pauta_refinement,
        proposal_refinement,
        blog_refinement,
    )

References:
- Task #42: Workflow Agents
"""

# Sequential workflows
from .grant_pipeline import (
    grant_pipeline,
    create_grant_pipeline,
    # State keys
    STATE_EDITAL_TOPIC,
    STATE_AGENCY,
    STATE_RESEARCH_RESULTS,
    STATE_EDITAL_REQUIREMENTS,
    STATE_DRAFT_PROPOSAL,
    STATE_REVIEW_FEEDBACK,
    STATE_FINAL_PROPOSAL,
)

# Parallel workflows
from .daily_briefing import (
    daily_briefing,
    resilient_daily_briefing,
    create_daily_briefing_workflow,
    create_resilient_daily_briefing,
    # State keys
    STATE_USER_NAME,
    STATE_BRIEFING_STYLE,
    STATE_ATLAS_DATA,
    STATE_JOURNEY_DATA,
    STATE_FINANCE_DATA,
    STATE_STUDIO_DATA,
    STATE_CONNECTIONS_DATA,
    STATE_CROSS_MODULE_DATA,
    STATE_DAILY_BRIEFING,
)

# Loop workflows
from .content_refinement import (
    pauta_refinement,
    proposal_refinement,
    blog_refinement,
    create_pauta_refinement_workflow,
    create_proposal_refinement_workflow,
    create_quality_based_refinement,
    # State keys
    STATE_TOPIC,
    STATE_GUEST_NAME,
    STATE_GUEST_BIO,
    STATE_PAUTA,
    STATE_PAUTA_CRITIQUE,
)

__all__ = [
    # Sequential
    "grant_pipeline",
    "create_grant_pipeline",

    # Parallel
    "daily_briefing",
    "resilient_daily_briefing",
    "create_daily_briefing_workflow",
    "create_resilient_daily_briefing",

    # Loop
    "pauta_refinement",
    "proposal_refinement",
    "blog_refinement",
    "create_pauta_refinement_workflow",
    "create_proposal_refinement_workflow",
    "create_quality_based_refinement",
]
