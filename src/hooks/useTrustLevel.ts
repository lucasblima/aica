/**
 * useTrustLevel Hook
 *
 * Fetches user engagement stats from Supabase and calculates the
 * progressive trust level using the trustLevel domain module.
 *
 * Returns the current trust level, label, progress toward the next level,
 * and the raw stats used for the calculation.
 *
 * @example
 * const { trustLevel, label, progress, isLoading } = useTrustLevel()
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/services/supabaseClient'
import { getCachedUser } from '@/services/authCacheService'
import {
  calculateTrustLevel,
  getTrustProgress,
  getTrustLevelLabel,
  type TrustLevel,
  type UserStats,
} from '@/lib/agents/trustLevel'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useTrustLevel')

export interface UseTrustLevelReturn {
  trustLevel: TrustLevel
  label: string
  progress: number
  nextLevel: TrustLevel | null
  stats: UserStats
  isLoading: boolean
}

const DEFAULT_STATS: UserStats = {
  totalMoments: 0,
  totalTasks: 0,
  daysActive: 0,
  modulesUsed: 0,
}

export function useTrustLevel(): UseTrustLevelReturn {
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const { user, error: authError } = await getCachedUser()
      if (authError || !user) {
        log.warn('Not authenticated, using default stats')
        return
      }

      // Parallel queries for engagement stats
      const [momentsResult, tasksResult] = await Promise.all([
        supabase
          .from('moments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      const totalMoments = momentsResult.count ?? 0
      const totalTasks = tasksResult.count ?? 0

      // Days active: count real interaction days via RPC
      let daysActive = 0
      try {
        const { data } = await supabase.rpc('count_days_with_activity', {
          p_user_id: user.id,
        })
        if (typeof data === 'number') daysActive = data
      } catch {
        // RPC may not exist yet, fallback to account age
        const createdAt = user.created_at ? new Date(user.created_at) : new Date()
        daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Modules used: count tables that have at least one row for this user
      let modulesUsed = 0
      const moduleTables = [
        'moments',          // Journey
        'work_items',       // Atlas
        'finance_transactions', // Finance
        'podcast_episodes', // Studio
        'workout_blocks',   // Flux
        'calendar_events',  // Agenda
      ]
      const moduleChecks = await Promise.all(
        moduleTables.map(table =>
          Promise.resolve(
            supabase
              .from(table)
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
          ).then(({ count }) => (count ?? 0) > 0 ? 1 : 0)
            .catch(() => 0 as 0 | 1)
        )
      )
      modulesUsed = moduleChecks.reduce((sum, v) => sum + v, 0)

      setStats({
        totalMoments,
        totalTasks,
        daysActive,
        modulesUsed,
      })
    } catch (err) {
      log.error('Failed to fetch trust level stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const trustLevel = useMemo(() => calculateTrustLevel(stats), [stats])
  const label = useMemo(() => getTrustLevelLabel(trustLevel), [trustLevel])
  const { nextLevel, progress } = useMemo(() => getTrustProgress(stats), [stats])

  return {
    trustLevel,
    label,
    progress,
    nextLevel,
    stats,
    isLoading,
  }
}
