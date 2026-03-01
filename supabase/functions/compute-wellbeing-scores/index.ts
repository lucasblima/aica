/**
 * compute-wellbeing-scores Edge Function
 * Issue #575, Sprint 3: Journey Validated Psychometric Well-Being
 *
 * Computes wellbeing dimension scores from assessment responses and EMA check-ins:
 * 1. Authenticates user via JWT
 * 2. Fetches latest assessment_responses for each instrument
 * 3. Fetches recent EMA check-ins (7 days)
 * 4. Computes wellbeing dimension scores:
 *    - positive_emotion: from PERMA P subscale or PANAS PA
 *    - engagement: from PERMA E subscale
 *    - relationships: from PERMA R subscale
 *    - meaning: from PERMA M subscale
 *    - accomplishment: from PERMA A subscale
 *    - life_satisfaction: from SWLS
 *    - mindfulness: from MAAS
 *    - affect_balance: from EMA valence average
 *    - financial_wellbeing: from InCharge
 * 5. Stores results in wellbeing_scores table
 * 6. Returns computed scores
 *
 * Endpoint: POST /functions/v1/compute-wellbeing-scores
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('compute-wellbeing-scores')

// ============================================================================
// TYPES
// ============================================================================

interface AssessmentRow {
  id: string
  instrument: string
  version: string
  subscale_scores: Record<string, number> | null
  composite_score: number | null
  administered_at: string
}

interface EMARow {
  id: string
  checkin_type: string
  valence: number | null
  arousal: number | null
  energy_level: number | null
  focus_level: number | null
  panas_positive: number | null
  panas_negative: number | null
  checked_in_at: string
}

interface WellbeingDimension {
  dimension: string
  score: number
  rawScore: number | null
  methodology: string
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

/**
 * Normalize a PERMA subscale score (0-10 range) to 0-1.
 */
function normalizePerma(score: number): number {
  return Math.max(0, Math.min(1, score / 10))
}

/**
 * Normalize SWLS sum score (5-35 range) to 0-1.
 */
function normalizeSwls(score: number): number {
  return Math.max(0, Math.min(1, (score - 5) / 30))
}

/**
 * Normalize MAAS mean score (1-6 range) to 0-1.
 */
function normalizeMaas(score: number): number {
  return Math.max(0, Math.min(1, (score - 1) / 5))
}

/**
 * Normalize PANAS positive affect sum (10-50 range) to 0-1.
 */
function normalizePanasPA(score: number): number {
  return Math.max(0, Math.min(1, (score - 10) / 40))
}

/**
 * Normalize InCharge mean score (1-10 range) to 0-1.
 */
function normalizeIncharge(score: number): number {
  return Math.max(0, Math.min(1, (score - 1) / 9))
}

/**
 * Normalize Affect Grid valence (1-9) to 0-1.
 */
function normalizeValence(score: number): number {
  return Math.max(0, Math.min(1, (score - 1) / 8))
}

// ============================================================================
// SCORE COMPUTATION
// ============================================================================

function computeWellbeingDimensions(
  assessments: Record<string, AssessmentRow>,
  emaCheckins: EMARow[]
): WellbeingDimension[] {
  const dimensions: WellbeingDimension[] = []

  // --- PERMA subscales ---
  const perma = assessments['perma_profiler']
  if (perma?.subscale_scores) {
    const ss = perma.subscale_scores

    if (ss.positive_emotion != null) {
      dimensions.push({
        dimension: 'positive_emotion',
        score: normalizePerma(ss.positive_emotion),
        rawScore: ss.positive_emotion,
        methodology: 'PERMA-Profiler P subscale (Butler & Kern, 2016)',
      })
    }

    if (ss.engagement != null) {
      dimensions.push({
        dimension: 'engagement',
        score: normalizePerma(ss.engagement),
        rawScore: ss.engagement,
        methodology: 'PERMA-Profiler E subscale (Butler & Kern, 2016)',
      })
    }

    if (ss.relationships != null) {
      dimensions.push({
        dimension: 'relationships',
        score: normalizePerma(ss.relationships),
        rawScore: ss.relationships,
        methodology: 'PERMA-Profiler R subscale (Butler & Kern, 2016)',
      })
    }

    if (ss.meaning != null) {
      dimensions.push({
        dimension: 'meaning',
        score: normalizePerma(ss.meaning),
        rawScore: ss.meaning,
        methodology: 'PERMA-Profiler M subscale (Butler & Kern, 2016)',
      })
    }

    if (ss.accomplishment != null) {
      dimensions.push({
        dimension: 'accomplishment',
        score: normalizePerma(ss.accomplishment),
        rawScore: ss.accomplishment,
        methodology: 'PERMA-Profiler A subscale (Butler & Kern, 2016)',
      })
    }
  }

  // --- Positive emotion fallback from PANAS ---
  if (!perma?.subscale_scores?.positive_emotion) {
    const panas = assessments['panas']
    if (panas?.subscale_scores?.positive_affect != null) {
      dimensions.push({
        dimension: 'positive_emotion',
        score: normalizePanasPA(panas.subscale_scores.positive_affect),
        rawScore: panas.subscale_scores.positive_affect,
        methodology: 'PANAS PA subscale (Watson, Clark & Tellegen, 1988)',
      })
    }
  }

  // --- Life Satisfaction from SWLS ---
  const swls = assessments['swls']
  if (swls?.subscale_scores?.life_satisfaction != null) {
    dimensions.push({
      dimension: 'life_satisfaction',
      score: normalizeSwls(swls.subscale_scores.life_satisfaction),
      rawScore: swls.subscale_scores.life_satisfaction,
      methodology: 'SWLS (Diener et al., 1985)',
    })
  }

  // --- Mindfulness from MAAS ---
  const maas = assessments['maas']
  if (maas?.subscale_scores?.mindfulness != null) {
    dimensions.push({
      dimension: 'mindfulness',
      score: normalizeMaas(maas.subscale_scores.mindfulness),
      rawScore: maas.subscale_scores.mindfulness,
      methodology: 'MAAS (Brown & Ryan, 2003)',
    })
  }

  // --- Financial Well-being from InCharge ---
  const incharge = assessments['incharge']
  if (incharge?.subscale_scores?.financial_wellbeing != null) {
    dimensions.push({
      dimension: 'financial_wellbeing',
      score: normalizeIncharge(incharge.subscale_scores.financial_wellbeing),
      rawScore: incharge.subscale_scores.financial_wellbeing,
      methodology: 'InCharge FDW Scale (Prawitz et al., 2006)',
    })
  }

  // --- Affect Balance from EMA valence average (7 days) ---
  const valenceValues = emaCheckins
    .filter(c => c.valence != null)
    .map(c => c.valence as number)

  if (valenceValues.length > 0) {
    const avgValence = valenceValues.reduce((a, b) => a + b, 0) / valenceValues.length
    dimensions.push({
      dimension: 'affect_balance',
      score: normalizeValence(avgValence),
      rawScore: avgValence,
      methodology: 'EMA Affect Grid valence average (Russell et al., 1989)',
    })
  }

  return dimensions
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
    log.info('Computing wellbeing scores for user:', userId)

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Fetch latest assessment for each instrument via direct query
    //    (service role client bypasses RLS, so we filter by user_id explicitly)
    const instruments = ['perma_profiler', 'swls', 'panas', 'maas', 'affect_grid', 'incharge']
    const assessmentRows: AssessmentRow[] = []

    for (const inst of instruments) {
      const { data: row } = await supabase
        .from('assessment_responses')
        .select('id, instrument, version, subscale_scores, composite_score, administered_at')
        .eq('user_id', userId)
        .eq('instrument', inst)
        .order('administered_at', { ascending: false })
        .limit(1)
        .single()

      if (row) {
        assessmentRows.push(row as AssessmentRow)
      }
    }

    // Index by instrument
    const assessmentsByInstrument: Record<string, AssessmentRow> = {}
    for (const row of assessmentRows) {
      assessmentsByInstrument[row.instrument] = row
    }

    log.info('Assessments found:', {
      count: assessmentRows.length,
      instruments: assessmentRows.map(r => r.instrument),
    })

    // 2. Fetch recent EMA check-ins (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: emaRows, error: emaError } = await supabase
      .from('ema_checkins')
      .select('id, checkin_type, valence, arousal, energy_level, focus_level, panas_positive, panas_negative, checked_in_at')
      .eq('user_id', userId)
      .gte('checked_in_at', sevenDaysAgo)
      .order('checked_in_at', { ascending: false })

    if (emaError) {
      log.warn('EMA fetch error (non-critical):', emaError.message)
    }

    const emaCheckins = (emaRows ?? []) as EMARow[]
    log.info('EMA check-ins found:', { count: emaCheckins.length })

    // 3. Compute wellbeing dimension scores
    const dimensions = computeWellbeingDimensions(assessmentsByInstrument, emaCheckins)

    if (dimensions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: 'Insufficient data to compute wellbeing scores. Complete at least one assessment.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Store results in wellbeing_scores table
    const insertRows = dimensions.map(d => ({
      user_id: userId,
      dimension: d.dimension,
      score: d.score,
      raw_score: d.rawScore,
      methodology: d.methodology,
    }))

    const { error: insertError } = await supabase
      .from('wellbeing_scores')
      .insert(insertRows)

    if (insertError) {
      log.error('Failed to store wellbeing scores:', insertError.message)
    } else {
      log.info('Wellbeing scores stored:', { dimensions: dimensions.length })
    }

    // 5. Build response
    const scoreMap: Record<string, number> = {}
    const detailMap: Record<string, { score: number; rawScore: number | null; methodology: string }> = {}
    for (const d of dimensions) {
      scoreMap[d.dimension] = d.score
      detailMap[d.dimension] = {
        score: d.score,
        rawScore: d.rawScore,
        methodology: d.methodology,
      }
    }

    log.info('Wellbeing scores computed:', {
      dimensions: dimensions.length,
      scores: Object.entries(scoreMap).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(', '),
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          scores: scoreMap,
          details: detailMap,
          dimensionsComputed: dimensions.length,
          assessmentsUsed: assessmentRows.map(r => r.instrument),
          emaCheckinsUsed: emaCheckins.length,
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('compute-wellbeing-scores failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
