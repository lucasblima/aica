/**
 * Edge Function: atlas-task-intelligence
 * Atlas Module — AI Task Intelligence
 *
 * Actions:
 * - suggest_priority: Analyze task → suggest Eisenhower quadrant
 * - decompose_task: Break complex task into subtasks
 * - daily_briefing: Generate daily task briefing
 *
 * Gemini Model: gemini-2.5-flash (cost-effective)
 * Auth: JWT via Supabase anon key
 *
 * Endpoint: POST /functions/v1/atlas-task-intelligence
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

// =============================================================================
// TYPES
// =============================================================================

interface SuggestPriorityInput {
  title: string
  description?: string
  dueDate?: string
  tags?: string[]
}

interface SuggestPriorityOutput {
  quadrant: 'do' | 'schedule' | 'delegate' | 'eliminate'
  confidence: number
  reasoning: string
  is_urgent: boolean
  is_important: boolean
}

interface DecomposeTaskInput {
  title: string
  description?: string
  estimatedHours?: number
}

interface SubtaskOutput {
  title: string
  estimatedMinutes: number
  priority: 'high' | 'medium' | 'low'
}

interface DecomposeTaskOutput {
  subtasks: SubtaskOutput[]
  totalEstimate: string
}

interface DailyBriefingTask {
  title: string
  priority: string
  dueDate?: string
  status: string
  quadrant?: string
}

interface DailyBriefingInput {
  tasks: DailyBriefingTask[]
}

interface DailyBriefingOutput {
  briefing: string
  topPriority: string
  suggestedOrder: string[]
}

type ActionType = 'suggest_priority' | 'decompose_task' | 'daily_briefing'

// =============================================================================
// CONSTANTS
// =============================================================================

const GEMINI_MODEL = 'gemini-2.5-flash'

// =============================================================================
// PROMPTS
// =============================================================================

function buildPriorityPrompt(input: SuggestPriorityInput): string {
  const dueDateInfo = input.dueDate
    ? `\nDATA LIMITE: ${new Date(input.dueDate).toLocaleDateString('pt-BR')}`
    : '\nSEM DATA LIMITE'

  const tagsInfo = input.tags?.length
    ? `\nETIQUETAS: ${input.tags.join(', ')}`
    : ''

  return `Voce e um assistente de produtividade especializado na Matriz de Eisenhower.
Analise a tarefa abaixo e classifique no quadrante correto.

TAREFA: ${input.title}
${input.description ? `DESCRICAO: ${input.description}` : ''}${dueDateInfo}${tagsInfo}

QUADRANTES:
- "do" = Urgente + Importante (fazer agora, prazo proximo, alto impacto)
- "schedule" = Importante + Nao Urgente (agendar, estrategico, sem prazo imediato)
- "delegate" = Urgente + Nao Importante (rapido, operacional, pode delegar)
- "eliminate" = Nem Urgente + Nem Importante (baixo impacto, dispensavel)

CRITERIOS:
- Se tem prazo em ate 2 dias → tende a ser urgente
- Se envolve decisoes estrategicas, saude, financas → tende a ser importante
- Se e tarefa mecanica/repetitiva → tende a ser delegavel
- Se e distracoes/habitos improdutivos → tende a ser eliminavel

Responda APENAS com JSON valido:
{
  "quadrant": "do" | "schedule" | "delegate" | "eliminate",
  "confidence": 0.0 a 1.0,
  "reasoning": "Explicacao breve em portugues (max 100 caracteres)",
  "is_urgent": true/false,
  "is_important": true/false
}`
}

function buildDecomposePrompt(input: DecomposeTaskInput): string {
  const estimateInfo = input.estimatedHours
    ? `\nDURACAO ESTIMADA PELO USUARIO: ${input.estimatedHours} horas`
    : ''

  return `Voce e um assistente de produtividade. Decomponha a tarefa complexa abaixo em subtarefas acionaveis.

TAREFA: ${input.title}
${input.description ? `DESCRICAO: ${input.description}` : ''}${estimateInfo}

REGRAS:
- Gere entre 2 e 8 subtarefas
- Cada subtarefa deve ser acionavel e especifica
- Estime a duracao em minutos (realista, nao otimista)
- Ordene por prioridade (high primeiro)
- Titulos curtos e diretos em portugues

Responda APENAS com JSON valido:
{
  "subtasks": [
    { "title": "Subtarefa 1", "estimatedMinutes": 30, "priority": "high" },
    { "title": "Subtarefa 2", "estimatedMinutes": 15, "priority": "medium" }
  ],
  "totalEstimate": "2h30 estimado"
}`
}

function buildBriefingPrompt(input: DailyBriefingInput): string {
  const taskLines = input.tasks
    .map((t, i) => {
      const due = t.dueDate ? ` (ate ${new Date(t.dueDate).toLocaleDateString('pt-BR')})` : ''
      const quadrant = t.quadrant ? ` [${t.quadrant}]` : ''
      return `${i + 1}. ${t.title} — ${t.status}${due}${quadrant}`
    })
    .join('\n')

  return `Voce e um assistente de produtividade. Gere um briefing conciso do dia com base nas tarefas abaixo.

TAREFAS DO DIA (${input.tasks.length} total):
${taskLines}

REGRAS:
- briefing: 2-3 frases motivacionais e praticas em portugues (max 300 caracteres)
- topPriority: nome da tarefa mais critica para comecar o dia
- suggestedOrder: lista de titulos de tarefa na ordem recomendada de execucao
- Considere urgencia, prazos e dependencias logicas
- Tom: direto, motivacional, sem ser invasivo

Responda APENAS com JSON valido:
{
  "briefing": "Texto do briefing",
  "topPriority": "Nome da tarefa mais importante",
  "suggestedOrder": ["Tarefa 1", "Tarefa 2", "Tarefa 3"]
}`
}

// =============================================================================
// HELPERS
// =============================================================================

function extractJSON(text: string): unknown {
  // Strip code fences FIRST (critical for gemini thinking models)
  const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```/g, '').trim()

  // Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // ignore
  }

  // Try finding first { ... } block
  const braceStart = cleaned.indexOf('{')
  const braceEnd = cleaned.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(cleaned.substring(braceStart, braceEnd + 1))
    } catch {
      // ignore
    }
  }

  throw new Error(`Failed to extract JSON from response: ${text.substring(0, 200)}`)
}

async function callGemini(prompt: string, apiKey: string): Promise<{ result: unknown; usageMetadata?: Record<string, number> }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
      thinkingConfig: {
        thinkingBudget: 0,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${error}`)
  }

  const data = await response.json()

  // Filter out thought parts, extract text
  const parts = data.candidates?.[0]?.content?.parts || []
  const textParts = parts.filter((p: { thought?: boolean }) => !p.thought)
  const text = textParts.map((p: { text?: string }) => p.text || '').join('')

  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  return {
    result: extractJSON(text),
    usageMetadata: data.usageMetadata,
  }
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

function handleSuggestPriority(result: unknown): SuggestPriorityOutput {
  const r = result as Record<string, unknown>
  const quadrant = String(r.quadrant || 'schedule')
  const validQuadrants = ['do', 'schedule', 'delegate', 'eliminate']
  return {
    quadrant: (validQuadrants.includes(quadrant) ? quadrant : 'schedule') as SuggestPriorityOutput['quadrant'],
    confidence: Math.min(1, Math.max(0, Number(r.confidence) || 0.5)),
    reasoning: String(r.reasoning || '').substring(0, 200),
    is_urgent: Boolean(r.is_urgent),
    is_important: Boolean(r.is_important),
  }
}

function handleDecomposeTask(result: unknown): DecomposeTaskOutput {
  const r = result as Record<string, unknown>
  const subtasks = (Array.isArray(r.subtasks) ? r.subtasks : []).slice(0, 8).map((s: unknown) => {
    const sub = s as Record<string, unknown>
    return {
      title: String(sub.title || 'Subtarefa'),
      estimatedMinutes: Math.max(5, Math.min(480, Number(sub.estimatedMinutes) || 30)),
      priority: (['high', 'medium', 'low'].includes(String(sub.priority)) ? String(sub.priority) : 'medium') as SubtaskOutput['priority'],
    }
  })

  return {
    subtasks,
    totalEstimate: String(r.totalEstimate || `${subtasks.reduce((sum, s) => sum + s.estimatedMinutes, 0)}min estimado`),
  }
}

function handleDailyBriefing(result: unknown): DailyBriefingOutput {
  const r = result as Record<string, unknown>
  return {
    briefing: String(r.briefing || '').substring(0, 500),
    topPriority: String(r.topPriority || ''),
    suggestedOrder: (Array.isArray(r.suggestedOrder) ? r.suggestedOrder : []).map(String),
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
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
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Auth: validate JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action, payload } = body as { action: ActionType; payload: unknown }

    if (!action || !payload) {
      return new Response(
        JSON.stringify({ success: false, error: 'action and payload are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let prompt: string
    let handler: (result: unknown) => unknown

    switch (action) {
      case 'suggest_priority': {
        const input = payload as SuggestPriorityInput
        if (!input.title) {
          return new Response(
            JSON.stringify({ success: false, error: 'title is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        prompt = buildPriorityPrompt(input)
        handler = handleSuggestPriority
        break
      }
      case 'decompose_task': {
        const input = payload as DecomposeTaskInput
        if (!input.title) {
          return new Response(
            JSON.stringify({ success: false, error: 'title is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        prompt = buildDecomposePrompt(input)
        handler = handleDecomposeTask
        break
      }
      case 'daily_briefing': {
        const input = payload as DailyBriefingInput
        if (!input.tasks?.length) {
          return new Response(
            JSON.stringify({ success: false, error: 'tasks array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        prompt = buildBriefingPrompt(input)
        handler = handleDailyBriefing
        break
      }
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log(`[atlas-task-intelligence] Action: ${action}, User: ${user.id}`)

    const { result, usageMetadata } = await callGemini(prompt, apiKey)
    const data = handler(result)

    // Log usage (fire-and-forget)
    if (usageMetadata) {
      const serviceClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      serviceClient.rpc('log_interaction', {
        p_user_id: user.id,
        p_interaction_type: `atlas_${action}`,
        p_module: 'atlas',
        p_model: GEMINI_MODEL,
        p_tokens_in: usageMetadata.promptTokenCount || 0,
        p_tokens_out: usageMetadata.candidatesTokenCount || 0,
      }).catch((err: Error) => {
        console.warn('[atlas-task-intelligence] Failed to log interaction:', err.message)
      })
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[atlas-task-intelligence] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
