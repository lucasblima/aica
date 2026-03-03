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
import { supabase } from '@/services/supabaseClient'
import { getCachedSession } from '@/services/authCacheService'
import type { Dossier, WorkspaceCustomSource, DeepResearchResult, GapAnalysisResponse, EnrichCardRequest, EnrichCardResponse, FileSearchRequest, FileSearchResponse } from '../types'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('podcastAIService');

// Initialize client singleton
const geminiClient = GeminiClient.getInstance()

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
 * log.debug(dossier.biography)
 * ```
 */
export async function generateDossier(
  guestName: string,
  theme?: string,
  customSources?: WorkspaceCustomSource[],
  existingResearch?: DeepResearchResult
): Promise<Dossier> {
  // If existingResearch provided, convert to Dossier format directly
  if (existingResearch) {
    log.debug('[podcastAIService] Converting existing deep research to dossier:', { guestName });
    return {
      guestName,
      episodeTheme: theme || existingResearch.suggestedThemes[0] || 'Carreira & Atualidades',
      biography: typeof existingResearch.dossier.biography === 'string'
        ? existingResearch.dossier.biography
        : JSON.stringify(existingResearch.dossier.biography || ''),
      controversies: existingResearch.dossier.controversies,
      suggestedTopics: existingResearch.suggestedThemes,
      iceBreakers: existingResearch.dossier.iceBreakers,
      technicalSheet: existingResearch.dossier.technicalSheet,
    };
  }

  try {
    log.debug('[podcastAIService] Generating dossier:', { guestName, theme, customSources })

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
      biography: typeof data.biography === 'string'
        ? data.biography
        : (data.biography ? JSON.stringify(data.biography) : 'Não foi possível gerar o dossiê automaticamente.'),
      controversies: data.controversies || [],
      suggestedTopics: data.suggestedTopics || [],
      iceBreakers: data.iceBreakers || [],
      technicalSheet: data.technicalSheet || undefined
    }

    log.debug('[podcastAIService] Dossier generated successfully:', {
      biographyLength: dossier.biography.length,
      controversiesCount: dossier.controversies.length,
      topicsCount: dossier.suggestedTopics.length,
      iceBreakerCount: dossier.iceBreakers.length
    })

    return dossier

  } catch (error) {
    log.error('[podcastAIService] Error generating dossier:', error)

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
 * log.debug(results.bio)
 * ```
 */
export async function searchGuestProfile(
  name: string,
  reference: string
): Promise<GuestSearchResult> {
  try {
    log.debug('[podcastAIService] Searching guest profile:', { name, reference })

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

    log.debug('[podcastAIService] Guest profile found:', {
      name: result.name,
      bioLength: result.bio.length,
      relevance: result.relevance
    })

    return result

  } catch (error) {
    log.error('[podcastAIService] Error searching guest profile:', error)

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
    log.error('[podcastAIService] Error suggesting guest:', error)
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
    log.error('[podcastAIService] Error suggesting theme:', error)
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
    log.error('[podcastAIService] Error generating ice breakers:', error)
    return []
  }
}

/**
 * Deep research a guest using Google Search Grounding + AI synthesis.
 * Calls the studio-deep-research Edge Function.
 *
 * @param guestName - Guest name to research
 * @param guestContext - Context about the guest (profession, company, etc.)
 * @param researchDepth - Research depth level
 * @returns Deep research result with dossier, sources, and suggestions
 */
export async function deepResearchGuest(
  guestName: string,
  guestContext: string,
  researchDepth: 'quick' | 'standard' | 'deep' = 'standard'
): Promise<DeepResearchResult> {
  log.debug('[podcastAIService] Deep researching guest:', { guestName, guestContext, researchDepth });

  // Get auth token explicitly to avoid 401 errors (#665)
  const { session, error: sessionError } = await getCachedSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication required: Please log in again');
  }

  const { data, error } = await supabase.functions.invoke('studio-deep-research', {
    body: { guestName, guestContext, researchDepth },
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) throw new Error(error.message || 'Falha na pesquisa');
  if (!data?.success) throw new Error(data?.error || 'Pesquisa nao retornou resultados');

  log.debug('[podcastAIService] Deep research completed:', {
    sourcesCount: data.data?.sources?.length,
    themesCount: data.data?.suggestedThemes?.length,
    depth: data.data?.researchDepth
  });

  return data.data;
}

/**
 * Analyze gaps in an existing dossier using Google Grounding.
 * Calls studio-gap-analysis Edge Function.
 */
export async function analyzeGaps(
  dossier: Dossier,
  guestName: string,
  theme: string,
  customSources?: WorkspaceCustomSource[]
): Promise<GapAnalysisResponse> {
  log.debug('[podcastAIService] Analyzing gaps:', { guestName, theme });

  const { session, error: sessionError } = await getCachedSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication required: Please log in again');
  }

  const { data, error } = await supabase.functions.invoke('studio-gap-analysis', {
    body: { dossier, guestName, theme, customSources },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || 'Gap analysis failed');
  return data;
}

/**
 * Enrich a specific suggestion card with detailed content.
 * Calls studio-enrich-card Edge Function.
 */
export async function enrichCard(request: EnrichCardRequest): Promise<EnrichCardResponse> {
  log.debug('[podcastAIService] Enriching card:', { cardType: request.cardType, cardTitle: request.cardTitle });

  const { session, error: sessionError } = await getCachedSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication required: Please log in again');
  }

  const { data, error } = await supabase.functions.invoke('studio-enrich-card', {
    body: request,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || 'Card enrichment failed');
  return data;
}

/**
 * Index custom sources for File Search RAG.
 * Calls studio-file-search Edge Function.
 */
export async function indexSources(request: FileSearchRequest): Promise<FileSearchResponse> {
  log.debug('[podcastAIService] Indexing sources:', { count: request.sources.length });

  const { session, error: sessionError } = await getCachedSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication required: Please log in again');
  }

  const { data, error } = await supabase.functions.invoke('studio-file-search', {
    body: request,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || 'Source indexing failed');
  return data;
}
