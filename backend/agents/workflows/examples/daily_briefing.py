"""
Daily Briefing - Parallel Workflow Example

This workflow gathers data from multiple AICA modules in parallel and
synthesizes a personalized daily briefing for the user.

Pattern: [Atlas, Journey, Finance, Studio] -> Parallel -> Merge -> Briefing

Uses the Parallel pattern because module data fetching is independent.

Features:
- Concurrent data gathering (faster than sequential)
- Resilient to partial failures (continues with available data)
- Personalized synthesis based on user context
- Cross-module insights integration

Usage:
    from backend.agents.workflows.examples.daily_briefing import daily_briefing

    # In your agent or application:
    result = await daily_briefing.ainvoke(
        initial_state={"user_name": "Lucas", "briefing_style": "conciso"}
    )

References:
- Task #42: Workflow Agents
- Task #40: Cross-Module Intelligence
"""

import os
import sys
from datetime import datetime

# Add parent paths for imports when running standalone
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from google.adk.agents import LlmAgent

from backend.agents.workflows import (
    ParallelWorkflowBuilder,
    create_resilient_parallel_workflow,
)
from backend.agents.tools.supabase_tools import (
    # Atlas
    get_pending_tasks,
    get_completed_tasks_today,
    # Journey
    get_recent_moments,
    analyze_emotional_pattern,
    # Finance
    get_finance_summary,
    # Studio
    get_upcoming_episodes,
    # Connections
    get_connection_spaces,
    # Cross-module
    get_holistic_user_view,
    generate_cross_module_insights,
)

# Constants
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ============================================================================
# STATE KEYS
# ============================================================================
STATE_USER_NAME = "user_name"
STATE_BRIEFING_STYLE = "briefing_style"  # "conciso", "detalhado", "motivacional"
STATE_ATLAS_DATA = "atlas_data"
STATE_JOURNEY_DATA = "journey_data"
STATE_FINANCE_DATA = "finance_data"
STATE_STUDIO_DATA = "studio_data"
STATE_CONNECTIONS_DATA = "connections_data"
STATE_CROSS_MODULE_DATA = "cross_module_data"
STATE_DAILY_BRIEFING = "daily_briefing"


# ============================================================================
# PARALLEL AGENTS - DATA GATHERERS
# ============================================================================

ATLAS_INSTRUCTION = """Voce e o coletor de dados do modulo Atlas (produtividade).

## Sua Tarefa
1. Use get_pending_tasks para obter tarefas pendentes
2. Use get_completed_tasks_today para ver progresso de hoje

## Formato da Resposta
Retorne um resumo estruturado:

**Tarefas Pendentes:**
- Total: X tarefas
- Urgentes (Q1): X
- Importantes (Q2): X
- Lista das 3 mais prioritarias

**Progresso Hoje:**
- Completadas: X tarefas
- Destaque: [tarefa mais significativa]

**Alerta:** [Se houver deadline proximo]

Seja objetivo e direto.
"""

JOURNEY_INSTRUCTION = """Voce e o coletor de dados do modulo Journey (autoconhecimento).

## Sua Tarefa
1. Use get_recent_moments para obter reflexoes recentes
2. Use analyze_emotional_pattern para identificar padroes

## Formato da Resposta
Retorne um resumo estruturado:

**Estado Emocional:**
- Emocao predominante: [emocao]
- Tendencia: [melhora/estavel/declinio]

**Reflexoes Recentes:**
- Temas principais: [lista]
- Insight destacado: [citacao ou resumo]

**Recomendacao:** [Sugestao gentil baseada no estado emocional]

Seja empatico e acolhedor.
"""

FINANCE_INSTRUCTION = """Voce e o coletor de dados do modulo Finance (financeiro).

## Sua Tarefa
1. Use get_finance_summary para obter resumo do mes

## Formato da Resposta
Retorne um resumo estruturado:

**Resumo do Mes:**
- Receitas: R$ X
- Despesas: R$ X
- Saldo: R$ X (positivo/negativo)

**Categorias Principais:**
- Maior gasto: [categoria]
- Transacoes: X no total

**Alerta:** [Se gastos excederem receitas ou houver anomalia]

Seja informativo e pratico.
"""

STUDIO_INSTRUCTION = """Voce e o coletor de dados do modulo Studio (podcast).

## Sua Tarefa
1. Use get_upcoming_episodes para ver episodios planejados

## Formato da Resposta
Retorne um resumo estruturado:

**Proximos Episodios:**
- Planejados: X episodios
- Proximo: [titulo] em [data]
- Convidado: [nome se houver]

**Pendencias:**
- [Lista de acoes necessarias]

**Sugestao:** [Proximo passo recomendado]

Se nao houver episodios, sugira criar um novo.
"""

CONNECTIONS_INSTRUCTION = """Voce e o coletor de dados do modulo Connections (relacionamentos).

## Sua Tarefa
1. Use get_connection_spaces para ver espacos de conexao

## Formato da Resposta
Retorne um resumo estruturado:

**Espacos Ativos:**
- Total: X espacos
- Favoritos: [lista]

**Destaques:**
- Espaco mais ativo: [nome]
- Conexoes recentes: [se houver]

**Sugestao:** [Contato para reconectar ou acao de networking]

Seja social e encorajador.
"""

CROSS_MODULE_INSTRUCTION = """Voce analisa correlacoes entre diferentes areas da vida do usuario.

## Sua Tarefa
1. Use get_holistic_user_view para visao geral
2. Use generate_cross_module_insights para correlacoes

## Formato da Resposta
Retorne insights cruzados:

**Correlacoes Identificadas:**
- [Produtividade + Emocoes]: [insight]
- [Financas + Habitos]: [insight]
- [Podcast + Networking]: [insight]

**Padrao Principal:**
[Observacao mais significativa cruzando 2+ modulos]

**Insight Acionavel:**
[Uma recomendacao baseada nas correlacoes]

Seja analitico e oferea valor unico.
"""


# ============================================================================
# MERGER AGENT
# ============================================================================

MERGER_INSTRUCTION = """Voce e a Aica, assistente pessoal do usuario.

## Dados Coletados
- **Atlas (Produtividade):** {atlas_data}
- **Journey (Emocional):** {journey_data}
- **Finance (Financeiro):** {finance_data}
- **Studio (Podcast):** {studio_data}
- **Connections (Relacionamentos):** {connections_data}
- **Cross-Module (Correlacoes):** {cross_module_data}

## Sua Tarefa
Sintetize um BRIEFING DIARIO personalizado.

## Formato do Briefing

---
**Bom dia, {user_name}!** [saudacao contextualizada]

### Como Voce Esta
[Breve reflexao baseada em Journey, empatica]

### Prioridades de Hoje
1. [Tarefa mais importante de Atlas]
2. [Segunda prioridade]
3. [Terceira prioridade]

### Alertas
- [Deadlines, gastos, compromissos importantes]

### Insight do Dia
[Cross-module insight mais relevante]

### Sugestao da Aica
[Uma acao concreta que conecta diferentes areas]

---

## Estilo: {briefing_style}
- **conciso**: Max 200 palavras, bullets diretos
- **detalhado**: 300-400 palavras, mais contexto
- **motivacional**: Foco em conquistas e encorajamento

## Regras
- Seja acolhedora mas objetiva
- Use emojis com moderacao (max 3)
- Personalize com o nome do usuario
- Se faltar dados de algum modulo, nao mencione
- Responda em portugues brasileiro
"""


# ============================================================================
# BUILD THE WORKFLOW
# ============================================================================

def create_daily_briefing_workflow():
    """
    Create the daily briefing parallel workflow.

    Returns:
        Parallel-then-merge workflow for daily briefing generation
    """
    return (
        ParallelWorkflowBuilder("daily_briefing")
        .with_description(
            "Gera briefing diario personalizado coletando dados de "
            "todos os modulos AICA em paralelo e sintetizando insights."
        )
        .with_model(GEMINI_MODEL)

        # Parallel data gatherers
        .add_parallel_agent(
            name="atlas_gatherer",
            instruction=ATLAS_INSTRUCTION,
            output_key=STATE_ATLAS_DATA,
            description="Coleta dados de produtividade",
            tools=[get_pending_tasks, get_completed_tasks_today],
        )
        .add_parallel_agent(
            name="journey_gatherer",
            instruction=JOURNEY_INSTRUCTION,
            output_key=STATE_JOURNEY_DATA,
            description="Coleta dados emocionais",
            tools=[get_recent_moments, analyze_emotional_pattern],
        )
        .add_parallel_agent(
            name="finance_gatherer",
            instruction=FINANCE_INSTRUCTION,
            output_key=STATE_FINANCE_DATA,
            description="Coleta dados financeiros",
            tools=[get_finance_summary],
        )
        .add_parallel_agent(
            name="studio_gatherer",
            instruction=STUDIO_INSTRUCTION,
            output_key=STATE_STUDIO_DATA,
            description="Coleta dados de podcast",
            tools=[get_upcoming_episodes],
        )
        .add_parallel_agent(
            name="connections_gatherer",
            instruction=CONNECTIONS_INSTRUCTION,
            output_key=STATE_CONNECTIONS_DATA,
            description="Coleta dados de relacionamentos",
            tools=[get_connection_spaces],
        )
        .add_parallel_agent(
            name="cross_module_gatherer",
            instruction=CROSS_MODULE_INSTRUCTION,
            output_key=STATE_CROSS_MODULE_DATA,
            description="Analisa correlacoes cross-module",
            tools=[get_holistic_user_view, generate_cross_module_insights],
        )

        # Merger synthesizes the briefing
        .with_merger(
            instruction=MERGER_INSTRUCTION,
            output_key=STATE_DAILY_BRIEFING,
            name="briefing_synthesizer",
            description="Sintetiza briefing diario personalizado",
        )

        .build()
    )


# Pre-built instance for easy import
daily_briefing = create_daily_briefing_workflow()


# ============================================================================
# ALTERNATIVE: RESILIENT VERSION
# ============================================================================

def create_resilient_daily_briefing():
    """
    Create a resilient version that handles partial failures.

    If some modules fail to fetch data, the briefing continues
    with available data and fallback messages.

    Returns:
        Resilient parallel-then-merge workflow
    """
    from backend.agents.workflows.parallel import create_parallel_step

    # Create parallel agents with the same configs
    parallel_agents = [
        create_parallel_step(
            name="atlas_gatherer",
            instruction=ATLAS_INSTRUCTION,
            output_key=STATE_ATLAS_DATA,
            tools=[get_pending_tasks, get_completed_tasks_today],
        ),
        create_parallel_step(
            name="journey_gatherer",
            instruction=JOURNEY_INSTRUCTION,
            output_key=STATE_JOURNEY_DATA,
            tools=[get_recent_moments, analyze_emotional_pattern],
        ),
        create_parallel_step(
            name="finance_gatherer",
            instruction=FINANCE_INSTRUCTION,
            output_key=STATE_FINANCE_DATA,
            tools=[get_finance_summary],
        ),
        create_parallel_step(
            name="studio_gatherer",
            instruction=STUDIO_INSTRUCTION,
            output_key=STATE_STUDIO_DATA,
            tools=[get_upcoming_episodes],
        ),
    ]

    # Define fallbacks for when agents fail
    fallback_values = {
        STATE_ATLAS_DATA: "Dados de tarefas indisponiveis no momento.",
        STATE_JOURNEY_DATA: "Dados emocionais indisponiveis no momento.",
        STATE_FINANCE_DATA: "Dados financeiros indisponiveis no momento.",
        STATE_STUDIO_DATA: "Dados de podcast indisponiveis no momento.",
    }

    return create_resilient_parallel_workflow(
        name="resilient_daily_briefing",
        parallel_agents=parallel_agents,
        merger_instruction=MERGER_INSTRUCTION,
        merger_output_key=STATE_DAILY_BRIEFING,
        description="Briefing diario resiliente a falhas parciais",
        fallback_values=fallback_values,
    )


# Resilient instance
resilient_daily_briefing = create_resilient_daily_briefing()


# ============================================================================
# TESTING / CLI USAGE
# ============================================================================
if __name__ == "__main__":
    """
    Test the daily briefing workflow.

    Run with: python -m backend.agents.workflows.examples.daily_briefing
    """
    import asyncio
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService

    async def test_briefing():
        print("=" * 60)
        print("DAILY BRIEFING - Test Run")
        print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print("=" * 60)

        # Create a test session
        session_service = InMemorySessionService()
        session = await session_service.create_session(
            agent_name=daily_briefing.name,
            user_id="test_user",
        )

        # Set initial state
        session.state[STATE_USER_NAME] = "Lucas"
        session.state[STATE_BRIEFING_STYLE] = "conciso"

        print(f"\nUser: {session.state[STATE_USER_NAME]}")
        print(f"Style: {session.state[STATE_BRIEFING_STYLE]}")
        print("\nStarting parallel data gathering...")

        # Create runner
        runner = Runner(
            agent=daily_briefing,
            session_service=session_service,
        )

        # Run the workflow
        async for event in runner.run(session_id=session.session_id):
            if hasattr(event, 'author') and hasattr(event, 'content'):
                print(f"\n[{event.author}]: {event.content[:300]}...")

        print("\n" + "=" * 60)
        print("Briefing generated!")
        print("=" * 60)

        # Show final briefing
        final_session = await session_service.get_session(session.session_id)
        if final_session:
            briefing = final_session.state.get(STATE_DAILY_BRIEFING, "No briefing generated")
            print("\n" + "=" * 60)
            print("FINAL DAILY BRIEFING:")
            print("=" * 60)
            print(briefing)

    # Run test
    asyncio.run(test_briefing())
