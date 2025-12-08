/**
 * useWeeklySummary Hook
 * React hook for managing weekly summaries
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { WeeklySummary, WeeklySummaryWithReflection } from '../types/weeklySummary'
import {
  getCurrentWeeklySummary,
  getWeeklySummary,
  getAllWeeklySummaries,
  generateWeeklySummary,
  addReflectionToSummary,
  markSummaryAsViewed,
} from '../services/weeklySummaryService'

/**
 * useCurrentWeeklySummary Hook
 * Hook for managing current week's summary
 */
export function useCurrentWeeklySummary() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch current week summary
  const fetchSummary = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedSummary = await getCurrentWeeklySummary(user.id)
      setSummary(fetchedSummary)

      // Mark as viewed
      if (fetchedSummary && !fetchedSummary.viewed_at) {
        await markSummaryAsViewed(user.id, fetchedSummary.id)
      }
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching current summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Generate summary manually
  const generate = useCallback(async (): Promise<WeeklySummary> => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      setIsGenerating(true)
      setError(null)

      const newSummary = await generateWeeklySummary(
        user.id,
        new Date().getFullYear(),
        Math.ceil(new Date().getDate() / 7)
      )

      setSummary(newSummary)
      return newSummary
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [user?.id])

  // Add reflection
  const addReflection = useCallback(
    async (reflection: string): Promise<WeeklySummaryWithReflection> => {
      if (!user?.id || !summary) throw new Error('No summary available')

      try {
        setIsLoading(true)
        setError(null)

        const updatedSummary = await addReflectionToSummary(
          user.id,
          summary.id,
          reflection
        )

        setSummary(updatedSummary)
        return updatedSummary
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id, summary]
  )

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id) {
      fetchSummary()
    }
  }, [user?.id, fetchSummary])

  return {
    summary,
    isLoading,
    isGenerating,
    error,
    generate,
    addReflection,
    refresh: fetchSummary,
  }
}

/**
 * useWeeklySummaries Hook
 * Hook for managing all weekly summaries
 */
export function useWeeklySummaries(limit: number = 20) {
  const { user } = useAuth()
  const [summaries, setSummaries] = useState<WeeklySummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSummaries = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedSummaries = await getAllWeeklySummaries(user.id, limit)
      setSummaries(fetchedSummaries)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching summaries:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, limit])

  useEffect(() => {
    if (user?.id) {
      fetchSummaries()
    }
  }, [user?.id, fetchSummaries])

  return {
    summaries,
    isLoading,
    error,
    refresh: fetchSummaries,
  }
}

/**
 * useSpecificWeeklySummary Hook
 * Hook for managing a specific week's summary
 */
export function useSpecificWeeklySummary(year: number, weekNumber: number) {
  const { user } = useAuth()
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedSummary = await getWeeklySummary(user.id, year, weekNumber)
      setSummary(fetchedSummary)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, year, weekNumber])

  useEffect(() => {
    if (user?.id) {
      fetchSummary()
    }
  }, [user?.id, fetchSummary])

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary,
  }
}
