/**
 * Billing Service
 *
 * Wraps the consolidated billing RPCs from the `20260215050000_consolidated_billing` migration.
 * Provides typed access to:
 *   - Interaction limit checking
 *   - Usage logging
 *   - Daily credit claiming
 *   - Usage summary retrieval
 *   - Credit spending
 *   - Subscription & plan queries
 *
 * ARCHITECTURE PRINCIPLES:
 *   1. Non-blocking: Billing errors NEVER break core AI functionality
 *   2. Typed: All RPC results are mapped to exported TypeScript interfaces
 *   3. Cached: Pricing plans are cached in memory (rarely change)
 *   4. Fail-safe: Every function catches errors and returns a safe fallback
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('BillingService')

// ============================================================================
// TYPES
// ============================================================================

export interface PricingPlan {
  id: string
  name: string
  description: string | null
  priceBrlMonthly: number
  dailyInteractionLimit: number | null
  features: string[]
  isActive: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  currentPeriodStart: string
  currentPeriodEnd: string
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  trialEnd: string | null
  cancelledAt: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

export interface UserCredits {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  lastDailyClaim: string | null
}

export interface InteractionLimitResult {
  allowed: boolean
  remaining: number
  plan: string
  resetsAt: string
}

export interface LogInteractionResult {
  success: boolean
  interactionId: string | null
  creditDeducted: boolean
  remaining: number
  message: string
}

export interface ClaimDailyCreditsResult {
  success: boolean
  creditsEarned: number
  newBalance: number
  message: string
}

export interface UsageSummary {
  totalInteractions: number
  totalTokensInput: number
  totalTokensOutput: number
  totalCostBrl: number
  topAction: string | null
  topModule: string | null
  interactionsToday: number
  dailyLimit: number | null
  planId: string
  creditBalance: number
}

export interface SpendCreditsResult {
  success: boolean
  newBalance: number
  message: string
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get the current authenticated user ID.
 * Returns null if not authenticated (billing should not block unauthenticated flows).
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      log.warn('No authenticated user for billing operation')
      return null
    }
    return user.id
  } catch (err) {
    log.error('Failed to get current user:', { error: err })
    return null
  }
}

// ============================================================================
// PRICING PLANS (CACHED)
// ============================================================================

let plansCache: PricingPlan[] | null = null
let plansCacheTimestamp = 0
const PLANS_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function mapPricingPlan(raw: Record<string, unknown>): PricingPlan {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string) ?? null,
    priceBrlMonthly: Number(raw.price_brl_monthly),
    dailyInteractionLimit: raw.daily_interaction_limit != null
      ? Number(raw.daily_interaction_limit)
      : null,
    features: (raw.features as string[]) ?? [],
    isActive: raw.is_active as boolean,
  }
}

/**
 * Get all active pricing plans.
 * Results are cached for 10 minutes since plans rarely change.
 */
export async function getPricingPlans(): Promise<PricingPlan[]> {
  const now = Date.now()
  if (plansCache && (now - plansCacheTimestamp) < PLANS_CACHE_TTL_MS) {
    return plansCache
  }

  try {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_brl_monthly', { ascending: true })

    if (error) {
      log.error('Erro ao buscar planos:', { error })
      return plansCache ?? []
    }

    plansCache = (data ?? []).map(mapPricingPlan)
    plansCacheTimestamp = now
    return plansCache
  } catch (err) {
    log.error('Erro inesperado ao buscar planos:', { error: err })
    return plansCache ?? []
  }
}

/**
 * Invalidate the plans cache.
 * Call this after an admin changes pricing plans.
 */
export function invalidatePlansCache(): void {
  plansCache = null
  plansCacheTimestamp = 0
}

// ============================================================================
// USER SUBSCRIPTION
// ============================================================================

function mapSubscription(raw: Record<string, unknown>): UserSubscription {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    planId: raw.plan_id as string,
    status: raw.status as UserSubscription['status'],
    currentPeriodStart: raw.current_period_start as string,
    currentPeriodEnd: raw.current_period_end as string,
    stripeSubscriptionId: (raw.stripe_subscription_id as string) ?? null,
    stripeCustomerId: (raw.stripe_customer_id as string) ?? null,
    trialEnd: (raw.trial_end as string) ?? null,
    cancelledAt: (raw.cancelled_at as string) ?? null,
    cancelAtPeriodEnd: raw.cancel_at_period_end as boolean,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  }
}

/**
 * Get the current user's active subscription.
 * Returns null if not found (user defaults to free plan in RPCs).
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // PGRST116 = no rows found — user has no subscription record yet
      if (error.code === 'PGRST116') {
        log.debug('Nenhuma assinatura encontrada, usuario usa plano free')
        return null
      }
      log.error('Erro ao buscar assinatura:', { error })
      return null
    }

    return data ? mapSubscription(data as Record<string, unknown>) : null
  } catch (err) {
    log.error('Erro inesperado ao buscar assinatura:', { error: err })
    return null
  }
}

// ============================================================================
// USER CREDITS
// ============================================================================

/**
 * Get the current user's credit balance.
 * Returns a safe default (0 balance) if not found.
 */
export async function getUserCredits(): Promise<UserCredits> {
  const DEFAULT_CREDITS: UserCredits = {
    balance: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    lastDailyClaim: null,
  }

  const userId = await getCurrentUserId()
  if (!userId) return DEFAULT_CREDITS

  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('balance, lifetime_earned, lifetime_spent, last_daily_claim')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        log.debug('Nenhum registro de creditos encontrado')
        return DEFAULT_CREDITS
      }
      log.error('Erro ao buscar creditos:', { error })
      return DEFAULT_CREDITS
    }

    return {
      balance: data.balance ?? 0,
      lifetimeEarned: data.lifetime_earned ?? 0,
      lifetimeSpent: data.lifetime_spent ?? 0,
      lastDailyClaim: data.last_daily_claim ?? null,
    }
  } catch (err) {
    log.error('Erro inesperado ao buscar creditos:', { error: err })
    return DEFAULT_CREDITS
  }
}

// ============================================================================
// RPC WRAPPERS
// ============================================================================

/**
 * Check if the current user can perform another AI interaction.
 * Returns a safe "allowed" default on error so billing never blocks core flows.
 */
export async function checkInteractionLimit(): Promise<InteractionLimitResult> {
  const FALLBACK: InteractionLimitResult = {
    allowed: true,
    remaining: 999,
    plan: 'free',
    resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  const userId = await getCurrentUserId()
  if (!userId) return FALLBACK

  try {
    const { data, error } = await supabase.rpc('check_interaction_limit', {
      p_user_id: userId,
    })

    if (error) {
      log.error('Erro ao verificar limite de interacoes:', { error })
      return FALLBACK
    }

    // RPC returns TABLE — Supabase returns array, we take the first row
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return FALLBACK

    return {
      allowed: row.allowed ?? true,
      remaining: row.remaining ?? 999,
      plan: row.plan ?? 'free',
      resetsAt: row.resets_at ?? FALLBACK.resetsAt,
    }
  } catch (err) {
    log.error('Erro inesperado ao verificar limite:', { error: err })
    return FALLBACK
  }
}

/**
 * Log an AI interaction.
 * This should be called AFTER the AI operation succeeds.
 * Fire-and-forget safe — errors are logged but never propagated.
 */
export async function logInteraction(
  action: string,
  module?: string,
  model?: string,
  tokensIn?: number,
  tokensOut?: number
): Promise<LogInteractionResult> {
  const FALLBACK: LogInteractionResult = {
    success: false,
    interactionId: null,
    creditDeducted: false,
    remaining: 0,
    message: 'Erro ao registrar interacao',
  }

  const userId = await getCurrentUserId()
  if (!userId) return FALLBACK

  try {
    const { data, error } = await supabase.rpc('log_interaction', {
      p_user_id: userId,
      p_action: action,
      p_module: module ?? null,
      p_model: model ?? null,
      p_tokens_in: tokensIn ?? 0,
      p_tokens_out: tokensOut ?? 0,
    })

    if (error) {
      log.error('Erro ao registrar interacao:', { error })
      return FALLBACK
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return FALLBACK

    return {
      success: row.success ?? false,
      interactionId: row.interaction_id ?? null,
      creditDeducted: row.credit_deducted ?? false,
      remaining: row.remaining ?? 0,
      message: row.message ?? '',
    }
  } catch (err) {
    log.error('Erro inesperado ao registrar interacao:', { error: err })
    return FALLBACK
  }
}

/**
 * Claim daily credits for the current user.
 */
export async function claimDailyCredits(): Promise<ClaimDailyCreditsResult> {
  const FALLBACK: ClaimDailyCreditsResult = {
    success: false,
    creditsEarned: 0,
    newBalance: 0,
    message: 'Erro ao resgatar creditos diarios',
  }

  const userId = await getCurrentUserId()
  if (!userId) return FALLBACK

  try {
    const { data, error } = await supabase.rpc('claim_daily_credits', {
      p_user_id: userId,
    })

    if (error) {
      log.error('Erro ao resgatar creditos diarios:', { error })
      return FALLBACK
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return FALLBACK

    return {
      success: row.success ?? false,
      creditsEarned: row.credits_earned ?? 0,
      newBalance: row.new_balance ?? 0,
      message: row.message ?? '',
    }
  } catch (err) {
    log.error('Erro inesperado ao resgatar creditos:', { error: err })
    return FALLBACK
  }
}

/**
 * Get usage summary for the current user's dashboard.
 *
 * @param days Number of days to include in the summary (default: 30)
 */
export async function getUsageSummary(days: number = 30): Promise<UsageSummary | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    const { data, error } = await supabase.rpc('get_usage_summary', {
      p_user_id: userId,
      p_days: days,
    })

    if (error) {
      log.error('Erro ao buscar resumo de uso:', { error })
      return null
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null

    return {
      totalInteractions: Number(row.total_interactions ?? 0),
      totalTokensInput: Number(row.total_tokens_input ?? 0),
      totalTokensOutput: Number(row.total_tokens_output ?? 0),
      totalCostBrl: Number(row.total_cost_brl ?? 0),
      topAction: row.top_action ?? null,
      topModule: row.top_module ?? null,
      interactionsToday: Number(row.interactions_today ?? 0),
      dailyLimit: row.daily_limit != null ? Number(row.daily_limit) : null,
      planId: row.plan_id ?? 'free',
      creditBalance: Number(row.credit_balance ?? 0),
    }
  } catch (err) {
    log.error('Erro inesperado ao buscar resumo de uso:', { error: err })
    return null
  }
}

/**
 * Spend credits for a specific reference (e.g., contact analysis, special feature).
 */
export async function spendCredits(
  amount: number,
  referenceId?: string,
  referenceType?: string,
  metadata?: Record<string, unknown>
): Promise<SpendCreditsResult> {
  const FALLBACK: SpendCreditsResult = {
    success: false,
    newBalance: 0,
    message: 'Erro ao gastar creditos',
  }

  const userId = await getCurrentUserId()
  if (!userId) return FALLBACK

  try {
    const { data, error } = await supabase.rpc('spend_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reference_id: referenceId ?? null,
      p_reference_type: referenceType ?? null,
      p_metadata: metadata ?? {},
    })

    if (error) {
      log.error('Erro ao gastar creditos:', { error })
      return FALLBACK
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return FALLBACK

    return {
      success: row.success ?? false,
      newBalance: row.new_balance ?? 0,
      message: row.message ?? '',
    }
  } catch (err) {
    log.error('Erro inesperado ao gastar creditos:', { error: err })
    return FALLBACK
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const billingService = {
  // Plans
  getPricingPlans,
  invalidatePlansCache,

  // Subscription
  getUserSubscription,

  // Credits
  getUserCredits,
  claimDailyCredits,
  spendCredits,

  // Interactions
  checkInteractionLimit,
  logInteraction,

  // Summary
  getUsageSummary,
}

export default billingService
