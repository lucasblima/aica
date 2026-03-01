/**
 * compute-life-score Edge Function
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Computes the composite Life Score for a user:
 * 1. Fetches domain scores from per-module tables
 * 2. Gets user's domain weights (or accepts overrides from request body)
 * 3. Computes weighted geometric mean (HDI methodology)
 * 4. Detects negative spirals
 * 5. Stores result in life_scores and score_attribution_log tables
 *
 * Endpoint: POST /functions/v1/compute-life-score
 * Body (optional): { weights?: Record<string, number> }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('compute-life-score')

// ============================================================================
// TYPES
// ============================================================================

interface DomainScore {
  module: string
  normalized: number
  raw: number
  label: string
  confidence: number
  trend: 'improving' | 'stable' | 'declining'
}

interface SpiralAlert {
  detected: boolean
  decliningDomains: string[]
  severity: 'warning' | 'critical'
}

interface RequestBody {
  weights?: Record<string, number>
}

// ============================================================================
// CORRELATED PAIRS (for spiral detection)
// ============================================================================

const CORRELATED_PAIRS = [
  ['journey', 'atlas'],
  ['finance', 'journey'],
  ['connections', 'journey'],
  ['atlas', 'flux'],
  ['finance', 'connections'],
]

const DEFAULT_WEIGHTS: Record<string, number> = {
  atlas: 1,
  journey: 1,
  connections: 1,
  finance: 1,
  grants: 1,
  studio: 1,
  flux: 1,
}

// ============================================================================
// COMPUTATION
// ============================================================================

function computeWeightedGeometricMean(
  domains: DomainScore[],
  weights: Record<string, number>
): number {
  if (domains.length === 0) return 0

  const totalWeight = domains.reduce((sum, d) => sum + (weights[d.module] ?? 1), 0)
  if (totalWeight === 0) return 0

  const logSum = domains.reduce((acc, d) => {
    const w = weights[d.module] ?? 1
    const score = Math.max(d.normalized, 0.01)
    return acc + w * Math.log(score)
  }, 0)

  return Math.exp(logSum / totalWeight)
}

function detectSpiral(domains: DomainScore[]): SpiralAlert {
  const declining = domains.filter(d => d.trend === 'declining').map(d => d.module)
  const correlatedDeclines = CORRELATED_PAIRS.filter(
    ([a, b]) => declining.includes(a) && declining.includes(b)
  )
  const detected = correlatedDeclines.length >= 1 || declining.length >= 3
  const severity: 'warning' | 'critical' =
    correlatedDeclines.length >= 2 || declining.length >= 4 ? 'critical' : 'warning'

  return { detected, decliningDomains: declining, severity }
}

function computeTrend(
  history: { composite_score: number }[]
): 'improving' | 'stable' | 'declining' {
  if (history.length < 3) return 'stable'

  const recent = history.slice(0, 7)
  const n = recent.length
  const meanX = (n - 1) / 2
  const meanY = recent.reduce((s, h) => s + h.composite_score, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (recent[i].composite_score - meanY)
    den += (i - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den

  if (slope > 0.02) return 'improving'
  if (slope < -0.02) return 'declining'
  return 'stable'
}

// ============================================================================
// DOMAIN SCORE FETCHERS
// ============================================================================

/**
 * Fetch domain scores from per-module data.
 * Each module will have its own scoring Edge Function in later sprints.
 * For now, we use available data to generate scores from existing tables.
 */
async function fetchDomainScores(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<DomainScore[]> {
  const domains: DomainScore[] = []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  // Atlas: based on task completion rate
  try {
    const { data: tasks } = await supabase
      .from('work_items')
      .select('status')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)

    if (tasks && tasks.length > 0) {
      const completed = tasks.filter((t: { status: string }) => t.status === 'done').length
      const score = completed / tasks.length
      domains.push({
        module: 'atlas',
        normalized: Math.min(score, 1),
        raw: score * 100,
        label: 'Produtividade',
        confidence: Math.min(tasks.length / 10, 1),
        trend: 'stable',
      })
    }
  } catch (e) {
    log.warn('Atlas scoring skipped:', e)
  }

  // Journey: based on moment frequency
  try {
    const { data: moments } = await supabase
      .from('moments')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)

    if (moments && moments.length > 0) {
      // Normalize: 30 moments/month = 1.0 (one per day)
      const score = Math.min(moments.length / 30, 1)
      domains.push({
        module: 'journey',
        normalized: score,
        raw: moments.length,
        label: 'Bem-estar',
        confidence: Math.min(moments.length / 5, 1),
        trend: 'stable',
      })
    }
  } catch (e) {
    log.warn('Journey scoring skipped:', e)
  }

  // Connections: based on health score average
  try {
    const { data: contacts } = await supabase
      .from('contact_network')
      .select('health_score')
      .eq('user_id', userId)
      .not('health_score', 'is', null)

    if (contacts && contacts.length > 0) {
      const avg = contacts.reduce(
        (s: number, c: { health_score: number }) => s + c.health_score, 0
      ) / contacts.length
      domains.push({
        module: 'connections',
        normalized: avg / 100,
        raw: avg,
        label: 'Relacionamentos',
        confidence: Math.min(contacts.length / 10, 1),
        trend: 'stable',
      })
    }
  } catch (e) {
    log.warn('Connections scoring skipped:', e)
  }

  // Finance: based on transaction categorization rate
  try {
    const { data: txns } = await supabase
      .from('finance_transactions')
      .select('category')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo)

    if (txns && txns.length > 0) {
      const categorized = txns.filter(
        (t: { category: string | null }) => t.category != null
      ).length
      const score = categorized / txns.length
      domains.push({
        module: 'finance',
        normalized: Math.min(score, 1),
        raw: score * 100,
        label: 'Financas',
        confidence: Math.min(txns.length / 20, 1),
        trend: 'stable',
      })
    }
  } catch (e) {
    log.warn('Finance scoring skipped:', e)
  }

  return domains
}

// ============================================================================
// SERVE
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
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
    log.info('Computing Life Score for user:', userId)

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse optional request body for weight overrides
    let bodyWeights: Record<string, number> | undefined
    try {
      const body: RequestBody = await req.json()
      if (body.weights && typeof body.weights === 'object') {
        bodyWeights = body.weights
      }
    } catch {
      // Empty body is fine — weights will come from DB or defaults
    }

    // 1. Fetch domain scores from existing module data
    const domainScores = await fetchDomainScores(supabase, userId)

    if (domainScores.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: 'Insufficient data to compute Life Score. Use more AICA modules to generate scores.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Determine weights: body override > DB > defaults
    let weights: Record<string, number> = { ...DEFAULT_WEIGHTS }

    if (bodyWeights) {
      weights = { ...weights, ...bodyWeights }
    } else {
      const { data: weightRow } = await supabase
        .from('user_domain_weights')
        .select('weights')
        .eq('user_id', userId)
        .single()

      if (weightRow?.weights) {
        weights = { ...weights, ...weightRow.weights }
      }
    }

    // 3. Fetch recent history for trend computation
    const { data: historyRows } = await supabase
      .from('life_scores')
      .select('composite_score')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(10)

    const previousScore = historyRows?.[0]?.composite_score ?? null

    // 4. Compute
    const composite = computeWeightedGeometricMean(domainScores, weights)
    const trend = computeTrend(historyRows ?? [])
    const spiral = detectSpiral(domainScores)

    // 5. Build domain scores JSONB
    const domainScoresMap: Record<string, number> = {}
    for (const d of domainScores) {
      domainScoresMap[d.module] = d.normalized
    }

    // 6. Insert into life_scores
    const { error: insertError } = await supabase
      .from('life_scores')
      .insert({
        user_id: userId,
        domain_scores: domainScoresMap,
        domain_weights: weights,
        composite_score: composite,
        trend,
        spiral_detected: spiral.detected,
        spiral_domains: spiral.decliningDomains,
      })

    if (insertError) {
      log.error('Failed to store Life Score:', insertError.message)
    }

    // 7. Insert attribution log (fire-and-forget)
    const delta = previousScore !== null ? composite - previousScore : null
    supabase
      .from('score_attribution_log')
      .insert({
        user_id: userId,
        model_id: 'life_score',
        previous_score: previousScore,
        new_score: composite,
        delta,
        trigger_action: 'compute_life_score',
        metadata: {
          domains_computed: domainScores.length,
          domain_modules: domainScores.map(d => d.module),
          spiral_detected: spiral.detected,
        },
      })
      .then(() => {
        log.info('Attribution log recorded')
      })
      .catch((err: Error) => {
        log.warn('Attribution log failed (non-critical):', err.message)
      })

    log.info('Life Score computed:', {
      composite: composite.toFixed(3),
      domains: domainScores.length,
      trend,
      spiral: spiral.detected,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          composite,
          domainScores: domainScoresMap,
          domainDetails: domainScores.map(d => ({
            module: d.module,
            label: d.label,
            normalized: d.normalized,
            raw: d.raw,
            confidence: d.confidence,
            trend: d.trend,
          })),
          domainWeights: weights,
          trend,
          spiralAlert: {
            detected: spiral.detected,
            decliningDomains: spiral.decliningDomains,
            severity: spiral.severity,
          },
          domainsComputed: domainScores.length,
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('compute-life-score failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
