"""
AICA Life OS - Root Agent (ADK Entry Point)

This module defines the root_agent that serves as the coordinator
for all AICA module agents. It uses LLM-driven delegation to route
user messages to the appropriate specialized agent.

Features:
  - LLM-driven routing to specialized agents
  - Persistent sessions via Supabase
  - Context caching for token optimization (up to 90% savings)
  - Automatic fact extraction (Mem0-style learning) (Task #38)
  - Progressive personalization based on interaction history (Task #39)
  - Cross-module intelligence for holistic insights (Task #40)

Required env vars:
  - GOOGLE_API_KEY or GEMINI_API_KEY
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
"""

import os
import logging
import asyncio
from google.adk.agents import LlmAgent

from .modules.atlas import atlas_agent
from .modules.captacao import captacao_agent
from .modules.studio import studio_agent
from .modules.journey import journey_agent
from .modules.finance import finance_agent
from .modules.connections import connections_agent

# Import services
from .services import (
    extract_facts_callback,
    get_personalized_instruction,
    get_cross_module_context,
)

# Import cross-module tools
from .tools.supabase_tools import (
    generate_cross_module_insights,
    get_cross_module_context_tool,
    get_holistic_user_view,
)

logger = logging.getLogger(__name__)

# Ensure API key is available (ADK reads GOOGLE_API_KEY by default)
if not os.getenv("GOOGLE_API_KEY"):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        os.environ["GOOGLE_API_KEY"] = gemini_key

# Session service is managed by the Runner in main_agents.py
# SupabaseSessionService available for production use when needed

# ============================================================================
# CONTEXT CACHING INTEGRATION (Task #36)
# ============================================================================
# Context caching is handled by the ContextCacheService which:
# 1. Loads user memories from user_memory table
# 2. Creates a cached context with 1-hour TTL
# 3. Automatically refreshes when profile changes or cache expires
#
# To use context caching in agent calls, import:
#   from .services import get_cache_for_user
#
# Then in your agent handler:
#   cache_name = await get_cache_for_user(user_id, COORDINATOR_INSTRUCTION)
#   if cache_name:
#       # Use cached_content parameter in generate_content
#       pass
# ============================================================================

# ============================================================================
# FACT EXTRACTION INTEGRATION (Task #38) - Mem0-style Learning
# ============================================================================
# Automatic fact extraction runs after each conversation via after_agent_callback.
# It analyzes the conversation to:
# 1. Extract facts, preferences, patterns about the user
# 2. Compare semantically with existing memories
# 3. Execute ADD, UPDATE, DELETE operations as needed
#
# Manual extraction is also available via the extract_facts_from_conversation tool.
# ============================================================================

# ============================================================================
# PROGRESSIVE PERSONALIZATION (Task #39)
# ============================================================================
# The PersonalizationService adapts agent behavior based on relationship maturity:
#
# Phase 1 - Cold Start (<10 interactions):
#   - Generic exploratory questions
#   - Focus on discovering interests
#   - Build initial engagement
#
# Phase 2 - Warm-up (10-50 interactions):
#   - Reference conversation history
#   - Identify recurring patterns
#   - Start connecting themes
#
# Phase 3 - Mature (50+ interactions):
#   - Deep cross-theme connections
#   - Anticipate user needs
#   - Promote personal growth
#
# To inject personalized context into any agent instruction:
#   personalized = await get_personalized_instruction(user_id, base_instruction)
#
# Journey agent uses generate_daily_question tool for personalized questions.
# ============================================================================

# ============================================================================
# CROSS-MODULE INTELLIGENCE (Task #40)
# ============================================================================
# The CrossModuleService analyzes data across multiple AICA modules to generate
# holistic insights. It identifies correlations and patterns that wouldn't be
# visible from a single module.
#
# Module Pairs Analyzed:
#   - Atlas + Journey: Productivity vs Emotional State
#   - Atlas + Finance: Tasks vs Spending patterns
#   - Journey + Connections: Emotions vs Social interactions
#   - Captacao + Connections: Grants vs Academic networking
#   - Studio + Connections: Podcast vs Guest network
#   - Finance + Journey: Spending vs Emotional state
#
# Available tools for agents:
#   - generate_cross_module_insights: Analyze patterns across modules
#   - get_cross_module_context_tool: Get relevant context from other modules
#   - get_holistic_user_view: Get complete user state across all modules
#
# Insights are cached for 24 hours and stored in user_memory for personalization.
# ============================================================================


async def _after_conversation_callback(callback_context):
    """
    Callback executed after each agent conversation.

    Runs automatic fact extraction to learn about the user from the conversation.

    Args:
        callback_context: ADK callback context with session and invocation info
    """
    try:
        # Access session from callback context
        session = getattr(callback_context, '_invocation_context', None)
        if session is None:
            return

        session = getattr(session, 'session', None)
        if session is None:
            return

        # Get user_id from session state
        user_id = session.state.get("user_id") if hasattr(session, 'state') else None

        if not user_id:
            logger.debug("No user_id in session, skipping fact extraction")
            return

        # Get conversation messages
        messages = getattr(session, 'messages', [])
        if not messages:
            return

        # Convert ADK messages to simple dicts
        conversation = []
        for msg in messages[-10:]:  # Last 10 messages
            if hasattr(msg, 'role') and hasattr(msg, 'content'):
                conversation.append({
                    "role": msg.role,
                    "content": str(msg.content) if msg.content else ""
                })

        # Run fact extraction asynchronously
        result = await extract_facts_callback(
            session_state=session.state if hasattr(session, 'state') else {},
            messages=conversation,
            context_module=None  # Let the extraction service infer the module
        )

        if result and (result.added > 0 or result.updated > 0 or result.deleted > 0):
            logger.info(
                f"Auto fact extraction for {user_id[:8]}: "
                f"+{result.added} ~{result.updated} -{result.deleted}"
            )

    except Exception as e:
        # Non-critical: log but don't fail the conversation
        logger.warning(f"Fact extraction callback error: {e}")
# ============================================================================

COORDINATOR_INSTRUCTION = """Voce e a Aica, assistente pessoal integrada ao Aica Life OS.
Voce coordena agentes especializados para ajudar o usuario em diferentes areas da vida.

## Regras Gerais
- Responda SEMPRE em portugues brasileiro
- Seja concisa e objetiva (max 300 palavras)
- Nunca invente dados - use apenas informacoes dos agentes
- Sugira proximos passos quando apropriado

## Delegacao de Agentes
Analise a mensagem do usuario e delegue ao agente correto:

1. **atlas_agent**: Tarefas, produtividade, prioridades, Eisenhower, to-do, pendencias
2. **captacao_agent**: Editais de fomento, buscar oportunidades, FAPERJ, FINEP, CNPq, propostas
3. **studio_agent**: Podcast, convidados, dossies, pautas, perguntas, episodios
4. **journey_agent**: Sentimentos, emocoes, reflexoes, autoconhecimento, padroes emocionais
5. **finance_agent**: Dinheiro, gastos, orcamento, extrato, economia, investimentos
6. **connections_agent**: Contatos, networking, relacionamentos, mensagens

## Ferramentas Cross-Module (Inteligencia Holistica)
Alem de delegar, voce tem acesso a ferramentas que cruzam dados entre modulos:

- **get_holistic_user_view**: Visao completa do estado do usuario em todos os modulos.
  Use para personalizar saudacoes ou quando precisar de contexto geral.

- **generate_cross_module_insights**: Gera insights que cruzam dados entre modulos.
  Exemplos: "Produtividade aumenta apos reflexoes matinais", "Gastos com delivery
  aumentam em semanas de deadline". Use quando o usuario pedir analises mais profundas.

- **get_cross_module_context_tool**: Obtem alertas e insights de outros modulos
  relevantes para o modulo atual. Use antes de delegar para enriquecer o contexto.

## Quando NAO delegar
Para saudacoes simples, perguntas gerais sobre o Aica, ou conversas casuais,
responda diretamente sem delegar. Seja acolhedora e profissional.

## Proatividade
Quando detectar alertas cross-module (deadlines, sobrecarga, estado emocional),
mencione-os proativamente para ajudar o usuario de forma holistica.
"""

root_agent = LlmAgent(
    name="aica_coordinator",
    model="gemini-2.5-flash",
    description="Coordenadora do Aica Life OS que delega a agentes especializados.",
    instruction=COORDINATOR_INSTRUCTION,
    sub_agents=[
        atlas_agent,
        captacao_agent,
        studio_agent,
        journey_agent,
        finance_agent,
        connections_agent,
    ],
    # Cross-module intelligence tools (Task #40)
    tools=[
        get_holistic_user_view,
        generate_cross_module_insights,
        get_cross_module_context_tool,
    ],
    # Enable automatic fact extraction after conversations (Task #38)
    after_agent_callback=_after_conversation_callback,
)
