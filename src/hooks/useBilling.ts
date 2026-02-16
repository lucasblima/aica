/**
 * useBilling Hook
 *
 * Provides billing state for the current user:
 *   - Active subscription (plan, status, period)
 *   - Credit balance (current, lifetime earned/spent)
 *   - Usage summary (interactions today, top action/module, costs)
 *   - Pricing plans (cached)
 *   - Actions: claim daily credits, check limit, refresh
 *
 * Fetches data on mount and exposes a refresh function for manual updates.
 * All billing errors are handled gracefully — billing never breaks the UI.
 *
 * @example
 * const { subscription, credits, usageSummary, plans, isLoading, claimDailyCredits } = useBilling()
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createNamespacedLogger } from '@/lib/logger'
import {
  getUserSubscription,
  getUserCredits,
  getUsageSummary,
  getPricingPlans,
  checkInteractionLimit,
  claimDailyCredits as claimDailyCreditsRpc,
} from '@/services/billingService'
import type {
  UserSubscription,
  UserCredits,
  UsageSummary,
  PricingPlan,
  InteractionLimitResult,
  ClaimDailyCreditsResult,
} from '@/services/billingService'

const log = createNamespacedLogger('useBilling')

// ============================================================================
// TYPES
// ============================================================================

export interface UseBillingReturn {
  /** User's active subscription (null if free/unregistered) */
  subscription: UserSubscription | null
  /** User's credit balance and lifetime stats */
  credits: UserCredits
  /** Usage summary for the configured period */
  usageSummary: UsageSummary | null
  /** Available pricing plans */
  plans: PricingPlan[]
  /** Whether initial data is loading */
  isLoading: boolean
  /** Last error message (null if none) */
  error: string | null
  /** Whether the user can claim daily credits (not yet claimed today) */
  canClaimDaily: boolean
  /** Claim daily credits. Returns the result from the RPC. */
  claimDailyCredits: () => Promise<ClaimDailyCreditsResult>
  /** Check current interaction limit status */
  checkLimit: () => Promise<InteractionLimitResult>
  /** Refresh all billing data from the database */
  refreshBilling: () => Promise<void>
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_CREDITS: UserCredits = {
  balance: 0,
  lifetimeEarned: 0,
  lifetimeSpent: 0,
  lastDailyClaim: null,
}

// ============================================================================
// HOOK
// ============================================================================

export function useBilling(): UseBillingReturn {
  const { user } = useAuth()

  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [credits, setCredits] = useState<UserCredits>(DEFAULT_CREDITS)
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null)
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch all billing data in parallel.
   */
  const fetchBillingData = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      const [subResult, creditsResult, summaryResult, plansResult] = await Promise.allSettled([
        getUserSubscription(),
        getUserCredits(),
        getUsageSummary(30),
        getPricingPlans(),
      ])

      if (subResult.status === 'fulfilled') {
        setSubscription(subResult.value)
      } else {
        log.warn('Falha ao buscar assinatura:', subResult.reason)
      }

      if (creditsResult.status === 'fulfilled') {
        setCredits(creditsResult.value)
      } else {
        log.warn('Falha ao buscar creditos:', creditsResult.reason)
      }

      if (summaryResult.status === 'fulfilled') {
        setUsageSummary(summaryResult.value)
      } else {
        log.warn('Falha ao buscar resumo de uso:', summaryResult.reason)
      }

      if (plansResult.status === 'fulfilled') {
        setPlans(plansResult.value)
      } else {
        log.warn('Falha ao buscar planos:', plansResult.reason)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados de cobranca'
      setError(message)
      log.error('Erro ao carregar billing:', { error: err })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  /**
   * Whether the user can claim daily credits (has not claimed today).
   */
  const canClaimDaily = useMemo((): boolean => {
    if (!credits.lastDailyClaim) return true

    const lastClaim = new Date(credits.lastDailyClaim)
    const now = new Date()
    return lastClaim.toDateString() !== now.toDateString()
  }, [credits.lastDailyClaim])

  /**
   * Claim daily credits and refresh billing data.
   */
  const handleClaimDailyCredits = useCallback(async (): Promise<ClaimDailyCreditsResult> => {
    try {
      setError(null)
      const result = await claimDailyCreditsRpc()

      if (result.success) {
        // Refresh credits after claiming
        const updatedCredits = await getUserCredits()
        setCredits(updatedCredits)
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao resgatar creditos'
      setError(message)
      return {
        success: false,
        creditsEarned: 0,
        newBalance: credits.balance,
        message,
      }
    }
  }, [credits.balance])

  /**
   * Check current interaction limit status.
   */
  const handleCheckLimit = useCallback(async (): Promise<InteractionLimitResult> => {
    return checkInteractionLimit()
  }, [])

  /**
   * Refresh all billing data.
   */
  const refreshBilling = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    await fetchBillingData()
  }, [fetchBillingData])

  return {
    subscription,
    credits,
    usageSummary,
    plans,
    isLoading,
    error,
    canClaimDaily,
    claimDailyCredits: handleClaimDailyCredits,
    checkLimit: handleCheckLimit,
    refreshBilling,
  }
}

export default useBilling
