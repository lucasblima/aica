/**
 * File Search V2 - RAG Gerenciado pelo Google
 *
 * Usa o SDK nativo @google/genai para File Search API.
 * Substitui a implementacao V1 que usava REST API direta.
 *
 * Vantagens:
 * - SDK gerenciado (menos codigo, menos bugs)
 * - Chunking otimizado para portugues
 * - Grounding metadata nativa (citacoes, confianca)
 * - Storage e queries GRATIS (apenas indexacao cobra)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenAI } from 'npm:@google/genai@^1.0.0'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
  'https://aica-5562559893.southamerica-east1.run.app',
  'https://dev.aica.guru',
  'https://aica.guru',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================================================
// CONFIG
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Chunking config otimizado para portugues
const CHUNKING_CONFIG = {
  white_space_config: {
    max_tokens_per_chunk: 400,
    max_overlap_tokens: 40,
  }
}

// ============================================================================
// TYPES
// ============================================================================

type FileSearchCategory =
  | 'financial'
  | 'documents'
  | 'personal'
  | 'business'
  | 'grants'
  | 'podcast_transcripts'
  | 'habitat_documents'
  | 'venture_documents'
  | 'academia_documents'
  | 'tribo_documents'
  | 'onboarding_resources'
  | 'journey_moments'

type Action = 'create_store' | 'upload_document' | 'query' | 'delete_document' | 'delete_store' | 'list_stores'

interface RequestBody {
  action: Action
  payload: Record<string, any>
}

// ============================================================================
// HELPER
// ============================================================================

function jsonResponse(
  data: any,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleCreateStore(
  client: GoogleGenAI,
  userId: string,
  category: FileSearchCategory,
  displayName: string | undefined,
  supabaseClient: any
): Promise<any> {
  // Check if store already exists for this user + category
  const { data: existing } = await supabaseClient
    .from('user_file_search_stores')
    .select('store_name, display_name')
    .eq('user_id', userId)
    .eq('store_category', category)
    .single()

  if (existing?.store_name) {
    return {
      id: existing.store_name,
      displayName: existing.display_name,
      alreadyExisted: true,
    }
  }

  const label = displayName || `${userId}_${category}`

  const store = await client.fileSearchStores.create({
    config: { display_name: label }
  })

  // Persist in Supabase
  await supabaseClient.from('user_file_search_stores').insert({
    user_id: userId,
    store_name: store.name,
    store_category: category,
    display_name: label,
  })

  return {
    id: store.name,
    displayName: label,
    alreadyExisted: false,
  }
}

async function handleUploadDocument(
  client: GoogleGenAI,
  userId: string,
  payload: {
    storeId?: string
    category?: FileSearchCategory
    fileName: string
    fileContent: string // base64
    mimeType: string
    metadata?: Record<string, string>
  },
  supabaseClient: any
): Promise<any> {
  // Resolve store: either by direct ID or by auto-creating from category
  let storeId = payload.storeId
  if (!storeId && payload.category) {
    const storeResult = await handleCreateStore(
      client, userId, payload.category, undefined, supabaseClient
    )
    storeId = storeResult.id
  }
  if (!storeId) {
    throw new Error('Necessario fornecer "storeId" ou "category"')
  }

  // Decode base64 to Blob
  const binaryString = atob(payload.fileContent)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: payload.mimeType })

  // Build custom metadata
  const customMetadata = payload.metadata
    ? Object.entries(payload.metadata).map(([key, value]) => ({
        key,
        string_value: value,
      }))
    : undefined

  // Upload with automatic indexing
  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: blob,
    file_search_store_name: storeId,
    config: {
      display_name: payload.fileName,
      custom_metadata: customMetadata,
      chunking_config: CHUNKING_CONFIG,
    }
  })

  // Poll for indexing completion (max 5 minutes)
  const maxWait = 300_000
  const startTime = Date.now()
  let status = operation as any

  while (!status.done) {
    if (Date.now() - startTime > maxWait) {
      throw new Error('Timeout: indexacao excedeu 5 minutos')
    }
    await new Promise(r => setTimeout(r, 2000))
    status = await client.operations.get(status.name || (operation as any).name)
  }

  if (status.error) {
    throw new Error(`Indexacao falhou: ${status.error.message || JSON.stringify(status.error)}`)
  }

  const documentName = status.result?.name || status.name

  // Register in Supabase
  const { data: storeData } = await supabaseClient
    .from('user_file_search_stores')
    .select('id')
    .eq('store_name', storeId)
    .single()

  if (storeData) {
    await supabaseClient.from('indexed_documents').insert({
      user_id: userId,
      store_id: storeData.id,
      gemini_file_name: documentName,
      original_filename: payload.fileName,
      mime_type: payload.mimeType,
      file_size_bytes: bytes.length,
      custom_metadata: payload.metadata || {},
      indexing_status: 'completed',
    })
  }

  return {
    id: documentName,
    fileName: payload.fileName,
    status: 'indexed',
    storeId,
  }
}

async function handleQuery(
  client: GoogleGenAI,
  userId: string,
  payload: {
    storeId?: string
    categories?: FileSearchCategory[]
    question: string
    maxResults?: number
    systemPrompt?: string
  },
  supabaseClient: any
): Promise<any> {
  // Resolve stores: either direct ID or by categories
  let storeIds: string[] = []

  if (payload.storeId) {
    storeIds = [payload.storeId]
  } else if (payload.categories?.length) {
    const { data: stores } = await supabaseClient
      .from('user_file_search_stores')
      .select('store_name')
      .eq('user_id', userId)
      .in('store_category', payload.categories)

    storeIds = (stores || []).map((s: any) => s.store_name)
  }

  if (storeIds.length === 0) {
    return {
      answer: 'Nenhum documento indexado encontrado nessas categorias.',
      sources: [],
      citations: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    }
  }

  const systemInstruction = payload.systemPrompt || `Voce e um assistente do AICA Life OS, uma plataforma de produtividade pessoal brasileira.
Responda sempre em portugues brasileiro.
Baseie suas respostas nos documentos disponiveis.
Se nao encontrar informacao relevante, diga claramente.
Cite as fontes quando apropriado.`

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: payload.question,
    tools: [{
      file_search: {
        file_search_stores: storeIds,
        max_results: payload.maxResults || 5,
      }
    }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      systemInstruction,
    }
  })

  // Extract grounding metadata
  const candidate = response.candidates?.[0]
  const groundingMetadata = (candidate as any)?.groundingMetadata

  const sources = (groundingMetadata?.groundingChunks || []).map((chunk: any) => ({
    title: chunk.retrievedContext?.title || chunk.web?.title || 'Documento',
    uri: chunk.retrievedContext?.uri || chunk.web?.uri || '',
  }))

  const citations = (groundingMetadata?.groundingSupports || []).map((support: any) => ({
    text: support.segment?.text || '',
    startIndex: support.segment?.startIndex,
    endIndex: support.segment?.endIndex,
    sourceIndices: support.groundingChunkIndices || [],
    confidence: support.confidenceScores || [],
  }))

  const usage = {
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
  }

  // Log query in Supabase
  await supabaseClient.from('file_search_queries').insert({
    user_id: userId,
    store_names: storeIds,
    query_text: payload.question,
    response_tokens: usage.inputTokens + usage.outputTokens,
    citations: sources,
  }).catch((err: any) => {
    console.warn('[file-search-v2] Failed to log query:', err.message)
  })

  return {
    answer: response.text || '',
    sources,
    citations,
    usage,
  }
}

async function handleDeleteDocument(
  client: GoogleGenAI,
  documentId: string,
  supabaseClient: any
): Promise<void> {
  // Delete from Gemini
  await client.fileSearchStores.documents.delete({
    name: documentId,
    config: { force: true }
  })

  // Delete from Supabase
  await supabaseClient
    .from('indexed_documents')
    .delete()
    .eq('gemini_file_name', documentId)
}

async function handleDeleteStore(
  client: GoogleGenAI,
  storeName: string,
  supabaseClient: any
): Promise<void> {
  // Delete from Gemini (force deletes contents too)
  await client.fileSearchStores.delete({
    name: storeName,
    config: { force: true }
  })

  // Delete from Supabase (cascade deletes indexed_documents via FK)
  await supabaseClient
    .from('user_file_search_stores')
    .delete()
    .eq('store_name', storeName)
}

async function handleListStores(
  userId: string,
  supabaseClient: any
): Promise<any[]> {
  const { data, error } = await supabaseClient
    .from('user_file_search_stores')
    .select('*, indexed_documents(count)')
    .eq('user_id', userId)

  if (error) throw error

  return (data || []).map((store: any) => ({
    id: store.store_name,
    category: store.store_category,
    displayName: store.display_name,
    documentCount: store.indexed_documents?.[0]?.count || 0,
    createdAt: store.created_at,
  }))
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    if (!GEMINI_API_KEY) {
      return jsonResponse(
        { error: 'GEMINI_API_KEY nao configurada', success: false },
        500, corsHeaders
      )
    }

    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(
        { error: 'Autenticacao necessaria', success: false },
        401, corsHeaders
      )
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return jsonResponse(
        { error: 'Usuario nao autenticado', success: false },
        401, corsHeaders
      )
    }

    // Initialize Google GenAI client
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    const body: RequestBody = await req.json()
    const { action, payload } = body

    console.log(`[file-search-v2] Action: ${action}, User: ${user.id}`)

    let result: any

    switch (action) {
      case 'create_store': {
        if (!payload.category) {
          throw new Error('Campo "category" e obrigatorio')
        }
        result = await handleCreateStore(
          client, user.id, payload.category, payload.displayName, supabaseClient
        )
        break
      }

      case 'upload_document': {
        if (!payload.fileName || !payload.fileContent || !payload.mimeType) {
          throw new Error('Campos "fileName", "fileContent" e "mimeType" sao obrigatorios')
        }
        result = await handleUploadDocument(client, user.id, payload as any, supabaseClient)
        break
      }

      case 'query': {
        if (!payload.question) {
          throw new Error('Campo "question" e obrigatorio')
        }
        result = await handleQuery(client, user.id, payload as any, supabaseClient)
        break
      }

      case 'delete_document': {
        if (!payload.documentId) {
          throw new Error('Campo "documentId" e obrigatorio')
        }
        await handleDeleteDocument(client, payload.documentId, supabaseClient)
        result = { deleted: true }
        break
      }

      case 'delete_store': {
        if (!payload.storeName) {
          throw new Error('Campo "storeName" e obrigatorio')
        }
        await handleDeleteStore(client, payload.storeName, supabaseClient)
        result = { deleted: true }
        break
      }

      case 'list_stores': {
        result = await handleListStores(user.id, supabaseClient)
        break
      }

      default:
        return jsonResponse(
          { error: `Action desconhecida: ${action}`, success: false },
          400, corsHeaders
        )
    }

    const latencyMs = Date.now() - startTime
    console.log(`[file-search-v2] ${action} completed in ${latencyMs}ms`)

    return jsonResponse({ result, success: true, latencyMs }, 200, corsHeaders)

  } catch (error) {
    const latencyMs = Date.now() - startTime
    console.error(`[file-search-v2] Error after ${latencyMs}ms:`, error)

    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = message.includes('autenticad') || message.includes('auth') ? 401 : 500

    return jsonResponse({ error: message, success: false, latencyMs }, status, corsHeaders)
  }
})
