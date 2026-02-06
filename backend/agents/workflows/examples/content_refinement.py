"""
Content Refinement - Loop Workflow Example

This workflow iteratively improves content (podcast pauta, grant proposals, etc.)
through a critique-refine loop until quality standards are met.

Pattern: Initial -> [Critic -> Refiner] x N -> Final

Uses the Loop pattern for iterative quality improvement.

Features:
- Max iterations limit (prevents infinite loops)
- Quality threshold-based exit
- Incremental improvement tracking
- Completion phrase detection

Use Cases:
- Podcast pauta optimization
- Grant proposal polishing
- Blog post refinement
- Any content that benefits from iteration

Usage:
    from backend.agents.workflows.examples.content_refinement import (
        pauta_refinement,
        proposal_refinement,
    )

    # In your agent or application:
    result = await pauta_refinement.ainvoke(
        initial_state={
            "topic": "IA e o futuro do trabalho",
            "guest_name": "Dr. Maria Silva"
        }
    )

References:
- Task #42: Workflow Agents
- Studio module (podcast pauta)
- Captacao module (grant proposals)
"""

import os
import sys

# Add parent paths for imports when running standalone
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from google.adk.agents import LlmAgent

from backend.agents.workflows import (
    LoopWorkflowBuilder,
    create_iterative_refinement_workflow,
    create_quality_checker_agent,
    exit_loop,
    set_quality_score,
)
from backend.agents.tools.supabase_tools import (
    search_user_documents,
    get_upcoming_episodes,
)
from backend.agents.tools.search_tools import search_editals

# Constants
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_MAX_ITERATIONS = 5
DEFAULT_QUALITY_THRESHOLD = 0.85

# ============================================================================
# STATE KEYS - PAUTA REFINEMENT
# ============================================================================
STATE_TOPIC = "topic"
STATE_GUEST_NAME = "guest_name"
STATE_GUEST_BIO = "guest_bio"
STATE_PAUTA = "pauta"
STATE_PAUTA_CRITIQUE = "pauta_critique"
STATE_QUALITY_SCORE = "quality_score"


# ============================================================================
# PODCAST PAUTA REFINEMENT WORKFLOW
# ============================================================================

PAUTA_INITIAL_INSTRUCTION = """Voce e um produtor de podcast experiente.

## Contexto
- Topico: {topic}
- Convidado: {guest_name}
- Bio do convidado: {guest_bio}

## Sua Tarefa
Gere uma PAUTA INICIAL para o episodio com:

### 1. Abertura (2-3 min)
- Boas-vindas e apresentacao do tema
- Apresentacao do convidado (highlights da bio)

### 2. Bloco Principal (15-20 min)
5-7 perguntas principais organizadas por subtema:
- Pergunta 1: [Contextualizacao - o que/como]
- Pergunta 2: [Experiencia pessoal]
- Pergunta 3: [Desafios e solucoes]
- Pergunta 4: [Opiniao/perspectiva unica]
- Pergunta 5: [Futuro/tendencias]

### 3. Bloco Interativo (5-10 min)
- Perguntas da audiencia (placeholders)
- Momento de historia pessoal

### 4. Encerramento (2-3 min)
- Principais takeaways
- Onde encontrar o convidado
- Chamada para acao

## Formato
Para cada pergunta, inclua:
- A pergunta em si
- Por que ela e interessante
- Possivel follow-up

Responda em portugues brasileiro.
"""

PAUTA_CRITIC_INSTRUCTION = """Voce e um critico de qualidade de pautas de podcast.

## Pauta a Avaliar
{pauta}

## Criterios de Avaliacao (1-5 cada)

### 1. Estrutura
- A pauta tem fluxo logico?
- As transicoes fazem sentido?

### 2. Profundidade
- As perguntas vao alem do obvio?
- Ha espaco para insights unicos?

### 3. Engajamento
- A pauta mantera a audiencia interessada?
- Ha variedade de formatos/tipos de pergunta?

### 4. Relevancia para o Convidado
- As perguntas aproveitam a expertise do convidado?
- Ha personalizacao para o perfil?

### 5. Valor para a Audiencia
- A audiencia aprendera algo util?
- Ha acao pratica que podem tomar?

## Formato da Resposta

**Pontuacoes:**
- Estrutura: X/5
- Profundidade: X/5
- Engajamento: X/5
- Relevancia: X/5
- Valor: X/5
- **MEDIA: X.X/5**

**Pontos Fortes:**
[Lista]

**Pontos de Melhoria:**
[Lista com sugestoes especificas]

**Veredicto:**
Se MEDIA >= 4.25: "Pauta aprovada para gravacao."
Se MEDIA < 4.25: [Prioridades de melhoria]

IMPORTANTE: Se a pauta estiver excelente e pronta, responda EXATAMENTE:
"Pauta aprovada para gravacao."
"""

PAUTA_REFINER_INSTRUCTION = """Voce e um refinador de pautas de podcast.

## Pauta Atual
{pauta}

## Critica Recebida
{pauta_critique}

## Sua Tarefa
1. Analise a critica cuidadosamente
2. Se a critica diz "Pauta aprovada para gravacao.", chame exit_loop()
3. Caso contrario, aplique as melhorias sugeridas

## Regras de Refinamento
- Mantenha o que esta funcionando bem
- Foque nos pontos de melhoria mencionados
- Adicione profundidade onde pedido
- Melhore transicoes se necessario
- NAO remova secoes, apenas melhore

## Formato
Retorne a pauta COMPLETA refinada, no mesmo formato da original,
mas com as melhorias aplicadas.

Responda em portugues brasileiro.
"""


def create_pauta_refinement_workflow(max_iterations: int = 5):
    """
    Create the podcast pauta refinement workflow.

    Args:
        max_iterations: Maximum refinement iterations

    Returns:
        LoopAgent configured for pauta refinement
    """
    # Initial pauta generator
    initial_agent = LlmAgent(
        name="pauta_generator",
        model=GEMINI_MODEL,
        instruction=PAUTA_INITIAL_INSTRUCTION,
        output_key=STATE_PAUTA,
        include_contents='none',
    )

    return (
        LoopWorkflowBuilder("pauta_refinement")
        .with_description(
            "Refinamento iterativo de pautas de podcast. "
            "Gera pauta inicial, critica, refina ate aprovacao."
        )
        .with_model(GEMINI_MODEL)
        .with_max_iterations(max_iterations)
        .with_completion_phrase("Pauta aprovada para gravacao.")
        .with_initial_agent(initial_agent)
        .with_critic(
            instruction=PAUTA_CRITIC_INSTRUCTION,
            output_key=STATE_PAUTA_CRITIQUE,
            name="pauta_critic",
        )
        .with_refiner(
            instruction=PAUTA_REFINER_INSTRUCTION,
            output_key=STATE_PAUTA,
            critique_key=STATE_PAUTA_CRITIQUE,
            name="pauta_refiner",
        )
        .build()
    )


# Pre-built instance
pauta_refinement = create_pauta_refinement_workflow()


# ============================================================================
# GRANT PROPOSAL REFINEMENT WORKFLOW
# ============================================================================

STATE_EDITAL_CONTEXT = "edital_context"
STATE_PROPOSAL = "proposal"
STATE_PROPOSAL_CRITIQUE = "proposal_critique"

PROPOSAL_INITIAL_INSTRUCTION = """Voce e um especialista em redacao de propostas de captacao.

## Contexto do Edital
{edital_context}

## Sua Tarefa
Gere uma PROPOSTA INICIAL com as seguintes secoes:

### Resumo Executivo (200 palavras)
- Objetivo central
- Metodologia resumida
- Impacto esperado

### Justificativa (300 palavras)
- Problema a ser resolvido
- Relevancia e inovacao
- Alinhamento com o edital

### Objetivos
- Objetivo Geral
- Objetivos Especificos (3-5)

### Metodologia (400 palavras)
- Abordagem tecnica
- Etapas de execucao
- Indicadores de progresso

### Cronograma
- Fases do projeto
- Marcos principais
- Duracao estimada

### Orcamento Resumido
- Pessoal
- Material permanente
- Material de consumo
- Servicos
- Total

### Resultados Esperados
- Produtos tangiveis
- Indicadores de sucesso

Responda em portugues brasileiro.
"""

PROPOSAL_CRITIC_INSTRUCTION = """Voce e um avaliador rigoroso de propostas de captacao.

## Proposta a Avaliar
{proposal}

## Contexto do Edital
{edital_context}

## Criterios de Avaliacao (1-5 cada)

### 1. Clareza e Objetividade
- A proposta e clara e bem escrita?
- Os objetivos sao especificos e mensuraveis?

### 2. Alinhamento com Edital
- Atende aos requisitos do edital?
- Prioridades do financiador contempladas?

### 3. Viabilidade Tecnica
- Metodologia e realista?
- Cronograma factivel?

### 4. Inovacao e Relevancia
- Contribuicao original?
- Impacto significativo?

### 5. Adequacao Orcamentaria
- Valores justificados?
- Categorias permitidas?

## Formato da Resposta

**Pontuacoes:**
- Clareza: X/5
- Alinhamento: X/5
- Viabilidade: X/5
- Inovacao: X/5
- Orcamento: X/5
- **MEDIA: X.X/5**

**Pontos de Atencao:**
[Lista de problemas especificos]

**Sugestoes de Melhoria:**
[Lista priorizada]

**Veredicto:**
Se MEDIA >= 4.0: "Proposta aprovada para submissao."
Se MEDIA < 4.0: [Prioridades de correcao]

IMPORTANTE: Se a proposta estiver pronta, responda EXATAMENTE:
"Proposta aprovada para submissao."
"""

PROPOSAL_REFINER_INSTRUCTION = """Voce e um refinador de propostas de captacao.

## Proposta Atual
{proposal}

## Critica Recebida
{proposal_critique}

## Contexto do Edital
{edital_context}

## Sua Tarefa
1. Analise a critica cuidadosamente
2. Se a critica diz "Proposta aprovada para submissao.", chame exit_loop()
3. Caso contrario, aplique as correcoes necessarias

## Regras de Refinamento
- Mantenha a estrutura geral
- Foque nos pontos de atencao mencionados
- Melhore clareza onde pedido
- Ajuste orcamento se necessario
- Fortaleca alinhamento com edital

## Formato
Retorne a proposta COMPLETA refinada, no mesmo formato da original,
com as melhorias aplicadas.

Responda em portugues brasileiro.
"""


def create_proposal_refinement_workflow(max_iterations: int = 5):
    """
    Create the grant proposal refinement workflow.

    Args:
        max_iterations: Maximum refinement iterations

    Returns:
        LoopAgent configured for proposal refinement
    """
    # Initial proposal generator
    initial_agent = LlmAgent(
        name="proposal_generator",
        model=GEMINI_MODEL,
        instruction=PROPOSAL_INITIAL_INSTRUCTION,
        output_key=STATE_PROPOSAL,
        include_contents='none',
        tools=[search_editals, search_user_documents],
    )

    return (
        LoopWorkflowBuilder("proposal_refinement")
        .with_description(
            "Refinamento iterativo de propostas de captacao. "
            "Gera proposta inicial, avalia, refina ate aprovacao."
        )
        .with_model(GEMINI_MODEL)
        .with_max_iterations(max_iterations)
        .with_completion_phrase("Proposta aprovada para submissao.")
        .with_initial_agent(initial_agent)
        .with_critic(
            instruction=PROPOSAL_CRITIC_INSTRUCTION,
            output_key=STATE_PROPOSAL_CRITIQUE,
            name="proposal_critic",
        )
        .with_refiner(
            instruction=PROPOSAL_REFINER_INSTRUCTION,
            output_key=STATE_PROPOSAL,
            critique_key=STATE_PROPOSAL_CRITIQUE,
            name="proposal_refiner",
        )
        .build()
    )


# Pre-built instance
proposal_refinement = create_proposal_refinement_workflow()


# ============================================================================
# GENERIC CONTENT REFINEMENT (QUALITY SCORE-BASED)
# ============================================================================

def create_quality_based_refinement(
    name: str,
    initial_instruction: str,
    critic_instruction: str,
    refiner_instruction: str,
    content_key: str,
    quality_threshold: float = 0.85,
    max_iterations: int = 5,
):
    """
    Create a quality score-based refinement workflow.

    Unlike phrase-based exit, this uses numeric quality scores
    and exits when the score exceeds the threshold.

    Args:
        name: Workflow name
        initial_instruction: Instruction for initial content generation
        critic_instruction: Instruction for evaluation (should output 0-1 score)
        refiner_instruction: Instruction for improvement
        content_key: State key for the content being refined
        quality_threshold: Minimum quality score to exit (0.0-1.0)
        max_iterations: Maximum iterations

    Returns:
        Workflow with quality-based exit
    """
    from backend.agents.workflows.loop import (
        create_quality_checker_agent,
        create_refiner_agent,
        create_loop_workflow,
    )
    from google.adk.agents.sequential_agent import SequentialAgent

    # Initial generator
    initial_agent = LlmAgent(
        name=f"{name}_initial",
        model=GEMINI_MODEL,
        instruction=initial_instruction,
        output_key=content_key,
        include_contents='none',
    )

    # Quality checker (uses set_quality_score + exit_loop)
    quality_checker = create_quality_checker_agent(
        name=f"{name}_quality_checker",
        evaluation_instruction=critic_instruction,
        quality_threshold=quality_threshold,
    )

    # Refiner
    refiner = create_refiner_agent(
        name=f"{name}_refiner",
        instruction=refiner_instruction,
        output_key=content_key,
        critique_key="critique",  # Quality checker doesn't use this
        completion_phrase="QUALITY_MET",  # Won't be used, quality checker handles exit
    )

    # Build loop
    refinement_loop = create_loop_workflow(
        name=f"{name}_loop",
        loop_agents=[quality_checker, refiner],
        max_iterations=max_iterations,
    )

    # Combine initial + loop
    return SequentialAgent(
        name=name,
        sub_agents=[initial_agent, refinement_loop],
        description=f"Quality-based refinement: {name} (threshold: {quality_threshold})",
    )


# ============================================================================
# EXAMPLE: BLOG POST REFINEMENT (Quality-based)
# ============================================================================

blog_refinement = create_quality_based_refinement(
    name="blog_refinement",
    initial_instruction="""Escreva um rascunho de post de blog sobre: {topic}

Estrutura:
- Titulo atraente
- Introducao engajante
- 3-5 secoes principais
- Conclusao com CTA

Estilo: Informativo mas acessivel, 600-800 palavras.""",
    critic_instruction="""Avalie o post: {content}

Criterios (0.0-1.0 cada):
- Clareza: O texto e facil de entender?
- Engajamento: Prende a atencao?
- Estrutura: Bem organizado?
- Valor: Traz informacao util?

Calcule a MEDIA e chame set_quality_score(media).
Se media >= 0.85, chame exit_loop().
Senao, liste melhorias necessarias.""",
    refiner_instruction="""Melhore o post baseado no feedback.

Post atual: {content}

Aplique as melhorias sugeridas mantendo o estilo original.
Retorne o post completo refinado.""",
    content_key="content",
    quality_threshold=0.85,
    max_iterations=4,
)


# ============================================================================
# TESTING / CLI USAGE
# ============================================================================
if __name__ == "__main__":
    """
    Test the content refinement workflows.

    Run with: python -m backend.agents.workflows.examples.content_refinement
    """
    import asyncio
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService

    async def test_pauta_refinement():
        print("=" * 60)
        print("PAUTA REFINEMENT - Test Run")
        print("=" * 60)

        # Create a test session
        session_service = InMemorySessionService()
        session = await session_service.create_session(
            agent_name=pauta_refinement.name,
            user_id="test_user",
        )

        # Set initial state
        session.state[STATE_TOPIC] = "O futuro da Inteligencia Artificial"
        session.state[STATE_GUEST_NAME] = "Dr. Ana Silva"
        session.state[STATE_GUEST_BIO] = (
            "Pesquisadora em IA na USP, PhD por Stanford, "
            "autora de 'Algoritmos e Sociedade', consultora do governo federal."
        )

        print(f"\nTopic: {session.state[STATE_TOPIC]}")
        print(f"Guest: {session.state[STATE_GUEST_NAME]}")
        print(f"Bio: {session.state[STATE_GUEST_BIO]}")
        print("\nStarting iterative refinement...")

        # Create runner
        runner = Runner(
            agent=pauta_refinement,
            session_service=session_service,
        )

        # Track iterations
        iteration = 0

        # Run the workflow
        async for event in runner.run(session_id=session.session_id):
            if hasattr(event, 'author'):
                if 'critic' in event.author.lower():
                    iteration += 1
                    print(f"\n--- Iteration {iteration} ---")

                if hasattr(event, 'content') and event.content:
                    preview = event.content[:200].replace('\n', ' ')
                    print(f"[{event.author}]: {preview}...")

        print("\n" + "=" * 60)
        print(f"Refinement completed after {iteration} iterations!")
        print("=" * 60)

        # Show final pauta
        final_session = await session_service.get_session(session.session_id)
        if final_session:
            pauta = final_session.state.get(STATE_PAUTA, "No pauta generated")
            print("\n" + "=" * 60)
            print("FINAL PAUTA:")
            print("=" * 60)
            print(pauta[:1500] + "..." if len(pauta) > 1500 else pauta)

    # Run test
    asyncio.run(test_pauta_refinement())
