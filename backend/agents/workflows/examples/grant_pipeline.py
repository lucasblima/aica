"""
Grant Application Pipeline - Sequential Workflow Example

This workflow orchestrates the complete grant application process:
1. Research edital requirements
2. Generate draft sections
3. Review and improve
4. Final validation

Uses the Sequential pattern because each step depends on the previous.

Usage:
    from backend.agents.workflows.examples.grant_pipeline import grant_pipeline

    # In your agent or application:
    result = await grant_pipeline.ainvoke(
        initial_state={"edital_topic": "IA em saude", "agency": "FAPERJ"}
    )

References:
- Task #42: Workflow Agents
- Captacao module requirements
"""

import os
import sys

# Add parent paths for imports when running standalone
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from google.adk.agents import LlmAgent

from backend.agents.workflows import SequentialWorkflowBuilder
from backend.agents.tools.supabase_tools import (
    get_active_grants,
    save_grant_opportunity,
    search_user_documents,
)
from backend.agents.tools.search_tools import search_editals

# Constants
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ============================================================================
# STATE KEYS
# ============================================================================
STATE_EDITAL_TOPIC = "edital_topic"
STATE_AGENCY = "agency"
STATE_RESEARCH_RESULTS = "research_results"
STATE_EDITAL_REQUIREMENTS = "edital_requirements"
STATE_DRAFT_PROPOSAL = "draft_proposal"
STATE_REVIEW_FEEDBACK = "review_feedback"
STATE_FINAL_PROPOSAL = "final_proposal"
STATE_VALIDATION_RESULT = "validation_result"


# ============================================================================
# STEP 1: RESEARCH EDITAL REQUIREMENTS
# ============================================================================
RESEARCH_INSTRUCTION = """Voce e um pesquisador especialista em editais de fomento brasileiro.

## Sua Tarefa
Pesquise editais abertos relacionados ao tema: {edital_topic}
Priorize a agencia: {agency}

## O Que Buscar
1. Use search_editals para buscar editais NOVOS e ABERTOS
2. Use search_user_documents com module='captacao' para ver documentos ja indexados
3. Use get_active_grants para ver projetos existentes do usuario

## Formato da Resposta
Estruture sua resposta com:
- **Editais Encontrados**: Lista de editais relevantes com prazos
- **Requisitos Principais**: Pontos-chave de elegibilidade
- **Oportunidades**: Como o tema se alinha com os editais
- **Proximos Passos**: Recomendacoes especificas

Responda em portugues brasileiro. Max 500 palavras.
"""


# ============================================================================
# STEP 2: GENERATE DRAFT SECTIONS
# ============================================================================
DRAFT_INSTRUCTION = """Voce e um redator especialista em propostas de captacao de recursos.

## Contexto
Pesquisa realizada: {research_results}
Requisitos do edital: {edital_requirements}

## Sua Tarefa
Elabore um RASCUNHO de proposta com as seguintes secoes:

### 1. Resumo Executivo (max 200 palavras)
- Objetivo principal
- Relevancia e inovacao
- Resultados esperados

### 2. Justificativa (max 300 palavras)
- Problema a ser resolvido
- Alinhamento com prioridades do edital
- Impacto esperado

### 3. Metodologia (max 300 palavras)
- Abordagem tecnica
- Etapas principais
- Cronograma preliminar

### 4. Orcamento Estimado
- Categorias de despesa
- Valores aproximados
- Justificativa de custos

## Regras
- Use linguagem tecnica apropriada
- Seja especifico e realista
- Destaque diferenciais e inovacao
- Responda em portugues brasileiro
"""


# ============================================================================
# STEP 3: REVIEW AND IMPROVE
# ============================================================================
REVIEW_INSTRUCTION = """Voce e um revisor critico de propostas de captacao.

## Proposta a Revisar
{draft_proposal}

## Criterios de Avaliacao
1. **Clareza**: A proposta e clara e bem estruturada?
2. **Alinhamento**: Atende aos requisitos do edital?
3. **Viabilidade**: Metodologia e orcamento sao realistas?
4. **Inovacao**: Ha diferenciais competitivos claros?
5. **Completude**: Todas as secoes estao adequadas?

## Formato da Resposta
Para CADA criterio, forneca:
- Pontuacao: 1-5 (1=Precisa reescrever, 5=Excelente)
- Pontos Fortes: O que esta bom
- Pontos de Melhoria: O que precisa ajustar
- Sugestao Especifica: Como melhorar

## Resumo Final
- Pontuacao Geral: Media das pontuacoes
- Veredicto: "Aprovado para refinamento" ou "Precisa revisao significativa"
- Top 3 Prioridades de Melhoria

Seja construtivo mas rigoroso. Responda em portugues brasileiro.
"""


# ============================================================================
# STEP 4: FINAL VALIDATION
# ============================================================================
VALIDATION_INSTRUCTION = """Voce e o validador final de propostas de captacao.

## Proposta Original
{draft_proposal}

## Feedback da Revisao
{review_feedback}

## Sua Tarefa
1. Aplique as melhorias sugeridas na revisao
2. Valide se a proposta esta pronta para submissao
3. Gere a versao FINAL da proposta

## Checklist de Validacao
[ ] Resumo executivo impactante
[ ] Justificativa convincente
[ ] Metodologia clara e viavel
[ ] Orcamento detalhado e justificado
[ ] Alinhamento com edital verificado
[ ] Linguagem tecnica apropriada
[ ] Sem erros gramaticais

## Formato da Resposta
### Proposta Final
[Versao refinada e completa da proposta]

### Status de Validacao
- Checklist: [X] ou [ ] para cada item
- Recomendacao: "Pronta para submissao" ou "Requer ajustes adicionais"
- Observacoes finais

Responda em portugues brasileiro.
"""


# ============================================================================
# BUILD THE WORKFLOW
# ============================================================================
def create_grant_pipeline():
    """
    Create the grant application pipeline workflow.

    Returns:
        SequentialAgent configured for grant application process
    """
    return (
        SequentialWorkflowBuilder("grant_application_pipeline")
        .with_description(
            "Pipeline completo de elaboracao de propostas de captacao. "
            "Pesquisa editais, gera rascunho, revisa e valida."
        )
        .with_model(GEMINI_MODEL)

        # Step 1: Research
        .add_step(
            name="research_step",
            instruction=RESEARCH_INSTRUCTION,
            output_key=STATE_RESEARCH_RESULTS,
            description="Pesquisa editais abertos e requisitos",
            tools=[search_editals, search_user_documents, get_active_grants],
        )

        # Step 2: Extract requirements from research
        .add_step(
            name="requirements_extraction_step",
            instruction="""Baseado na pesquisa: {research_results}

Extraia e organize os REQUISITOS do edital mais promissor:
- Elegibilidade (quem pode submeter)
- Temas prioritarios
- Valores e rubricas permitidas
- Documentos obrigatorios
- Prazos importantes

Formato estruturado em bullet points.""",
            output_key=STATE_EDITAL_REQUIREMENTS,
            description="Extrai requisitos estruturados do edital",
            required_state=[STATE_RESEARCH_RESULTS],
        )

        # Step 3: Draft proposal
        .add_step(
            name="draft_step",
            instruction=DRAFT_INSTRUCTION,
            output_key=STATE_DRAFT_PROPOSAL,
            description="Gera rascunho da proposta",
            required_state=[STATE_RESEARCH_RESULTS, STATE_EDITAL_REQUIREMENTS],
        )

        # Step 4: Review
        .add_step(
            name="review_step",
            instruction=REVIEW_INSTRUCTION,
            output_key=STATE_REVIEW_FEEDBACK,
            description="Revisa e critica a proposta",
            required_state=[STATE_DRAFT_PROPOSAL],
        )

        # Step 5: Final validation
        .add_step(
            name="validation_step",
            instruction=VALIDATION_INSTRUCTION,
            output_key=STATE_FINAL_PROPOSAL,
            description="Valida e finaliza a proposta",
            required_state=[STATE_DRAFT_PROPOSAL, STATE_REVIEW_FEEDBACK],
        )

        .with_initial_state({
            STATE_EDITAL_TOPIC: "projeto de pesquisa",  # Default, override at runtime
            STATE_AGENCY: "FAPERJ",  # Default, override at runtime
        })

        .build()
    )


# Pre-built instance for easy import
grant_pipeline = create_grant_pipeline()


# ============================================================================
# TESTING / CLI USAGE
# ============================================================================
if __name__ == "__main__":
    """
    Test the grant pipeline workflow.

    Run with: python -m backend.agents.workflows.examples.grant_pipeline
    """
    import asyncio
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService

    async def test_pipeline():
        print("=" * 60)
        print("GRANT APPLICATION PIPELINE - Test Run")
        print("=" * 60)

        # Create a test session
        session_service = InMemorySessionService()
        session = await session_service.create_session(
            agent_name=grant_pipeline.name,
            user_id="test_user",
        )

        # Set initial state
        session.state[STATE_EDITAL_TOPIC] = "Inteligencia Artificial aplicada a saude publica"
        session.state[STATE_AGENCY] = "FAPERJ"

        print(f"\nTopic: {session.state[STATE_EDITAL_TOPIC]}")
        print(f"Agency: {session.state[STATE_AGENCY]}")
        print("\nStarting pipeline...")

        # Create runner
        runner = Runner(
            agent=grant_pipeline,
            session_service=session_service,
        )

        # Run the pipeline
        async for event in runner.run(session_id=session.session_id):
            if hasattr(event, 'author') and hasattr(event, 'content'):
                print(f"\n[{event.author}]: {event.content[:500]}...")

        print("\n" + "=" * 60)
        print("Pipeline completed!")
        print("=" * 60)

        # Show final state
        final_session = await session_service.get_session(session.session_id)
        if final_session:
            print("\nFinal State Keys:")
            for key in final_session.state:
                value = final_session.state[key]
                preview = str(value)[:100] if value else "None"
                print(f"  - {key}: {preview}...")

    # Run test
    asyncio.run(test_pipeline())
