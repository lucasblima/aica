/**
 * Unified Workspace AI Hook
 *
 * Consolidates all AI operations for Studio Workspace:
 * - Dossier generation
 * - Guest profile search
 * - Topic suggestions
 * - Deep research
 * - Ice breaker generation
 * - Gemini Live connections
 *
 * SECURITY: All operations use GeminiClient → Edge Functions
 * NEVER instantiates GoogleGenAI directly (API keys stay in backend)
 *
 * @module studio/hooks/useWorkspaceAI
 */

import { useState, useCallback, useRef } from 'react'
import { GeminiClient } from '@/lib/gemini'
import * as podcastAIService from '../services/podcastAIService'
import type { Dossier, WorkspaceCustomSource } from '../types'
import type { GuestSearchResult } from '../services/podcastAIService'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useWorkspaceAI');

// Re-export types for convenience
export type { Dossier, GuestSearchResult, WorkspaceCustomSource as CustomSource }

/**
 * Deep research options
 */
export interface ResearchOptions {
  include_sources?: boolean
  max_depth?: number
}

/**
 * Deep research result
 */
export interface ResearchResult {
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
 * Topic suggestion
 */
export interface Topic {
  title: string
  description: string
  category?: string
}

/**
 * Gemini Live connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
export type LiveMode = 'idle' | 'monitor' | 'cohost'

/**
 * Unified Workspace AI interface
 */
export interface UseWorkspaceAI {
  // === Dossier Generation ===
  generateDossier: (
    guestName: string,
    theme?: string,
    customSources?: WorkspaceCustomSource[]
  ) => Promise<Dossier>
  isGeneratingDossier: boolean

  // === Guest Profile Search ===
  searchGuestProfile: (name: string, reference: string) => Promise<GuestSearchResult>
  isSearching: boolean

  // === Topic Suggestions ===
  suggestTrendingGuest: () => Promise<string>
  suggestTrendingTheme: (guestName: string) => Promise<string>
  isSuggesting: boolean

  // === Deep Research (SECURITY FIXED) ===
  deepResearch: (query: string, options?: ResearchOptions) => Promise<ResearchResult>
  isResearching: boolean

  // === Ice Breaker Generation ===
  generateMoreIceBreakers: (
    guestName: string,
    theme: string,
    existing: string[],
    count?: number
  ) => Promise<string[]>
  isGeneratingIceBreakers: boolean

  // === Gemini Live (WebSocket) ===
  // Note: Implementation moved to useGeminiLive for now
  // Will be integrated in future iterations
  liveMode: LiveMode
  connectionStatus: ConnectionStatus

  // === Error Handling ===
  error: Error | null
  clearError: () => void
}

/**
 * Consolidated AI hook for Studio Workspace
 *
 * @example
 * ```tsx
 * function WorkspaceView() {
 *   const ai = useWorkspaceAI()
 *
 *   const handleGenerateDossier = async () => {
 *     const dossier = await ai.generateDossier('Elon Musk', 'Inovação')
 *     log.debug(dossier)
 *   }
 *
 *   const handleDeepResearch = async () => {
 *     const result = await ai.deepResearch('Elon Musk: CEO da Tesla', {
 *       include_sources: true,
 *       max_depth: 3
 *     })
 *     log.debug(result)
 *   }
 * }
 * ```
 */
export function useWorkspaceAI(): UseWorkspaceAI {
  // Initialize secure client (singleton)
  const geminiClient = GeminiClient.getInstance()

  // Loading states (granular for better UX)
  const [isGeneratingDossier, setIsGeneratingDossier] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [isGeneratingIceBreakers, setIsGeneratingIceBreakers] = useState(false)

  // Gemini Live state (placeholder for now)
  const [liveMode, setLiveMode] = useState<LiveMode>('idle')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')

  // Error state
  const [error, setError] = useState<Error | null>(null)

  // Request cancellation ref
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Generate comprehensive dossier for podcast guest
   *
   * Uses: podcastAIService.generateDossier (smart model)
   * Token Usage: ~2000-3000 tokens
   * Latency: ~5-8s
   */
  const generateDossier = useCallback(
    async (
      guestName: string,
      theme?: string,
      customSources?: WorkspaceCustomSource[]
    ): Promise<Dossier> => {
      setIsGeneratingDossier(true)
      setError(null)

      try {
        const dossier = await podcastAIService.generateDossier(
          guestName,
          theme,
          customSources
        )
        return dossier
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate dossier')
        setError(error)
        throw error
      } finally {
        setIsGeneratingDossier(false)
      }
    },
    []
  )

  /**
   * Search for guest profile using intelligent search
   *
   * Uses: podcastAIService.searchGuestProfile (smart model)
   * Token Usage: ~1000-1500 tokens
   * Latency: ~3-5s
   */
  const searchGuestProfile = useCallback(
    async (name: string, reference: string): Promise<GuestSearchResult> => {
      setIsSearching(true)
      setError(null)

      try {
        const result = await podcastAIService.searchGuestProfile(name, reference)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to search guest profile')
        setError(error)
        throw error
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  /**
   * Suggest trending guest for podcast interview
   *
   * Uses: podcastAIService.suggestTrendingGuest (smart model)
   * Token Usage: ~500-800 tokens
   * Latency: ~2-4s
   */
  const suggestTrendingGuest = useCallback(async (): Promise<string> => {
    setIsSuggesting(true)
    setError(null)

    try {
      const suggestion = await podcastAIService.suggestTrendingGuest()
      return suggestion
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to suggest guest')
      setError(error)
      throw error
    } finally {
      setIsSuggesting(false)
    }
  }, [])

  /**
   * Suggest trending theme based on guest name
   *
   * Uses: podcastAIService.suggestTrendingTheme (smart model)
   * Token Usage: ~500-800 tokens
   * Latency: ~2-4s
   */
  const suggestTrendingTheme = useCallback(async (guestName: string): Promise<string> => {
    setIsSuggesting(true)
    setError(null)

    try {
      const theme = await podcastAIService.suggestTrendingTheme(guestName)
      return theme
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to suggest theme')
      setError(error)
      throw error
    } finally {
      setIsSuggesting(false)
    }
  }, [])

  /**
   * Perform deep research on a person
   *
   * SECURITY FIX: Now uses GeminiClient → Edge Function
   * BEFORE: Direct GoogleGenAI instantiation (VULNERABLE)
   * AFTER: Secure backend pattern
   *
   * Uses: deep_research Edge Function (smart model)
   * Token Usage: ~3000-5000 tokens
   * Latency: ~8-12s
   */
  const deepResearch = useCallback(
    async (query: string, options?: ResearchOptions): Promise<ResearchResult> => {
      setIsResearching(true)
      setError(null)

      try {
        log.debug('[useWorkspaceAI] Deep research:', { query, options })

        // SECURE: Use GeminiClient → Edge Function (API key in backend)
        const response = await geminiClient.call({
          action: 'deep_research',
          payload: {
            query,
            include_sources: options?.include_sources ?? true,
            max_depth: options?.max_depth ?? 2
          },
          model: 'smart' // Use smart model for comprehensive research
        })

        // Parse response
        const result: ResearchResult =
          typeof response.result === 'string'
            ? JSON.parse(response.result)
            : response.result

        log.debug('[useWorkspaceAI] Deep research completed:', {
          success: result.success,
          confidence: result.confidence_score,
          quality: result.quality_score
        })

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to perform deep research')
        setError(error)
        log.error('[useWorkspaceAI] Deep research error:', error)

        // Return error result
        return {
          success: false,
          error: error.message
        }
      } finally {
        setIsResearching(false)
      }
    },
    [geminiClient]
  )

  /**
   * Generate more ice breaker questions
   *
   * Uses: podcastAIService.generateMoreIceBreakers (smart model)
   * Token Usage: ~1000-1500 tokens
   * Latency: ~3-5s
   */
  const generateMoreIceBreakers = useCallback(
    async (
      guestName: string,
      theme: string,
      existing: string[],
      count: number = 3
    ): Promise<string[]> => {
      setIsGeneratingIceBreakers(true)
      setError(null)

      try {
        const iceBreakers = await podcastAIService.generateMoreIceBreakers(
          guestName,
          theme,
          existing,
          count
        )
        return iceBreakers
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate ice breakers')
        setError(error)
        throw error
      } finally {
        setIsGeneratingIceBreakers(false)
      }
    },
    []
  )

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Dossier generation
    generateDossier,
    isGeneratingDossier,

    // Guest search
    searchGuestProfile,
    isSearching,

    // Topic suggestions
    suggestTrendingGuest,
    suggestTrendingTheme,
    isSuggesting,

    // Deep research (SECURITY FIXED)
    deepResearch,
    isResearching,

    // Ice breaker generation
    generateMoreIceBreakers,
    isGeneratingIceBreakers,

    // Gemini Live (placeholder)
    liveMode,
    connectionStatus,

    // Error handling
    error,
    clearError
  }
}
