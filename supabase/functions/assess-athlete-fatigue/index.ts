/**
 * assess-athlete-fatigue Edge Function
 * Sprint 6: Flux Training Science — Fatigue Assessment
 *
 * Computes CTL/ATL/TSB and readiness score for an athlete:
 * 1. Validates auth via JWT
 * 2. Fetches training_stress_history for athlete
 * 3. Computes EMA-based load metrics
 * 4. Classifies fatigue risk (Halson 2014)
 * 5. Computes readiness score
 * 6. Updates athlete record with readiness + fatigue risk
 * 7. Returns assessment
 *
 * Endpoint: POST /functions/v1/assess-athlete-fatigue
 * Body: { athleteId: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('assess-athlete-fatigue')

// ============================================================================
// EMA CONSTANTS (Banister 1991)
// ============================================================================

const CTL_DAYS = 42
const ATL_DAYS = 7
const CTL_DECAY = 2 / (CTL_DAYS + 1)
const ATL_DECAY = 2 / (ATL_DAYS + 1)

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

function computeEMA(tssHistory: number[], decay: number): number[] {
  if (tssHistory.length === 0) return []
  const ema: number[] = [tssHistory[0]]
  for (let i = 1; i < tssHistory.length; i++) {
    ema.push(tssHistory[i] * decay + ema[i - 1] * (1 - decay))
  }
  return ema
}

function classifyFatigueRisk(tsb: number): 'low' | 'moderate' | 'high' | 'overtraining' {
  if (tsb < -30) return 'overtraining'
  if (tsb < -10) return 'high'
  if (tsb < 5) return 'moderate'
  return 'low'
}

function computeACWR(atl: number, ctl: number): number {
  if (ctl <= 0) return atl > 0 ? 2.0 : 0
  return atl / ctl
}

function assessReadiness(
  tssValues: number[],
  recentRPEs: number[]
): {
  readinessScore: number
  fatigueRisk: string
  ctl: number
  atl: number
  tsb: number
  acwr: number
  recommendation: string
  suggestedIntensity: string
} {
  const ctlArr = computeEMA(tssValues, CTL_DECAY)
  const atlArr = computeEMA(tssValues, ATL_DECAY)

  const ctl = ctlArr[ctlArr.length - 1] || 0
  const atl = atlArr[atlArr.length - 1] || 0
  const tsb = ctl - atl
  const fatigueRisk = classifyFatigueRisk(tsb)
  const acwr = computeACWR(atl, ctl)

  // Readiness score components
  const tsbComponent = Math.max(0, Math.min(100, (tsb + 30) * (100 / 60)))
  const acwrComponent = acwr >= 0.8 && acwr <= 1.3 ? 100 :
    acwr < 0.8 ? 60 :
    acwr <= 1.5 ? 50 : 20

  const avgRPE = recentRPEs.length > 0
    ? recentRPEs.reduce((s, v) => s + v, 0) / recentRPEs.length
    : 5
  const rpeComponent = Math.max(0, (10 - avgRPE) * 10)

  const readinessScore = Math.round(
    0.40 * tsbComponent +
    0.30 * acwrComponent +
    0.30 * rpeComponent
  )

  const suggestedIntensity =
    readinessScore >= 80 ? 'hard' :
    readinessScore >= 65 ? 'moderate' :
    readinessScore >= 45 ? 'easy' :
    readinessScore >= 25 ? 'recovery' : 'rest'

  const recommendation =
    fatigueRisk === 'overtraining'
      ? 'ALERTA: Risco de overtraining detectado. Reduza volume imediatamente.'
      : fatigueRisk === 'high'
      ? 'Fadiga elevada. Priorize recuperacao ativa ou descanso.'
      : fatigueRisk === 'moderate'
      ? 'Carga moderada. Treino normal pode continuar, monitore fadiga.'
      : acwr > 1.5
      ? 'Carga aguda alta vs cronico. Reduza volume para evitar lesoes.'
      : readinessScore >= 80
      ? 'Atleta descansado e pronto para treino intenso.'
      : 'Condicoes normais para treino. Siga o plano programado.'

  return {
    readinessScore,
    fatigueRisk,
    ctl: Math.round(ctl * 100) / 100,
    atl: Math.round(atl * 100) / 100,
    tsb: Math.round(tsb * 100) / 100,
    acwr: Math.round(acwr * 100) / 100,
    recommendation,
    suggestedIntensity,
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

    // Auth client for JWT verification
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

    // Parse body
    const body = await req.json()
    const { athleteId } = body

    if (!athleteId) {
      return new Response(
        JSON.stringify({ success: false, error: 'athleteId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    log.info('Assessing fatigue for athlete:', { athleteId, userId })

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify athlete belongs to user
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, name')
      .eq('id', athleteId)
      .eq('user_id', userId)
      .single()

    if (athleteError || !athlete) {
      return new Response(
        JSON.stringify({ success: false, error: 'Athlete not found or not owned by user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch stress history (last 60 days)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)

    const { data: history, error: historyError } = await supabase
      .from('training_stress_history')
      .select('tss, rpe, date')
      .eq('athlete_id', athleteId)
      .eq('user_id', userId)
      .gte('date', cutoff.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (historyError) throw historyError

    if (!history || history.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: 'Sem historico de treino para avaliar. Registre sessoes primeiro.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Compute assessment
    const tssValues = history.map((h: { tss: number }) => h.tss || 0)
    const recentRPEs = history
      .slice(-7)
      .filter((h: { rpe: number | null }) => h.rpe !== null)
      .map((h: { rpe: number }) => h.rpe)

    const assessment = assessReadiness(tssValues, recentRPEs)

    // Update athlete record
    const { error: updateError } = await supabase
      .from('athletes')
      .update({
        readiness_score: assessment.readinessScore,
        fatigue_risk: assessment.fatigueRisk,
      })
      .eq('id', athleteId)
      .eq('user_id', userId)

    if (updateError) {
      log.warn('Failed to update athlete readiness:', updateError.message)
    }

    // Log attribution
    supabase
      .from('score_attribution_log')
      .insert({
        user_id: userId,
        model_id: 'training_stress_balance',
        previous_score: null,
        new_score: assessment.readinessScore,
        delta: null,
        trigger_action: 'assess_athlete_fatigue',
        metadata: {
          athlete_id: athleteId,
          ctl: assessment.ctl,
          atl: assessment.atl,
          tsb: assessment.tsb,
          acwr: assessment.acwr,
          fatigue_risk: assessment.fatigueRisk,
          sessions_analyzed: history.length,
        },
      })
      .then(() => log.info('Attribution log recorded'))
      .catch((err: Error) => log.warn('Attribution log failed:', err.message))

    log.info('Fatigue assessment complete:', {
      athleteId,
      readiness: assessment.readinessScore,
      risk: assessment.fatigueRisk,
      tsb: assessment.tsb,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          readiness: assessment.readinessScore,
          fatigueRisk: assessment.fatigueRisk,
          ctl: assessment.ctl,
          atl: assessment.atl,
          tsb: assessment.tsb,
          acwr: assessment.acwr,
          recommendation: assessment.recommendation,
          suggestedIntensity: assessment.suggestedIntensity,
          sessionsAnalyzed: history.length,
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('assess-athlete-fatigue failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
