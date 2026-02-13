/**
 * useUserPatterns Hook
 * OpenClaw Adaptation — Living User Dossier (Issue #255)
 *
 * Fetches user behavioral patterns and triggers weekly synthesis.
 * Patterns have confidence scoring, evidence tracking, and vector embeddings.
 *
 * @example
 * const { patterns, isSynthesizing, synthesize } = useUserPatterns()
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useUserPatterns')

// =============================================================================
// TYPES
// =============================================================================

export type PatternType =
  | 'productivity'
  | 'emotional'
  | 'routine'
  | 'social'
  | 'health'
  | 'learning'
  | 'trigger'
  | 'strength'

export interface UserPattern {
  id: string
  pattern_type: PatternType
  pattern_key: string
  description: string
  confidence_score: number
  times_observed: number
  evidence: string[]
  first_observed_at: string
  last_confirmed_at: string
}

export interface SynthesisResult {
  patterns_updated: number
  patterns_created: number
  patterns_deactivated: number
  council_insights_analyzed: number
  existing_patterns_count: number
}

export interface UseUserPatternsReturn {
  patterns: UserPattern[]
  isLoading: boolean
  isSynthesizing: boolean
  error: string | null
  synthesisResult: SynthesisResult | null
  synthesize: () => Promise<void>
  refresh: () => Promise<void>
  getByType: (type: PatternType) => UserPattern[]
  highConfidence: UserPattern[]
}

// =============================================================================
// HOOK
// =============================================================================

export function useUserPatterns(): UseUserPatternsReturn {
  const [patterns, setPatterns] = useState<UserPattern[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null)

  // Fetch all active patterns
  const fetchPatterns = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: rpcError } = await supabase
        .rpc('get_user_patterns_summary', { p_user_id: user.id })

      if (rpcError) {
        log.error('Failed to fetch patterns:', rpcError)
        setError('Erro ao carregar padrões')
        return
      }

      setPatterns((data || []) as UserPattern[])
    } catch (err) {
      log.error('Error fetching patterns:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatterns()
  }, [fetchPatterns])

  // Trigger weekly synthesis
  const synthesize = useCallback(async () => {
    setIsSynthesizing(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: fnError } = await supabase.functions.invoke('synthesize-user-patterns', {
        body: { userId: user.id },
      })

      if (fnError) throw fnError

      if (!data?.success) {
        if (data?.error === 'insufficient_data') {
          setError(data.message || 'Dados insuficientes para síntese.')
          return
        }
        throw new Error(data?.error || 'Failed to synthesize')
      }

      setSynthesisResult(data.summary as SynthesisResult)

      // Refresh patterns after synthesis
      await fetchPatterns()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na síntese'
      log.error('Synthesis error:', err)
      setError(message)
    } finally {
      setIsSynthesizing(false)
    }
  }, [fetchPatterns])

  // Filter by type
  const getByType = useCallback(
    (type: PatternType) => patterns.filter(p => p.pattern_type === type),
    [patterns]
  )

  // High confidence patterns (>= 0.70)
  const highConfidence = patterns.filter(p => p.confidence_score >= 0.70)

  return {
    patterns,
    isLoading,
    isSynthesizing,
    error,
    synthesisResult,
    synthesize,
    refresh: fetchPatterns,
    getByType,
    highConfidence,
  }
}
