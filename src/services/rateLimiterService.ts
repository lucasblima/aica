/**
 * Rate Limiter Service
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Frontend service for token-based rate limiting with 4-hour windows.
 * Implements tier fallback (premium → standard → lite) and credit bypass.
 *
 * @example
 * const { canSend, tier, shouldQueue } = await checkRateLimit('premium', 1000)
 * if (canSend) {
 *   await sendMessage(message, tier)
 * } else if (shouldQueue) {
 *   await queueMessage(message)
 * }
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('RateLimiterService');


// ============================================================================
// TYPES
// ============================================================================

export type ModelTier = 'premium' | 'standard' | 'lite'

export interface TokenWindow {
  id: string
  user_id: string
  window_start: string
  window_end: string
  premium_tokens_used: number
  standard_tokens_used: number
  lite_tokens_used: number
  premium_tokens_limit: number
  standard_tokens_limit: number
  lite_tokens_limit: number
  created_at: string
}

export interface RateLimitStatus {
  /** Whether the user can send a message */
  canSend: boolean
  /** The tier that will be used (may be downgraded) */
  availableTier: ModelTier | null
  /** Whether the message should be queued */
  shouldQueue: boolean
  /** Current token usage */
  usage: {
    premium: { used: number; limit: number; remaining: number }
    standard: { used: number; limit: number; remaining: number }
    lite: { used: number; limit: number; remaining: number }
  }
  /** Credit balance for bypass */
  creditBalance: number
  /** Time until window resets (in seconds) */
  windowResetIn: number
  /** Current window end time */
  windowEnd: string | null
  /** Whether user has credits for bypass */
  canBypassWithCredits: boolean
}

export interface PricingPlan {
  id: string
  name: string
  price_brl_monthly: number
  premium_tokens_per_window: number
  standard_tokens_per_window: number
  lite_tokens_per_window: number
  window_duration_hours: number
  max_queued_messages: number
  features: string[]
  is_active: boolean
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_start: string
  current_period_end: string
  plan?: PricingPlan
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount_brl: number
  transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus'
  description: string
  tokens_purchased?: number
  model_tier?: ModelTier
  created_at: string
}

// Token costs per tier (in BRL per 1K tokens)
export const TOKEN_COSTS_BRL = {
  premium: 0.15, // Claude Sonnet level
  standard: 0.03, // Gemini Flash level
  lite: 0.01, // Haiku level
} as const

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

/**
 * Get or create the current 4-hour token window
 */
export async function getCurrentWindow(): Promise<TokenWindow | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    log.warn('[rateLimiterService] getCurrentWindow: No authenticated user')
    return null
  }

  const { data, error } = await supabase.rpc('get_or_create_current_window', {
    p_user_id: user.id
  })

  if (error) {
    log.error('[rateLimiterService] getCurrentWindow error:', { error: error })
    return null
  }

  return data as TokenWindow
}

/**
 * Get user's current subscription and plan
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:pricing_plans(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    log.error('[rateLimiterService] getUserSubscription error:', { error: error })
    return null
  }

  return data as UserSubscription
}

/**
 * Get user's credit balance
 */
export async function getCreditBalance(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data, error } = await supabase
    .from('user_credits')
    .select('balance_brl')
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return 0 // Not found - no credits
    log.error('[rateLimiterService] getCreditBalance error:', { error: error })
    return 0
  }

  return data?.balance_brl ?? 0
}

// ============================================================================
// RATE LIMIT CHECK
// ============================================================================

/**
 * Check rate limit status for a given tier and token count
 *
 * @param preferredTier - The preferred model tier
 * @param estimatedTokens - Estimated tokens for the request
 * @returns Rate limit status with available tier and queue recommendation
 */
export async function checkRateLimit(
  preferredTier: ModelTier = 'standard',
  estimatedTokens: number = 1000
): Promise<RateLimitStatus> {
  const window = await getCurrentWindow()
  const creditBalance = await getCreditBalance()

  // Default response for errors
  const defaultResponse: RateLimitStatus = {
    canSend: false,
    availableTier: null,
    shouldQueue: true,
    usage: {
      premium: { used: 0, limit: 0, remaining: 0 },
      standard: { used: 0, limit: 0, remaining: 0 },
      lite: { used: 0, limit: 0, remaining: 0 },
    },
    creditBalance,
    windowResetIn: 0,
    windowEnd: null,
    canBypassWithCredits: false,
  }

  if (!window) return defaultResponse

  // Calculate remaining tokens for each tier
  const usage = {
    premium: {
      used: window.premium_tokens_used,
      limit: window.premium_tokens_limit,
      remaining: Math.max(0, window.premium_tokens_limit - window.premium_tokens_used),
    },
    standard: {
      used: window.standard_tokens_used,
      limit: window.standard_tokens_limit,
      remaining: Math.max(0, window.standard_tokens_limit - window.standard_tokens_used),
    },
    lite: {
      used: window.lite_tokens_used,
      limit: window.lite_tokens_limit,
      remaining: Math.max(0, window.lite_tokens_limit - window.lite_tokens_used),
    },
  }

  // Calculate window reset time
  const windowEnd = new Date(window.window_end)
  const now = new Date()
  const windowResetIn = Math.max(0, Math.floor((windowEnd.getTime() - now.getTime()) / 1000))

  // Check credit bypass cost
  const bypassCost = (estimatedTokens / 1000) * TOKEN_COSTS_BRL[preferredTier]
  const canBypassWithCredits = creditBalance >= bypassCost

  // Determine available tier using fallback logic
  let availableTier: ModelTier | null = null

  // Check preferred tier first
  if (usage[preferredTier].remaining >= estimatedTokens) {
    availableTier = preferredTier
  }
  // Fallback: premium → standard → lite
  else if (preferredTier === 'premium') {
    if (usage.standard.remaining >= estimatedTokens) {
      availableTier = 'standard'
    } else if (usage.lite.remaining >= estimatedTokens) {
      availableTier = 'lite'
    }
  }
  // Fallback: standard → lite
  else if (preferredTier === 'standard') {
    if (usage.lite.remaining >= estimatedTokens) {
      availableTier = 'lite'
    }
  }

  const canSend = availableTier !== null || canBypassWithCredits
  const shouldQueue = !canSend

  return {
    canSend,
    availableTier,
    shouldQueue,
    usage,
    creditBalance,
    windowResetIn,
    windowEnd: window.window_end,
    canBypassWithCredits,
  }
}

// ============================================================================
// TOKEN CONSUMPTION
// ============================================================================

/**
 * Consume tokens from the current window
 *
 * @param tier - Model tier used
 * @param tokens - Number of tokens consumed
 * @returns Success status
 */
export async function consumeTokens(
  tier: ModelTier,
  tokens: number
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase.rpc('increment_token_usage', {
    p_user_id: user.id,
    p_tier: tier,
    p_tokens: tokens,
  })

  if (error) {
    log.error('[rateLimiterService] consumeTokens error:', { error: error })
    return { success: false, error: error.message }
  }

  return { success: data === true }
}

/**
 * Use credits to bypass rate limit
 *
 * @param tier - Model tier to use
 * @param tokens - Number of tokens
 * @returns Success status and transaction details
 */
export async function useCreditsForBypass(
  tier: ModelTier,
  tokens: number
): Promise<{ success: boolean; cost: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, cost: 0, error: 'Not authenticated' }
  }

  const cost = (tokens / 1000) * TOKEN_COSTS_BRL[tier]

  const { data, error } = await supabase.rpc('deduct_user_credits', {
    p_user_id: user.id,
    p_amount: cost,
    p_description: `Bypass rate limit: ${tokens} ${tier} tokens`,
    p_tokens_used: tokens,
    p_model_tier: tier,
  })

  if (error) {
    log.error('[rateLimiterService] useCreditsForBypass error:', { error: error })
    return { success: false, cost, error: error.message }
  }

  return { success: data === true, cost }
}

// ============================================================================
// MESSAGE QUEUE
// ============================================================================

export interface QueuedMessage {
  id: string
  user_id: string
  message_content: string
  context_messages?: Array<{ role: string; content: string }>
  preferred_model_tier: ModelTier
  status: 'queued' | 'processing' | 'completed' | 'failed'
  priority: number
  estimated_tokens: number
  response_content?: string
  error_message?: string
  queued_at: string
  processed_at?: string
}

/**
 * Queue a message for later processing
 *
 * @param message - Message content
 * @param options - Queue options
 * @returns Queued message or error
 */
export async function queueMessage(
  message: string,
  options: {
    preferredTier?: ModelTier
    contextMessages?: Array<{ role: string; content: string }>
    estimatedTokens?: number
  } = {}
): Promise<{ success: boolean; queuedMessage?: QueuedMessage; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('message_queue')
    .insert({
      user_id: user.id,
      message_content: message,
      context_messages: options.contextMessages,
      preferred_model_tier: options.preferredTier ?? 'standard',
      estimated_tokens: options.estimatedTokens ?? 1000,
      status: 'queued',
      priority: 0,
    })
    .select()
    .single()

  if (error) {
    log.error('[rateLimiterService] queueMessage error:', { error: error })
    return { success: false, error: error.message }
  }

  return { success: true, queuedMessage: data as QueuedMessage }
}

/**
 * Get user's queued messages
 */
export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('message_queue')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['queued', 'processing'])
    .order('queued_at', { ascending: true })

  if (error) {
    log.error('[rateLimiterService] getQueuedMessages error:', { error: error })
    return []
  }

  return data as QueuedMessage[]
}

/**
 * Get queue position for a message
 */
export async function getQueuePosition(messageId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return -1

  const { data, error } = await supabase
    .from('message_queue')
    .select('id, queued_at')
    .eq('user_id', user.id)
    .eq('status', 'queued')
    .order('queued_at', { ascending: true })

  if (error) {
    log.error('[rateLimiterService] getQueuePosition error:', { error: error })
    return -1
  }

  const position = data.findIndex((m) => m.id === messageId)
  return position >= 0 ? position + 1 : -1
}

/**
 * Cancel a queued message
 */
export async function cancelQueuedMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('message_queue')
    .delete()
    .eq('id', messageId)
    .eq('status', 'queued')

  if (error) {
    log.error('[rateLimiterService] cancelQueuedMessage error:', { error: error })
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// CREDIT MANAGEMENT
// ============================================================================

/**
 * Get credit transaction history
 */
export async function getCreditTransactions(
  limit = 20
): Promise<CreditTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    log.error('[rateLimiterService] getCreditTransactions error:', { error: error })
    return []
  }

  return data as CreditTransaction[]
}

/**
 * Estimate cost for a request
 */
export function estimateCost(tier: ModelTier, tokens: number): number {
  return (tokens / 1000) * TOKEN_COSTS_BRL[tier]
}

// ============================================================================
// PRICING PLANS
// ============================================================================

/**
 * Get all available pricing plans
 */
export async function getPricingPlans(): Promise<PricingPlan[]> {
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_brl_monthly', { ascending: true })

  if (error) {
    log.error('[rateLimiterService] getPricingPlans error:', { error: error })
    return []
  }

  return data as PricingPlan[]
}

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

export interface UsageStats {
  totalTokensUsed: number
  totalCreditsSpent: number
  averageTokensPerDay: number
  topTier: ModelTier | null
  windowsInPeriod: number
}

/**
 * Get usage statistics for a period
 */
export async function getUsageStats(days = 30): Promise<UsageStats> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      totalTokensUsed: 0,
      totalCreditsSpent: 0,
      averageTokensPerDay: 0,
      topTier: null,
      windowsInPeriod: 0,
    }
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get token usage
  const { data: usageData, error: usageError } = await supabase
    .from('user_token_usage')
    .select('premium_tokens_used, standard_tokens_used, lite_tokens_used')
    .eq('user_id', user.id)
    .gte('window_start', startDate.toISOString())

  if (usageError) {
    log.error('[rateLimiterService] getUsageStats error:', { error: usageError })
  }

  // Get credit transactions
  const { data: transactionsData, error: transactionsError } = await supabase
    .from('credit_transactions')
    .select('amount_brl')
    .eq('user_id', user.id)
    .eq('transaction_type', 'usage')
    .gte('created_at', startDate.toISOString())

  if (transactionsError) {
    log.error('[rateLimiterService] getUsageStats transactions error:', { error: transactionsError })
  }

  const windows = usageData || []
  const transactions = transactionsData || []

  let totalPremium = 0
  let totalStandard = 0
  let totalLite = 0

  for (const w of windows) {
    totalPremium += w.premium_tokens_used || 0
    totalStandard += w.standard_tokens_used || 0
    totalLite += w.lite_tokens_used || 0
  }

  const totalTokensUsed = totalPremium + totalStandard + totalLite
  const totalCreditsSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount_brl), 0)

  // Determine top tier
  let topTier: ModelTier | null = null
  const tierUsage = { premium: totalPremium, standard: totalStandard, lite: totalLite }
  const maxUsage = Math.max(totalPremium, totalStandard, totalLite)
  if (maxUsage > 0) {
    topTier = (Object.entries(tierUsage).find(([, v]) => v === maxUsage)?.[0] as ModelTier) || null
  }

  return {
    totalTokensUsed,
    totalCreditsSpent,
    averageTokensPerDay: days > 0 ? totalTokensUsed / days : 0,
    topTier,
    windowsInPeriod: windows.length,
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Window management
  getCurrentWindow,
  getUserSubscription,
  getCreditBalance,

  // Rate limiting
  checkRateLimit,
  consumeTokens,
  useCreditsForBypass,

  // Message queue
  queueMessage,
  getQueuedMessages,
  getQueuePosition,
  cancelQueuedMessage,

  // Credits
  getCreditTransactions,
  estimateCost,

  // Plans
  getPricingPlans,

  // Analytics
  getUsageStats,

  // Constants
  TOKEN_COSTS_BRL,
}
