/**
 * useUserCredits Hook
 *
 * Manages user credit balance for the monthly credit billing system.
 * Combines monthly plan budget with extra credits from user_credits table.
 *
 * Data flow:
 *   get_usage_summary RPC returns:
 *     - daily_limit = monthly_credits (plan budget)
 *     - interactions_today = credits used this month
 *     - credit_balance = extra credits (user_credits table)
 *     - plan_id = current plan
 *
 *   balance = (monthly_credits - month_used) + extra_credits
 *
 * @example
 * const { balance, claimDaily, canClaimDaily, refreshBalance } = useUserCredits()
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useUserCredits')

interface CreditState {
  /** Remaining credits available (monthly remaining + extra credits) */
  balance: number
  /** Monthly plan budget */
  monthlyBudget: number
  /** Credits used this month */
  monthUsed: number
  /** Extra credits from user_credits table */
  extraCredits: number
  /** Current plan ID */
  planId: string
  /** Total credits earned lifetime (from user_credits) */
  lifetimeEarned: number
  /** Last daily claim timestamp */
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
  /** Total remaining credits (monthly remaining + extra) */
  balance: number
  /** Monthly plan budget */
  monthlyBudget: number
  /** Credits used this month */
  monthUsed: number
  /** Extra credits from bonus claims */
  extraCredits: number
  /** Total credits earned lifetime */
  lifetimeEarned: number
  /** Current plan ID */
  planId: string
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
}

export function useUserCredits(): UseUserCreditsReturn {
  const { user } = useAuth()
  const [state, setState] = useState<CreditState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch credit data from get_usage_summary RPC + user_credits table
   */
  const fetchCredits = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // Fetch usage summary (monthly budget, usage, plan) and user_credits in parallel
      const [summaryResult, creditsResult] = await Promise.all([
        supabase.rpc('get_usage_summary', { p_user_id: user.id }),
        supabase
          .from('user_credits')
          .select('balance, lifetime_earned, last_daily_claim')
          .eq('user_id', user.id)
          .single()
      ])

      if (summaryResult.error) {
        throw summaryResult.error
      }

      const summary = summaryResult.data?.[0]
      if (!summary) {
        // No usage data yet — set defaults based on free plan
        setState({
          balance: 500,
          monthlyBudget: 500,
          monthUsed: 0,
          extraCredits: 0,
          planId: 'free',
          lifetimeEarned: 0,
          lastDailyClaim: null
        })
        return
      }

      // get_usage_summary returns:
      //   daily_limit = monthly_credits (plan budget)
      //   interactions_today = credits used this month (renamed field)
      //   credit_balance = extra credits from user_credits table
      //   plan_id = current plan
      const monthlyBudget = summary.daily_limit ?? 500
      const monthUsed = Number(summary.interactions_today) || 0
      const extraCredits = summary.credit_balance ?? 0
      const planId = summary.plan_id || 'free'

      // Total remaining = monthly remaining + extra credits
      const monthlyRemaining = Math.max(0, monthlyBudget - monthUsed)
      const balance = monthlyRemaining + extraCredits

      // user_credits data for lifetime stats and daily claim tracking
      const lifetimeEarned = creditsResult.data?.lifetime_earned ?? 0
      const lastDailyClaim = creditsResult.data?.last_daily_claim ?? null

      setState({
        balance,
        monthlyBudget,
        monthUsed,
        extraCredits,
        planId,
        lifetimeEarned,
        lastDailyClaim
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load credits'
      setError(message)
      log.error('Error:', { error: message })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  /**
   * Check if user can claim daily credits
   */
  const canClaimDaily = useCallback((): boolean => {
    if (!state?.lastDailyClaim) return true

    const lastClaim = new Date(state.lastDailyClaim)
    const now = new Date()

    // Compare dates (ignoring time)
    return lastClaim.toDateString() !== now.toDateString()
  }, [state])

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
        newBalance: data.newBalance || state?.balance || 0,
        message: data.message || '',
        nextClaimAt: data.nextClaimAt
      }

      // Refresh all credit data on successful claim
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
        newBalance: state?.balance || 0,
        message
      }
    }
  }

  // Load credits on mount and when user changes
  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  // Subscribe to real-time updates on user_credits (extra credits changes)
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
        () => {
          // Re-fetch everything to keep monthly + extra in sync
          fetchCredits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchCredits])

  return {
    balance: state?.balance ?? 0,
    monthlyBudget: state?.monthlyBudget ?? 500,
    monthUsed: state?.monthUsed ?? 0,
    extraCredits: state?.extraCredits ?? 0,
    lifetimeEarned: state?.lifetimeEarned ?? 0,
    planId: state?.planId ?? 'free',
    isLoading,
    error,
    canClaimDaily: canClaimDaily(),
    claimDaily,
    refreshBalance: fetchCredits
  }
}

export default useUserCredits
