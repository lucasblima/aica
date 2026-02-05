# AICA Life OS - Exemplos de Codigo para Integracao Google

Este documento contem codigo pronto para copiar e adaptar ao AICA.

---

## 1. FILE SEARCH API - Edge Function Completa

### `supabase/functions/file-search-v2/index.ts`

```typescript
// File Search V2 - RAG Gerenciado pelo Google
// Substitui implementacao customizada de embeddings

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenAI } from 'npm:@google/genai'

const client = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateStoreRequest {
  action: 'create_store'
  displayName: string
  moduleType: 'captacao' | 'studio' | 'journey' | 'finance'
}

interface UploadDocumentRequest {
  action: 'upload_document'
  storeId: string
  fileName: string
  fileContent: string // Base64
  mimeType: string
  metadata?: Record<string, string>
}

interface QueryRequest {
  action: 'query'
  storeId: string
  question: string
  maxResults?: number
}

interface DeleteDocumentRequest {
  action: 'delete_document'
  documentId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    switch (body.action) {
      case 'create_store':
        return await handleCreateStore(body as CreateStoreRequest)

      case 'upload_document':
        return await handleUploadDocument(body as UploadDocumentRequest)

      case 'query':
        return await handleQuery(body as QueryRequest)

      case 'delete_document':
        return await handleDeleteDocument(body as DeleteDocumentRequest)

      case 'list_stores':
        return await handleListStores()

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${body.action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('File Search Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCreateStore(req: CreateStoreRequest) {
  const store = await client.fileSearchStores.create({
    config: {
      display_name: `aica-${req.moduleType}-${req.displayName}`,
    }
  })

  return new Response(
    JSON.stringify({
      success: true,
      store: {
        id: store.name,
        displayName: store.displayName,
        createTime: store.createTime,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleUploadDocument(req: UploadDocumentRequest) {
  // Decodificar base64 para Blob
  const binaryString = atob(req.fileContent)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: req.mimeType })

  // Upload e indexacao automatica
  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: blob,
    file_search_store_name: req.storeId,
    config: {
      display_name: req.fileName,
      custom_metadata: req.metadata
        ? Object.entries(req.metadata).map(([key, value]) => ({
            key,
            string_value: value
          }))
        : undefined,
      chunking_config: {
        white_space_config: {
          max_tokens_per_chunk: 400,
          max_overlap_tokens: 40,
        }
      }
    }
  })

  // Aguardar indexacao completar
  let status = operation
  while (!status.done) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    status = await client.operations.get(operation.name)
  }

  return new Response(
    JSON.stringify({
      success: true,
      document: {
        id: status.result?.name,
        status: 'indexed',
        fileName: req.fileName,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleQuery(req: QueryRequest) {
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: req.question,
    tools: [{
      file_search: {
        file_search_stores: [req.storeId],
        max_results: req.maxResults || 5,
      }
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
    systemInstruction: `
      Voce e um assistente do AICA Life OS, uma plataforma de produtividade pessoal.
      Responda sempre em portugues brasileiro.
      Baseie suas respostas nos documentos disponiveis.
      Se nao encontrar informacao relevante, diga claramente.
      Cite as fontes quando apropriado.
    `
  })

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  const groundingSupports = response.candidates?.[0]?.groundingMetadata?.groundingSupports || []

  return new Response(
    JSON.stringify({
      success: true,
      answer: response.text,
      sources: groundingChunks.map(chunk => ({
        title: chunk.retrievedContext?.title,
        uri: chunk.retrievedContext?.uri,
      })),
      citations: groundingSupports.map(support => ({
        text: support.segment?.text,
        sourceIndices: support.groundingChunkIndices,
        confidence: support.confidenceScores,
      })),
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleDeleteDocument(req: DeleteDocumentRequest) {
  await client.fileSearchStores.documents.delete({
    name: req.documentId,
    config: { force: true }
  })

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleListStores() {
  const stores = await client.fileSearchStores.list()

  return new Response(
    JSON.stringify({
      success: true,
      stores: stores.map(store => ({
        id: store.name,
        displayName: store.displayName,
        createTime: store.createTime,
      }))
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

---

## 2. FRONTEND CLIENT - Hook para File Search

### `src/hooks/useFileSearch.ts`

```typescript
import { useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-search-v2`

interface FileSearchStore {
  id: string
  displayName: string
  createTime: string
}

interface QueryResult {
  answer: string
  sources: Array<{ title?: string; uri?: string }>
  citations: Array<{
    text: string
    sourceIndices: number[]
    confidence: number[]
  }>
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

interface UseFileSearchReturn {
  isLoading: boolean
  error: string | null
  createStore: (displayName: string, moduleType: string) => Promise<FileSearchStore>
  uploadDocument: (
    storeId: string,
    file: File,
    metadata?: Record<string, string>
  ) => Promise<{ id: string; status: string }>
  query: (storeId: string, question: string) => Promise<QueryResult>
  listStores: () => Promise<FileSearchStore[]>
  deleteDocument: (documentId: string) => Promise<void>
}

export function useFileSearch(): UseFileSearchReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    }
  }, [])

  const createStore = useCallback(async (
    displayName: string,
    moduleType: string
  ): Promise<FileSearchStore> => {
    setIsLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_store',
          displayName,
          moduleType,
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create store: ${response.statusText}`)
      }

      const data = await response.json()
      return data.store
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

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
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const headers = await getAuthHeaders()
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'upload_document',
          storeId,
          fileName: file.name,
          fileContent,
          mimeType: file.type,
          metadata,
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to upload document: ${response.statusText}`)
      }

      const data = await response.json()
      return data.document
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  const query = useCallback(async (
    storeId: string,
    question: string
  ): Promise<QueryResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'query',
          storeId,
          question,
          maxResults: 5,
        })
      })

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        answer: data.answer,
        sources: data.sources,
        citations: data.citations,
        usage: data.usage,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  const listStores = useCallback(async (): Promise<FileSearchStore[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'list_stores' })
      })

      if (!response.ok) {
        throw new Error(`Failed to list stores: ${response.statusText}`)
      }

      const data = await response.json()
      return data.stores
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  const deleteDocument = useCallback(async (documentId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'delete_document',
          documentId,
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  return {
    isLoading,
    error,
    createStore,
    uploadDocument,
    query,
    listStores,
    deleteDocument,
  }
}
```

---

## 3. ADK AGENT - Captacao Especialista

### `backend/agents/captacao_agent.py`

```python
"""
Agente Especialista em Captacao de Recursos
Usa ADK + File Search + Google Search para analise de editais
"""

from google.adk.agents import Agent
from google.adk.tools import google_search
from google.adk.tools.file_search import FileSearchTool
from google.adk.sessions import InMemorySessionService
from google.adk.runner import Runner
import os

FILE_SEARCH_STORE = os.getenv('CAPTACAO_FILE_SEARCH_STORE')

file_search_tool = FileSearchTool(
    file_search_stores=[FILE_SEARCH_STORE],
    description="Busca em editais, regulamentos e documentos de captacao indexados"
)

captacao_agent = Agent(
    name="captacao_specialist",
    model="gemini-2.5-pro",

    instruction="""
    Voce e um especialista em captacao de recursos para projetos brasileiros.

    ## Conhecimentos Especializados
    - FAPERJ: Editais APQ, JCNE, Cientista do Nosso Estado
    - FINEP: Subvencao economica, credito, fundos setoriais
    - CNPq: Bolsas, auxilios, projetos de pesquisa
    - CAPES: Bolsas de pos-graduacao, PNPD
    - Lei Rouanet: Projetos culturais, incentivo fiscal
    - Lei do Audiovisual: Producoes audiovisuais
    - Fundos internacionais: Horizon Europe, NSF partnerships

    ## Capacidades
    1. **Analise de Editais**: Extrair requisitos, criterios, prazos
    2. **Matching**: Comparar perfil do projeto com requisitos do edital
    3. **Redacao**: Gerar secoes de propostas em portugues tecnico
    4. **Pesquisa**: Buscar oportunidades abertas e dados atualizados
    5. **Compliance**: Verificar conformidade com regulamentos

    ## Diretrizes
    - SEMPRE use a ferramenta file_search para buscar em editais indexados
    - Use google_search para informacoes atualizadas (prazos, resultados)
    - Responda em portugues brasileiro formal/tecnico
    - Cite fontes especificas quando mencionar requisitos
    - Se nao souber, diga claramente em vez de inventar
    """,

    description="""
    Especialista em captacao de recursos e editais brasileiros.
    Analisa editais, compara com projetos, sugere oportunidades e
    auxilia na redacao de propostas.
    """,

    tools=[
        file_search_tool,
        google_search,
    ]
)

# Ferramentas customizadas para integracao com AICA
def get_user_projects(user_id: str) -> list:
    """Busca projetos do usuario no banco de dados AICA"""
    from supabase import create_client

    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_KEY')
    )

    response = supabase.table('grant_projects')\
        .select('*')\
        .eq('user_id', user_id)\
        .execute()

    return response.data

def save_opportunity_match(user_id: str, edital_id: str, score: float, analysis: str):
    """Salva match de oportunidade no banco"""
    from supabase import create_client

    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_KEY')
    )

    supabase.table('grant_opportunities').insert({
        'user_id': user_id,
        'edital_id': edital_id,
        'match_score': score,
        'ai_analysis': analysis,
        'status': 'new'
    }).execute()

# Runner para execucao
async def run_captacao_query(user_id: str, query: str):
    """Executa query no agente de captacao"""

    session_service = InMemorySessionService()

    runner = Runner(
        agent=captacao_agent,
        session_service=session_service,
        app_name="aica_captacao"
    )

    session = await session_service.create(
        user_id=user_id,
        app_name="aica_captacao"
    )

    result = await runner.run(
        session_id=session.id,
        user_message=query
    )

    return result
```

---

## 4. GROUNDING WITH GOOGLE SEARCH - Hook

### `src/hooks/useGroundedSearch.ts`

```typescript
import { useState, useCallback } from 'react'
import { GeminiClient } from '@/lib/gemini'

interface GroundedResult {
  text: string
  sources: Array<{
    title: string
    url: string
    snippet?: string
  }>
  searchQueries: string[]
  confidence: number
}

interface UseGroundedSearchReturn {
  search: (query: string) => Promise<GroundedResult>
  isSearching: boolean
  error: string | null
}

export function useGroundedSearch(): UseGroundedSearchReturn {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geminiClient = GeminiClient.getInstance()

  const search = useCallback(async (query: string): Promise<GroundedResult> => {
    setIsSearching(true)
    setError(null)

    try {
      const response = await geminiClient.call({
        action: 'grounded_search',
        payload: {
          query,
          includeSearchSuggestions: true,
        },
        model: 'smart'
      })

      const result = response.result
      const groundingMetadata = result.groundingMetadata || {}

      return {
        text: result.text,
        sources: (groundingMetadata.groundingChunks || []).map((chunk: any) => ({
          title: chunk.web?.title || 'Fonte',
          url: chunk.web?.uri || '',
          snippet: chunk.text,
        })),
        searchQueries: groundingMetadata.webSearchQueries || [],
        confidence: calculateAverageConfidence(groundingMetadata.groundingSupports || []),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setError(message)
      throw err
    } finally {
      setIsSearching(false)
    }
  }, [geminiClient])

  return { search, isSearching, error }
}

function calculateAverageConfidence(supports: any[]): number {
  if (!supports.length) return 0

  const scores = supports.flatMap(s => s.confidenceScores || [])
  if (!scores.length) return 0

  return scores.reduce((a, b) => a + b, 0) / scores.length
}
```

---

## 5. COMPONENTE REACT - RAG Query UI

### `src/modules/captacao/components/EditalQueryCard.tsx`

```tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { useFileSearch } from '@/hooks/useFileSearch'

interface EditalQueryCardProps {
  storeId: string
  onResultSelect?: (result: any) => void
}

export function EditalQueryCard({ storeId, onResultSelect }: EditalQueryCardProps) {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<any>(null)
  const { query, isLoading, error } = useFileSearch()

  const handleSearch = async () => {
    if (!question.trim()) return

    try {
      const response = await query(storeId, question)
      setResult(response)
    } catch (err) {
      console.error('Query failed:', err)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
      {/* Search Input */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pergunte sobre editais... Ex: 'Quais editais aceitam projetos de IA?'"
            className="w-full px-4 py-3 pr-12 bg-white rounded-lg border border-ceramic-200
                       focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                       resize-none h-24 text-sm"
          />
          <Search className="absolute right-4 top-3 w-5 h-5 text-ceramic-400" />
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading || !question.trim()}
          className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium
                     hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Buscar'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Answer */}
            <div className="bg-white rounded-lg p-4 border border-ceramic-200">
              <h4 className="text-sm font-medium text-ceramic-600 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resposta
              </h4>
              <div className="prose prose-sm max-w-none text-ceramic-800">
                {result.answer}
              </div>
            </div>

            {/* Citations */}
            {result.citations?.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-ceramic-200">
                <h4 className="text-sm font-medium text-ceramic-600 mb-3">
                  Citacoes
                </h4>
                <div className="space-y-2">
                  {result.citations.map((citation: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm p-2 bg-ceramic-50 rounded"
                    >
                      <span className="text-amber-600 font-medium">[{index + 1}]</span>
                      <span className="text-ceramic-700">{citation.text}</span>
                      <span className="text-ceramic-400 text-xs">
                        ({Math.round(citation.confidence?.[0] * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {result.sources?.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-ceramic-200">
                <h4 className="text-sm font-medium text-ceramic-600 mb-3">
                  Fontes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((source: any, index: number) => (
                    <a
                      key={index}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-ceramic-100
                                 rounded-full text-sm text-ceramic-700 hover:bg-ceramic-200
                                 transition-colors"
                    >
                      {source.title || `Fonte ${index + 1}`}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Stats */}
            <div className="flex justify-end text-xs text-ceramic-400">
              Tokens: {result.usage?.inputTokens} in / {result.usage?.outputTokens} out
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## 6. CONFIGURACAO DE AMBIENTE

### `.env.example` (adicionar)

```bash
# Google AI / Gemini Configuration
# Estas chaves devem estar APENAS no Supabase Secrets (backend)
# GEMINI_API_KEY=sua-chave-aqui  # NAO COLOCAR NO FRONTEND

# File Search Stores (IDs apos criacao)
VITE_CAPTACAO_FILE_SEARCH_STORE=fileSearchStores/aica-captacao-xxx
VITE_STUDIO_FILE_SEARCH_STORE=fileSearchStores/aica-studio-xxx
VITE_JOURNEY_FILE_SEARCH_STORE=fileSearchStores/aica-journey-xxx

# Feature Flags
VITE_ENABLE_FILE_SEARCH_V2=true
VITE_ENABLE_GROUNDED_SEARCH=true
VITE_ENABLE_LIVE_API=false  # Ativar quando pronto
```

### Supabase Secrets (via CLI)

```bash
supabase secrets set GEMINI_API_KEY=sua-chave-do-google-ai-studio
supabase secrets set GOOGLE_CLOUD_PROJECT=seu-projeto-gcp
```

---

## 7. SCRIPT DE MIGRACAO

### `scripts/migrate-to-file-search-v2.ts`

```typescript
/**
 * Script de migracao para File Search V2
 * Indexa documentos existentes na nova API
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

async function migrateDocuments() {
  console.log('Iniciando migracao para File Search V2...\n')

  // 1. Criar stores por modulo
  const modules = ['captacao', 'studio', 'journey']
  const stores: Record<string, string> = {}

  for (const module of modules) {
    console.log(`Criando store para ${module}...`)
    const store = await genai.fileSearchStores.create({
      config: { display_name: `aica-${module}-knowledge` }
    })
    stores[module] = store.name!
    console.log(`   Store criado: ${store.name}`)
  }

  // 2. Buscar documentos existentes no Supabase
  const { data: documents, error } = await supabase
    .from('file_search_documents')
    .select('*')
    .eq('indexing_status', 'indexed')

  if (error) {
    console.error('Erro ao buscar documentos:', error)
    return
  }

  console.log(`\nEncontrados ${documents?.length || 0} documentos para migrar\n`)

  // 3. Migrar cada documento
  for (const doc of documents || []) {
    try {
      console.log(`   Migrando: ${doc.original_filename}...`)

      const { data: fileData } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (!fileData) {
        console.log(`   Arquivo nao encontrado no storage: ${doc.storage_path}`)
        continue
      }

      const storeId = stores[doc.module_type] || stores['captacao']

      const operation = await genai.fileSearchStores.uploadToFileSearchStore({
        file: fileData,
        file_search_store_name: storeId,
        config: {
          display_name: doc.original_filename,
          custom_metadata: [
            { key: 'module_type', string_value: doc.module_type },
            { key: 'module_id', string_value: doc.module_id || '' },
            { key: 'original_id', string_value: doc.id },
          ],
          chunking_config: {
            white_space_config: {
              max_tokens_per_chunk: 400,
              max_overlap_tokens: 40,
            }
          }
        }
      })

      let status = operation
      while (!status.done) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        status = await genai.operations.get(operation.name)
      }

      await supabase
        .from('file_search_documents')
        .update({
          v2_document_id: status.result?.name,
          v2_store_id: storeId,
          v2_migrated_at: new Date().toISOString(),
        })
        .eq('id', doc.id)

      console.log(`   Migrado: ${doc.original_filename}`)

    } catch (err) {
      console.error(`   Erro ao migrar ${doc.original_filename}:`, err)
    }
  }

  console.log('\nMigracao concluida!')
  console.log('\nStore IDs criados:')
  for (const [module, storeId] of Object.entries(stores)) {
    console.log(`   ${module}: ${storeId}`)
  }
}

migrateDocuments().catch(console.error)
```

---

## Proximos Passos

1. **Testar File Search** em sandbox com alguns PDFs de editais
2. **Criar Edge Function** `file-search-v2`
3. **Migrar documentos** existentes
4. **Integrar hook** no modulo Captacao
5. **Expandir** para Studio e Journey

---

*Codigo pronto para implementacao - adaptar conforme necessario*
