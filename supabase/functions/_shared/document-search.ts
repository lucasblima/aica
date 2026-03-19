// ==========================================================================
// document-search.ts — RAG document retrieval for chat context enrichment
// Uses Google GenAI SDK file_search to query user's indexed documents
// ==========================================================================

import { GoogleGenAI } from 'npm:@google/genai@^1.0.0'

// Modules that have indexable documents
const MODULE_TO_CATEGORIES: Record<string, string[]> = {
  grants: ['grants', 'documents'],
  captacao: ['grants', 'documents'],
  studio: ['podcast_transcripts', 'documents'],
  journey: ['journey_moments', 'personal'],
  connections: ['habitat_documents', 'venture_documents', 'academia_documents', 'tribo_documents'],
}

const MAX_CHUNKS = 3
const MAX_CONTEXT_CHARS = 3000 // ~2000 tokens

export interface DocumentSearchResult {
  found: boolean
  contextString: string
  sources: Array<{ title: string; uri: string }>
  usage: { inputTokens: number; outputTokens: number }
}

/**
 * Search user's indexed documents for relevant context.
 * Returns empty result for modules without documents (atlas, finance, flux, agenda).
 */
export async function fetchRelevantDocuments(
  supabaseAdmin: any,
  userId: string,
  module: string,
  query: string,
  apiKey: string
): Promise<DocumentSearchResult> {
  const emptyResult: DocumentSearchResult = {
    found: false,
    contextString: '',
    sources: [],
    usage: { inputTokens: 0, outputTokens: 0 },
  }

  // Only search for modules that have documents
  const categories = MODULE_TO_CATEGORIES[module]
  if (!categories) {
    return emptyResult
  }

  try {
    // Find user's stores for this module's categories
    const { data: stores, error } = await supabaseAdmin
      .from('user_file_search_stores')
      .select('store_name')
      .eq('user_id', userId)
      .in('store_category', categories)

    if (error || !stores?.length) {
      console.log(`[document-search] No stores found for user=${userId} module=${module}`)
      return emptyResult
    }

    const storeIds = stores.map((s: any) => s.store_name)
    console.log(`[document-search] Querying ${storeIds.length} store(s) for module=${module}`)

    // Query with file_search
    const client = new GoogleGenAI({ apiKey })
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      tools: [{
        file_search: {
          file_search_stores: storeIds,
          max_results: MAX_CHUNKS,
        }
      }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        systemInstruction: `Extraia e resuma as informacoes mais relevantes dos documentos para responder a pergunta do usuario. Seja conciso. Responda em portugues.`,
      }
    })

    // Extract grounding metadata
    const candidate = response.candidates?.[0]
    const groundingMetadata = (candidate as any)?.groundingMetadata

    const sources = (groundingMetadata?.groundingChunks || [])
      .slice(0, MAX_CHUNKS)
      .map((chunk: any) => ({
        title: chunk.retrievedContext?.title || 'Documento',
        uri: chunk.retrievedContext?.uri || '',
      }))

    const answerText = (response.text || '').substring(0, MAX_CONTEXT_CHARS)

    if (!answerText) {
      return emptyResult
    }

    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
    }

    console.log(`[document-search] Found ${sources.length} source(s), answer=${answerText.length} chars, tokens_in=${usage.inputTokens} tokens_out=${usage.outputTokens}`)

    const contextString = `## Documentos Relevantes\n${answerText}\n\nFontes: ${sources.map((s: any) => s.title).join(', ')}`

    return {
      found: true,
      contextString,
      sources,
      usage,
    }
  } catch (err) {
    console.warn(`[document-search] Failed for module=${module}:`, (err as Error).message)
    return emptyResult
  }
}
