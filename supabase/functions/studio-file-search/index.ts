/**
 * Edge Function: studio-file-search
 * Studio Creative Hub — NotebookLM Research UX
 *
 * Purpose:
 * - Creates a Gemini File Search store from user-provided custom sources
 * - Indexes text/URL content for RAG-based queries
 * - Optimized for Portuguese with max_tokens_per_chunk: 400
 *
 * Input: { sources: Array<{ content, type: 'text' | 'url', label }> }
 * Output: { success, data: { storeId, indexedCount } }
 *
 * Gemini API: File Search (fileSearchStores)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-file-search')

// =============================================================================
// HELPERS
// =============================================================================

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AICA-Research-Bot/1.0' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    // Strip HTML tags for plain text extraction
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000) // Limit to ~50k chars per source
  } catch (err) {
    logger.warn(`Failed to fetch URL ${url}:`, err)
    return ''
  }
}

// =============================================================================
// HANDLER
// =============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Input validation
    const { sources } = await req.json()
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      throw new Error('Campo "sources" deve ser um array com pelo menos 1 item')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    logger.info(`Indexing ${sources.length} sources`)

    // Step 1: Resolve URL sources to text content
    const resolvedSources: Array<{ content: string; label: string }> = []
    for (const source of sources) {
      if (source.type === 'url') {
        const content = await fetchUrlContent(source.content)
        if (content) {
          resolvedSources.push({ content, label: source.label || source.content })
        }
      } else {
        resolvedSources.push({ content: source.content, label: source.label || 'Texto' })
      }
    }

    if (resolvedSources.length === 0) {
      throw new Error('Nenhuma fonte pude ser processada')
    }

    // Step 2: Create File Search store via Gemini API
    const storeData = await withHealthTracking(
      { functionName: 'studio-file-search', actionName: 'create_corpus' },
      supabaseClient,
      async () => {
        const createStoreResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/corpora?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              display_name: `aica-studio-research-${user.id.substring(0, 8)}-${Date.now()}`,
            }),
          }
        )
        const data = await createStoreResponse.json()
        if (data.error) throw new Error(`Failed to create store: ${data.error.message}`)
        return data
      }
    )

    const corpusName = storeData.name
    logger.info(`Created corpus: ${corpusName}`)

    // Step 3: Create documents and chunk content
    let indexedCount = 0
    for (const source of resolvedSources) {
      // Create a document in the corpus
      const createDocResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${corpusName}/documents?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: source.label.substring(0, 128),
          }),
        }
      )
      const docData = await createDocResponse.json()
      if (docData.error) {
        logger.warn(`Failed to create doc for "${source.label}":`, docData.error)
        continue
      }

      const docName = docData.name

      // Chunk content into ~400 token segments (approx 1600 chars for Portuguese)
      const chunkSize = 1600
      const chunks: string[] = []
      for (let i = 0; i < source.content.length; i += chunkSize) {
        chunks.push(source.content.substring(i, i + chunkSize))
      }

      // Create chunks in the document
      for (const chunkText of chunks) {
        const createChunkResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${docName}/chunks?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: { string_value: chunkText },
            }),
          }
        )
        const chunkData = await createChunkResponse.json()
        if (chunkData.error) {
          logger.warn('Failed to create chunk:', chunkData.error)
        }
      }

      indexedCount++
      logger.info(`Indexed "${source.label}" (${chunks.length} chunks)`)
    }

    logger.info(`Complete: ${indexedCount}/${resolvedSources.length} sources indexed`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          storeId: corpusName,
          indexedCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    logger.error('error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
