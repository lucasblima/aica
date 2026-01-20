/**
 * useUserCredits Hook
 *
 * Manages user credit balance for the "Process with Aica" feature.
 * Provides:
 * - Current balance
 * - Lifetime stats
 * - Daily claim functionality
 * - Real-time balance updates
 *
 * @example
 * const { balance, claimDaily, canClaimDaily, refreshBalance } = useUserCredits()
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

interface UserCredits {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  lastDailyClaim: string | null
}

interface ClaimResult {
  success: boolean
  creditsEarned: number
  newBalance: number
  message: string
  nextClaimAt?: string
}

interface UseUserCreditsReturn {
  /** Current credit balance */
  balance: number
  /** Total credits earned lifetime */
  lifetimeEarned: number
  /** Total credits spent lifetime */
  lifetimeSpent: number
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Whether user can claim daily credits */
  canClaimDaily: boolean
  /** Claim daily credits */
  claimDaily: () => Promise<ClaimResult>
  /** Refresh balance from database */
  refreshBalance: () => Promise<void>
  /** Spend credits (for external use) */
  spendCredits: (amount: number, referenceId: string, referenceType: string) => Promise<boolean>
}

export function useUserCredits(): UseUserCreditsReturn {
  const { user } = useAuth()
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch credits from database
   */
  const fetchCredits = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('user_credits')
        .select('balance, lifetime_earned, lifetime_spent, last_daily_claim')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        // If no record exists, it will be created by trigger or we create it
        if (fetchError.code === 'PGRST116') {
          // Create default credits
          const { data: newData, error: insertError } = await supabase
            .from('user_credits')
            .insert({
              user_id: user.id,
              balance: 50,
              lifetime_earned: 50,
              lifetime_spent: 0
            })
            .select()
            .single()

          if (!insertError && newData) {
            setCredits({
              balance: newData.balance,
              lifetimeEarned: newData.lifetime_earned,
              lifetimeSpent: newData.lifetime_spent,
              lastDailyClaim: newData.last_daily_claim
            })
          } else {
            // Default values if insert fails (RLS may prevent it)
            setCredits({
              balance: 50,
              lifetimeEarned: 50,
              lifetimeSpent: 0,
              lastDailyClaim: null
            })
          }
        } else {
          throw fetchError
        }
      } else if (data) {
        setCredits({
          balance: data.balance,
          lifetimeEarned: data.lifetime_earned,
          lifetimeSpent: data.lifetime_spent,
          lastDailyClaim: data.last_daily_claim
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load credits'
      setError(message)
      console.error('[useUserCredits] Error:', message)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  /**
   * Check if user can claim daily credits
   */
  const canClaimDaily = useCallback((): boolean => {
    if (!credits?.lastDailyClaim) return true

    const lastClaim = new Date(credits.lastDailyClaim)
    const now = new Date()

    // Compare dates (ignoring time)
    return lastClaim.toDateString() !== now.toDateString()
  }, [credits])

  /**
   * Claim daily credits via Edge Function
   */
  const claimDaily = async (): Promise<ClaimResult> => {
    try {
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const { data, error: fnError } = await supabase.functions.invoke('claim-daily-credits', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (fnError) throw fnError

      const result: ClaimResult = {
        success: data.success,
        creditsEarned: data.creditsEarned || 0,
        newBalance: data.newBalance || credits?.balance || 0,
        message: data.message || '',
        nextClaimAt: data.nextClaimAt
      }

      // Update local state
      if (result.success) {
        await fetchCredits()
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim credits'
      setError(message)
      return {
        success: false,
        creditsEarned: 0,
        newBalance: credits?.balance || 0,
        message
      }
    }
  }

  /**
   * Spend credits (usually called by processing functions)
   */
  const spendCredits = async (
    amount: number,
    referenceId: string,
    referenceType: string
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('spend_credits', {
        p_user_id: user?.id,
        p_amount: amount,
        p_reference_id: referenceId,
        p_reference_type: referenceType,
        p_metadata: {}
      })

      if (rpcError) throw rpcError

      const result = data?.[0]
      if (result?.success) {
        await fetchCredits()
        return true
      }

      setError(result?.message || 'Failed to spend credits')
      return false
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to spend credits'
      setError(message)
      return false
    }
  }

  // Load credits on mount and when user changes
  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`user_credits:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[useUserCredits] Real-time update:', payload)
          if (payload.new) {
            const newData = payload.new as Record<string, unknown>
            setCredits({
              balance: newData.balance as number,
              lifetimeEarned: newData.lifetime_earned as number,
              lifetimeSpent: newData.lifetime_spent as number,
              lastDailyClaim: newData.last_daily_claim as string | null
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return {
    balance: credits?.balance ?? 0,
    lifetimeEarned: credits?.lifetimeEarned ?? 0,
    lifetimeSpent: credits?.lifetimeSpent ?? 0,
    isLoading,
    error,
    canClaimDaily: canClaimDaily(),
    claimDaily,
    refreshBalance: fetchCredits,
    spendCredits
  }
}

export default useUserCredits
