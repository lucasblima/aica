import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"

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

type ModelTier = 'premium' | 'standard' | 'lite'

interface RateLimitRequest {
  user_id: string
  model_tier: ModelTier
  estimated_tokens: number
}

interface RateLimitResponse {
  allowed: boolean
  remaining_tokens: number
  reset_time: string
  queue_position?: number
  retry_after?: number
}

interface TokenAvailability {
  is_available: boolean
  remaining_tokens: number
  window_start: string
  window_end: string
}

// ============================================================================
// MODEL TIER MAPPINGS
// ============================================================================

const MODEL_TIER_LIMITS: Record<ModelTier, { free: number; pro: number; teams: number; enterprise: number }> = {
  premium: { free: 50000, pro: 500000, teams: 2000000, enterprise: 10000000 },
  standard: { free: 200000, pro: 2000000, teams: 10000000, enterprise: 50000000 },
  lite: { free: 1000000, pro: 10000000, teams: 50000000, enterprise: -1 }, // -1 = unlimited
}

const MODEL_TO_TIER: Record<string, ModelTier> = {
  'claude-opus-4-5-20251101': 'premium',
  'gemini-1.5-pro': 'premium',
  'claude-sonnet-4-20250514': 'standard',
  'gemini-1.5-flash': 'standard',
  'gemini-2.0-flash-exp': 'standard',
  'claude-haiku-4-20250514': 'lite',
  'gemini-2.0-flash-lite': 'lite',
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: RateLimitRequest = await req.json()
    const { user_id, model_tier, estimated_tokens } = body

    // Validate inputs
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!model_tier || !['premium', 'standard', 'lite'].includes(model_tier)) {
      return new Response(
        JSON.stringify({ error: 'model_tier must be one of: premium, standard, lite' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!estimated_tokens || estimated_tokens < 1) {
      return new Response(
        JSON.stringify({ error: 'estimated_tokens must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check token availability using the database function
    const { data: availability, error: availabilityError } = await supabase
      .rpc('check_token_availability', {
        p_user_id: user_id,
        p_model_tier: model_tier,
        p_estimated_tokens: estimated_tokens,
      })

    if (availabilityError) {
      console.error('[check-rate-limit] Error checking availability:', availabilityError)
      throw new Error('Failed to check token availability')
    }

    // Parse the result
    const result = availability as TokenAvailability

    // Calculate reset time (end of current 4-hour window)
    const windowEnd = new Date(result.window_end)
    const now = new Date()
    const retryAfterSeconds = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))

    // Build response
    const response: RateLimitResponse = {
      allowed: result.is_available,
      remaining_tokens: result.remaining_tokens,
      reset_time: result.window_end,
    }

    if (!result.is_available) {
      response.retry_after = retryAfterSeconds

      // Check queue position if user has pending actions
      const { data: queuePosition, error: queueError } = await supabase
        .from('action_queue')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('status', 'pending')

      if (!queueError && queuePosition !== null) {
        // Get actual count
        const { count } = await supabase
          .from('action_queue')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .eq('status', 'pending')

        response.queue_position = count || 0
      }
    }

    // Build rate limit headers
    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(MODEL_TIER_LIMITS[model_tier].pro), // Default to pro limits
      'X-RateLimit-Remaining': String(result.remaining_tokens),
      'X-RateLimit-Reset': String(Math.floor(windowEnd.getTime() / 1000)),
    }

    if (!result.is_available) {
      rateLimitHeaders['Retry-After'] = String(retryAfterSeconds)
    }

    return new Response(
      JSON.stringify(response),
      {
        status: result.is_available ? 200 : 429,
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {
    const err = error as Error
    console.error('[check-rate-limit] Error:', err.message)

    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
