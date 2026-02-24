/**
 * useModulePulseData - Fetches summary pulse data for each AICA module.
 *
 * Uses count queries for efficiency and a 5-minute cache to avoid
 * repeated calls on re-renders.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export interface ModulePulseItem {
  key: string
  emoji: string
  label: string
  route: string
  count: number
  progress?: number // 0-1, optional visual bar
}

interface PulseCache {
  data: ModulePulseItem[]
  timestamp: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function useModulePulseData() {
  const { user } = useAuth()
  const [pulses, setPulses] = useState<ModulePulseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const cacheRef = useRef<PulseCache | null>(null)

  const fetchPulses = useCallback(async () => {
    if (!user?.id) {
      setPulses([])
      setIsLoading(false)
      return
    }

    // Check cache
    if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_TTL_MS) {
      setPulses(cacheRef.current.data)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // Get current date boundaries
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Get current ISO week boundaries
      const dayOfWeek = now.getDay() || 7 // 1=Mon..7=Sun
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - dayOfWeek + 1)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString()

      // Fire all queries in parallel
      const [fluxRes, journeyRes, financeRes, atlasRes, studioRes] = await Promise.all([
        // Flux: workout_slots created this week
        supabase
          .from('workout_slots')
          .select('*', { head: true, count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', weekStartStr),

        // Journey: moments today
        supabase
          .from('moments')
          .select('*', { head: true, count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', todayStart),

        // Finance: transactions this month (count)
        supabase
          .from('finance_transactions')
          .select('*', { head: true, count: 'exact' })
          .eq('user_id', user.id)
          .gte('transaction_date', monthStart.split('T')[0]),

        // Atlas: open work_items
        supabase
          .from('work_items')
          .select('*', { head: true, count: 'exact' })
          .eq('user_id', user.id)
          .neq('status', 'completed'),

        // Studio: episodes in draft/recording
        supabase
          .from('podcast_episodes')
          .select('*', { head: true, count: 'exact' })
          .eq('user_id', user.id)
          .in('status', ['draft', 'recording']),
      ])

      const items: ModulePulseItem[] = []

      const fluxCount = fluxRes.count ?? 0
      if (fluxCount > 0) {
        items.push({
          key: 'flux',
          emoji: '🏋️',
          label: `${fluxCount} treino${fluxCount > 1 ? 's' : ''} esta semana`,
          route: '/flux',
          count: fluxCount,
        })
      }

      const journeyCount = journeyRes.count ?? 0
      if (journeyCount > 0) {
        items.push({
          key: 'journey',
          emoji: '✨',
          label: `${journeyCount} momento${journeyCount > 1 ? 's' : ''} hoje`,
          route: '/',
          count: journeyCount,
        })
      }

      const financeCount = financeRes.count ?? 0
      if (financeCount > 0) {
        items.push({
          key: 'finance',
          emoji: '💰',
          label: `${financeCount} transaç${financeCount > 1 ? 'ões' : 'ão'} este mês`,
          route: '/finance',
          count: financeCount,
        })
      }

      const atlasCount = atlasRes.count ?? 0
      if (atlasCount > 0) {
        items.push({
          key: 'atlas',
          emoji: '📋',
          label: `${atlasCount} tarefa${atlasCount > 1 ? 's' : ''} aberta${atlasCount > 1 ? 's' : ''}`,
          route: '/',
          count: atlasCount,
        })
      }

      const studioCount = studioRes.count ?? 0
      if (studioCount > 0) {
        items.push({
          key: 'studio',
          emoji: '🎙️',
          label: `${studioCount} episódio${studioCount > 1 ? 's' : ''} em preparo`,
          route: '/studio',
          count: studioCount,
        })
      }

      cacheRef.current = { data: items, timestamp: Date.now() }
      setPulses(items)
    } catch {
      // Silently fail — pulse is informational only
      setPulses([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchPulses()
  }, [fetchPulses])

  return { pulses, isLoading }
}
