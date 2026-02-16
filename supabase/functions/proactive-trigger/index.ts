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
import { getCorsHeaders } from '../_shared/cors.ts'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PROACTIVE_TRIGGER_SECRET = Deno.env.get('PROACTIVE_TRIGGER_SECRET') || 'dev-secret-change-in-production'
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
  const corsHeaders = {
    ...getCorsHeaders(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-proactive-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)

  try {
    // Authentication
    const secret = req.headers.get('x-proactive-secret')
    const authHeader = req.headers.get('authorization')

    if (secret !== PROACTIVE_TRIGGER_SECRET && !authHeader?.includes(SUPABASE_SERVICE_KEY)) {
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
      return await handleStatus()
    }

    // Route: POST /proactive-trigger
    if (req.method === 'POST') {
      return await handleTrigger(req)
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
async function handleStatus(): Promise<Response> {
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
    adk_backend_url: ADK_BACKEND_URL,
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
async function handleTrigger(req: Request): Promise<Response> {
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
 * This creates a minimal execution that stores results in user_memory.
 * Full functionality requires the ADK backend.
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
    return {
      success: false,
      message: 'Failed to store execution record',
      error: error.message,
    }
  }

  // Agent-specific minimal actions
  switch (agentName) {
    case 'session_cleanup':
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

    default:
      return {
        success: true,
        message: `Agent ${agentName} trigger recorded. Full execution requires ADK backend.`,
        data: {
          execution_mode: 'edge_function_fallback',
          triggered_at: executionTime,
        },
      }
  }
}
