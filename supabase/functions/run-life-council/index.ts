/**
 * Life Council — Fan-out/Fan-in AI Daily Insight Generator
 *
 * Executes 3 AI personas in parallel (Philosopher, Strategist, Bio-Hacker)
 * then synthesizes their outputs into a single Daily Insight.
 *
 * Architecture adapted from OpenClaw's Council of Agents pattern.
 *
 * @see docs/OPENCLAW_ADAPTATION.md Section 1
 * @issue #254
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { callAI, extractJSON } from "../_shared/model-router.ts"
import { withHealthTracking } from "../_shared/health-tracker.ts"

// ============================================================================
// CORS
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dev.aica.guru',
  'https://aica.guru',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================================================
// PERSONA PROMPTS
// ============================================================================

const PHILOSOPHER_PROMPT = `Voce e um terapeuta humanista e filosofo pratico. Analise os registros emocionais das ultimas 24 horas do usuario.

DADOS DO JOURNEY (momentos):
{moments}

Identifique:
1. Padrao emocional dominante (ansiedade, gratidao, frustracao, serenidade, motivacao, melancolia)
2. Possiveis gatilhos de estresse ou desconforto
3. Sinais de desalinhamento entre valores declarados e acoes tomadas
4. Uma reflexao acolhedora e pratica (2-3 frases, em portugues brasileiro)

Responda APENAS em JSON valido:
{
  "pattern": "string - padrao emocional dominante",
  "triggers": ["string - gatilhos identificados"],
  "misalignment": "string ou null - desalinhamento detectado",
  "reflection": "string - reflexao acolhedora em portugues"
}`

const STRATEGIST_PROMPT = `Voce e um COO experiente e estrategista de produtividade. Analise as tarefas e produtividade das ultimas 24 horas.

TAREFAS (Atlas):
{tasks}

RELATORIO DIARIO (se disponivel):
{daily_report}

Analise:
1. Taxa de conclusao (tarefas completadas / total visivel)
2. Alinhamento com Eisenhower (quais quadrantes foram priorizados? Q1 urgente, Q2 importante, Q3 delegavel, Q4 eliminar)
3. Gargalos identificados (tarefas atrasadas, sem deadline, acumulo)
4. Uma sugestao tatica concreta para as proximas 24 horas

Responda APENAS em JSON valido:
{
  "completionRate": "string - ex: 5/8 (62%)",
  "quadrantFocus": "string - qual quadrante foi mais trabalhado",
  "bottlenecks": ["string - gargalos encontrados"],
  "tacticalAdvice": "string - sugestao pratica para amanha em portugues"
}`

const BIOHACKER_PROMPT = `Voce e um coach de performance e biohacker. Analise os horarios de atividade do usuario nas ultimas 48 horas.

HORARIOS DE ATIVIDADE (timestamps dos registros):
{activity_times}

Analise:
1. Horario estimado do primeiro e ultimo registro do dia (proxy para acordar/dormir)
2. Distribuicao de atividade: manha (6-12h), tarde (12-18h), noite (18-24h), madrugada (0-6h)
3. Sinais de privacao de sono (registros muito tarde/muito cedo) ou excesso de trabalho (atividade continua por muitas horas)
4. Uma sugestao de otimizacao de rotina baseada nos dados

Responda APENAS em JSON valido:
{
  "sleepEstimate": "string - ex: Dormiu ~23h, acordou ~7h (8h estimadas)",
  "activityDistribution": {"manha": 0, "tarde": 0, "noite": 0, "madrugada": 0},
  "overworkSignals": ["string - sinais de sobrecarga identificados"],
  "routineAdvice": "string - sugestao de otimizacao em portugues"
}`

const SYNTHESIS_PROMPT = `Voce e o Conselheiro-Chefe do usuario. Recebeu 3 analises independentes de especialistas:

FILOSOFO/TERAPEUTA:
{philosopher}

ESTRATEGISTA/COO:
{strategist}

BIO-HACKER/COACH:
{biohacker}
{life_score_context}
Sintetize um "Daily Insight" unico que:
1. RESOLVA CONFLITOS entre perspectivas (ex: Estrategista quer mais trabalho, mas Filosofo detectou burnout → sugira descanso estrategico)
2. Priorize na ordem: SAUDE > CONSCIENCIA > PRODUTIVIDADE
3. Gere 1-3 acoes concretas e realizaveis para hoje/amanha
4. Tom: acolhedor, pratico, motivador. Em portugues brasileiro.

Responda APENAS em JSON valido:
{
  "overallStatus": "thriving | balanced | strained | burnout_risk",
  "headline": "string max 100 chars - titulo do insight do dia",
  "synthesis": "string - 2-3 paragrafos com a sintese integrada",
  "actions": [
    {"action": "string - acao concreta", "module": "journey | atlas | connections | flux", "priority": "high | medium"}
  ],
  "conflictsResolved": ["string - conflitos que foram resolvidos entre as perspectivas"]
}`

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const userId = body.userId

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const startTime = Date.now()

    // =====================================================================
    // STEP 1: Data Collection
    // =====================================================================

    const { data: context, error: contextError } = await supabaseClient
      .rpc('get_council_context', { p_user_id: userId })

    if (contextError) {
      console.error('[LIFE-COUNCIL] Context fetch error:', contextError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch context', details: contextError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Minimum data requirement: at least 1 moment or 1 task
    const momentsCount = context?.moments_count || 0
    const tasksCount = context?.tasks_count || 0

    if (momentsCount === 0 && tasksCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'insufficient_data',
          message: 'Precisamos de pelo menos 1 momento no Journey ou 1 tarefa no Atlas para gerar o insight.',
          momentsCount,
          tasksCount,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================================
    // STEP 1b: Fetch Life Score for holistic context
    // =====================================================================

    let lifeScoreContext = ''
    try {
      const { data: latestScore } = await supabaseClient
        .from('life_scores')
        .select('composite_score, domain_scores, trend, spiral_detected, spiral_domains, computed_at')
        .eq('user_id', userId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestScore) {
        const domains = latestScore.domain_scores as Record<string, number> || {}
        const domainLabels: Record<string, string> = {
          atlas: 'Produtividade', journey: 'Bem-estar', finance: 'Finanças',
          flux: 'Treinamento', connections: 'Relacionamentos', grants: 'Captação', studio: 'Produção',
        }
        const domainLines = Object.entries(domains)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${domainLabels[k] || k}: ${Math.round(v * 100)}%`)
          .join(', ')

        lifeScoreContext = `\n\nLIFE SCORE ATUAL (dados reais do sistema):\n`
          + `Score composto: ${Math.round(latestScore.composite_score * 100)}/100\n`
          + `Domínios: ${domainLines}\n`
          + `Tendência: ${latestScore.trend || 'estável'}\n`
          + `Alerta de espiral: ${latestScore.spiral_detected ? `SIM — domínios em declínio: ${(latestScore.spiral_domains || []).join(', ')}` : 'Não detectado'}\n`
          + `Última atualização: ${latestScore.computed_at}\n`
      }
    } catch (err) {
      console.warn('[LIFE-COUNCIL] Life Score fetch failed (non-critical):', err)
    }

    // =====================================================================
    // STEP 2: Fan-out — 3 Personas in Parallel (Gemini Flash)
    // =====================================================================

    const momentsStr = JSON.stringify(context.moments || [], null, 2)
    const tasksStr = JSON.stringify(context.tasks || [], null, 2)
    const reportStr = JSON.stringify(context.daily_report || {}, null, 2)
    const activityStr = JSON.stringify(context.activity_times || [], null, 2)

    const personaPromises = [
      // Persona 1: Philosopher
      withHealthTracking(
        { functionName: 'run-life-council', actionName: 'philosopher' },
        supabaseClient,
        () => callAI({
          prompt: PHILOSOPHER_PROMPT.replace('{moments}', momentsStr),
          complexity: 'low',
          expectJson: true,
          temperature: 0.3,
        })
      ),
      // Persona 2: Strategist
      withHealthTracking(
        { functionName: 'run-life-council', actionName: 'strategist' },
        supabaseClient,
        () => callAI({
          prompt: STRATEGIST_PROMPT
            .replace('{tasks}', tasksStr)
            .replace('{daily_report}', reportStr),
          complexity: 'low',
          expectJson: true,
          temperature: 0.2,
        })
      ),
      // Persona 3: Bio-Hacker
      withHealthTracking(
        { functionName: 'run-life-council', actionName: 'biohacker' },
        supabaseClient,
        () => callAI({
          prompt: BIOHACKER_PROMPT.replace('{activity_times}', activityStr),
          complexity: 'low',
          expectJson: true,
          temperature: 0.2,
        })
      ),
    ]

    const [philosopherResult, strategistResult, biohackerResult] = await Promise.all(personaPromises)

    // Parse persona outputs
    let philosopherOutput, strategistOutput, biohackerOutput
    try {
      philosopherOutput = extractJSON(philosopherResult.text)
    } catch {
      philosopherOutput = { pattern: 'unknown', triggers: [], misalignment: null, reflection: 'Dados insuficientes para analise emocional.' }
    }
    try {
      strategistOutput = extractJSON(strategistResult.text)
    } catch {
      strategistOutput = { completionRate: 'N/A', quadrantFocus: 'unknown', bottlenecks: [], tacticalAdvice: 'Continue focando nas prioridades.' }
    }
    try {
      biohackerOutput = extractJSON(biohackerResult.text)
    } catch {
      biohackerOutput = { sleepEstimate: 'N/A', activityDistribution: {}, overworkSignals: [], routineAdvice: 'Mantenha sua rotina atual.' }
    }

    // =====================================================================
    // STEP 3: Fan-in — Synthesis (Gemini Pro)
    // =====================================================================

    const synthesisResult = await withHealthTracking(
      { functionName: 'run-life-council', actionName: 'synthesis' },
      supabaseClient,
      () => callAI({
        prompt: SYNTHESIS_PROMPT
          .replace('{philosopher}', JSON.stringify(philosopherOutput, null, 2))
          .replace('{strategist}', JSON.stringify(strategistOutput, null, 2))
          .replace('{biohacker}', JSON.stringify(biohackerOutput, null, 2))
          .replace('{life_score_context}', lifeScoreContext),
        complexity: 'high',
        expectJson: true,
        temperature: 0.5,
      })
    )

    let synthesis
    try {
      synthesis = extractJSON<{
        overallStatus: string
        headline: string
        synthesis: string
        actions: Array<{ action: string; module: string; priority: string }>
        conflictsResolved: string[]
      }>(synthesisResult.text)
    } catch {
      synthesis = {
        overallStatus: 'balanced',
        headline: 'Dia em equilibrio — continue assim!',
        synthesis: 'Nao foi possivel gerar uma sintese completa com os dados disponiveis.',
        actions: [],
        conflictsResolved: [],
      }
    }

    // =====================================================================
    // STEP 4: Log interaction + Save to Database
    // =====================================================================

    const totalTokensIn =
      philosopherResult.tokens.input +
      strategistResult.tokens.input +
      biohackerResult.tokens.input +
      synthesisResult.tokens.input

    const totalTokensOut =
      philosopherResult.tokens.output +
      strategistResult.tokens.output +
      biohackerResult.tokens.output +
      synthesisResult.tokens.output

    const totalTokens = totalTokensIn + totalTokensOut

    // Fire-and-forget usage tracking
    supabaseClient.rpc('log_interaction', {
      p_user_id: userId,
      p_action: 'life_council',
      p_module: 'journey',
      p_model: synthesisResult.model,
      p_tokens_in: totalTokensIn,
      p_tokens_out: totalTokensOut,
    }).then(() => {
      console.log('[run-life-council] Logged interaction')
    }).catch((err: any) => {
      console.warn('[run-life-council] Failed to log interaction:', err.message)
    })

    const processingTime = Date.now() - startTime

    // Validate overallStatus
    const validStatuses = ['thriving', 'balanced', 'strained', 'burnout_risk']
    const overallStatus = validStatuses.includes(synthesis.overallStatus)
      ? synthesis.overallStatus
      : 'balanced'

    const { data: saved, error: saveError } = await supabaseClient
      .from('daily_council_insights')
      .upsert({
        user_id: userId,
        insight_date: new Date().toISOString().split('T')[0],
        philosopher_output: philosopherOutput,
        strategist_output: strategistOutput,
        biohacker_output: biohackerOutput,
        overall_status: overallStatus,
        headline: (synthesis.headline || '').substring(0, 200),
        synthesis: synthesis.synthesis || '',
        actions: synthesis.actions || [],
        conflicts_resolved: synthesis.conflictsResolved || [],
        model_used: synthesisResult.model,
        total_tokens_used: totalTokens,
        processing_time_ms: processingTime,
        data_sources: {
          moments_count: momentsCount,
          tasks_count: tasksCount,
          has_daily_report: !!context.daily_report?.report_content,
        },
      }, { onConflict: 'user_id,insight_date' })
      .select('id')
      .single()

    if (saveError) {
      console.error('[LIFE-COUNCIL] Save error:', saveError)
    }

    // =====================================================================
    // RESPONSE
    // =====================================================================

    return new Response(
      JSON.stringify({
        success: true,
        insight: {
          id: saved?.id,
          overall_status: overallStatus,
          headline: synthesis.headline,
          synthesis: synthesis.synthesis,
          actions: synthesis.actions,
          conflicts_resolved: synthesis.conflictsResolved,
          personas: {
            philosopher: philosopherOutput,
            strategist: strategistOutput,
            biohacker: biohackerOutput,
          },
        },
        metadata: {
          total_tokens: totalTokens,
          processing_time_ms: processingTime,
          models_used: {
            personas: philosopherResult.model,
            synthesis: synthesisResult.model,
          },
          escalations: {
            philosopher: philosopherResult.wasEscalated,
            strategist: strategistResult.wasEscalated,
            biohacker: biohackerResult.wasEscalated,
            synthesis: synthesisResult.wasEscalated,
          },
          data_sources: {
            moments: momentsCount,
            tasks: tasksCount,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[LIFE-COUNCIL] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
