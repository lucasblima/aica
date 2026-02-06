/**
 * Claim Daily Credits Edge Function
 *
 * Allows users to claim their daily credit bonus (5 credits).
 * Can only be claimed once per day.
 *
 * Endpoint: POST /functions/v1/claim-daily-credits
 * Body: {} (empty)
 * Response: {
 *   success: boolean,
 *   creditsEarned: number,
 *   newBalance: number,
 *   message: string,
 *   nextClaimAt?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClaimResponse {
  success: boolean
  creditsEarned: number
  newBalance: number
  message: string
  nextClaimAt?: string
}

/**
 * Get next midnight in user's timezone (or UTC)
 */
function getNextMidnight(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    console.log(`[claim-daily-credits] User ${user.id} claiming daily credits`)

    // Call database function to claim daily credits
    const { data: claimResult, error: claimError } = await supabase.rpc('claim_daily_credits', {
      p_user_id: user.id
    })

    if (claimError) {
      console.error('[claim-daily-credits] RPC error:', claimError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to claim credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = claimResult?.[0]

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'No result from claim function' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: ClaimResponse = {
      success: result.success,
      creditsEarned: result.credits_earned || 0,
      newBalance: result.new_balance || 0,
      message: result.message || (result.success ? 'Daily credits claimed!' : 'Already claimed today'),
      nextClaimAt: result.success ? undefined : getNextMidnight()
    }

    // If claim was successful, also award XP
    if (result.success) {
      try {
        await supabase.rpc('award_user_xp', {
          p_user_id: user.id,
          p_xp_amount: 10,
          p_source: 'daily_login',
          p_description: 'Daily login bonus'
        })
        console.log('[claim-daily-credits] Awarded 10 XP for daily login')
      } catch {
        // XP award is non-critical
        console.log('[claim-daily-credits] XP award skipped')
      }
    }

    console.log(`[claim-daily-credits] Result: ${JSON.stringify(response)}`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error('[claim-daily-credits] Error:', err.message)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
