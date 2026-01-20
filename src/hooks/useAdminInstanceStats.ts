/**
 * useAdminInstanceStats Hook
 *
 * Fetches and subscribes to WhatsApp instance statistics for admin dashboard.
 * Includes real-time updates via Supabase Realtime.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/services/supabaseClient'
import {
  getAdminInstanceStats,
  getAdminInstances,
  getAdminRecentErrors,
  generateHealthAlerts,
} from '@/services/adminWhatsAppService'
import type {
  AdminInstanceStats,
  AdminInstanceRow,
  AdminErrorEntry,
  AdminHealthAlert,
  AdminInstanceFilters,
} from '@/types/adminWhatsApp'

interface UseAdminInstanceStatsReturn {
  /** Aggregated statistics */
  stats: AdminInstanceStats | null
  /** All instances */
  instances: AdminInstanceRow[]
  /** Recent errors */
  recentErrors: AdminErrorEntry[]
  /** Generated health alerts */
  alerts: AdminHealthAlert[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refresh all data */
  refresh: () => Promise<void>
  /** Apply filters to instances */
  applyFilters: (filters: AdminInstanceFilters) => Promise<void>
  /** Current filters */
  filters: AdminInstanceFilters
}

const REFRESH_INTERVAL_MS = 30000 // 30 seconds

export function useAdminInstanceStats(): UseAdminInstanceStatsReturn {
  const [stats, setStats] = useState<AdminInstanceStats | null>(null)
  const [instances, setInstances] = useState<AdminInstanceRow[]>([])
  const [recentErrors, setRecentErrors] = useState<AdminErrorEntry[]>([])
  const [alerts, setAlerts] = useState<AdminHealthAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<AdminInstanceFilters>({})

  const channelRef = useRef<RealtimeChannel | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch all data
  const fetchData = useCallback(async (currentFilters: AdminInstanceFilters = {}) => {
    try {
      setError(null)

      // Fetch all data in parallel
      const [statsData, instancesData, errorsData] = await Promise.all([
        getAdminInstanceStats(),
        getAdminInstances(currentFilters),
        getAdminRecentErrors(50),
      ])

      setStats(statsData)
      setInstances(instancesData)
      setRecentErrors(errorsData)

      // Generate alerts based on current data
      const generatedAlerts = generateHealthAlerts(statsData, instancesData)
      setAlerts(generatedAlerts)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error')
      setError(errorObj)
      console.error('[useAdminInstanceStats] Fetch error:', errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData(filters)
  }, [fetchData, filters])

  // Set up real-time subscription for live updates
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Subscribe to all whatsapp_sessions changes
        channelRef.current = supabase
          .channel('admin_whatsapp_sessions')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whatsapp_sessions',
            },
            (payload) => {
              console.log('[useAdminInstanceStats] Real-time update:', payload.eventType)
              // Refresh data on any change
              fetchData(filters)
            }
          )
          .subscribe((status) => {
            console.log('[useAdminInstanceStats] Subscription status:', status)
          })
      } catch (err) {
        console.error('[useAdminInstanceStats] Subscription error:', err)
      }
    }

    setupSubscription()

    // Set up auto-refresh interval
    refreshIntervalRef.current = setInterval(() => {
      fetchData(filters)
    }, REFRESH_INTERVAL_MS)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [fetchData, filters])

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchData(filters)
  }, [fetchData, filters])

  // Apply filters
  const applyFilters = useCallback(async (newFilters: AdminInstanceFilters) => {
    setFilters(newFilters)
    setIsLoading(true)
    await fetchData(newFilters)
  }, [fetchData])

  return {
    stats,
    instances,
    recentErrors,
    alerts,
    isLoading,
    error,
    refresh,
    applyFilters,
    filters,
  }
}

export default useAdminInstanceStats
