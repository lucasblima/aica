/**
 * React hook for Gemini Context Caching
 *
 * Provides easy access to context cache operations:
 * - Get or create a cache for the current user
 * - View cache statistics (tokens saved, hits, cost savings)
 * - Invalidate or refresh the cache
 *
 * Token Savings:
 * - Context caching can reduce token costs by up to 90%
 * - User profile (user_memory) and system instructions are cached
 * - Cache TTL is 1 hour by default
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     getOrCreateCache,
 *     getCacheStats,
 *     invalidateCache,
 *     refreshCache,
 *     isLoading,
 *     error,
 *     stats
 *   } = useContextCache()
 *
 *   // Get or create cache
 *   const cacheName = await getOrCreateCache({
 *     systemInstruction: "You are Aica..."
 *   })
 *
 *   // View stats
 *   await getCacheStats()
 *   console.log(`Tokens saved: ${stats?.totalTokensSaved}`)
 * }
 * ```
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useContextCache')

// Edge Function URL
const CONTEXT_CACHE_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/context-cache`
  : 'http://localhost:54321/functions/v1/context-cache'

// ============================================================================
// TYPES
// ============================================================================

export interface CacheStats {
  cacheName: string | null
  cachedTokens: number
  totalTokensSaved: number
  cacheHits: number
  createdAt: string | null
  expiresAt: string | null
  isActive: boolean
  savingsPercentage: number
  estimatedCostSavingsUsd: number
}

export interface GetOrCreateCacheOptions {
  systemInstruction: string
  extraContext?: string
  ttlSeconds?: number
}

export interface CacheResult {
  cacheName: string | null
  fromCache: boolean
  tokenCount: number
}

// ============================================================================
// HOOK
// ============================================================================

export function useContextCache() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CacheStats | null>(null)

  /**
   * Make authenticated request to context-cache Edge Function
   */
  const makeRequest = useCallback(async (
    action: string,
    payload: Record<string, unknown> = {}
  ): Promise<unknown> => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('User not authenticated')
    }

    const response = await fetch(CONTEXT_CACHE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ action, ...payload })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Request failed')
    }

    return data.result
  }, [])

  /**
   * Get or create a context cache for the current user.
   * Returns the cache name to use in Gemini API calls.
   *
   * @param options - Cache options including system instruction
   * @returns Cache result with name and token count
   */
  const getOrCreateCache = useCallback(async (
    options: GetOrCreateCacheOptions
  ): Promise<CacheResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await makeRequest('get_or_create', {
        system_instruction: options.systemInstruction,
        extra_context: options.extraContext,
        ttl_seconds: options.ttlSeconds
      }) as {
        cache_name: string | null
        from_cache: boolean
        token_count: number
      }

      log.info(`Cache ${result.from_cache ? 'hit' : 'created'}: ${result.token_count} tokens`)

      return {
        cacheName: result.cache_name,
        fromCache: result.from_cache,
        tokenCount: result.token_count
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get cache'
      setError(message)
      log.error('getOrCreateCache failed:', message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [makeRequest])

  /**
   * Get cache statistics including tokens saved and cost savings.
   * Updates the stats state with the result.
   *
   * @returns Cache statistics
   */
  const getCacheStats = useCallback(async (): Promise<CacheStats | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await makeRequest('get_stats') as {
        cache_name: string | null
        cached_tokens: number
        total_tokens_saved: number
        cache_hits: number
        created_at: string | null
        expires_at: string | null
        is_active: boolean
        savings_percentage: number
        estimated_cost_savings_usd: number
      }

      const cacheStats: CacheStats = {
        cacheName: result.cache_name,
        cachedTokens: result.cached_tokens,
        totalTokensSaved: result.total_tokens_saved,
        cacheHits: result.cache_hits,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        isActive: result.is_active,
        savingsPercentage: result.savings_percentage,
        estimatedCostSavingsUsd: result.estimated_cost_savings_usd
      }

      setStats(cacheStats)
      return cacheStats
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get stats'
      setError(message)
      log.error('getCacheStats failed:', message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [makeRequest])

  /**
   * Invalidate (delete) the current user's cache.
   * Use this when user preferences change significantly.
   *
   * @returns True if cache was invalidated
   */
  const invalidateCache = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await makeRequest('invalidate') as { invalidated: boolean }
      if (result.invalidated) {
        setStats(null)
        log.info('Cache invalidated')
      }
      return result.invalidated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to invalidate cache'
      setError(message)
      log.error('invalidateCache failed:', message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [makeRequest])

  /**
   * Force refresh the cache with new content.
   * Invalidates the existing cache and creates a new one.
   *
   * @param options - Cache options including system instruction
   * @returns New cache result
   */
  const refreshCache = useCallback(async (
    options: GetOrCreateCacheOptions
  ): Promise<CacheResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await makeRequest('refresh', {
        system_instruction: options.systemInstruction,
        extra_context: options.extraContext,
        ttl_seconds: options.ttlSeconds
      }) as {
        cache_name: string | null
        refreshed: boolean
        token_count: number
      }

      log.info(`Cache refreshed: ${result.token_count} tokens`)

      return {
        cacheName: result.cache_name,
        fromCache: false,
        tokenCount: result.token_count
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh cache'
      setError(message)
      log.error('refreshCache failed:', message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [makeRequest])

  return {
    // Actions
    getOrCreateCache,
    getCacheStats,
    invalidateCache,
    refreshCache,

    // State
    isLoading,
    error,
    stats
  }
}

// ============================================================================
// DEFAULT SYSTEM INSTRUCTION
// ============================================================================

/**
 * Default system instruction for Aica coordinator.
 * Use this when creating a cache for general Aica interactions.
 */
export const AICA_COORDINATOR_INSTRUCTION = `Voce e a Aica, assistente pessoal integrada ao Aica Life OS.
Voce ajuda o usuario em diferentes areas da vida com empatia e objetividade.

## Regras Gerais
- Responda SEMPRE em portugues brasileiro
- Seja concisa e objetiva (max 300 palavras)
- Nunca invente dados - use apenas informacoes fornecidas
- Sugira proximos passos quando apropriado
- Respeite as preferencias do usuario no perfil

## Areas de Atuacao
1. **Atlas**: Tarefas, produtividade, prioridades, Matriz de Eisenhower
2. **Captacao**: Editais de fomento, FAPERJ, FINEP, CNPq
3. **Studio**: Producao de podcasts, convidados, pautas
4. **Journey**: Sentimentos, emocoes, reflexoes, autoconhecimento
5. **Finance**: Gastos, orcamento, economia
6. **Connections**: Contatos, networking, relacionamentos`
