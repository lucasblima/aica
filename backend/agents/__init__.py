"""
AICA Life OS - ADK Multi-Agent System

Specialized AI agents for each AICA module, orchestrated
by a coordinator agent using Google's Agent Development Kit.

Modules:
  - Atlas: Task management with Eisenhower Matrix
  - Captacao: Grant writing and edital research
  - Studio: Podcast production and guest research
  - Journey: Self-knowledge and emotional patterns
  - Finance: Financial analysis and statement parsing
  - Connections: Relationship management

Services:
  - SupabaseSessionService: Persistent sessions
  - ContextCacheService: Token-efficient caching
  - FactExtractionService: Mem0-style learning
  - PersonalizationService: Adaptive personalization
  - CrossModuleService: Holistic insights
  - FileSearchService: RAG with File Search API

Workflows (Task #42):
  - Sequential: Step-by-step pipelines
  - Parallel: Concurrent data gathering
  - Loop: Iterative refinement

Proactive Agents (Task #43):
  - MorningBriefingAgent: Daily briefings
  - DeadlineWatcherAgent: Deadline monitoring
  - PatternAnalyzerAgent: Weekly pattern analysis
  - SessionCleanupAgent: Database maintenance

Usage:
    from backend.agents import root_agent
    from backend.agents.proactive import register_all_agents

    # Register proactive agents at startup
    register_all_agents()

    # Use root_agent for interactive sessions
    result = await runner.run(root_agent, user_message)
"""
