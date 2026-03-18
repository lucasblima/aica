/**
 * ReACT Agent Edge Function — Context-Enriched Chat
 *
 * Implements a Reasoning + Acting loop that queries the user's real data
 * across AICA modules before answering. Simple questions bypass the loop
 * via an intent pre-check.
 *
 * Flow:
 *   Frontend -> react-agent
 *     |- Intent pre-check (simple questions bypass ReACT)
 *     |- Build 6 query tools for user's data
 *     |- Run ReACT loop (1-5 tool calls)
 *     |- Persist run to agent_runs table
 *     '- Return enriched answer
 *
 * @see _shared/react-loop.ts for the generic ReACT engine
 * @see _shared/model-router.ts for extractJSON, assessConfidence
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { runReactLoop } from '../_shared/react-loop.ts'
import type { ReactTool, ReactStep } from '../_shared/react-loop.ts'
import { logInteraction } from '../_shared/usage-tracker.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODELS = { fast: 'gemini-2.5-flash', smart: 'gemini-2.5-pro' } as const

const SYSTEM_PROMPT = `Voce e a Aica, assistente pessoal inteligente do AICA Life OS.
Voce tem acesso a ferramentas para consultar dados reais do usuario.
Use as ferramentas para buscar contexto relevante antes de responder.
Responda em portugues brasileiro, de forma concisa e personalizada.
Cite dados especificos (nomes de tarefas, valores, datas) quando disponivel.`

// ---------------------------------------------------------------------------
// Tool builders
// ---------------------------------------------------------------------------

function buildChatTools(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): ReactTool[] {
  return [
    // 1. Atlas — tasks
    {
      name: 'query_tasks',
      description:
        'Query the user\'s tasks (work_items). Returns title, status, priority, due_date, is_urgent, is_important. ' +
        'Params: { status?: string (e.g. "todo","in_progress","done"), limit?: number (default 10) }',
      execute: async (params) => {
        let query = supabase
          .from('work_items')
          .select('id, title, status, priority, due_date, is_urgent, is_important, created_at')
          .eq('user_id', userId)
          .eq('archived', false)
          .order('created_at', { ascending: false })
          .limit(Number(params.limit) || 10)

        if (params.status) {
          query = query.eq('status', params.status)
        }

        const { data, error } = await query
        if (error) return { error: error.message }
        return { count: data?.length ?? 0, tasks: data }
      },
    },

    // 2. Journey — moments
    {
      name: 'query_moments',
      description:
        'Query the user\'s journal moments. Returns content, emotion, created_at, tags, sentiment_data. ' +
        'Params: { limit?: number (default 5), days?: number (default 7) }',
      execute: async (params) => {
        const days = Number(params.days) || 7
        const since = new Date(Date.now() - days * 86_400_000).toISOString()

        const { data, error } = await supabase
          .from('moments')
          .select('id, content, emotion, created_at, tags, sentiment_data')
          .eq('user_id', userId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(Number(params.limit) || 5)

        if (error) return { error: error.message }
        return { count: data?.length ?? 0, moments: data }
      },
    },

    // 3. Finance — transactions summary
    {
      name: 'query_finances',
      description:
        'Query the user\'s financial summary: total income, total expenses, and recent transactions for the last N days. ' +
        'Params: { days?: number (default 30) }',
      execute: async (params) => {
        const days = Number(params.days) || 30
        const since = new Date(Date.now() - days * 86_400_000).toISOString()

        const { data, error } = await supabase
          .from('finance_transactions')
          .select('id, description, amount, type, category, date, created_at')
          .eq('user_id', userId)
          .gte('date', since.split('T')[0])
          .order('date', { ascending: false })
          .limit(50)

        if (error) return { error: error.message }

        const transactions = data ?? []
        const income = transactions
          .filter((t: { type: string }) => t.type === 'income')
          .reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0)
        const expenses = transactions
          .filter((t: { type: string }) => t.type === 'expense')
          .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount || 0), 0)

        return {
          period_days: days,
          total_income: income,
          total_expenses: expenses,
          balance: income - expenses,
          transaction_count: transactions.length,
          recent: transactions.slice(0, 10),
        }
      },
    },

    // 4. Patterns — user behavioral patterns
    {
      name: 'query_patterns',
      description:
        'Query the user\'s behavioral patterns from the Living User Dossier. ' +
        'Params: { min_confidence?: number (default 0.5) }',
      execute: async (params) => {
        const minConf = Number(params.min_confidence) || 0.5

        const { data, error } = await supabase
          .from('user_patterns')
          .select('id, pattern_type, description, confidence_score, times_observed, created_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .gte('confidence_score', minConf)
          .order('confidence_score', { ascending: false })
          .limit(10)

        if (error) return { error: error.message }
        return { count: data?.length ?? 0, patterns: data }
      },
    },

    // 5. Agenda — calendar events
    {
      name: 'query_events',
      description:
        'Query the user\'s upcoming calendar events. Returns title, start_time, end_time, location. ' +
        'Params: { days_ahead?: number (default 7) }',
      execute: async (params) => {
        const daysAhead = Number(params.days_ahead) || 7
        const now = new Date().toISOString()
        const until = new Date(Date.now() + daysAhead * 86_400_000).toISOString()

        const { data, error } = await supabase
          .from('calendar_events')
          .select('id, title, start_time, end_time, location, description')
          .eq('user_id', userId)
          .gte('start_time', now)
          .lte('start_time', until)
          .order('start_time', { ascending: true })
          .limit(20)

        if (error) return { error: error.message }
        return { count: data?.length ?? 0, events: data }
      },
    },

    // 6. Council — daily council insights
    {
      name: 'query_council',
      description:
        'Query recent Life Council insights (overall_status, headline, synthesis, actions). ' +
        'Params: { limit?: number (default 3) }',
      execute: async (params) => {
        const { data, error } = await supabase
          .from('daily_council_insights')
          .select('id, overall_status, headline, synthesis, actions, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(Number(params.limit) || 3)

        if (error) return { error: error.message }
        return { count: data?.length ?? 0, insights: data }
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // -----------------------------------------------------------------------
    // 1. Setup clients
    // -----------------------------------------------------------------------
    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const genAI = new GoogleGenerativeAI(apiKey)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // -----------------------------------------------------------------------
    // 2. Extract userId from JWT
    // -----------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let userId: string
    try {
      const token = authHeader.replace('Bearer ', '')
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub
      if (!userId) throw new Error('No sub in token')
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // -----------------------------------------------------------------------
    // 3. Parse request body
    // -----------------------------------------------------------------------
    const body = await req.json()
    const message: string = body.payload?.message || body.message
    const history: Array<{ role: string; content: string }> =
      body.payload?.history || body.history || []
    const module: string = body.payload?.module || body.module || 'coordinator'

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // -----------------------------------------------------------------------
    // 4. Intent pre-check — simple questions bypass ReACT
    // -----------------------------------------------------------------------
    const intentModel = genAI.getGenerativeModel({
      model: MODELS.fast,
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    })
    const intentResult = await intentModel.generateContent(
      `Classify if this question needs cross-module user data to answer well.
Reply ONLY "simple" or "enriched".
Simple: greetings, time, generic questions, opinions, jokes, single-domain answers that don't need user data.
Enriched: questions about user's tasks, emotions, finances, schedule, patterns, daily summary, cross-module analysis.
Question: "${message}"`,
    )
    const intent = intentResult.response.text().trim().toLowerCase()

    if (intent.includes('simple')) {
      // Direct chat — no ReACT loop needed
      const chatModel = genAI.getGenerativeModel({
        model: MODELS.fast,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      })
      const directResult = await chatModel.generateContent(
        `${SYSTEM_PROMPT}\n\nUsuario: ${message}`,
      )
      const directAnswer = directResult.response.text()

      // Fire-and-forget usage logging
      logInteraction(supabaseAdmin, userId, {
        action: 'react_chat_simple',
        module,
        model: MODELS.fast,
        tokensIn: directResult.response.usageMetadata?.promptTokenCount ?? 0,
        tokensOut: directResult.response.usageMetadata?.candidatesTokenCount ?? 0,
      })

      return new Response(
        JSON.stringify({
          success: true,
          response: directAnswer,
          mode: 'direct',
          react: false,
          tokens: {
            input: directResult.response.usageMetadata?.promptTokenCount ?? 0,
            output: directResult.response.usageMetadata?.candidatesTokenCount ?? 0,
          },
          latencyMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // -----------------------------------------------------------------------
    // 5. Build ReACT tools
    // -----------------------------------------------------------------------
    const tools: ReactTool[] = buildChatTools(supabaseAdmin, userId)

    // -----------------------------------------------------------------------
    // 6. Create agent_runs record
    // -----------------------------------------------------------------------
    const { data: run } = await supabaseAdmin
      .from('agent_runs')
      .insert({
        user_id: userId,
        agent_type: 'react',
        action: 'react_chat',
        status: 'running',
        user_message: message,
      })
      .select('id')
      .single()

    // -----------------------------------------------------------------------
    // 7. Build callModel wrapper for Gemini
    // -----------------------------------------------------------------------
    const callModel = async (prompt: string, model: 'fast' | 'smart') => {
      const m = genAI.getGenerativeModel({
        model: MODELS[model],
        generationConfig: {
          temperature: model === 'fast' ? 0.3 : 0.5,
          maxOutputTokens: 4096,
        },
      })
      const result = await m.generateContent(prompt)
      const usage = result.response.usageMetadata
      return {
        text: result.response.text(),
        tokens: {
          input: usage?.promptTokenCount ?? 0,
          output: usage?.candidatesTokenCount ?? 0,
        },
      }
    }

    // -----------------------------------------------------------------------
    // 8. Run ReACT loop with health tracking
    // -----------------------------------------------------------------------
    const reactResult = await withHealthTracking(
      { functionName: 'react-agent', actionName: 'react_chat' },
      supabaseAdmin,
      () =>
        runReactLoop(
          {
            tools,
            minToolCalls: 1,
            maxToolCalls: 5,
            maxCharsPerObservation: 4000,
            timeoutPerStepMs: 30_000,
            totalTimeoutMs: 120_000, // Leave 30s margin for the Edge Function's 150s limit
            systemPrompt: SYSTEM_PROMPT,
            userMessage: message,
            history,
          },
          callModel,
        ),
    )

    // -----------------------------------------------------------------------
    // 9. Update agent_runs with result
    // -----------------------------------------------------------------------
    const latencyMs = Date.now() - startTime
    const toolCallsCount = reactResult.steps.filter((s: ReactStep) => s.action).length

    if (run?.id) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'completed',
          steps: reactResult.steps,
          final_answer: reactResult.finalAnswer,
          confidence: reactResult.confidence,
          was_escalated: reactResult.wasEscalated,
          total_tokens: reactResult.tokens.input + reactResult.tokens.output,
          tool_calls_count: toolCallsCount,
          latency_ms: latencyMs,
          model_used: reactResult.model,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id)
    }

    // -----------------------------------------------------------------------
    // 10. Log usage (fire-and-forget)
    // -----------------------------------------------------------------------
    logInteraction(supabaseAdmin, userId, {
      action: 'react_chat',
      module,
      model: reactResult.model,
      tokensIn: reactResult.tokens.input,
      tokensOut: reactResult.tokens.output,
    })

    // -----------------------------------------------------------------------
    // 11. Return response
    // -----------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        response: reactResult.finalAnswer,
        mode: 'react',
        react: true,
        steps: reactResult.steps.length,
        toolCalls: toolCallsCount,
        confidence: reactResult.confidence,
        wasEscalated: reactResult.wasEscalated,
        tokens: reactResult.tokens,
        latencyMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[react-agent] Error:', message)
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
