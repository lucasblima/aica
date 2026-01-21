/**
 * Unified Timeline Hook
 * Manages state, filtering, pagination, and data fetching for timeline
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import {
  UnifiedEvent,
  TimelineFilters,
  TimelineStats,
  DEFAULT_TIMELINE_FILTERS,
} from '../types/unifiedEvent'
import {
  fetchUnifiedTimelineEvents,
  fetchTimelineStats,
} from '../services/unifiedTimelineService'

const log = createNamespacedLogger('useUnifiedTimeline')
const PAGE_SIZE = 20

export interface UseUnifiedTimelineResult {
  events: UnifiedEvent[]
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  total: number
  filters: TimelineFilters
  setFilters: (filters: TimelineFilters) => void
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Main hook for unified timeline
 */
export function useUnifiedTimeline(userId?: string): UseUnifiedTimelineResult {
  const [events, setEvents] = useState<UnifiedEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [filters, setFiltersState] = useState<TimelineFilters>(DEFAULT_TIMELINE_FILTERS)

  const hasMore = events.length < total

  /**
   * Fetch events with current filters
   */
  const fetchEvents = useCallback(
    async (currentOffset: number, append: boolean = false) => {
      if (!userId) {
        setEvents([])
        setTotal(0)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchUnifiedTimelineEvents(userId, filters, PAGE_SIZE, currentOffset)

        if (append) {
          setEvents((prev) => {
            // Deduplicate by ID
            const existingIds = new Set(prev.map((e) => e.id))
            const newEvents = result.events.filter((e) => !existingIds.has(e.id))
            return [...prev, ...newEvents]
          })
        } else {
          setEvents(result.events)
        }
        setTotal(result.total)
      } catch (err) {
        log.error('[useUnifiedTimeline] Fetch error:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch timeline events'))
      } finally {
        setIsLoading(false)
      }
    },
    [userId, filters]
  )

  /**
   * Initial load and filter changes
   */
  useEffect(() => {
    setOffset(0)
    fetchEvents(0, false)
  }, [fetchEvents])

  /**
   * Load more events (pagination)
   */
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    await fetchEvents(newOffset, true)
  }, [isLoading, hasMore, offset, fetchEvents])

  /**
   * Refresh timeline (reset and reload)
   */
  const refresh = useCallback(async () => {
    setOffset(0)
    await fetchEvents(0, false)
  }, [fetchEvents])

  /**
   * Update filters (resets pagination)
   */
  const setFilters = useCallback((newFilters: TimelineFilters) => {
    setFiltersState(newFilters)
    setOffset(0)
    // fetchEvents will be called by useEffect due to filter dependency
  }, [])

  return {
    events,
    isLoading,
    error,
    hasMore,
    total,
    filters,
    setFilters,
    loadMore,
    refresh,
  }
}

/**
 * Hook for timeline statistics
 */
export interface UseTimelineStatsResult {
  stats: TimelineStats | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useTimelineStats(
  userId?: string,
  dateRange: TimelineFilters['dateRange'] = 'last30'
): UseTimelineStatsResult {
  const [stats, setStats] = useState<TimelineStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setStats(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchTimelineStats(userId, dateRange)
      setStats(result)
    } catch (err) {
      log.error('[useTimelineStats] Fetch error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch timeline stats'))
    } finally {
      setIsLoading(false)
    }
  }, [userId, dateRange])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refresh = useCallback(async () => {
    await fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refresh,
  }
}
