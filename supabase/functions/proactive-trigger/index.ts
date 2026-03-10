/**
 * Proactive Agent Trigger Edge Function (Task #43)
 *
 * Triggers proactive agents via HTTP. Can be called by:
 * - Supabase pg_cron
 * - Cloud Scheduler
 * - External cron services (cron-job.org)
 *
 * Endpoints:
 * - POST /proactive-trigger - Trigger agent for user(s)
 * - GET /proactive-trigger/status - Get agent status
 *
 * Request body for POST:
 * {
 *   "agent_name": "morning_briefing" | "deadline_watcher" | "pattern_analyzer" | "session_cleanup",
 *   "user_id": "uuid" | "all",  // "all" triggers for all active users
 *   "context": {}  // Optional additional context
 * }
 *
 * Authentication:
 * - Requires PROACTIVE_TRIGGER_SECRET header for external calls
 * - Or valid Supabase service role key
 *
 * Note: This Edge Function forwards requests to the ADK backend.
 * The ADK backend at ADK_BACKEND_URL handles the actual agent execution.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// ============================================================================
// CORS (inlined — MCP deploy cannot resolve relative _shared/ imports)
// ============================================================================

const ALLOWED_ORIGINS = [
  'https://dev.aica.guru',
  'https://aica.guru',
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = isAllowedOrigin(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-proactive-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PROACTIVE_TRIGGER_SECRET = Deno.env.get('PROACTIVE_TRIGGER_SECRET')
const ADK_BACKEND_URL = Deno.env.get('ADK_BACKEND_URL') || 'http://localhost:8000'

// Valid agent names
const VALID_AGENTS = [
  'morning_briefing',
  'deadline_watcher',
  'pattern_analyzer',
  'session_cleanup',
]

interface TriggerRequest {
  agent_name: string
  user_id: string // UUID or "all"
  context?: Record<string, unknown>
}

interface TriggerResult {
  success: boolean
  message: string
  data?: unknown
  error?: string
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)

  try {
    // Authentication
    const secret = req.headers.get('x-proactive-secret')
    const authHeader = req.headers.get('authorization')

    const bearerToken = authHeader?.replace('Bearer ', '')
    const hasValidSecret = PROACTIVE_TRIGGER_SECRET && secret === PROACTIVE_TRIGGER_SECRET
    const hasValidServiceKey = bearerToken === SUPABASE_SERVICE_KEY

    if (!hasValidSecret && !hasValidServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Route: GET /proactive-trigger/status
    if (req.method === 'GET' && url.pathname.endsWith('/status')) {
      return await handleStatus(corsHeaders)
    }

    // Route: POST /proactive-trigger
    if (req.method === 'POST') {
      return await handleTrigger(req, corsHeaders)
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Proactive trigger error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Handle status request - returns available agents and their schedules
 */
async function handleStatus(corsHeaders: Record<string, string>): Promise<Response> {
  const status = {
    available_agents: VALID_AGENTS,
    schedules: {
      morning_briefing: {
        description: 'Gera briefing diario personalizado',
        schedule: '0 7 * * *',
        timezone: 'America/Sao_Paulo',
      },
      deadline_watcher: {
        description: 'Monitora deadlines a cada 6 horas',
        schedule: '0 */6 * * *',
        timezone: 'America/Sao_Paulo',
      },
      pattern_analyzer: {
        description: 'Analisa padroes semanalmente',
        schedule: '0 21 * * 0',
        timezone: 'America/Sao_Paulo',
      },
      session_cleanup: {
        description: 'Limpa sessoes expiradas diariamente',
        schedule: '0 3 * * *',
        timezone: 'America/Sao_Paulo',
      },
    },
    timestamp: new Date().toISOString(),
  }

  return new Response(
    JSON.stringify(status),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Handle trigger request - execute proactive agent
 */
async function handleTrigger(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const body: TriggerRequest = await req.json()

  // Validate request
  if (!body.agent_name || !VALID_AGENTS.includes(body.agent_name)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid agent_name',
        valid_agents: VALID_AGENTS,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (!body.user_id) {
    return new Response(
      JSON.stringify({ error: 'user_id is required (UUID or "all")' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get user(s) to trigger
  let userIds: string[] = []

  if (body.user_id === 'all') {
    // Get all active users
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id')
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    userIds = (users || []).map(u => u.id)
  } else if (body.user_id === 'system') {
    // System-level cleanup (no specific user)
    userIds = ['system']
  } else {
    // Single user
    userIds = [body.user_id]
  }

  if (userIds.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'No users to trigger',
        data: { triggered_count: 0 }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Execute agent for each user
  const results: Array<{ user_id: string; result: TriggerResult }> = []

  for (const userId of userIds) {
    try {
      const result = await executeAgentForUser(
        body.agent_name,
        userId,
        body.context || {},
        supabase
      )
      results.push({ user_id: userId, result })
    } catch (error) {
      results.push({
        user_id: userId,
        result: {
          success: false,
          message: 'Execution failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  // Summary
  const successCount = results.filter(r => r.result.success).length
  const failureCount = results.length - successCount

  return new Response(
    JSON.stringify({
      success: failureCount === 0,
      message: `Triggered ${body.agent_name} for ${results.length} user(s): ${successCount} success, ${failureCount} failed`,
      data: {
        agent_name: body.agent_name,
        triggered_count: results.length,
        success_count: successCount,
        failure_count: failureCount,
        results: results,
      }
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Execute proactive agent for a single user
 *
 * This function can either:
 * 1. Forward to ADK backend (if available)
 * 2. Execute locally using Supabase RPC (fallback)
 */
async function executeAgentForUser(
  agentName: string,
  userId: string,
  context: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<TriggerResult> {
  // Try ADK backend first
  try {
    const response = await fetch(`${ADK_BACKEND_URL}/proactive/${agentName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        context: context,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        message: data.message || 'Agent executed via ADK',
        data: data,
      }
    }

    // ADK returned error - fall through to local execution
    console.warn(`ADK backend returned ${response.status}, falling back to local execution`)
  } catch (error) {
    // ADK not available - fall through to local execution
    console.warn('ADK backend not available, using local execution:', error)
  }

  // Fallback: Local execution using Supabase
  return await executeAgentLocally(agentName, userId, context, supabase)
}

/**
 * Execute agent locally using Supabase (fallback when ADK is not available)
 *
 * Handles all 4 agent types with real logic:
 * - morning_briefing: calls run-life-council Edge Function, inserts notification
 * - deadline_watcher: queries work_items for overdue/due-today, inserts notification
 * - pattern_analyzer: calls synthesize-user-patterns Edge Function, inserts notification
 * - session_cleanup: calls cleanup_expired_agent_sessions RPC
 */
async function executeAgentLocally(
  agentName: string,
  userId: string,
  context: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<TriggerResult> {
  const executionTime = new Date().toISOString()

  // Store execution record
  const { error } = await supabase
    .from('user_memory')
    .upsert({
      user_id: userId,
      category: 'proactive',
      key: `${agentName}_last_trigger`,
      module: null,
      value: JSON.stringify({
        triggered_at: executionTime,
        context: context,
        execution_mode: 'edge_function_fallback',
        note: 'Full execution requires ADK backend',
      }),
      source: 'proactive_trigger',
      confidence: 1.0,
    }, {
      onConflict: 'user_id,category,key,module',
    })

  if (error) {
    console.warn('Failed to store execution record (non-blocking):', error.message)
  }

  // Agent-specific actions
  switch (agentName) {
    case 'morning_briefing': {
      try {
        const councilResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/run-life-council`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({ userId }),
          }
        )
        const councilData = await councilResponse.json()

        if (councilData.success) {
          await supabase.from('agent_notifications').insert({
            user_id: userId,
            agent_name: 'morning_briefing',
            notification_type: 'insight',
            title: (councilData.insight?.headline || 'Briefing matinal').substring(0, 200),
            body: (councilData.insight?.synthesis || 'Conselho do dia gerado').substring(0, 500),
            metadata: {
              insight_id: councilData.insight?.id,
              overall_status: councilData.insight?.overall_status,
            },
          })
          return {
            success: true,
            message: 'Morning briefing generated',
            data: councilData,
          }
        }
        return {
          success: false,
          message: 'Life council call returned unsuccessful',
          data: councilData,
        }
      } catch (err) {
        console.error('morning_briefing failed:', err)
        return {
          success: false,
          message: 'Morning briefing failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }

    case 'deadline_watcher': {
      try {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const { data: urgentTasks } = await supabase
          .from('work_items')
          .select('id, title, due_date, status, priority')
          .eq('user_id', userId)
          .in('status', ['todo', 'in_progress', 'pending'])
          .lte('due_date', tomorrow)
          .order('due_date', { ascending: true })

        if (urgentTasks && urgentTasks.length > 0) {
          const today = new Date().toISOString().split('T')[0]
          const overdue = urgentTasks.filter((t: { due_date: string }) => t.due_date < today)
          const dueToday = urgentTasks.filter((t: { due_date: string }) => t.due_date === today)

          const title = overdue.length > 0
            ? `${overdue.length} tarefa(s) atrasada(s)`
            : `${dueToday.length} tarefa(s) para hoje`

          const body = urgentTasks
            .slice(0, 5)
            .map((t: { title: string }) => `\u2022 ${t.title}`)
            .join('\n')
            .substring(0, 500)

          await supabase.from('agent_notifications').insert({
            user_id: userId,
            agent_name: 'deadline_watcher',
            notification_type: 'deadline',
            title,
            body,
            metadata: {
              task_count: urgentTasks.length,
              overdue_count: overdue.length,
              due_today_count: dueToday.length,
            },
          })
        }
        return {
          success: true,
          message: `Found ${urgentTasks?.length || 0} urgent tasks`,
          data: { task_count: urgentTasks?.length || 0 },
        }
      } catch (err) {
        console.error('deadline_watcher failed:', err)
        return {
          success: false,
          message: 'Deadline watcher failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }

    case 'pattern_analyzer': {
      try {
        const patternResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/synthesize-user-patterns`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({ userId }),
          }
        )
        const patternData = await patternResponse.json()

        if (patternData.success && patternData.new_patterns?.length > 0) {
          await supabase.from('agent_notifications').insert({
            user_id: userId,
            agent_name: 'pattern_analyzer',
            notification_type: 'pattern',
            title: `${patternData.new_patterns.length} novo(s) padr\u00e3o(\u00f5es) detectado(s)`,
            body: patternData.new_patterns
              .map((p: { description: string }) => `\u2022 ${p.description}`)
              .join('\n')
              .substring(0, 500),
            metadata: { patterns: patternData.new_patterns },
          })
        }
        return {
          success: true,
          message: 'Pattern analysis complete',
          data: patternData,
        }
      } catch (err) {
        console.error('pattern_analyzer failed:', err)
        return {
          success: false,
          message: 'Pattern analysis failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }

    case 'session_cleanup': {
      // Actually run cleanup
      const { error: cleanupError } = await supabase.rpc('cleanup_expired_agent_sessions')
      if (cleanupError) {
        return {
          success: false,
          message: 'Cleanup RPC failed',
          error: cleanupError.message,
        }
      }
      return {
        success: true,
        message: 'Session cleanup executed via RPC',
        data: { execution_mode: 'rpc' },
      }
    }

    default:
      return {
        success: true,
        message: `Agent ${agentName} trigger recorded. No handler available.`,
        data: {
          execution_mode: 'edge_function_fallback',
          triggered_at: executionTime,
        },
      }
  }
}
