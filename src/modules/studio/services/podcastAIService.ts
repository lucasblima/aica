/**
 * Podcast AI Service - Studio Module
 *
 * Provides AI-powered features for podcast production:
 * - Guest dossier generation
 * - Guest profile search
 * - Topic suggestions
 * - Ice breaker generation
 *
 * Uses the centralized GeminiClient for secure backend calls
 */

import { GeminiClient } from '@/lib/gemini'
import type { Dossier } from '../../../_deprecated/modules/podcast/types'

// Initialize client singleton
const geminiClient = GeminiClient.getInstance()

/**
 * Custom source for guest research
 */
export interface CustomSource {
  id: string
  url: string
  title: string
  type: 'article' | 'video' | 'social' | 'other'
}

/**
 * Guest search result
 */
export interface GuestSearchResult {
  name: string
  reference: string
  bio: string
  socialMedia?: {
    twitter?: string
    instagram?: string
    linkedin?: string
  }
  recentActivity?: string[]
  relevance: number
}

/**
 * Generate comprehensive dossier for podcast guest
 *
 * @param guestName - Name of the guest
 * @param theme - Episode theme (optional)
 * @param customSources - Additional sources for research (optional)
 * @returns Dossier with biography, controversies, topics, and ice breakers
 *
 * @example
 * ```ts
 * const dossier = await generateDossier('Elon Musk', 'Inovação e Tecnologia')
 * console.log(dossier.biography)
 * ```
 */
export async function generateDossier(
  guestName: string,
  theme?: string,
  customSources?: CustomSource[]
): Promise<Dossier> {
  try {
    console.log('[podcastAIService] Generating dossier:', { guestName, theme, customSources })

    const response = await geminiClient.call({
      action: 'generate_dossier',
      payload: {
        guestName,
        theme: theme || undefined,
        customSources: customSources || undefined
      },
      model: 'smart' // Use smarter model for detailed dossiers
    })

    // Parse and structure the response
    const data = typeof response.result === 'string'
      ? JSON.parse(response.result)
      : response.result

    const finalTheme = (theme && theme.trim())
      ? theme
      : (data.derivedTheme || 'Carreira & Atualidades')

    const dossier: Dossier = {
      guestName,
      episodeTheme: finalTheme,
      biography: data.biography || 'Não foi possível gerar o dossiê automaticamente.',
      controversies: data.controversies || [],
      suggestedTopics: data.suggestedTopics || [],
      iceBreakers: data.iceBreakers || [],
      technicalSheet: data.technicalSheet || undefined
    }

    console.log('[podcastAIService] Dossier generated successfully:', {
      biographyLength: dossier.biography.length,
      controversiesCount: dossier.controversies.length,
      topicsCount: dossier.suggestedTopics.length,
      iceBreakerCount: dossier.iceBreakers.length
    })

    return dossier

  } catch (error) {
    console.error('[podcastAIService] Error generating dossier:', error)

    // Fallback dossier
    return {
      guestName,
      episodeTheme: theme || 'Carreira & Atualidades',
      biography: 'Não foi possível gerar o dossiê automaticamente.',
      controversies: [],
      suggestedTopics: [],
      iceBreakers: []
    }
  }
}

/**
 * Search for guest profile using intelligent search
 *
 * @param name - Guest name to search
 * @param reference - Reference context (e.g., profession, company)
 * @returns Search results with profile information
 *
 * @example
 * ```ts
 * const results = await searchGuestProfile('Bill Gates', 'Microsoft Founder')
 * console.log(results.bio)
 * ```
 */
export async function searchGuestProfile(
  name: string,
  reference: string
): Promise<GuestSearchResult> {
  try {
    console.log('[podcastAIService] Searching guest profile:', { name, reference })

    const response = await geminiClient.call({
      action: 'intelligent_search',
      payload: {
        query: name,
        context: reference
      },
      model: 'smart'
    })

    const data = typeof response.result === 'string'
      ? JSON.parse(response.result)
      : response.result

    const result: GuestSearchResult = {
      name: data.name || name,
      reference: data.reference || reference,
      bio: data.bio || 'Informações não disponíveis.',
      socialMedia: data.socialMedia || undefined,
      recentActivity: data.recentActivity || [],
      relevance: data.relevance || 0.5
    }

    console.log('[podcastAIService] Guest profile found:', {
      name: result.name,
      bioLength: result.bio.length,
      relevance: result.relevance
    })

    return result

  } catch (error) {
    console.error('[podcastAIService] Error searching guest profile:', error)

    // Fallback result
    return {
      name,
      reference,
      bio: 'Não foi possível buscar informações sobre este convidado.',
      relevance: 0
    }
  }
}

/**
 * Suggest trending guest for podcast interview
 *
 * @returns Suggested guest name
 */
export async function suggestTrendingGuest(): Promise<string> {
  try {
    const response = await geminiClient.call({
      action: 'suggest_guest',
      payload: {},
      model: 'smart'
    })

    return response.result || ''
  } catch (error) {
    console.error('[podcastAIService] Error suggesting guest:', error)
    return ''
  }
}

/**
 * Suggest trending theme based on guest name
 *
 * @param guestName - Guest name
 * @returns Suggested theme
 */
export async function suggestTrendingTheme(guestName: string): Promise<string> {
  try {
    const response = await geminiClient.call({
      action: 'suggest_topic',
      payload: { guestName },
      model: 'smart'
    })

    return response.result || 'Carreira e Atualidades'
  } catch (error) {
    console.error('[podcastAIService] Error suggesting theme:', error)
    return ''
  }
}

/**
 * Generate more ice breaker questions
 *
 * @param guestName - Guest name
 * @param theme - Episode theme
 * @param existing - Existing ice breakers
 * @param count - Number of new ice breakers to generate
 * @returns Array of ice breaker questions
 */
export async function generateMoreIceBreakers(
  guestName: string,
  theme: string,
  existing: string[],
  count: number = 3
): Promise<string[]> {
  try {
    const response = await geminiClient.call({
      action: 'generate_ice_breakers',
      payload: {
        guestName,
        theme,
        existing,
        count
      },
      model: 'smart'
    })

    return response.result || []
  } catch (error) {
    console.error('[podcastAIService] Error generating ice breakers:', error)
    return []
  }
}
