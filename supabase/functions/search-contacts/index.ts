/**
 * Search Contacts Edge Function
 * Issue #145: Semantic Search for Contacts and Conversations
 *
 * Allows semantic search for contacts using natural language queries:
 * - "people I discussed fundraising with"
 * - "contacts interested in tech startups"
 * - "who mentioned wanting to help with my project"
 *
 * Uses pgvector cosine similarity with optional keyword fallback.
 *
 * Endpoint: POST /functions/v1/search-contacts
 * Body: {
 *   query: string,
 *   limit?: number,
 *   threshold?: number,
 *   include_keyword_search?: boolean,
 *   embedding_types?: string[]
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

// Constants
const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_DIMENSIONS = 768

// Types
interface SearchRequest {
  query: string
  limit?: number
  threshold?: number
  include_keyword_search?: boolean
  embedding_types?: string[]
}

interface SearchResult {
  contact_phone: string
  contact_name: string
  similarity: number
  embedding_type: string
  relationship_score: number | null
  last_message_at: string | null
  detected_topics: string[] | null
  conversation_summary: string | null
  match_source: 'semantic' | 'keyword'
}

interface SearchResponse {
  success: boolean
  results: SearchResult[]
  query: string
  total_results: number
  error?: string
}

interface EmbeddingResponse {
  embedding?: {
    values: number[]
  }
}

/**
 * Generate query embedding using text-embedding-004
 * Uses RETRIEVAL_QUERY task type optimized for search queries
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
      taskType: 'RETRIEVAL_QUERY',  // Optimized for search queries
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

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const response: SearchResponse = {
    success: false,
    results: [],
    query: '',
    total_results: 0,
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Check authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ...response, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ...response, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body: SearchRequest = await req.json()

    if (!body.query || typeof body.query !== 'string' || body.query.trim().length < 2) {
      return new Response(
        JSON.stringify({ ...response, error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    response.query = body.query.trim()
    const limit = Math.min(body.limit ?? 10, 50)
    const threshold = Math.max(0, Math.min(1, body.threshold ?? 0.6))
    const includeKeyword = body.include_keyword_search ?? true
    const embeddingTypes = body.embedding_types ?? ['profile', 'conversation_summary']

    console.log(`[search-contacts] User ${user.id} searching: "${response.query}"`)

    // Service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(response.query)
    const embeddingVector = `[${queryEmbedding.join(',')}]`

    // Execute semantic search using the database function
    const { data: semanticResults, error: searchError } = await supabase.rpc(
      'search_contacts_by_embedding',
      {
        _query_embedding: embeddingVector,
        _user_id: user.id,
        _limit: limit,
        _min_similarity: threshold,
        _embedding_types: embeddingTypes,
      }
    )

    if (searchError) {
      console.error('[search-contacts] Semantic search error:', searchError)
      throw new Error(`Search failed: ${searchError.message}`)
    }

    // Map semantic results
    const results: SearchResult[] = (semanticResults || []).map((r: Record<string, unknown>) => ({
      contact_phone: r.contact_phone as string,
      contact_name: (r.contact_name as string) || (r.contact_phone as string),
      similarity: Math.round((r.similarity as number) * 100) / 100,
      embedding_type: r.embedding_type as string,
      relationship_score: (r.relationship_score as number | null),
      last_message_at: (r.last_message_at as string | null),
      detected_topics: (r.detected_topics as string[] | null),
      conversation_summary: (r.conversation_summary as string | null),
      match_source: 'semantic' as const,
    }))

    // Optional: Add keyword search fallback
    if (includeKeyword && results.length < limit) {
      const remainingLimit = limit - results.length
      const existingPhones = results.map(r => r.contact_phone)

      // Simple keyword search on contact_network
      const { data: keywordResults } = await supabase
        .from('contact_network')
        .select(`
          phone_number,
          contact_phone,
          name,
          contact_name,
          relationship_score,
          last_whatsapp_message_at,
          tags,
          ai_tags
        `)
        .eq('user_id', user.id)
        .or(`name.ilike.%${response.query}%,contact_name.ilike.%${response.query}%,tags.cs.{${response.query}}`)
        .not('phone_number', 'in', `(${existingPhones.map(p => `'${p}'`).join(',')})`)
        .limit(remainingLimit)

      if (keywordResults && keywordResults.length > 0) {
        for (const kr of keywordResults) {
          // Get latest insight for this contact
          const { data: insight } = await supabase
            .from('contact_insights')
            .select('detected_topics, conversation_summary')
            .eq('user_id', user.id)
            .eq('contact_phone', kr.phone_number || kr.contact_phone)
            .order('period_end', { ascending: false })
            .limit(1)
            .single()

          results.push({
            contact_phone: kr.phone_number || kr.contact_phone,
            contact_name: kr.name || kr.contact_name || kr.phone_number || kr.contact_phone,
            similarity: 0.5, // Lower similarity for keyword matches
            embedding_type: 'keyword',
            relationship_score: kr.relationship_score,
            last_message_at: kr.last_whatsapp_message_at,
            detected_topics: insight?.detected_topics || null,
            conversation_summary: insight?.conversation_summary || null,
            match_source: 'keyword' as const,
          })
        }
      }
    }

    response.success = true
    response.results = results
    response.total_results = results.length

    console.log(`[search-contacts] Found ${results.length} results for "${response.query}"`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const err = error as Error
    console.error('[search-contacts] Error:', err)

    response.error = err.message
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
