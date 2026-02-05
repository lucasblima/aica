# AICA Life OS - Estrategia de Integracao com Ecossistema Google

## Relatorio de Pesquisa e Recomendacoes Estrategicas
**Data:** 01 de Fevereiro de 2026
**Objetivo:** Maximizar o uso dos servicos Google para potencializar o AICA Life OS

---

## Executive Summary

A Google oferece um ecossistema robusto de ferramentas de IA que podem **eliminar semanas de desenvolvimento** no AICA. Apos analise da base de codigo atual e dos servicos disponiveis, foram identificadas **7 oportunidades de alto impacto** que podem transformar o AICA em uma plataforma muito mais poderosa sem "reinventar a roda".

### Principais Descobertas:

| Servico Google | Modulo AICA Beneficiado | Impacto | Prioridade |
|----------------|------------------------|---------|------------|
| **File Search API** | Captacao, Studio, Journey | CRITICO | P0 |
| **Agent Development Kit (ADK)** | Todos os modulos | CRITICO | P0 |
| **Gemini Live API** | WhatsApp/Tia Sabia | ALTO | P1 |
| **Grounding with Google Search** | Captacao, Studio | ALTO | P1 |
| **Deep Research Agent** | Captacao, Studio | ALTO | P2 |
| **Grounding with Google Maps** | World Graph | MEDIO | P2 |
| **Gemini 3 Pro/Flash** | Todos | MEDIO | P3 |

---

## 1. FILE SEARCH API - RAG Gerenciado (PRIORIDADE MAXIMA)

### O Que E
Sistema RAG (Retrieval-Augmented Generation) **totalmente gerenciado** pela Google, lancado em Novembro 2025. Elimina a necessidade de:
- Gerenciar vector databases (Pinecone, ChromaDB, pgvector)
- Implementar chunking strategies
- Gerenciar embeddings manualmente
- Configurar similarity search

### Status Atual no AICA
O AICA ja possui implementacao parcial em `src/services/fileSearchApiClient.ts`, mas esta usando uma arquitetura hibrida (Python backend + Edge Functions) que pode ser **simplificada drasticamente**.

### Custo
- **Indexacao:** $0.15 por 1M tokens (unica vez)
- **Storage:** GRATIS
- **Query-time embeddings:** GRATIS
- **Uso:** Cobrado como tokens normais de input

### Implementacao Recomendada

```typescript
// src/lib/google/fileSearch.ts
import { genai } from '@google/genai';

const client = new genai.Client();

// 1. Criar File Search Store (uma vez por modulo)
export async function createModuleStore(moduleType: 'captacao' | 'studio' | 'journey') {
  const store = await client.fileSearchStores.create({
    config: { display_name: `aica-${moduleType}-knowledge` }
  });
  return store;
}

// 2. Upload de documento com indexacao automatica
export async function indexDocument(storeId: string, file: File, metadata: Record<string, string>) {
  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: file,
    file_search_store_name: storeId,
    config: {
      display_name: file.name,
      custom_metadata: Object.entries(metadata).map(([k, v]) => ({
        key: k, string_value: v
      })),
      chunking_config: {
        white_space_config: {
          max_tokens_per_chunk: 400,
          max_overlap_tokens: 40
        }
      }
    }
  });
  return operation;
}

// 3. Query com RAG automatico
export async function queryWithRAG(storeId: string, question: string) {
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: question,
    tools: [{
      file_search: {
        file_search_stores: [storeId],
        max_results: 5
      }
    }]
  });

  return {
    answer: response.text,
    sources: response.groundingMetadata?.groundingChunks || []
  };
}
```

### Modulos AICA Beneficiados

#### Captacao (Grants)
- Indexar todos os editais (PDFs) automaticamente
- Busca semantica: "editais sobre sustentabilidade com prazo em marco"
- Comparacao automatica: "compare os requisitos deste edital com meu projeto"

#### Studio (Podcasts)
- Indexar transcricoes de episodios anteriores
- Busca: "o que o convidado X falou sobre IA?"
- Geracao de pautas baseada em episodios anteriores

#### Journey (Jornada)
- Indexar todos os momentos e reflexoes
- Busca semantica por padroes: "momentos onde mencionei ansiedade"
- Analise temporal de emocoes

---

## 2. AGENT DEVELOPMENT KIT (ADK) - Framework de Agentes

### O Que E
Framework **open-source** da Google (v1.0.0 stable lancado em Maio 2025) para construir sistemas multi-agentes. Usado internamente pelo Google em produtos como Agentspace.

### Por Que Usar
- **Code-first:** Definir agentes em Python/TypeScript puro
- **Multi-agent nativo:** Orquestracao de multiplos agentes especializados
- **Tool ecosystem:** Integracao nativa com Google Search, File Search, etc.
- **Deploy flexivel:** Cloud Run, Vertex AI Agent Engine, ou self-hosted

### Arquitetura Proposta para AICA

```
AICA MULTI-AGENT SYSTEM
+-- Coordinator Agent (event routing)
    +-- Captacao Agent (File Search + Google Search)
    +-- Studio Agent (Google Search + Function Calling)
    +-- Finance Agent (Function Calling)
    +-- Journey Agent (Embeddings Search)
```

### Implementacao Base

```python
# agents/coordinator_agent.py
from google.adk.agents import Agent
from google.adk.tools import google_search, file_search

coordinator_agent = Agent(
    name="aica_coordinator",
    model="gemini-2.5-flash",
    instruction="""
    Voce e o coordenador do AICA Life OS.
    Delegue tarefas ao agente apropriado baseado no contexto do usuario.
    """,
    sub_agents=[captacao_agent, studio_agent, finance_agent, journey_agent]
)

captacao_agent = Agent(
    name="captacao_agent",
    model="gemini-2.5-pro",
    instruction="Especialista em captacao de recursos e editais brasileiros.",
    tools=[
        file_search(store_name="aica-captacao-knowledge"),
        google_search
    ]
)
```

---

## 3. GEMINI LIVE API - Conversacao em Tempo Real

### O Que E
API de streaming bidirecional para interacoes de voz e video em tempo real com o Gemini.

### Caracteristicas
- **Latencia sub-segundo** (600ms para primeiro token)
- **Voice Activity Detection** nativo
- **Barge-in** (interrupcao natural)
- **Affective dialog** (entende tom emocional)
- **24 idiomas** incluindo portugues

### Status Atual no AICA
O AICA usa ElevenLabs para TTS e Evolution API (WhatsApp) para comunicacao. A integracao com Gemini Live API pode **unificar e melhorar** essa experiencia.

### Arquitetura Proposta para Tia Sabia

```
TIA SABIA VOICE SYSTEM
WhatsApp (Audio) <-- WebSocket --> Supabase Edge Function (Proxy)
                                        |
                                        v
                                   Gemini Live API
                                   (gemini-2.5-flash-native-audio)
                                        |
                                        v
                                   Tools Available:
                                   - File Search (Knowledge)
                                   - Google Search (Web)
                                   - Function Calling (AICA)
```

### Codigo de Integracao

```typescript
// supabase/functions/tia-sabia-voice/index.ts
import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({});

Deno.serve(async (req) => {
  const { socket, response } = Deno.upgradeWebSocket(req);

  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: `
        Voce e Tia Sabia, assistente pessoal do AICA Life OS.
        Fale sempre em portugues brasileiro, de forma calorosa e acolhedora.
      `,
      tools: [
        { googleSearch: {} },
        { fileSearch: { fileSearchStores: ['aica-user-knowledge'] } }
      ],
      voice: 'Aoede',
      languageCode: 'pt-BR'
    }
  });

  socket.onmessage = async (event) => {
    const audioData = event.data;
    await session.sendRealtimeInput({ audio: audioData });
  };

  for await (const chunk of session.receive()) {
    if (chunk.data) {
      socket.send(chunk.data);
    }
  }

  return response;
});
```

---

## 4. GROUNDING WITH GOOGLE SEARCH

### O Que E
Ferramenta que conecta o Gemini aos resultados de busca do Google em tempo real.

### Aplicacao no AICA

#### Modulo Captacao
```typescript
const response = await gemini.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Quais editais da FAPERJ estao abertos para IA?',
  tools: [{ googleSearch: {} }]
});
// Resposta inclui groundingMetadata com fontes verificaveis
```

#### Modulo Studio
```typescript
const response = await gemini.generateContent({
  model: 'gemini-2.5-pro',
  contents: `Pesquise informacoes atualizadas sobre ${guestName}`,
  tools: [{ googleSearch: {} }]
});
```

---

## 5. DEEP RESEARCH AGENT

### O Que E
Agente de pesquisa autonomo do Gemini que pode executar pesquisas multi-step complexas. Lancado em Dezembro 2025 via Interactions API.

### Aplicacao no AICA - Modulo Captacao

```python
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    input="Faca uma analise completa do edital FAPERJ APQ1 2026...",
    agent='deep-research-pro-preview-12-2025',
    background=True,
    agent_config={
        'type': 'deep-research',
        'thinking_summaries': 'auto'
    }
)

# Polling para resultado
while True:
    interaction = client.interactions.get(interaction.id)
    if interaction.status == "completed":
        report = interaction.outputs[-1].text
        break
    time.sleep(10)
```

---

## 6. MIGRACAO RECOMENDADA

### Fase 1: File Search
- Criar Edge Function file-search-v2
- Migrar logica de indexacao para File Search API nativo
- Criar stores por modulo (captacao, studio, journey)
- Integrar com frontend existente
- Migrar dados existentes
- Deprecar implementacao antiga

### Fase 2: ADK Integration
- Setup ADK Python backend
- Criar agente coordenador
- Implementar primeiro agente (Captacao)
- Implementar agentes Studio e Journey
- Integrar com Supabase via Function Calling
- Deploy em Cloud Run
- Testes E2E

### Fase 3: Live API
- Implementar Edge Function WebSocket
- Integrar com Evolution API
- Configurar voz e persona Tia Sabia
- Testes de latencia
- Deploy producao

---

## 7. COMPARATIVO DE CUSTOS

### Implementacao Atual (Estimativa)
| Servico | Custo Mensal |
|---------|--------------|
| ElevenLabs TTS | ~$22/mes |
| pgvector hosting | ~$20/mes |
| Custom embeddings | ~$10/mes |
| **Total** | **~$52/mes** |

### Com Google Ecosystem
| Servico | Custo Mensal |
|---------|--------------|
| File Search (10M tokens/mes) | ~$1.50/mes |
| Gemini 2.5 Flash (queries) | ~$5/mes |
| Gemini Live API | ~$10/mes |
| **Total** | **~$16.50/mes** |

### Economia Estimada
- **Custo:** ~68% de reducao
- **Manutenacao:** Reducao significativa (Google gerencia infra)

---

## 8. CHECKLIST DE IMPLEMENTACAO

### Imediato
- [ ] Obter API key do Google AI Studio
- [ ] Testar File Search API em sandbox
- [ ] Criar primeiro File Search Store para Captacao
- [ ] Documentar estrutura de metadados

### Curto Prazo
- [ ] Implementar Edge Function file-search-v2
- [ ] Migrar documentos existentes
- [ ] Integrar Grounding with Google Search no Studio
- [ ] Setup inicial do ADK

### Medio Prazo
- [ ] Sistema multi-agentes completo
- [ ] Gemini Live API para Tia Sabia
- [ ] Deep Research para Captacao
- [ ] Testes de producao

---

## 9. RECURSOS E DOCUMENTACAO

### Links Oficiais
- [File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [ADK Documentation](https://google.github.io/adk-docs/)
- [ADK Python SDK](https://github.com/google/adk-python)
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [Deep Research Agent](https://ai.google.dev/gemini-api/docs/deep-research)
- [Google Gen AI SDK TypeScript](https://googleapis.github.io/js-genai)

### Codelabs Recomendados
- [File Search for RAG](https://codelabs.developers.google.com/gemini-file-search-for-rag)
- [Building AI Agents with ADK](https://codelabs.developers.google.com/devsite/codelabs/build-agents-with-adk-foundation)

### Pricing
- [Gemini API Pricing](https://ai.google.dev/pricing)
- File Search: $0.15/1M tokens indexacao, storage e queries gratis

---

## CONCLUSAO

O ecossistema Google oferece **solucoes prontas** que podem:

1. **Eliminar semanas** de desenvolvimento de RAG customizado
2. **Reduzir custos** em ~68%
3. **Simplificar arquitetura** (menos moving parts)
4. **Melhorar qualidade** (modelos state-of-the-art)

A recomendacao e comecar pelo **File Search API** (maior impacto imediato) e progressivamente adotar **ADK** para orquestracao de agentes, culminando com **Gemini Live API** para a Tia Sabia.

**Proximo passo concreto:** Criar um File Search Store para o modulo Captacao e indexar os primeiros PDFs de editais para validar o fluxo.

---

*Documento gerado por Claude Opus 4.5 - 01/02/2026*
