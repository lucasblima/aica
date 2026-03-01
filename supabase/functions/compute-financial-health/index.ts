/**
 * compute-financial-health Edge Function
 * Sprint 5 — Behavioral Economics Engine
 *
 * Aggregates finance_transactions into a FinHealth Score.
 * 1. Fetches last 30 days of transactions
 * 2. Computes income, expenses, savings rate
 * 3. Scores 4 components (Spend, Save, Borrow, Plan)
 * 4. Stores result in financial_health_scores
 * 5. Logs attribution
 *
 * Endpoint: POST /functions/v1/compute-financial-health
 * Body (optional): { emergencyFundMonths, hasInsurance, retirementSaving, creditUtilization }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('compute-financial-health')

// ============================================================================
// TYPES
// ============================================================================

interface RequestBody {
  emergencyFundMonths?: number
  hasInsurance?: boolean
  retirementSaving?: boolean
  creditUtilization?: number
  debtToIncomeRatio?: number
}

type FinHealthTier = 'vulnerable' | 'coping' | 'healthy'

// ============================================================================
// SCORING FUNCTIONS (mirrored from frontend service)
// ============================================================================

function scoreSpend(income: number, expenses: number, billsOnTimeRate: number): number {
  if (income <= 0) return 0
  const expenseRatio = expenses / income
  const ratioScore = expenseRatio <= 0.6
    ? 100
    : expenseRatio <= 0.8
      ? 100 - ((expenseRatio - 0.6) / 0.2) * 40
      : expenseRatio <= 1.0
        ? 60 - ((expenseRatio - 0.8) / 0.2) * 40
        : Math.max(0, 20 - (expenseRatio - 1.0) * 20)

  const billScore = Math.min(100, billsOnTimeRate * 100)
  return Math.round(ratioScore * 0.6 + billScore * 0.4)
}

function scoreSave(emergencyFundMonths: number, savingsRate: number): number {
  const emergencyScore = Math.min(100, (emergencyFundMonths / 6) * 100)
  const savingsScore = Math.min(100, (savingsRate / 0.20) * 100)
  return Math.round(emergencyScore * 0.5 + savingsScore * 0.5)
}

function scoreBorrow(debtToIncomeRatio: number, creditUtilization: number): number {
  const dtiScore = debtToIncomeRatio <= 0.2
    ? 100
    : debtToIncomeRatio <= 0.36
      ? 100 - ((debtToIncomeRatio - 0.2) / 0.16) * 30
      : debtToIncomeRatio <= 0.5
        ? 70 - ((debtToIncomeRatio - 0.36) / 0.14) * 40
        : Math.max(0, 30 - (debtToIncomeRatio - 0.5) * 60)

  const creditScore = creditUtilization <= 0.1
    ? 100
    : creditUtilization <= 0.3
      ? 100 - ((creditUtilization - 0.1) / 0.2) * 30
      : creditUtilization <= 0.5
        ? 70 - ((creditUtilization - 0.3) / 0.2) * 40
        : Math.max(0, 30 - (creditUtilization - 0.5) * 60)

  return Math.round(dtiScore * 0.6 + creditScore * 0.4)
}

function scorePlan(hasInsurance: boolean, retirementSaving: boolean, hasEmergencyFund: boolean): number {
  let score = 0
  if (hasInsurance) score += 35
  if (retirementSaving) score += 35
  if (hasEmergencyFund) score += 30
  return score
}

function computeTier(composite: number): FinHealthTier {
  if (composite >= 80) return 'healthy'
  if (composite >= 40) return 'coping'
  return 'vulnerable'
}

// ============================================================================
// SERVE
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client to verify JWT
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    log.info('Computing Financial Health for user:', userId)

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse optional request body
    let body: RequestBody = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is fine
    }

    // ── Fetch transactions from last 30 days ──
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

    const { data: transactions, error: txnError } = await supabase
      .from('finance_transactions')
      .select('amount, type, category, is_recurring')
      .eq('user_id', userId)
      .gte('transaction_date', thirtyDaysAgo)

    if (txnError) {
      log.error('Failed to fetch transactions:', txnError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch transaction data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: 'Dados insuficientes para calcular saude financeira. Importe extratos bancarios primeiro.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Aggregate transaction data ──
    let totalIncome = 0
    let totalExpenses = 0
    let recurringCount = 0
    let recurringPaid = 0

    for (const txn of transactions) {
      const amt = Math.abs(txn.amount)
      if (txn.type === 'income') {
        totalIncome += amt
      } else {
        totalExpenses += amt
      }
      if (txn.is_recurring) {
        recurringCount++
        recurringPaid++ // Assumption: if it's in the ledger, it was paid
      }
    }

    const monthlyIncome = totalIncome
    const monthlyExpenses = totalExpenses
    const billsOnTimeRate = recurringCount > 0 ? recurringPaid / recurringCount : 0.8
    const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome) : 0

    // User-supplied parameters (with defaults)
    const emergencyFundMonths = body.emergencyFundMonths ?? 0
    const hasInsurance = body.hasInsurance ?? false
    const retirementSaving = body.retirementSaving ?? false
    const creditUtilization = body.creditUtilization ?? 0.3
    const debtToIncomeRatio = body.debtToIncomeRatio ?? (monthlyIncome > 0 ? 0 : 0)
    const hasEmergencyFund = emergencyFundMonths >= 1

    // ── Compute scores ──
    const spend = scoreSpend(monthlyIncome, monthlyExpenses, billsOnTimeRate)
    const save = scoreSave(emergencyFundMonths, savingsRate)
    const borrow = scoreBorrow(debtToIncomeRatio, creditUtilization)
    const plan = scorePlan(hasInsurance, retirementSaving, hasEmergencyFund)

    const composite = Math.round((spend + save + borrow + plan) / 4)
    const tier = computeTier(composite)

    // ── Store result ──
    const { error: insertError } = await supabase
      .from('financial_health_scores')
      .insert({
        user_id: userId,
        spend_score: spend,
        save_score: save,
        borrow_score: borrow,
        plan_score: plan,
        composite_score: composite,
        tier,
        debt_to_income_ratio: debtToIncomeRatio,
        emergency_fund_months: emergencyFundMonths,
        savings_rate: savingsRate,
        component_details: {
          monthlyIncome,
          monthlyExpenses,
          billsOnTimeRate,
          creditUtilization,
          hasInsurance,
          retirementSaving,
          transactionCount: transactions.length,
        },
      })

    if (insertError) {
      log.error('Failed to store financial health score:', insertError.message)
    }

    // ── Log attribution (fire-and-forget) ──
    supabase
      .from('score_attribution_log')
      .insert({
        user_id: userId,
        model_id: 'finhealth_score',
        previous_score: null,
        new_score: composite,
        delta: null,
        trigger_action: 'compute_financial_health',
        metadata: {
          tier,
          spend,
          save,
          borrow,
          plan,
          transactionCount: transactions.length,
        },
      })
      .then(() => log.info('Attribution log recorded'))
      .catch((err: Error) => log.warn('Attribution log failed (non-critical):', err.message))

    log.info('Financial Health computed:', { composite, tier, spend, save, borrow, plan })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          spend,
          save,
          borrow,
          plan,
          composite,
          tier,
          debtToIncomeRatio,
          emergencyFundMonths,
          savingsRate,
          monthlyIncome,
          monthlyExpenses,
          transactionCount: transactions.length,
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('compute-financial-health failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
