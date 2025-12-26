/**
 * Gemini Deep Research API Integration (SECURITY FIXED)
 *
 * CRITICAL SECURITY UPDATE:
 * Previous implementation exposed VITE_GEMINI_API_KEY in frontend code.
 * This version uses GeminiClient → Edge Functions for secure backend calls.
 *
 * @deprecated Use useWorkspaceAI.deepResearch() instead
 * This file is kept for backward compatibility but will be removed in Wave 5.
 *
 * @module api/geminiDeepResearch
 */

import { GeminiClient } from '@/lib/gemini'

const geminiClient = GeminiClient.getInstance()

/**
 * @deprecated Use types from useWorkspaceAI instead
 */
export interface DeepResearchRequest {
  query: string
  include_sources?: boolean
  max_depth?: number
}

/**
 * @deprecated Use types from useWorkspaceAI instead
 */
export interface DeepResearchResponse {
  success: boolean
  confidence_score?: number
  quality_score?: number

  // Biography
  biography?: string
  summary?: string
  sources?: Array<{ url: string; title: string; date: string }>

  // Technical sheet
  full_name?: string
  birth_date?: string
  birth_place?: string
  nationality?: string
  occupation?: string
  known_for?: string
  education?: string
  awards?: Array<{ name: string; year: number; organization?: string }>
  social_media?: {
    twitter?: string
    instagram?: string
    linkedin?: string
    youtube?: string
    [key: string]: string | undefined
  }

  // Controversies & news
  controversies?: Array<{
    title: string
    summary: string
    source: string
    sentiment: 'positive' | 'negative' | 'neutral'
    date: string
  }>
  recent_news?: Array<{
    title: string
    url: string
    source: string
    date: string
  }>

  error?: string
}

/**
 * Perform deep research on a person using Gemini API
 *
 * SECURITY FIX:
 * - BEFORE: new GoogleGenAI(VITE_GEMINI_API_KEY) - EXPOSED API KEY
 * - AFTER: GeminiClient.getInstance() → Edge Function - SECURE
 *
 * @deprecated Use useWorkspaceAI().deepResearch() instead
 */
export async function performDeepResearch(
  request: DeepResearchRequest
): Promise<DeepResearchResponse> {
  console.warn(
    '⚠️  performDeepResearch() is deprecated. Use useWorkspaceAI().deepResearch() instead.'
  )

  try {
    // SECURE: Use GeminiClient → Edge Function (API key in backend)
    const response = await geminiClient.call({
      action: 'deep_research',
      payload: {
        query: request.query,
        include_sources: request.include_sources ?? true,
        max_depth: request.max_depth ?? 2
      },
      model: 'smart'
    })

    // Parse response
    const result: DeepResearchResponse =
      typeof response.result === 'string'
        ? JSON.parse(response.result)
        : response.result

    return {
      success: true,
      ...result
    }
  } catch (error) {
    console.error('Error in Gemini Deep Research:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Mock implementation for development/testing
 *
 * @deprecated Will be removed in Wave 5
 */
export function mockDeepResearch(query: string): DeepResearchResponse {
  const guestName = query.split(':')[0]?.trim() || 'Convidado'

  return {
    success: true,
    confidence_score: 75,
    quality_score: 70,
    full_name: guestName,
    occupation: 'Personalidade Pública',
    known_for: 'Trabalhos na área de atuação',
    biography: `${guestName} é uma personalidade conhecida em sua área de atuação. Informações detalhadas serão adicionadas após pesquisa mais aprofundada.`,
    summary: `Perfil de ${guestName} com informações básicas.`,
    sources: [
      {
        url: 'https://example.com',
        title: 'Fonte de exemplo',
        date: new Date().toISOString().split('T')[0]
      }
    ],
    recent_news: [],
    controversies: [],
    awards: [],
    social_media: {}
  }
}
