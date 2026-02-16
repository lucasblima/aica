/**
 * Plan-and-Execute Edge Function — Planner Agent
 *
 * Decomposes cross-module user goals into step-by-step execution plans.
 * Each plan contains ordered steps targeting specific AICA module agents.
 *
 * Actions:
 *   - create_plan: Decompose a goal into an execution plan
 *   - execute_step: Execute a single step of an existing plan
 *   - get_plan: Retrieve a plan with its steps
 *
 * @see Phase 2 of Agent Orchestra Roadmap
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { withHealthTracking } from "../_shared/health-tracker.ts"
import { callAI } from "../_shared/model-router.ts"

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
// TYPES
// ============================================================================

const VALID_MODULES = [
  'atlas', 'captacao', 'studio', 'journey',
  'finance', 'connections', 'flux', 'agenda', 'coordinator',
] as const

type AgentModule = typeof VALID_MODULES[number]

interface PlanStep {
  step_order: number
  module: AgentModule
  action: string
}

interface DecomposedPlan {
  steps: PlanStep[]
  modules_involved: AgentModule[]
  reasoning: string
}

interface CreatePlanPayload {
  goal: string
  context?: Record<string, unknown>
}

interface ExecuteStepPayload {
  plan_id: string
  step_id: string
}

// ============================================================================
// PLAN DECOMPOSITION
// ============================================================================

const DECOMPOSITION_PROMPT = `Você é o Planner Agent do AICA Life OS, responsável por decompor objetivos complexos do usuário em planos de execução passo a passo.

## Módulos disponíveis:
- atlas: gestão de tarefas, criar/atualizar work_items, prioridades, Eisenhower Matrix
- journey: registrar momentos, reflexões, emoções, autoconhecimento
- connections: gerenciar contatos, CRM pessoal, buscar informações de pessoas
- finance: transações financeiras, orçamento, categorização de gastos
- flux: treinos, atletas, planos de exercício, coaching
- studio: produção de podcast, pesquisa de convidados, pautas, episódios
- captacao: editais, grants, propostas de captação de recursos
- agenda: eventos de calendário, reuniões, compromissos
- coordinator: ações genéricas que não se encaixam em módulos específicos

## Regras:
1. Decomponha o objetivo em 2-6 passos concretos e acionáveis
2. Cada passo deve ter UM módulo responsável
3. A ordem dos passos deve ser lógica (dependências primeiro)
4. Seja específico na ação de cada passo
5. Use português brasileiro na descrição das ações

## Formato de resposta (JSON):
{
  "steps": [
    { "step_order": 1, "module": "connections", "action": "Buscar contato João no CRM pessoal" },
    { "step_order": 2, "module": "agenda", "action": "Criar reunião com João sobre FAPERJ" }
  ],
  "modules_involved": ["connections", "agenda"],
  "reasoning": "O objetivo envolve buscar um contato e agendar uma reunião"
}`

async function decomposePlan(
  goal: string,
  userContext: Record<string, unknown> | undefined,
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<DecomposedPlan> {
  // Fetch user patterns for context enrichment
  let userPatterns = ''
  try {
    const { data: patterns } = await supabaseClient
      .from('user_patterns')
      .select('pattern_type, pattern_data')
      .eq('user_id', userId)
      .limit(5)

    if (patterns && patterns.length > 0) {
      userPatterns = `\n\nPadrões conhecidos do usuário:\n${patterns.map(
        (p: { pattern_type: string; pattern_data: unknown }) =>
          `- ${p.pattern_type}: ${JSON.stringify(p.pattern_data).substring(0, 200)}`
      ).join('\n')}`
    }
  } catch {
    // Non-critical, continue without patterns
  }

  // Fetch recent Life Council insights for context
  let councilInsights = ''
  try {
    const { data: insights } = await supabaseClient
      .from('daily_council_insights')
      .select('insight_type, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    if (insights && insights.length > 0) {
      councilInsights = `\n\nInsights recentes do Life Council:\n${insights.map(
        (i: { insight_type: string; content: string }) =>
          `- ${i.insight_type}: ${i.content.substring(0, 150)}`
      ).join('\n')}`
    }
  } catch {
    // Non-critical, continue without insights
  }

  const contextStr = userContext
    ? `\n\nContexto adicional: ${JSON.stringify(userContext).substring(0, 500)}`
    : ''

  const prompt = `Objetivo do usuário: "${goal}"${contextStr}${userPatterns}${councilInsights}

Decomponha este objetivo em um plano de execução.`

  const result = await callAI({
    prompt,
    systemPrompt: DECOMPOSITION_PROMPT,
    complexity: 'medium',
    expectJson: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  })

  const parsed = extractJSON(result.text)

  // Validate the parsed plan
  if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Plan decomposition returned no steps')
  }

  // Validate each step has required fields and valid module
  for (const step of parsed.steps) {
    if (!step.module || !VALID_MODULES.includes(step.module)) {
      step.module = 'coordinator'
    }
    if (!step.action || typeof step.action !== 'string') {
      throw new Error(`Step ${step.step_order} missing action`)
    }
  }

  // Ensure modules_involved is accurate
  const modulesUsed = [...new Set(parsed.steps.map((s: PlanStep) => s.module))]

  return {
    steps: parsed.steps,
    modules_involved: modulesUsed,
    reasoning: parsed.reasoning || '',
  }
}

// ============================================================================
// STEP EXECUTION
// ============================================================================

const STEP_EXECUTION_PROMPT = `Você é um agente executor do AICA Life OS. Sua tarefa é executar UM passo específico de um plano.

Dado o contexto do plano e do passo, descreva o resultado da execução.
Se o passo requer criar algo, gere o conteúdo necessário.
Se o passo requer buscar informações, descreva o que seria encontrado.

IMPORTANTE: Por enquanto, você opera em modo "sugerir e confirmar" — descreva o que FARIA, mas não execute ações destrutivas.

Retorne JSON:
{
  "result_summary": "Descrição do resultado",
  "data": { ... },
  "suggestions": ["Próximos passos sugeridos"],
  "confidence": 0.0-1.0
}`

async function executeStep(
  planGoal: string,
  step: { module: string; action: string; step_order: number },
  previousResults: Array<{ step_order: number; result: unknown }>,
): Promise<Record<string, unknown>> {
  const previousContext = previousResults.length > 0
    ? `\n\nResultados dos passos anteriores:\n${previousResults.map(
        r => `Passo ${r.step_order}: ${JSON.stringify(r.result).substring(0, 300)}`
      ).join('\n')}`
    : ''

  const prompt = `Plano: "${planGoal}"
Passo atual (#${step.step_order}): ${step.action}
Módulo: ${step.module}${previousContext}

Execute este passo e retorne o resultado.`

  const result = await callAI({
    prompt,
    systemPrompt: STEP_EXECUTION_PROMPT,
    complexity: 'medium',
    expectJson: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  })

  return extractJSON(result.text)
}

// ============================================================================
// JSON EXTRACTION (robust, from gemini-chat pattern)
// ============================================================================

function extractJSON(text: string): any {
  // Strip code fences FIRST
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '')

  // Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to find JSON object in text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Try to fix common issues
        const fixed = jsonMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/'/g, '"')
        return JSON.parse(fixed)
      }
    }
    throw new Error('No valid JSON found in response')
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleCreatePlan(
  payload: CreatePlanPayload,
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!payload.goal || payload.goal.trim().length < 5) {
    return new Response(
      JSON.stringify({ success: false, error: 'Goal must be at least 5 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Decompose the goal into steps
  const decomposed = await withHealthTracking(
    { functionName: 'plan-and-execute', actionName: 'decompose' },
    supabaseClient,
    () => decomposePlan(payload.goal, payload.context, supabaseClient, userId),
  )

  // Create the plan record
  const { data: plan, error: planError } = await supabaseClient
    .from('execution_plans')
    .insert({
      user_id: userId,
      goal: payload.goal.trim(),
      status: 'pending',
      modules_involved: decomposed.modules_involved,
      context: {
        ...payload.context,
        reasoning: decomposed.reasoning,
      },
    })
    .select('id')
    .single()

  if (planError || !plan) {
    console.error('[plan-and-execute] Failed to create plan:', planError)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create plan' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Create all step records
  const stepInserts = decomposed.steps.map((step: PlanStep) => ({
    plan_id: plan.id,
    step_order: step.step_order,
    module: step.module,
    action: step.action,
    status: 'pending',
  }))

  const { data: steps, error: stepsError } = await supabaseClient
    .from('execution_plan_steps')
    .insert(stepInserts)
    .select('id, step_order, module, action, status')

  if (stepsError) {
    console.error('[plan-and-execute] Failed to create steps:', stepsError)
    // Clean up the plan
    await supabaseClient.from('execution_plans').delete().eq('id', plan.id)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create plan steps' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      plan: {
        id: plan.id,
        goal: payload.goal.trim(),
        status: 'pending',
        modules_involved: decomposed.modules_involved,
        reasoning: decomposed.reasoning,
        steps: steps || [],
      },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function handleExecuteStep(
  payload: ExecuteStepPayload,
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!payload.plan_id || !payload.step_id) {
    return new Response(
      JSON.stringify({ success: false, error: 'plan_id and step_id are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Verify plan belongs to user
  const { data: plan, error: planError } = await supabaseClient
    .from('execution_plans')
    .select('id, goal, status')
    .eq('id', payload.plan_id)
    .eq('user_id', userId)
    .single()

  if (planError || !plan) {
    return new Response(
      JSON.stringify({ success: false, error: 'Plan not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Get the step
  const { data: step, error: stepError } = await supabaseClient
    .from('execution_plan_steps')
    .select('id, step_order, module, action, status')
    .eq('id', payload.step_id)
    .eq('plan_id', payload.plan_id)
    .single()

  if (stepError || !step) {
    return new Response(
      JSON.stringify({ success: false, error: 'Step not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (step.status !== 'pending') {
    return new Response(
      JSON.stringify({ success: false, error: `Step is already ${step.status}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Mark step as running
  await supabaseClient
    .from('execution_plan_steps')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', step.id)

  // Mark plan as running if not already
  if (plan.status === 'pending') {
    await supabaseClient
      .from('execution_plans')
      .update({ status: 'running' })
      .eq('id', plan.id)
  }

  // Get previous step results for context
  const { data: previousSteps } = await supabaseClient
    .from('execution_plan_steps')
    .select('step_order, result')
    .eq('plan_id', payload.plan_id)
    .eq('status', 'completed')
    .order('step_order', { ascending: true })

  try {
    const result = await withHealthTracking(
      { functionName: 'plan-and-execute', actionName: 'execute_step' },
      supabaseClient,
      () => executeStep(
        plan.goal,
        step,
        (previousSteps || []).map((s: { step_order: number; result: unknown }) => ({
          step_order: s.step_order,
          result: s.result,
        })),
      ),
    )

    // Mark step as completed
    await supabaseClient
      .from('execution_plan_steps')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', step.id)

    // Check if all steps are done
    const { data: remainingSteps } = await supabaseClient
      .from('execution_plan_steps')
      .select('id')
      .eq('plan_id', payload.plan_id)
      .in('status', ['pending', 'running'])

    if (!remainingSteps || remainingSteps.length === 0) {
      await supabaseClient
        .from('execution_plans')
        .update({ status: 'completed' })
        .eq('id', plan.id)
    }

    return new Response(
      JSON.stringify({ success: true, step_id: step.id, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    // Mark step as failed
    await supabaseClient
      .from('execution_plan_steps')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
        completed_at: new Date().toISOString(),
      })
      .eq('id', step.id)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Step execution failed',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
}

async function handleGetPlan(
  planId: string,
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const { data: plan, error: planError } = await supabaseClient
    .from('execution_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single()

  if (planError || !plan) {
    return new Response(
      JSON.stringify({ success: false, error: 'Plan not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const { data: steps } = await supabaseClient
    .from('execution_plan_steps')
    .select('*')
    .eq('plan_id', planId)
    .order('step_order', { ascending: true })

  return new Response(
    JSON.stringify({ success: true, plan: { ...plan, steps: steps || [] } }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Authenticate
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Get user
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
  if (userError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = await req.json()
    const { action, payload } = body

    switch (action) {
      case 'create_plan':
        return await handleCreatePlan(payload, supabaseClient, user.id, corsHeaders)

      case 'execute_step':
        return await handleExecuteStep(payload, supabaseClient, user.id, corsHeaders)

      case 'get_plan':
        return await handleGetPlan(payload?.plan_id, supabaseClient, user.id, corsHeaders)

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
  } catch (error) {
    console.error('[plan-and-execute] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
