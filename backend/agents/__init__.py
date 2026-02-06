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

Observability (Task #44):
  - Tracing: OpenTelemetry distributed tracing
  - Metrics: Agent invocations, latency, token usage
  - Logging: Structured JSON logs with correlation

A2A Communication (Task #44):
  - MessageBus: In-memory pub/sub for agent communication
  - Protocol: Request/response and event patterns
  - Handlers: Pre-built delegation and notification handlers

Privacy & LGPD (Task #44):
  - ConsentManager: Purpose-specific consent tracking
  - DataSubjectRights: Export, delete, anonymize
  - RetentionPolicy: Automatic data purging
  - PrivacyAuditLogger: Tamper-evident audit trail

Usage:
    from backend.agents import root_agent
    from backend.agents.proactive import register_all_agents
    from backend.agents.observability import setup_observability
    from backend.agents.privacy import get_consent_manager

    # Register proactive agents at startup
    register_all_agents()

    # Initialize observability
    setup_observability(app)

    # Check consent before processing
    consent = get_consent_manager()
    if await consent.check_consent(user_id, "ai_processing"):
        result = await runner.run(root_agent, user_message)
"""
