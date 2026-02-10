/**
 * Agent Proxy Edge Function
 *
 * Proxies requests from the AICA frontend to the ADK agents
 * backend running on Cloud Run. Handles JWT forwarding, CORS,
 * and error propagation.
 *
 * This allows the frontend to use Supabase Edge Functions as
 * a unified API gateway while the ADK backend runs separately.
 *
 * @endpoint POST /functions/v1/agent-proxy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
  'https://aica-5562559893.southamerica-east1.run.app',
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
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Validate auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get agents backend URL from environment
    const agentsUrl = Deno.env.get('AGENTS_BACKEND_URL')
    if (!agentsUrl) {
      console.error('[agent-proxy] AGENTS_BACKEND_URL not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Agent service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const { message, session_id, context } = body

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Forward request to ADK backend
    const agentResponse = await fetch(`${agentsUrl}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        message,
        session_id,
        context,
      }),
    })

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text()
      console.error(`[agent-proxy] Backend error ${agentResponse.status}: ${errorText}`)

      return new Response(
        JSON.stringify({
          success: false,
          error: `Agent service error: ${agentResponse.status}`,
          latencyMs: Date.now() - startTime,
        }),
        { status: agentResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await agentResponse.json()
    const latencyMs = Date.now() - startTime

    console.log(`[agent-proxy] Agent: ${data.agent}, Latency: ${latencyMs}ms`)

    // Return response with proxy metadata
    return new Response(
      JSON.stringify({
        ...data,
        latencyMs,
        proxy: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const error = err as Error
    const latencyMs = Date.now() - startTime
    console.error(`[agent-proxy] Error after ${latencyMs}ms:`, error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        latencyMs,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
