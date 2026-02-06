# Google AI Services Integration Guide

## Visao Geral

Este documento detalha como integrar os servicos de IA da Google no AICA Life OS, substituindo implementacoes customizadas por solucoes gerenciadas que reduzem complexidade e custos.

---

## 1. File Search API (RAG Gerenciado)

### Conceito
O File Search API e um sistema RAG (Retrieval-Augmented Generation) totalmente gerenciado pela Google. Ele elimina a necessidade de:
- Gerenciar vector databases (Pinecone, ChromaDB, pgvector)
- Implementar chunking strategies
- Gerenciar embeddings manualmente
- Configurar similarity search

### Arquitetura

```
FILE SEARCH V2 ARCHITECTURE
Frontend (React) --> Edge Function (file-search-v2) --> Google File Search API
                                                            |
                                                    +-------+-------+
                                                    |       |       |
                                                 Indexing  Query  Storage
                                                 ($0.15/  (free)  (free)
                                                  1M tok)
```

### Implementacao Edge Function

```typescript
// supabase/functions/file-search-v2/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenAI } from 'npm:@google/genai@^1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = new GoogleGenAI({
      apiKey: Deno.env.get('GEMINI_API_KEY')!
    })

    const { action, ...params } = await req.json()

    switch (action) {
      case 'create_store': {
        const store = await client.fileSearchStores.create({
          config: {
            display_name: params.displayName
          }
        })
        return jsonResponse({ store })
      }

      case 'upload_document': {
        const fileBytes = Uint8Array.from(
          atob(params.fileContent),
          c => c.charCodeAt(0)
        )
        const blob = new Blob([fileBytes], { type: params.mimeType })

        const operation = await client.fileSearchStores.uploadToFileSearchStore({
          file: blob,
          file_search_store_name: params.storeId,
          config: {
            display_name: params.fileName,
            custom_metadata: params.metadata?.map(
              ([k, v]: [string, string]) => ({ key: k, string_value: v })
            ),
            chunking_config: {
              white_space_config: {
                max_tokens_per_chunk: 400,
                max_overlap_tokens: 40,
              }
            }
          }
        })

        // Polling para indexacao completar
        let status = operation
        while (!status.done) {
          await new Promise(r => setTimeout(r, 1000))
          status = await client.operations.get(operation.name)
        }

        return jsonResponse({ document: status.result })
      }

      case 'query': {
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: params.question,
          tools: [{
            file_search: {
              file_search_stores: [params.storeId],
              max_results: params.maxResults || 5,
            }
          }],
          systemInstruction: `
            Voce e um assistente do AICA Life OS.
            Responda sempre em portugues brasileiro.
            Baseie suas respostas nos documentos disponiveis.
            Cite as fontes quando apropriado.
          `
        })

        const metadata = response.candidates?.[0]?.groundingMetadata
        return jsonResponse({
          answer: response.text,
          sources: metadata?.groundingChunks || [],
          citations: metadata?.groundingSupports || [],
          usage: response.usageMetadata,
        })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error) {
    console.error('File Search Error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})

function jsonResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### Frontend Hook

```typescript
// src/hooks/useFileSearchV2.ts

import { useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'

const EDGE_FUNCTION = 'file-search-v2'

export function useFileSearchV2() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const callEdgeFunction = useCallback(async (body: Record<string, any>) => {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${EDGE_FUNCTION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      }
    )
    if (!response.ok) throw new Error(response.statusText)
    return response.json()
  }, [])

  const createStore = useCallback(async (displayName: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await callEdgeFunction({
        action: 'create_store',
        displayName
      })
      return result.store
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callEdgeFunction])

  const uploadDocument = useCallback(async (
    storeId: string,
    file: File,
    metadata?: Record<string, string>
  ) => {
    setIsLoading(true)
    setError(null)
    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result = await callEdgeFunction({
        action: 'upload_document',
        storeId,
        fileName: file.name,
        fileContent,
        mimeType: file.type,
        metadata: metadata ? Object.entries(metadata) : undefined,
      })
      return result.document
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callEdgeFunction])

  const query = useCallback(async (storeId: string, question: string) => {
    setIsLoading(true)
    setError(null)
    try {
      return await callEdgeFunction({
        action: 'query',
        storeId,
        question,
        maxResults: 5,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callEdgeFunction])

  return {
    isLoading,
    error,
    createStore,
    uploadDocument,
    query,
  }
}
```

---

## 2. Grounding with Google Search

### Conceito
Conecta o Gemini aos resultados de busca do Google em tempo real, fornecendo:
- Informacoes atualizadas
- Citacoes verificaveis
- Reducao de alucinacoes

### Implementacao

```typescript
// Em Edge Function ou via GeminiClient

const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `
    Busque editais de financiamento abertos para projetos de
    tecnologia e inovacao no Brasil, especialmente:
    - FAPERJ (Rio de Janeiro)
    - FINEP
    - CNPq

    Prazo de inscricao: proximos 60 dias
  `,
  tools: [{ googleSearch: {} }]
});

// Extrair metadados de grounding
const metadata = response.candidates?.[0]?.groundingMetadata;

// Queries executadas
console.log('Buscas:', metadata.webSearchQueries);

// Fontes encontradas
console.log('Fontes:', metadata.groundingChunks.map(c => ({
  title: c.web?.title,
  url: c.web?.uri,
})));

// Suportes (citacoes inline)
console.log('Citacoes:', metadata.groundingSupports.map(s => ({
  text: s.segment?.text,
  startIndex: s.segment?.startIndex,
  endIndex: s.segment?.endIndex,
  confidence: s.confidenceScores,
})));
```

### Billing
- **Gemini 3**: Cobrado por query executada (o modelo pode gerar multiplas queries)
- **Gemini 2.5**: Cobrado por prompt

---

## 3. Agent Development Kit (ADK)

### Conceito
Framework open-source para construir sistemas multi-agentes.

### Setup

```bash
pip install google-adk
mkdir -p backend/agents
```

### Agente Base

```python
# backend/agents/captacao_agent.py

from google.adk.agents import Agent
from google.adk.tools import google_search
from google.adk.tools.file_search import FileSearchTool
import os

FILE_SEARCH_STORE = os.getenv('CAPTACAO_FILE_SEARCH_STORE')

file_search_tool = FileSearchTool(
    file_search_stores=[FILE_SEARCH_STORE],
    description="Busca em editais e documentos de captacao"
)

captacao_agent = Agent(
    name="captacao_specialist",
    model="gemini-2.5-pro",

    instruction="""
    Voce e um especialista em captacao de recursos para projetos brasileiros.

    Conhecimentos:
    - FAPERJ, FINEP, CNPq, CAPES
    - Lei Rouanet, Lei do Audiovisual
    - Fundos internacionais

    Capacidades:
    1. Analisar editais e extrair requisitos
    2. Comparar projetos com requisitos
    3. Gerar secoes de propostas
    4. Buscar oportunidades atualizadas

    Sempre responda em portugues brasileiro.
    """,

    tools=[file_search_tool, google_search]
)
```

### Orquestracao Multi-Agente

```python
# backend/agents/coordinator.py

from google.adk.agents import Agent
from .captacao_agent import captacao_agent
from .studio_agent import studio_agent
from .journey_agent import journey_agent

coordinator_agent = Agent(
    name="aica_coordinator",
    model="gemini-2.5-flash",

    instruction="""
    Voce e o coordenador do AICA Life OS.

    Delegue tarefas para os agentes especializados:
    - captacao_agent: editais, financiamento, projetos
    - studio_agent: podcasts, convidados, roteiros
    - journey_agent: autoconhecimento, reflexoes, memoria

    Responda em portugues brasileiro de forma calorosa.
    """,

    sub_agents=[
        captacao_agent,
        studio_agent,
        journey_agent,
    ]
)
```

---

## 4. Gemini Live API (Voz em Tempo Real)

### Conceito
API de streaming bidirecional para interacoes de voz em tempo real.

### Caracteristicas
- **Latencia**: ~600ms para primeiro token
- **VAD**: Voice Activity Detection nativo
- **Barge-in**: Usuario pode interromper
- **Affective dialog**: Entende tom emocional
- **Idiomas**: 24, incluindo portugues

### Implementacao para Tia Sabia

```typescript
// supabase/functions/tia-sabia-voice/index.ts

import { GoogleGenAI, Modality } from 'npm:@google/genai'

const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! })

Deno.serve(async (req) => {
  const { socket, response } = Deno.upgradeWebSocket(req)

  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: `
        Voce e Tia Sabia, assistente pessoal do AICA Life OS.

        Personalidade:
        - Calorosa e acolhedora
        - Usa expressoes brasileiras naturalmente
        - Tom de tia querida que se importa
        - Paciente e encorajadora

        Capacidades:
        - Ajudar com tarefas e agenda
        - Orientar sobre captacao de recursos
        - Apoiar reflexoes pessoais
        - Gerenciar conexoes e relacionamentos
      `,
      tools: [
        { googleSearch: {} },
        { fileSearch: { fileSearchStores: ['aica-user-knowledge'] } }
      ],
      voice: 'Aoede',
      languageCode: 'pt-BR'
    }
  })

  socket.onmessage = async (event) => {
    await session.sendRealtimeInput({ audio: event.data })
  }

  for await (const chunk of session.receive()) {
    if (chunk.data) {
      socket.send(chunk.data)
    }
  }

  return response
})
```

---

## 5. Comparativo de Custos

### Implementacao Atual
| Servico | Custo/Mes |
|---------|-----------|
| ElevenLabs TTS | ~$22 |
| Custom embeddings | ~$10 |
| Vector DB hosting | ~$20 |
| **Total** | **~$52** |

### Com Google Ecosystem
| Servico | Custo/Mes |
|---------|-----------|
| File Search (10M tokens) | ~$1.50 |
| Gemini 2.5 Flash | ~$5 |
| Gemini Live API | ~$10 |
| **Total** | **~$16.50** |

**Economia: ~68%**

---

## 6. Checklist de Migracao

### Fase 1: File Search V2
- [ ] Criar Edge Function `file-search-v2`
- [ ] Criar stores: captacao, studio, journey
- [ ] Migrar documentos existentes
- [ ] Atualizar hooks frontend
- [ ] Deprecar implementacao antiga

### Fase 2: Grounding
- [ ] Adicionar Google Search ao Studio
- [ ] Implementar UI de fontes/citacoes
- [ ] Configurar cache de resultados

### Fase 3: ADK
- [ ] Setup Python backend
- [ ] Implementar agente Captacao
- [ ] Implementar agente Studio
- [ ] Integrar com Supabase
- [ ] Deploy em Cloud Run

### Fase 4: Live API
- [ ] WebSocket Edge Function
- [ ] Integrar Evolution API (WhatsApp)
- [ ] Configurar persona Tia Sabia
- [ ] Testes de latencia

---

## 7. Recursos

### Documentacao Oficial
- [File Search API](https://ai.google.dev/gemini-api/docs/file-search)
- [ADK Docs](https://google.github.io/adk-docs/)
- [Live API](https://ai.google.dev/gemini-api/docs/live)
- [Grounding](https://ai.google.dev/gemini-api/docs/google-search)

### Codelabs
- [File Search for RAG](https://codelabs.developers.google.com/gemini-file-search-for-rag)
- [Building AI Agents with ADK](https://codelabs.developers.google.com/devsite/codelabs/build-agents-with-adk-foundation)

### Pricing
- [Gemini API Pricing](https://ai.google.dev/pricing)
