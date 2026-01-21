/**
 * useConsciousnessPoints Hook
 * React hook for managing Consciousness Points (CP) and gamification
 */

import { useState, useEffect, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'

const log = createNamespacedLogger('useConsciousnessPoints')
import {
  UserConsciousnessStats,
  ConsciousnessPointsLog,
  getProgressToNextLevel,
} from '../types/consciousnessPoints'
import {
  getUserConsciousnessStats,
  getCPLog,
  getUserProgress,
  getRecentAchievements,
} from '../services/consciousnessPointsService'

/**
 * useConsciousnessPoints Hook
 * Main hook for CP stats and progress
 */
export function useConsciousnessPoints() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserConsciousnessStats | null>(null)
  const [progress, setProgress] = useState<ReturnType<typeof getProgressToNextLevel> | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      // Reset to safe defaults when user is null/undefined
      setStats(null)
      setProgress(null)
      setError(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const data = await getUserProgress(user.id)
      setStats(data.stats)
      setProgress(data.progress)
    } catch (err) {
      const error = err as Error
      setError(error)
      // Reset to safe defaults on error
      setStats(null)
      setProgress(null)
      log.error('Error fetching CP stats:', error)
    } finally {
      // ALWAYS set loading to false
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchStats()
    }
  }, [user?.id, fetchStats])

  return {
    stats,
    progress,
    isLoading,
    error,
    refresh: fetchStats,
  }
}

/**
 * useCPLog Hook
 * Hook for viewing CP transaction log
 */
export function useCPLog(limit: number = 50) {
  const { user } = useAuth()
  const [log, setLog] = useState<ConsciousnessPointsLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLog = useCallback(async () => {
    if (!user?.id) {
      // Reset to safe defaults when user is null/undefined
      setLog([])
      setError(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const fetchedLog = await getCPLog(user.id, limit)
      setLog(fetchedLog)
    } catch (err) {
      const error = err as Error
      setError(error)
      // Reset to safe defaults on error
      setLog([])
      log.error('Error fetching CP log:', error)
    } finally {
      // ALWAYS set loading to false
      setIsLoading(false)
    }
  }, [user?.id, limit])

  useEffect(() => {
    if (user?.id) {
      fetchLog()
    }
  }, [user?.id, fetchLog])

  return {
    log,
    isLoading,
    error,
    refresh: fetchLog,
  }
}

/**
 * useAchievements Hook
 * Hook for viewing recent achievements
 */
export function useAchievements() {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState<{
    level_ups: { level: number; level_name: string; achieved_at: string }[]
    streaks: { streak: number; achieved_at: string }[]
  }>({ level_ups: [], streaks: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAchievements = useCallback(async () => {
    if (!user?.id) {
      // Reset to safe defaults when user is null/undefined
      setAchievements({ level_ups: [], streaks: [] })
      setError(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const fetchedAchievements = await getRecentAchievements(user.id)
      setAchievements(fetchedAchievements)
    } catch (err) {
      const error = err as Error
      setError(error)
      // Reset to safe defaults on error
      setAchievements({ level_ups: [], streaks: [] })
      log.error('Error fetching achievements:', error)
    } finally {
      // ALWAYS set loading to false
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchAchievements()
    }
  }, [user?.id, fetchAchievements])

  return {
    achievements,
    isLoading,
    error,
    refresh: fetchAchievements,
  }
}

/**
 * useCPAnimation Hook
 * Hook for animating CP changes with level-up detection
 */
export function useCPAnimation() {
  const [showAnimation, setShowAnimation] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [leveledUp, setLeveledUp] = useState(false)
  const [newLevel, setNewLevel] = useState<{ level: number; name: string } | null>(null)

  const triggerAnimation = useCallback(
    (points: number, didLevelUp: boolean = false, level?: { level: number; name: string }) => {
      setPointsEarned(points)
      setLeveledUp(didLevelUp)
      setNewLevel(level || null)
      setShowAnimation(true)

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowAnimation(false)
      }, 3000)
    },
    []
  )

  return {
    showAnimation,
    pointsEarned,
    leveledUp,
    newLevel,
    triggerAnimation,
  }
}
