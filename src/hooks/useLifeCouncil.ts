/**
 * useLifeCouncil Hook
 * OpenClaw Adaptation — Life Council (Issue #254)
 *
 * Triggers the Life Council fan-out/fan-in pipeline and displays results.
 * 3 AI personas (Philosopher, Strategist, Bio-Hacker) → Gemini Pro synthesis.
 *
 * @example
 * const { insight, isLoading, runCouncil } = useLifeCouncil()
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useLifeCouncil')

// =============================================================================
// TYPES
// =============================================================================

export type CouncilStatus = 'thriving' | 'balanced' | 'strained' | 'burnout_risk'

export interface CouncilAction {
  action: string
  module: 'journey' | 'atlas' | 'connections' | 'flux'
  priority: 'high' | 'medium'
}

export interface PhilosopherOutput {
  pattern: string
  triggers: string[]
  misalignment: string | null
  reflection: string
}

export interface StrategistOutput {
  completionRate: string
  quadrantFocus: string
  bottlenecks: string[]
  tacticalAdvice: string
}

export interface BiohackerOutput {
  sleepEstimate: string
  activityDistribution: Record<string, number>
  overworkSignals: string[]
  routineAdvice: string
}

export interface CouncilInsight {
  id: string
  insight_date: string
  overall_status: CouncilStatus
  headline: string
  synthesis: string
  actions: CouncilAction[]
  conflicts_resolved: string[]
  philosopher_output: PhilosopherOutput
  strategist_output: StrategistOutput
  biohacker_output: BiohackerOutput
  processing_time_ms: number
  created_at: string
  viewed_at: string | null
}

export interface CouncilMetadata {
  total_tokens: number
  processing_time_ms: number
  models_used: {
    personas: string
    synthesis: string
  }
  data_sources: {
    moments: number
    tasks: number
  }
}

export interface UseLifeCouncilReturn {
  insight: CouncilInsight | null
  isLoading: boolean
  isRunning: boolean
  error: string | null
  metadata: CouncilMetadata | null
  runCouncil: () => Promise<void>
  markViewed: () => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

export function useLifeCouncil(): UseLifeCouncilReturn {
  const [insight, setInsight] = useState<CouncilInsight | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<CouncilMetadata | null>(null)

  // Fetch latest insight on mount
  const fetchLatest = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: rpcError } = await supabase
        .rpc('get_latest_council_insight', { p_user_id: user.id })

      if (rpcError) {
        log.error('Failed to fetch latest insight:', rpcError)
        return
      }

      if (data && data.id) {
        setInsight(data as CouncilInsight)
      }
    } catch (err) {
      log.error('Error fetching insight:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLatest()
  }, [fetchLatest])

  // Run the Life Council (generates new insight)
  const runCouncil = useCallback(async () => {
    setIsRunning(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: fnError } = await supabase.functions.invoke('run-life-council', {
        body: { userId: user.id },
      })

      if (fnError) throw fnError

      if (!data?.success) {
        if (data?.error === 'insufficient_data') {
          setError(data.message || 'Dados insuficientes para gerar insight.')
          return
        }
        throw new Error(data?.error || 'Failed to run council')
      }

      setInsight(data.insight as CouncilInsight)
      setMetadata(data.metadata as CouncilMetadata)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar o Conselho'
      log.error('Council error:', err)
      setError(message)
    } finally {
      setIsRunning(false)
    }
  }, [])

  // Mark insight as viewed
  const markViewed = useCallback(async () => {
    if (!insight?.id) return

    const { error: updateError } = await supabase
      .from('daily_council_insights')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', insight.id)

    if (updateError) {
      log.error('Failed to mark viewed:', updateError)
    } else {
      setInsight(prev => prev ? { ...prev, viewed_at: new Date().toISOString() } : null)
    }
  }, [insight?.id])

  return {
    insight,
    isLoading,
    isRunning,
    error,
    metadata,
    runCouncil,
    markViewed,
  }
}
