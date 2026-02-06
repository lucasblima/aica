/**
 * useWhatsAppSessionSubscription Hook
 *
 * Real-time subscription to whatsapp_sessions table changes via Supabase Realtime.
 * Monitors connection status, profile updates, and disconnections.
 *
 * @example
 * const { session, isConnected, status, error } = useWhatsAppSessionSubscription()
 *
 * Issue: #89 - Real-time Status Hook
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/services/supabaseClient'
import type { WhatsAppSession, WhatsAppSessionStatus } from '@/types/whatsappSession'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('WhatsAppSession')

interface UseWhatsAppSessionSubscriptionReturn {
  /** Current session data */
  session: WhatsAppSession | null
  /** Loading state for initial fetch */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Whether user is connected (status === 'connected') */
  isConnected: boolean
  /** Current connection status */
  status: WhatsAppSessionStatus | null
  /** Manually refresh session data */
  refresh: () => Promise<void>
}

export function useWhatsAppSessionSubscription(): UseWhatsAppSessionSubscriptionReturn {
  const [session, setSession] = useState<WhatsAppSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasInitiallyLoaded = useRef(false)

  // Fetch session data (used for both initial load and refresh)
  const fetchSession = useCallback(async () => {
    try {
      // Only show loading spinner on initial fetch, not on refresh
      if (!hasInitiallyLoaded.current) {
        setIsLoading(true)
      }
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error: fetchError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) {
        throw fetchError
      }

      setSession(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error fetching session')
      setError(error)
      log.error('[useWhatsAppSessionSubscription] Fetch error:', error)
    } finally {
      hasInitiallyLoaded.current = true
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Set up real-time subscription
  // Issue #196: Use ref + cancelled flag to handle React Strict Mode cleanup race
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let cancelled = false

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          log.warn('[useWhatsAppSessionSubscription] No user for subscription')
          return
        }

        // If cleanup already ran while we were awaiting, don't subscribe
        if (cancelled) return

        log.debug('[useWhatsAppSessionSubscription] Setting up subscription for user:', user.id)

        const channel = supabase
          .channel(`whatsapp_sessions_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whatsapp_sessions',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              log.debug('[useWhatsAppSessionSubscription] Change detected:', payload)

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                setSession(payload.new as WhatsAppSession)
              } else if (payload.eventType === 'DELETE') {
                setSession(null)
              }
            }
          )
          .subscribe((status) => {
            log.debug('[useWhatsAppSessionSubscription] Subscription status:', status)
          })

        // Store in ref so cleanup always has the latest channel
        channelRef.current = channel

        // If cleanup ran while we were subscribing, remove immediately
        if (cancelled) {
          supabase.removeChannel(channel)
          channelRef.current = null
        }
      } catch (err) {
        log.error('[useWhatsAppSessionSubscription] Subscription setup error:', err)
      }
    }

    setupSubscription()

    return () => {
      cancelled = true
      if (channelRef.current) {
        log.debug('[useWhatsAppSessionSubscription] Cleaning up subscription')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  return {
    session,
    isLoading,
    error,
    isConnected: session?.status === 'connected',
    status: session?.status ?? null,
    refresh: fetchSession,
  }
}

export default useWhatsAppSessionSubscription
