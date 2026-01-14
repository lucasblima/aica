import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5p22u2w6jq-rj.a.run.app',
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

type Priority = 'high' | 'normal' | 'low'
type ActionStatus = 'pending' | 'processing' | 'completed' | 'failed'
type ActionType = 'ai_completion' | 'document_processing' | 'notification' | 'email' | 'webhook'

interface QueuedAction {
  id: string
  user_id: string
  action_type: ActionType
  payload: Record<string, unknown>
  priority: Priority
  status: ActionStatus
  scheduled_for: string | null
  retry_count: number
  max_retries: number
  created_at: string
}

interface ProcessResult {
  processed: number
  succeeded: number
  failed: number
  remaining: number
  actions: Array<{
    id: string
    status: 'completed' | 'failed'
    error?: string
  }>
}

// ============================================================================
// PRIORITY WEIGHTS
// ============================================================================

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 1,
  normal: 2,
  low: 3,
}

// ============================================================================
// ACTION PROCESSORS
// ============================================================================

async function processAICompletion(
  supabase: ReturnType<typeof createClient>,
  action: QueuedAction
): Promise<{ success: boolean; error?: string }> {
  const { payload, user_id } = action

  try {
    // Check rate limit before processing
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-rate-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        user_id,
        model_tier: payload.model_tier || 'standard',
        estimated_tokens: payload.estimated_tokens || 1000,
      }),
    })

    const rateLimit = await response.json()

    if (!rateLimit.allowed) {
      // Reschedule for later
      const retryAfter = rateLimit.retry_after || 3600 // Default 1 hour
      const scheduledFor = new Date(Date.now() + retryAfter * 1000).toISOString()

      await supabase
        .from('action_queue')
        .update({
          status: 'pending',
          scheduled_for: scheduledFor,
          retry_count: action.retry_count + 1,
        })
        .eq('id', action.id)

      return { success: false, error: `Rate limited. Rescheduled for ${scheduledFor}` }
    }

    // Process AI completion via gemini-chat function
    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/gemini-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        action: payload.action,
        payload: payload.data,
      }),
    })

    if (!aiResponse.ok) {
      throw new Error(`AI completion failed: ${aiResponse.statusText}`)
    }

    const result = await aiResponse.json()

    // Record token usage
    if (result.usageMetadata) {
      const totalTokens = (result.usageMetadata.promptTokenCount || 0) +
                          (result.usageMetadata.candidatesTokenCount || 0)

      await supabase.rpc('record_token_usage', {
        p_user_id: user_id,
        p_model_tier: payload.model_tier || 'standard',
        p_tokens_used: totalTokens,
        p_request_type: payload.action || 'ai_completion',
      })
    }

    // Store result if callback specified
    if (payload.callback_table && payload.callback_id) {
      await supabase
        .from(payload.callback_table as string)
        .update({ ai_result: result.result })
        .eq('id', payload.callback_id)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function processDocumentProcessing(
  supabase: ReturnType<typeof createClient>,
  action: QueuedAction
): Promise<{ success: boolean; error?: string }> {
  const { payload } = action

  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Document processing failed: ${response.statusText}`)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function processNotification(
  supabase: ReturnType<typeof createClient>,
  action: QueuedAction
): Promise<{ success: boolean; error?: string }> {
  const { payload, user_id } = action

  try {
    // Insert notification into notifications table
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title: payload.title || 'Notification',
        message: payload.message,
        type: payload.type || 'info',
        read: false,
        data: payload.data || {},
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function processAction(
  supabase: ReturnType<typeof createClient>,
  action: QueuedAction
): Promise<{ success: boolean; error?: string }> {
  switch (action.action_type) {
    case 'ai_completion':
      return processAICompletion(supabase, action)
    case 'document_processing':
      return processDocumentProcessing(supabase, action)
    case 'notification':
      return processNotification(supabase, action)
    default:
      return { success: false, error: `Unknown action type: ${action.action_type}` }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const MAX_ACTIONS_PER_RUN = 10

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse query params
    const url = new URL(req.url)
    const force = url.searchParams.get('force') === 'true'
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || String(MAX_ACTIONS_PER_RUN)),
      MAX_ACTIONS_PER_RUN
    )

    // Fetch pending actions ordered by priority and created_at
    const now = new Date().toISOString()
    const { data: pendingActions, error: fetchError } = await supabase
      .from('action_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit)

    if (fetchError) {
      console.error('[process-action-queue] Error fetching actions:', fetchError)
      throw new Error('Failed to fetch pending actions')
    }

    const actions = (pendingActions || []) as QueuedAction[]
    console.log(`[process-action-queue] Found ${actions.length} pending actions`)

    const results: ProcessResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      remaining: 0,
      actions: [],
    }

    // Process each action
    for (const action of actions) {
      // Mark as processing
      await supabase
        .from('action_queue')
        .update({ status: 'processing' })
        .eq('id', action.id)

      const { success, error } = await processAction(supabase, action)
      results.processed++

      if (success) {
        results.succeeded++
        results.actions.push({ id: action.id, status: 'completed' })

        // Mark as completed
        await supabase
          .from('action_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', action.id)
      } else {
        results.failed++
        results.actions.push({ id: action.id, status: 'failed', error })

        // Check if we should retry
        const shouldRetry = action.retry_count < action.max_retries

        if (shouldRetry) {
          // Exponential backoff: 1min, 5min, 30min
          const backoffMinutes = Math.pow(5, action.retry_count + 1)
          const scheduledFor = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString()

          await supabase
            .from('action_queue')
            .update({
              status: 'pending',
              retry_count: action.retry_count + 1,
              scheduled_for: scheduledFor,
              error_message: error,
            })
            .eq('id', action.id)
        } else {
          // Max retries exceeded, mark as failed permanently
          await supabase
            .from('action_queue')
            .update({
              status: 'failed',
              error_message: error,
              processed_at: new Date().toISOString(),
            })
            .eq('id', action.id)
        }
      }
    }

    // Get remaining count
    const { count: remainingCount } = await supabase
      .from('action_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    results.remaining = remainingCount || 0

    const latencyMs = Date.now() - startTime
    console.log(`[process-action-queue] Completed in ${latencyMs}ms: ${results.succeeded}/${results.processed} succeeded`)

    return new Response(
      JSON.stringify({
        ...results,
        latencyMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    const err = error as Error
    console.error('[process-action-queue] Error:', err.message)

    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
