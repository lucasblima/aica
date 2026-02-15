/**
 * useUserStats - Fetches user engagement stats for trust level calculation
 *
 * Queries module tables in parallel to determine how much the user
 * has engaged with the system. Stats are fetched once on mount.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import type { UserStats } from '@/lib/agents/trustLevel'

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const userId = session.user.id
      const createdAt = new Date(session.user.created_at)
      const daysActive = Math.max(1, Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ))

      const [moments, tasks, patterns, finances, athletes, connections, podcasts, grants] =
        await Promise.all([
          supabase.from('moments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('work_items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('user_patterns').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('finance_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('athletes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('connection_spaces').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
          supabase.from('podcast_shows').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('grant_projects').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        ])

      const modulesUsed = [
        (moments.count || 0) > 0,       // journey
        (tasks.count || 0) > 0,          // atlas
        (finances.count || 0) > 0,       // finance
        (athletes.count || 0) > 0,       // flux
        (connections.count || 0) > 0,    // connections
        (podcasts.count || 0) > 0,       // studio
        (grants.count || 0) > 0,         // captacao
      ].filter(Boolean).length

      setStats({
        totalMoments: moments.count || 0,
        totalTasks: tasks.count || 0,
        daysActive,
        modulesUsed,
        patternsCount: patterns.count || 0,
      })
    } catch {
      // Silently fail — trust level defaults to suggest_confirm
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, refetch: fetchStats }
}
