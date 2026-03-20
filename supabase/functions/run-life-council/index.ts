/**
 * Life Council — Fan-out/Fan-in AI Daily Insight Generator
 *
 * Executes up to 5 AI personas dynamically based on available module data,
 * then synthesizes their outputs into a single Daily Insight.
 *
 * Personas:
 * - Philosopher (Journey) — emotional pattern analysis
 * - Strategist (Atlas) — productivity & task analysis
 * - Bio-Hacker (Journey activity + Flux) — sleep, routine, training
 * - Financial Advisor (Finance) — spending, income/expense ratio
 * - Relationship Coach (Connections) — contact health, attention needs
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

const BIOHACKER_PROMPT = `Voce e um coach de performance e biohacker. Analise os horarios de atividade e dados de treinamento do usuario.

HORARIOS DE ATIVIDADE (timestamps dos registros, ultimas 48h):
{activity_times}

DADOS DE TREINAMENTO (Flux, se disponivel):
{flux_data}

Analise:
1. Horario estimado do primeiro e ultimo registro do dia (proxy para acordar/dormir)
2. Distribuicao de atividade: manha (6-12h), tarde (12-18h), noite (18-24h), madrugada (0-6h)
3. Sinais de privacao de sono ou excesso de trabalho
4. Se houver dados de treino: avalie consistencia (completion rate), variedade de modalidades, e equilibrio treino/recuperacao
5. Uma sugestao de otimizacao de rotina integrada (sono + treino + energia)

Responda APENAS em JSON valido:
{
  "sleepEstimate": "string - ex: Dormiu ~23h, acordou ~7h (8h estimadas)",
  "activityDistribution": {"manha": 0, "tarde": 0, "noite": 0, "madrugada": 0},
  "overworkSignals": ["string - sinais de sobrecarga identificados"],
  "trainingInsight": "string ou null - insight sobre treinamento se dados disponíveis",
  "routineAdvice": "string - sugestao de otimizacao em portugues"
}`

const FINANCIAL_ADVISOR_PROMPT = `Voce e um consultor financeiro pessoal. Analise os dados financeiros dos ultimos 30 dias do usuario.

RESUMO FINANCEIRO:
{finance_data}

Analise:
1. Relacao receita/despesa (income/expense ratio) — saudavel se > 1.2
2. Top categorias de gasto e se ha concentracao excessiva
3. Padrao de gastos (crescente, estavel, decrescente)
4. Uma sugestao financeira pratica e especifica para o proximo mes

Responda APENAS em JSON valido:
{
  "incomeExpenseRatio": "string - ex: 1.35 (saudavel)",
  "topExpenseCategories": ["string - categoria: valor"],
  "spendingPattern": "string - crescente | estavel | decrescente",
  "financialAdvice": "string - sugestao pratica em portugues"
}`

const RELATIONSHIP_COACH_PROMPT = `Voce e um coach de relacionamentos e inteligencia social. Analise a saude da rede de contatos do usuario.

DADOS DE CONEXOES:
{connections_data}

Analise:
1. Saude geral da rede (score medio de saude dos contatos)
2. Quantos contatos precisam de atencao (health_score < 40)
3. Equilibrio entre manter contatos existentes e cultivar novos
4. Uma sugestao pratica de quem/como reconectar esta semana

Responda APENAS em JSON valido:
{
  "networkHealth": "string - ex: 72/100 (boa)",
  "contactsNeedingAttention": "number",
  "balanceAssessment": "string - avaliacao do equilibrio da rede",
  "reconnectionAdvice": "string - sugestao pratica de reconexao em portugues"
}`

const STUDIO_PRODUCER_PROMPT = `Voce e um produtor de conteudo experiente. Analise os dados de producao de podcast do usuario.

DADOS DE PRODUCAO (Studio):
{studio_data}

Analise:
1. Volume de producao: total de episodios e quantos publicados
2. Consistencia: taxa de publicacao vs. episodios em producao
3. Uma sugestao pratica para manter ou melhorar o ritmo de producao

Responda APENAS em JSON valido:
{
  "productionVolume": "string - ex: 12 episodios, 8 publicados",
  "consistencyRate": "string - ex: 67% publicados",
  "productionAdvice": "string - sugestao pratica em portugues"
}`

const GRANTS_RESEARCHER_PROMPT = `Voce e um consultor de captacao de recursos e pesquisa. Analise os dados de projetos e oportunidades do usuario.

DADOS DE CAPTACAO (Grants):
{grants_data}

Analise:
1. Status dos projetos ativos e proximidade de deadlines
2. Risco de perder prazos (deadlines proximos nos proximos 14 dias)
3. Uma sugestao pratica de proximo passo para o projeto mais urgente

Responda APENAS em JSON valido:
{
  "activeProjectsSummary": "string - ex: 3 projetos ativos",
  "deadlineRisk": "string - baixo | medio | alto",
  "nextStepAdvice": "string - sugestao pratica em portugues"
}`

// ============================================================================
// DYNAMIC SYNTHESIS PROMPT BUILDER
// ============================================================================

function buildSynthesisPrompt(
  personaOutputs: Record<string, unknown>,
  availableModules: string[],
  allModules: string[],
  lifeScoreContext: string,
): string {
  const personaCount = Object.keys(personaOutputs).length
  const missingModules = allModules.filter(m => !availableModules.includes(m))

  let personaSections = ''
  if (personaOutputs.philosopher) {
    personaSections += `\nFILOSOFO/TERAPEUTA (Journey):\n${JSON.stringify(personaOutputs.philosopher, null, 2)}\n`
  }
  if (personaOutputs.strategist) {
    personaSections += `\nESTRATEGISTA/COO (Atlas):\n${JSON.stringify(personaOutputs.strategist, null, 2)}\n`
  }
  if (personaOutputs.biohacker) {
    personaSections += `\nBIO-HACKER/COACH (Saude + Treino):\n${JSON.stringify(personaOutputs.biohacker, null, 2)}\n`
  }
  if (personaOutputs.financial_advisor) {
    personaSections += `\nCONSULTOR FINANCEIRO (Finance):\n${JSON.stringify(personaOutputs.financial_advisor, null, 2)}\n`
  }
  if (personaOutputs.relationship_coach) {
    personaSections += `\nCOACH DE RELACIONAMENTOS (Connections):\n${JSON.stringify(personaOutputs.relationship_coach, null, 2)}\n`
  }
  if (personaOutputs.studio_producer) {
    personaSections += `\nPRODUTOR DE CONTEUDO (Studio):\n${JSON.stringify(personaOutputs.studio_producer, null, 2)}\n`
  }
  if (personaOutputs.grants_researcher) {
    personaSections += `\nCONSULTOR DE CAPTACAO (Grants):\n${JSON.stringify(personaOutputs.grants_researcher, null, 2)}\n`
  }

  return `Voce e o Conselheiro-Chefe do usuario. Recebeu ${personaCount} analises independentes de especialistas:
${personaSections}
${lifeScoreContext}
Modulos com dados: ${availableModules.join(', ')}
Modulos sem dados (NAO opine sobre estes): ${missingModules.length > 0 ? missingModules.join(', ') : 'nenhum'}

Sintetize um "Daily Insight" unico que:
1. RESOLVA CONFLITOS entre perspectivas (ex: Estrategista quer mais trabalho, mas Filosofo detectou burnout → sugira descanso estrategico)
2. Priorize na ordem: SAUDE > CONSCIENCIA > PRODUTIVIDADE > FINANCAS > RELACIONAMENTOS
3. Gere 1-3 acoes concretas e realizaveis para hoje/amanha — somente para modulos COM dados
4. Tom: acolhedor, pratico, motivador. Em portugues brasileiro.
5. NAO faca sugestoes sobre modulos listados como "sem dados"

Responda APENAS em JSON valido:
{
  "overallStatus": "thriving | balanced | strained | burnout_risk",
  "headline": "string max 100 chars - titulo do insight do dia",
  "synthesis": "string - 2-3 paragrafos com a sintese integrada",
  "actions": [
    {"action": "string - acao concreta", "module": "journey | atlas | connections | flux | finance | studio | grants", "priority": "high | medium"}
  ],
  "conflictsResolved": ["string - conflitos que foram resolvidos entre as perspectivas"]
}`
}

// ============================================================================
// PERSONA TYPES & HELPERS
// ============================================================================

interface PersonaResult {
  name: string
  output: Record<string, unknown>
  tokens: { input: number; output: number }
  model: string
  wasEscalated: boolean
}

const ALL_MODULES = ['journey', 'atlas', 'finance', 'connections', 'flux', 'studio', 'grants']

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // =====================================================================
    // Authentication — JWT preferred, body userId as fallback
    // =====================================================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const body = await req.json().catch(() => ({}))
    let userId: string | null = null

    // Try JWT auth first (preferred — prevents arbitrary userId injection)
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        })
        const { data: { user: authUser } } = await userClient.auth.getUser()
        if (authUser) {
          userId = authUser.id
        }
      } catch (err) {
        console.warn('[LIFE-COUNCIL] JWT validation failed, trying body userId:', err)
      }
    }

    // Fallback: body userId (backward compatibility with frontend)
    if (!userId && body.userId) {
      userId = body.userId
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Send Authorization header or userId in body.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Dynamic module availability from RPC
    const availableModules: string[] = context?.available_modules || []
    const momentsCount = context?.moments_count || 0
    const tasksCount = context?.tasks_count || 0

    // Minimum data: at least 1 module with data
    if (availableModules.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'insufficient_data',
          message: 'Precisamos de dados em pelo menos 1 modulo para gerar o insight. Registre momentos no Journey, tarefas no Atlas, transacoes no Finance, ou dados em qualquer outro modulo.',
          availableModules,
          momentsCount,
          tasksCount,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[LIFE-COUNCIL] Available modules: ${availableModules.join(', ')}`)

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
          atlas: 'Produtividade', journey: 'Bem-estar', finance: 'Financas',
          flux: 'Treinamento', connections: 'Relacionamentos', grants: 'Captacao', studio: 'Producao',
        }
        const domainLines = Object.entries(domains)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${domainLabels[k] || k}: ${Math.round(v * 100)}%`)
          .join(', ')

        lifeScoreContext = `\n\nLIFE SCORE ATUAL (dados reais do sistema):\n`
          + `Score composto: ${Math.round(latestScore.composite_score * 100)}/100\n`
          + `Dominios: ${domainLines}\n`
          + `Tendencia: ${latestScore.trend || 'estavel'}\n`
          + `Alerta de espiral: ${latestScore.spiral_detected ? `SIM — dominios em declinio: ${(latestScore.spiral_domains || []).join(', ')}` : 'Nao detectado'}\n`
          + `Ultima atualizacao: ${latestScore.computed_at}\n`
      }
    } catch (err) {
      console.warn('[LIFE-COUNCIL] Life Score fetch failed (non-critical):', err)
    }

    // =====================================================================
    // STEP 2: Fan-out — Dynamic Personas in Parallel
    // =====================================================================

    const momentsStr = JSON.stringify(context.moments || [], null, 2)
    const tasksStr = JSON.stringify(context.tasks || [], null, 2)
    const reportStr = JSON.stringify(context.daily_report || {}, null, 2)
    const activityStr = JSON.stringify(context.activity_times || [], null, 2)
    const financeStr = JSON.stringify(context.finance || {}, null, 2)
    const connectionsStr = JSON.stringify(context.connections || {}, null, 2)
    const fluxStr = JSON.stringify(context.flux || {}, null, 2)
    const studioStr = JSON.stringify(context.studio || {}, null, 2)
    const grantsStr = JSON.stringify(context.grants || {}, null, 2)

    // Build persona list based on available modules
    const personaTasks: Array<{
      name: string
      promise: Promise<{ text: string; tokens: { input: number; output: number }; model: string; wasEscalated: boolean }>
      fallback: Record<string, unknown>
    }> = []

    // Philosopher — requires Journey data
    if (availableModules.includes('journey')) {
      personaTasks.push({
        name: 'philosopher',
        promise: withHealthTracking(
          { functionName: 'run-life-council', actionName: 'philosopher' },
          supabaseClient,
          () => callAI({
            prompt: PHILOSOPHER_PROMPT.replace('{moments}', momentsStr),
            complexity: 'low',
            expectJson: true,
            temperature: 0.3,
          })
        ),
        fallback: { pattern: 'unknown', triggers: [], misalignment: null, reflection: 'Dados insuficientes para analise emocional.' },
      })
    }

    // Strategist — requires Atlas data
    if (availableModules.includes('atlas')) {
      personaTasks.push({
        name: 'strategist',
        promise: withHealthTracking(
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
        fallback: { completionRate: 'N/A', quadrantFocus: 'unknown', bottlenecks: [], tacticalAdvice: 'Continue focando nas prioridades.' },
      })
    }

    // Bio-Hacker — runs if Journey OR Flux has data (activity times from journey, training from flux)
    if (availableModules.includes('journey') || availableModules.includes('flux')) {
      personaTasks.push({
        name: 'biohacker',
        promise: withHealthTracking(
          { functionName: 'run-life-council', actionName: 'biohacker' },
          supabaseClient,
          () => callAI({
            prompt: BIOHACKER_PROMPT
              .replace('{activity_times}', activityStr)
              .replace('{flux_data}', availableModules.includes('flux') ? fluxStr : 'Sem dados de treinamento disponiveis.'),
            complexity: 'low',
            expectJson: true,
            temperature: 0.2,
          })
        ),
        fallback: { sleepEstimate: 'N/A', activityDistribution: {}, overworkSignals: [], trainingInsight: null, routineAdvice: 'Mantenha sua rotina atual.' },
      })
    }

    // Financial Advisor — requires Finance data
    if (availableModules.includes('finance')) {
      personaTasks.push({
        name: 'financial_advisor',
        promise: withHealthTracking(
          { functionName: 'run-life-council', actionName: 'financial_advisor' },
          supabaseClient,
          () => callAI({
            prompt: FINANCIAL_ADVISOR_PROMPT.replace('{finance_data}', financeStr),
            complexity: 'low',
            expectJson: true,
            temperature: 0.2,
          })
        ),
        fallback: { incomeExpenseRatio: 'N/A', topExpenseCategories: [], spendingPattern: 'unknown', financialAdvice: 'Continue controlando seus gastos.' },
      })
    }

    // Relationship Coach — requires Connections data
    if (availableModules.includes('connections')) {
      personaTasks.push({
        name: 'relationship_coach',
        promise: withHealthTracking(
          { functionName: 'run-life-council', actionName: 'relationship_coach' },
          supabaseClient,
          () => callAI({
            prompt: RELATIONSHIP_COACH_PROMPT.replace('{connections_data}', connectionsStr),
            complexity: 'low',
            expectJson: true,
            temperature: 0.2,
          })
        ),
        fallback: { networkHealth: 'N/A', contactsNeedingAttention: 0, balanceAssessment: 'unknown', reconnectionAdvice: 'Mantenha contato com pessoas importantes.' },
      })
    }

    // Studio Producer — requires Studio data
    if (availableModules.includes('studio')) {
      personaTasks.push({
        name: 'studio_producer',
        promise: withHealthTracking(
          { functionName: 'run-life-council', actionName: 'studio_producer' },
          supabaseClient,
          () => callAI({
            prompt: STUDIO_PRODUCER_PROMPT.replace('{studio_data}', studioStr),
            complexity: 'low',
            expectJson: true,
            temperature: 0.2,
          })
        ),
        fallback: { productionVolume: 'N/A', consistencyRate: 'N/A', productionAdvice: 'Continue produzindo conteudo regularmente.' },
      })
    }

    // Grants Researcher — requires Grants data
    if (availableModules.includes('grants')) {
      personaTasks.push({
        name: 'grants_researcher',
        promise: withHealthTracking(
          { functionName: 'run-life-council', actionName: 'grants_researcher' },
          supabaseClient,
          () => callAI({
            prompt: GRANTS_RESEARCHER_PROMPT.replace('{grants_data}', grantsStr),
            complexity: 'low',
            expectJson: true,
            temperature: 0.2,
          })
        ),
        fallback: { activeProjectsSummary: 'N/A', deadlineRisk: 'unknown', nextStepAdvice: 'Revise os prazos dos seus projetos.' },
      })
    }

    console.log(`[LIFE-COUNCIL] Running ${personaTasks.length} personas: ${personaTasks.map(p => p.name).join(', ')}`)

    // Execute all personas in parallel
    const personaResults = await Promise.allSettled(personaTasks.map(p => p.promise))

    // Parse results
    const parsedPersonas: Record<string, PersonaResult> = {}
    let totalTokensIn = 0
    let totalTokensOut = 0

    for (let i = 0; i < personaTasks.length; i++) {
      const task = personaTasks[i]
      const result = personaResults[i]

      if (result.status === 'fulfilled') {
        let output: Record<string, unknown>
        try {
          output = extractJSON(result.value.text) as Record<string, unknown>
        } catch {
          output = task.fallback
        }
        parsedPersonas[task.name] = {
          name: task.name,
          output,
          tokens: result.value.tokens,
          model: result.value.model,
          wasEscalated: result.value.wasEscalated,
        }
        totalTokensIn += result.value.tokens.input
        totalTokensOut += result.value.tokens.output
      } else {
        console.error(`[LIFE-COUNCIL] Persona ${task.name} failed:`, result.reason)
        parsedPersonas[task.name] = {
          name: task.name,
          output: task.fallback,
          tokens: { input: 0, output: 0 },
          model: 'fallback',
          wasEscalated: false,
        }
      }
    }

    // =====================================================================
    // STEP 3: Fan-in — Synthesis (Gemini Pro)
    // =====================================================================

    const personaOutputs: Record<string, unknown> = {}
    for (const [name, result] of Object.entries(parsedPersonas)) {
      personaOutputs[name] = result.output
    }

    const synthesisPrompt = buildSynthesisPrompt(
      personaOutputs,
      availableModules,
      ALL_MODULES,
      lifeScoreContext,
    )

    const synthesisResult = await withHealthTracking(
      { functionName: 'run-life-council', actionName: 'synthesis' },
      supabaseClient,
      () => callAI({
        prompt: synthesisPrompt,
        complexity: 'high',
        expectJson: true,
        temperature: 0.5,
      })
    )

    totalTokensIn += synthesisResult.tokens.input
    totalTokensOut += synthesisResult.tokens.output

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

    // Build persona outputs for DB storage (backward compatible + new columns)
    const philosopherOutput = parsedPersonas.philosopher?.output || {}
    const strategistOutput = parsedPersonas.strategist?.output || {}
    const biohackerOutput = parsedPersonas.biohacker?.output || {}
    const financialAdvisorOutput = parsedPersonas.financial_advisor?.output || {}
    const relationshipCoachOutput = parsedPersonas.relationship_coach?.output || {}
    const studioProducerOutput = parsedPersonas.studio_producer?.output || {}
    const grantsResearcherOutput = parsedPersonas.grants_researcher?.output || {}

    const { data: saved, error: saveError } = await supabaseClient
      .from('daily_council_insights')
      .upsert({
        user_id: userId,
        insight_date: new Date().toISOString().split('T')[0],
        philosopher_output: philosopherOutput,
        strategist_output: strategistOutput,
        biohacker_output: biohackerOutput,
        financial_advisor_output: financialAdvisorOutput,
        relationship_coach_output: relationshipCoachOutput,
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
          available_modules: availableModules,
          persona_count: personaTasks.length,
          has_daily_report: !!context.daily_report?.report_content,
          has_finance: availableModules.includes('finance'),
          has_connections: availableModules.includes('connections'),
          has_flux: availableModules.includes('flux'),
          has_studio: availableModules.includes('studio'),
          has_grants: availableModules.includes('grants'),
          studio_producer_output: studioProducerOutput,
          grants_researcher_output: grantsResearcherOutput,
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

    // Build personas response object (all active personas)
    const personasResponse: Record<string, Record<string, unknown>> = {}
    for (const [name, result] of Object.entries(parsedPersonas)) {
      personasResponse[name] = result.output
    }

    // Build escalations object
    const escalations: Record<string, boolean> = {}
    for (const [name, result] of Object.entries(parsedPersonas)) {
      escalations[name] = result.wasEscalated
    }
    escalations.synthesis = synthesisResult.wasEscalated

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
          personas: personasResponse,
        },
        metadata: {
          total_tokens: totalTokens,
          processing_time_ms: processingTime,
          available_modules: availableModules,
          persona_count: personaTasks.length,
          models_used: {
            personas: personaTasks.length > 0 ? parsedPersonas[personaTasks[0].name]?.model : 'none',
            synthesis: synthesisResult.model,
          },
          escalations,
          data_sources: {
            moments: momentsCount,
            tasks: tasksCount,
            finance: availableModules.includes('finance'),
            connections: availableModules.includes('connections'),
            flux: availableModules.includes('flux'),
            studio: availableModules.includes('studio'),
            grants: availableModules.includes('grants'),
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
