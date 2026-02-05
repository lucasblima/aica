"""
AICA Life OS - Root Agent (ADK Entry Point)

This module defines the root_agent that serves as the coordinator
for all AICA module agents. It uses LLM-driven delegation to route
user messages to the appropriate specialized agent.

Required env vars:
  - GOOGLE_API_KEY or GEMINI_API_KEY
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
"""

import os
from google.adk.agents import LlmAgent

from .modules.atlas import atlas_agent
from .modules.captacao import captacao_agent
from .modules.studio import studio_agent
from .modules.journey import journey_agent
from .modules.finance import finance_agent
from .modules.connections import connections_agent

# Ensure API key is available (ADK reads GOOGLE_API_KEY by default)
if not os.getenv("GOOGLE_API_KEY"):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        os.environ["GOOGLE_API_KEY"] = gemini_key

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

## Quando NAO delegar
Para saudacoes simples, perguntas gerais sobre o Aica, ou conversas casuais,
responda diretamente sem delegar. Seja acolhedora e profissional.
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
)
