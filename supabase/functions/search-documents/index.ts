/**
 * Search Documents Edge Function
 * Epic #113 - Issue #116: Embeddings and Semantic Search (RAG)
 *
 * This function provides semantic search over processed documents using:
 * 1. Google's text-embedding-004 model for query embedding generation
 * 2. PostgreSQL pgvector for fast similarity search
 * 3. search_documents_by_embedding() SQL function for secure querying
 *
 * @module functions/search-documents
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import { getCorsHeaders } from '../_shared/cors.ts'

// =============================================================================
// TYPES
// =============================================================================

interface SearchRequest {
  query: string
  organization_id?: string
  project_id?: string
  limit?: number
  threshold?: number
  document_types?: string[]
}

interface SearchResult {
  document_id: string
  chunk_id: string
  chunk_text: string
  similarity: number
  document_name: string
  detected_type: string | null
  organization_id?: string
  project_id?: string
}

interface SearchResponse {
  success: boolean
  results: SearchResult[]
  query: string
  total_results: number
  search_time_ms: number
  embedding_model: string
  error?: string
}

interface EmbeddingResponse {
  embedding: {
    values: number[]
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Embedding model configuration (configurable via env vars)
const EMBEDDING_MODEL = Deno.env.get('EMBEDDING_MODEL') || 'text-embedding-004'
const EMBEDDING_DIMENSIONS = 768 // text-embedding-004 output dimensions

// Search defaults (configurable via env vars)
const DEFAULT_LIMIT = parseInt(Deno.env.get('DEFAULT_SEARCH_LIMIT') || '10', 10)
const DEFAULT_THRESHOLD = parseFloat(Deno.env.get('DEFAULT_SIMILARITY_THRESHOLD') || '0.7')
const MAX_LIMIT = parseInt(Deno.env.get('MAX_SEARCH_LIMIT') || '50', 10)
const MIN_QUERY_LENGTH = parseInt(Deno.env.get('MIN_QUERY_LENGTH') || '3', 10)
const MAX_QUERY_LENGTH = parseInt(Deno.env.get('MAX_QUERY_LENGTH') || '1000', 10)

// =============================================================================
// CORS HELPERS
// =============================================================================

// corsHeaders is initialized per-request inside the handler via getCorsHeaders(req)

let _corsHeaders: Record<string, string> = {}

function createResponse(data: SearchResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ..._corsHeaders, 'Content-Type': 'application/json' },
  })
}

function createErrorResponse(error: string, status = 400): Response {
  return createResponse(
    {
      success: false,
      results: [],
      query: '',
      total_results: 0,
      search_time_ms: 0,
      embedding_model: EMBEDDING_MODEL,
      error,
    },
    status
  )
}

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

/**
 * Generate embedding for search query using Google's text-embedding-004 model
 * @param query - The search query text
 * @returns Array of 768 float values
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY not configured')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text: query }],
      },
      taskType: 'RETRIEVAL_QUERY',
      // Optimize for semantic search queries
      title: 'Search Query',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Embedding API error:', errorText)
    throw new Error(`Embedding API error: ${response.status}`)
  }

  const data = (await response.json()) as EmbeddingResponse
  const values = data.embedding?.values

  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Invalid embedding response: expected ${EMBEDDING_DIMENSIONS} dimensions`)
  }

  return values
}

// =============================================================================
// SEARCH FUNCTIONS
// =============================================================================

/**
 * Execute semantic search using pgvector
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID for RLS filtering
 * @param embedding - Query embedding vector
 * @param options - Search options
 * @returns Search results
 */
async function executeSemanticSearch(
  supabase: SupabaseClient,
  userId: string,
  embedding: number[],
  options: {
    limit: number
    threshold: number
    organizationId?: string
    projectId?: string
    documentTypes?: string[]
  }
): Promise<SearchResult[]> {
  // Format embedding as PostgreSQL vector string
  const embeddingVector = `[${embedding.join(',')}]`

  // Call the search function
  const { data, error } = await supabase.rpc('search_documents_by_embedding', {
    _query_embedding: embeddingVector,
    _user_id: userId,
    _limit: options.limit,
    _min_similarity: options.threshold,
  })

  if (error) {
    console.error('Search RPC error:', error)
    throw new Error(`Search failed: ${error.message}`)
  }

  let results = (data as SearchResult[]) || []

  // Apply additional filters that couldn't be done in SQL
  // (organization_id, project_id, and document_types filtering)
  // TODO: For better performance at scale, consider adding these filters directly
  // to the search_documents_by_embedding() RPC function via database migration.
  // This would avoid fetching extra results that get filtered out in application code.
  if (options.organizationId || options.projectId || options.documentTypes?.length) {
    // Fetch full document details for filtering
    const documentIds = [...new Set(results.map((r) => r.document_id))]

    if (documentIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('processed_documents')
        .select('id, organization_id, project_id, detected_type')
        .in('id', documentIds)

      if (!docsError && docs) {
        const docsMap = new Map(docs.map((d) => [d.id, d]))

        results = results.filter((r) => {
          const doc = docsMap.get(r.document_id)
          if (!doc) return false

          // Filter by organization if specified
          if (options.organizationId && doc.organization_id !== options.organizationId) {
            return false
          }

          // Filter by project if specified
          if (options.projectId && doc.project_id !== options.projectId) {
            return false
          }

          // Filter by document types if specified
          if (options.documentTypes?.length && !options.documentTypes.includes(doc.detected_type)) {
            return false
          }

          // Add organization/project to result
          r.organization_id = doc.organization_id
          r.project_id = doc.project_id

          return true
        })
      }
    }
  }

  return results
}

/**
 * Expand search results with context from adjacent chunks
 * @param supabase - Supabase client
 * @param results - Initial search results
 * @param contextChunks - Number of context chunks to include (before and after)
 * @returns Expanded results with context
 */
async function expandResultsWithContext(
  supabase: SupabaseClient,
  results: SearchResult[],
  contextChunks: number = 1
): Promise<SearchResult[]> {
  if (contextChunks === 0 || results.length === 0) {
    return results
  }

  // Get chunk indices for each result
  const chunkIds = results.map((r) => r.chunk_id)

  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, document_id, chunk_index')
    .in('id', chunkIds)

  if (error || !chunks) {
    return results
  }

  // Map chunk_id to chunk info
  const chunkMap = new Map(chunks.map((c) => [c.id, c]))

  // For each document, get context chunks
  const documentChunkIndices = new Map<string, Set<number>>()

  for (const result of results) {
    const chunk = chunkMap.get(result.chunk_id)
    if (!chunk) continue

    const docId = result.document_id
    if (!documentChunkIndices.has(docId)) {
      documentChunkIndices.set(docId, new Set())
    }

    const indices = documentChunkIndices.get(docId)!
    for (let i = -contextChunks; i <= contextChunks; i++) {
      const idx = chunk.chunk_index + i
      if (idx >= 0) indices.add(idx)
    }
  }

  // Fetch context chunks for each document
  for (const [docId, indices] of documentChunkIndices) {
    const { data: contextChunksData } = await supabase
      .from('document_chunks')
      .select('id, chunk_index, chunk_text')
      .eq('document_id', docId)
      .in('chunk_index', [...indices])
      .order('chunk_index')

    if (contextChunksData) {
      // Find matching result and add context
      const matchingResults = results.filter((r) => r.document_id === docId)
      for (const result of matchingResults) {
        const chunk = chunkMap.get(result.chunk_id)
        if (!chunk) continue

        // Combine adjacent chunks into the chunk_text
        const adjacentChunks = contextChunksData.filter(
          (c) => Math.abs(c.chunk_index - chunk.chunk_index) <= contextChunks
        )

        if (adjacentChunks.length > 1) {
          result.chunk_text = adjacentChunks.map((c) => c.chunk_text).join('\n\n---\n\n')
        }
      }
    }
  }

  return results
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

function validateRequest(body: unknown): SearchRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object')
  }

  const req = body as Record<string, unknown>

  // Validate query
  if (!req.query || typeof req.query !== 'string') {
    throw new Error('Query is required and must be a string')
  }

  const query = req.query.trim()

  if (query.length < MIN_QUERY_LENGTH) {
    throw new Error(`Query must be at least ${MIN_QUERY_LENGTH} characters`)
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query must be at most ${MAX_QUERY_LENGTH} characters`)
  }

  // Validate optional parameters
  let limit = DEFAULT_LIMIT
  if (req.limit !== undefined) {
    limit = parseInt(String(req.limit), 10)
    if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new Error(`Limit must be between 1 and ${MAX_LIMIT}`)
    }
  }

  let threshold = DEFAULT_THRESHOLD
  if (req.threshold !== undefined) {
    threshold = parseFloat(String(req.threshold))
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1')
    }
  }

  // Validate organization_id and project_id if provided
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  let organizationId: string | undefined
  if (req.organization_id) {
    if (typeof req.organization_id !== 'string' || !uuidRegex.test(req.organization_id)) {
      throw new Error('organization_id must be a valid UUID')
    }
    organizationId = req.organization_id
  }

  let projectId: string | undefined
  if (req.project_id) {
    if (typeof req.project_id !== 'string' || !uuidRegex.test(req.project_id)) {
      throw new Error('project_id must be a valid UUID')
    }
    projectId = req.project_id
  }

  // Validate document_types if provided
  let documentTypes: string[] | undefined
  if (req.document_types) {
    if (!Array.isArray(req.document_types)) {
      throw new Error('document_types must be an array')
    }
    documentTypes = req.document_types.filter((t) => typeof t === 'string')
  }

  return {
    query,
    organization_id: organizationId,
    project_id: projectId,
    limit,
    threshold,
    document_types: documentTypes,
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  _corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: _corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405)
  }

  const startTime = performance.now()

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401)
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return createErrorResponse('Server configuration error', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return createErrorResponse('Invalid or expired token', 401)
    }

    // Parse and validate request
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON body')
    }

    const searchRequest = validateRequest(body)

    // NOTE: console.log statements are intentional for Supabase Edge Functions.
    // These logs appear in Supabase Dashboard → Functions → Logs for production monitoring.
    console.log(`[search-documents] User ${user.id} searching: "${searchRequest.query.substring(0, 50)}..."`)

    // Generate embedding for query
    console.log('[search-documents] Generating query embedding...')
    const queryEmbedding = await generateQueryEmbedding(searchRequest.query)
    console.log(`[search-documents] Generated embedding with ${queryEmbedding.length} dimensions`)

    // Execute semantic search
    console.log('[search-documents] Executing semantic search...')
    let results = await executeSemanticSearch(supabase, user.id, queryEmbedding, {
      limit: searchRequest.limit!,
      threshold: searchRequest.threshold!,
      organizationId: searchRequest.organization_id,
      projectId: searchRequest.project_id,
      documentTypes: searchRequest.document_types,
    })

    // Expand results with context (1 chunk before/after)
    results = await expandResultsWithContext(supabase, results, 1)

    const searchTimeMs = Math.round(performance.now() - startTime)

    console.log(`[search-documents] Found ${results.length} results in ${searchTimeMs}ms`)

    return createResponse({
      success: true,
      results,
      query: searchRequest.query,
      total_results: results.length,
      search_time_ms: searchTimeMs,
      embedding_model: EMBEDDING_MODEL,
    })
  } catch (error) {
    const searchTimeMs = Math.round(performance.now() - startTime)
    console.error('[search-documents] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return createResponse(
      {
        success: false,
        results: [],
        query: '',
        total_results: 0,
        search_time_ms: searchTimeMs,
        embedding_model: EMBEDDING_MODEL,
        error: errorMessage,
      },
      500
    )
  }
})
