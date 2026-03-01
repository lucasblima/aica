/**
 * compute-cross-module-intelligence Edge Function
 * Sprint 7: Cross-Module Intelligence
 *
 * Computes cross-domain analytics for a user:
 * 1. Fetches Life Score history (last 30 entries)
 * 2. Fetches domain score histories from life_scores table
 * 3. Computes Pearson correlation matrix across all domain pairs
 * 4. Runs Goodhart divergence detection
 * 5. Checks digital sabbatical eligibility
 * 6. Stores results (correlations + alerts)
 * 7. Returns JSON with success: true, data: { correlations, alerts, sabbatical }
 *
 * Endpoint: POST /functions/v1/compute-cross-module-intelligence
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('compute-cross-module-intelligence')

// ============================================================================
// TYPES
// ============================================================================

type AicaDomain = 'atlas' | 'journey' | 'connections' | 'finance' | 'grants' | 'studio' | 'flux'

interface CorrelationResult {
  domainA: string
  domainB: string
  coefficient: number
  sampleSize: number
  pValue: number | null
  isSignificant: boolean
  strength: string
  direction: string
}

interface GoodhartAlert {
  alertType: string
  severity: string
  message: string
  affectedDomains: string[]
  details: Record<string, unknown>
}

interface SabbaticalInfo {
  consecutiveActiveDays: number
  isOnSabbatical: boolean
  suggestion: {
    eligible: boolean
    message: string
    suggestedDays: number
    urgency: string
  } | null
}

// ============================================================================
// ALL DOMAINS
// ============================================================================

const ALL_DOMAINS: AicaDomain[] = ['atlas', 'journey', 'connections', 'finance', 'grants', 'studio', 'flux']

// ============================================================================
// PEARSON CORRELATION (self-contained for Edge Function)
// ============================================================================

function pearsonCorrelation(x: number[], y: number[]): { r: number; n: number } {
  const n = Math.min(x.length, y.length)
  if (n < 3) return { r: 0, n }

  const xSlice = x.slice(0, n)
  const ySlice = y.slice(0, n)

  const meanX = xSlice.reduce((s, v) => s + v, 0) / n
  const meanY = ySlice.reduce((s, v) => s + v, 0) / n

  let sumXY = 0, sumX2 = 0, sumY2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX
    const dy = ySlice[i] - meanY
    sumXY += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }

  const denom = Math.sqrt(sumX2 * sumY2)
  if (denom === 0) return { r: 0, n }

  return { r: sumXY / denom, n }
}

function normalCDF(z: number): number {
  const absZ = Math.abs(z)
  const t = 1 / (1 + 0.2316419 * absZ)
  const d = 0.3989422804 * Math.exp(-absZ * absZ / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744))))
  return z > 0 ? 1 - p : p
}

function approximatePValue(r: number, n: number): number {
  if (n <= 2) return 1
  const absR = Math.abs(r)
  if (absR >= 1) return 0

  const t = absR * Math.sqrt((n - 2) / (1 - absR * absR))
  const df = n - 2

  if (df > 30) {
    return 2 * (1 - normalCDF(t))
  }

  const criticalT05: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042,
  }

  const closestDf = Object.keys(criticalT05)
    .map(Number)
    .reduce((prev, curr) => Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev)

  const critical = criticalT05[closestDf] || 2.0
  return t >= critical ? 0.01 : 0.10
}

function getCorrelationStrength(r: number): string {
  const absR = Math.abs(r)
  if (absR >= 0.7) return 'strong'
  if (absR >= 0.4) return 'moderate'
  if (absR >= 0.2) return 'weak'
  return 'negligible'
}

// ============================================================================
// GOODHART DETECTION (self-contained for Edge Function)
// ============================================================================

function detectGoodhartDivergence(
  history: { composite_score: number }[],
  domainHistories: Record<string, number[]>
): GoodhartAlert | null {
  if (history.length < 5) return null

  const newest = history[0].composite_score
  const oldest = history[Math.min(4, history.length - 1)].composite_score
  const change = newest - oldest

  if (change < 0.05) return null

  // Check how many domains are declining (negative slope)
  let decliningCount = 0
  const decliningDomains: string[] = []

  for (const [domain, scores] of Object.entries(domainHistories)) {
    if (scores.length < 3) continue
    const recent = scores.slice(0, 5)
    const n = recent.length
    const meanX = (n - 1) / 2
    const meanY = recent.reduce((s, v) => s + v, 0) / n
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      num += (i - meanX) * (recent[i] - meanY)
      den += (i - meanX) ** 2
    }
    const slope = den === 0 ? 0 : num / den
    if (slope < -0.02) {
      decliningCount++
      decliningDomains.push(domain)
    }
  }

  if (decliningCount < 2) return null

  const severity = decliningCount >= 3 ? 'critical' : 'warning'
  const names = decliningDomains.join(', ')
  const message = severity === 'critical'
    ? `Atencao: seu Life Score subiu, mas ${decliningCount} areas estao em declinio (${names}). O score pode nao refletir sua situacao real.`
    : `Seu Life Score esta subindo, mas as areas de ${names} estao em declinio. Considere equilibrar sua atencao entre as areas.`

  return {
    alertType: 'score_health_divergence',
    severity,
    message,
    affectedDomains: decliningDomains,
    details: {
      compositeChange: Math.round(change * 1000) / 1000,
      decliningCount,
    },
  }
}

function detectSingleDomainInflation(
  latestDomainScores: Record<string, number>
): GoodhartAlert | null {
  const entries = Object.entries(latestDomainScores)
  if (entries.length < 3) return null

  const scores = entries.map(([, v]) => v)
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length
  if (mean === 0) return null

  const inflated = entries.filter(([, score]) => score / mean >= 1.8)
  if (inflated.length === 0) return null

  const lowDomains = entries.filter(([, score]) => score < mean * 0.6)
  if (lowDomains.length < 2) return null

  const inflatedName = inflated[0][0]
  const inflatedScore = inflated[0][1]
  const lowNames = lowDomains.map(([d]) => d).join(', ')

  return {
    alertType: 'single_domain_inflation',
    severity: inflatedScore / mean >= 2.5 ? 'warning' : 'info',
    message: `A area "${inflatedName}" esta muito acima da media (${(inflatedScore * 100).toFixed(0)}%), enquanto ${lowNames} estao abaixo. Tente distribuir sua atencao.`,
    affectedDomains: [inflatedName, ...lowDomains.map(([d]) => d)],
    details: {
      inflatedDomain: inflatedName,
      inflatedScore,
      meanScore: Math.round(mean * 1000) / 1000,
    },
  }
}

// ============================================================================
// SABBATICAL CHECK (self-contained for Edge Function)
// ============================================================================

function checkSabbaticalEligibility(
  consecutiveDays: number,
  isOnSabbatical: boolean
): SabbaticalInfo['suggestion'] {
  if (isOnSabbatical || consecutiveDays < 30) return null

  if (consecutiveDays >= 60) {
    return {
      eligible: true,
      message: `Voce esta ativo ha ${consecutiveDays} dias consecutivos! Sugerimos uma pausa de 3 dias para recarregar.`,
      suggestedDays: 3,
      urgency: 'strong',
    }
  }
  if (consecutiveDays >= 45) {
    return {
      eligible: true,
      message: `${consecutiveDays} dias consecutivos! Considere uma pausa de 2-3 dias.`,
      suggestedDays: 2,
      urgency: 'moderate',
    }
  }
  return {
    eligible: true,
    message: `Voce esta usando o AICA ha ${consecutiveDays} dias seguidos. Que tal uma pausa de 2 dias?`,
    suggestedDays: 2,
    urgency: 'gentle',
  }
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
    log.info('Computing cross-module intelligence for user:', userId)

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ========================================================================
    // 1. FETCH LIFE SCORE HISTORY (last 30 entries)
    // ========================================================================

    const { data: historyRows } = await supabase
      .from('life_scores')
      .select('composite_score, domain_scores, computed_at')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(30)

    const history = historyRows ?? []

    if (history.length < 3) {
      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: 'Dados insuficientes para analise cross-module. Precisa de pelo menos 3 Life Scores computados.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // 2. BUILD DOMAIN SCORE TIME SERIES
    // ========================================================================

    const domainHistories: Record<string, number[]> = {}
    for (const domain of ALL_DOMAINS) {
      domainHistories[domain] = []
    }

    for (const row of history) {
      const scores = row.domain_scores as Record<string, number> | null
      if (!scores) continue
      for (const domain of ALL_DOMAINS) {
        if (scores[domain] != null) {
          domainHistories[domain].push(scores[domain])
        }
      }
    }

    // ========================================================================
    // 3. COMPUTE CORRELATION MATRIX
    // ========================================================================

    const correlationPairs: CorrelationResult[] = []

    for (let i = 0; i < ALL_DOMAINS.length; i++) {
      for (let j = i + 1; j < ALL_DOMAINS.length; j++) {
        const domainA = ALL_DOMAINS[i]
        const domainB = ALL_DOMAINS[j]
        const xData = domainHistories[domainA]
        const yData = domainHistories[domainB]

        const { r, n } = pearsonCorrelation(xData, yData)
        const pValue = approximatePValue(r, n)
        const isSignificant = pValue < 0.05 && n >= 7

        correlationPairs.push({
          domainA,
          domainB,
          coefficient: Math.round(r * 1000) / 1000,
          sampleSize: n,
          pValue: Math.round(pValue * 1000) / 1000,
          isSignificant,
          strength: getCorrelationStrength(r),
          direction: r >= 0 ? 'positive' : 'negative',
        })
      }
    }

    const significantPairs = correlationPairs.filter(p => p.isSignificant)

    // Store correlations
    if (correlationPairs.length > 0) {
      const corrRows = correlationPairs.map(p => ({
        user_id: userId,
        domain_a: p.domainA,
        domain_b: p.domainB,
        correlation_coefficient: p.coefficient,
        sample_size: p.sampleSize,
        p_value: p.pValue,
        is_significant: p.isSignificant,
        window_days: 30,
      }))

      const { error: corrError } = await supabase
        .from('domain_correlations')
        .upsert(corrRows, { onConflict: 'user_id,domain_a,domain_b,window_days' })

      if (corrError) {
        log.warn('Failed to store correlations:', corrError.message)
      }
    }

    // ========================================================================
    // 4. GOODHART DETECTION
    // ========================================================================

    const alerts: GoodhartAlert[] = []

    const divergenceAlert = detectGoodhartDivergence(history, domainHistories)
    if (divergenceAlert) alerts.push(divergenceAlert)

    // Latest domain scores for inflation check
    if (history.length > 0 && history[0].domain_scores) {
      const latestScores = history[0].domain_scores as Record<string, number>
      const inflationAlert = detectSingleDomainInflation(latestScores)
      if (inflationAlert) alerts.push(inflationAlert)
    }

    // Store alerts
    for (const alert of alerts) {
      const { error: alertError } = await supabase
        .from('goodhart_alerts')
        .insert({
          user_id: userId,
          alert_type: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          affected_domains: alert.affectedDomains,
          details: alert.details,
        })

      if (alertError) {
        log.warn('Failed to store Goodhart alert:', alertError.message)
      }
    }

    // ========================================================================
    // 5. SABBATICAL CHECK
    // ========================================================================

    let sabbatical: SabbaticalInfo = {
      consecutiveActiveDays: 0,
      isOnSabbatical: false,
      suggestion: null,
    }

    const { data: sabbaticalRow } = await supabase
      .from('digital_sabbatical_state')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (sabbaticalRow) {
      const today = new Date().toISOString().split('T')[0]
      const isOnSabbatical = !!(
        sabbaticalRow.sabbatical_accepted &&
        sabbaticalRow.sabbatical_start_date &&
        sabbaticalRow.sabbatical_end_date &&
        sabbaticalRow.sabbatical_start_date <= today &&
        sabbaticalRow.sabbatical_end_date >= today
      )

      const suggestion = checkSabbaticalEligibility(
        sabbaticalRow.consecutive_active_days ?? 0,
        isOnSabbatical
      )

      sabbatical = {
        consecutiveActiveDays: sabbaticalRow.consecutive_active_days ?? 0,
        isOnSabbatical,
        suggestion,
      }
    }

    // ========================================================================
    // 6. LOG ATTRIBUTION (fire-and-forget)
    // ========================================================================

    supabase
      .from('score_attribution_log')
      .insert({
        user_id: userId,
        model_id: 'pearson_correlation',
        previous_score: null,
        new_score: significantPairs.length,
        delta: null,
        trigger_action: 'compute_cross_module_intelligence',
        metadata: {
          total_pairs: correlationPairs.length,
          significant_pairs: significantPairs.length,
          goodhart_alerts: alerts.length,
          sabbatical_eligible: sabbatical.suggestion?.eligible ?? false,
        },
      })
      .then(() => log.info('Attribution logged'))
      .catch((err: Error) => log.warn('Attribution log failed (non-critical):', err.message))

    // ========================================================================
    // 7. RESPONSE
    // ========================================================================

    log.info('Cross-module intelligence computed:', {
      totalPairs: correlationPairs.length,
      significantPairs: significantPairs.length,
      alerts: alerts.length,
      sabbatical: sabbatical.suggestion?.eligible ?? false,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          correlations: {
            pairs: correlationPairs,
            significantPairs,
            strongestPositive: significantPairs
              .filter(p => p.direction === 'positive')
              .sort((a, b) => b.coefficient - a.coefficient)[0] ?? null,
            strongestNegative: significantPairs
              .filter(p => p.direction === 'negative')
              .sort((a, b) => a.coefficient - b.coefficient)[0] ?? null,
            windowDays: 30,
          },
          alerts,
          sabbatical,
          historyEntriesUsed: history.length,
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('compute-cross-module-intelligence failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
