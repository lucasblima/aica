/**
 * Estimate Processing Cost Edge Function
 *
 * Calculates the credit cost for processing a contact's WhatsApp messages
 * before the user commits to the operation.
 *
 * Endpoint: POST /functions/v1/estimate-processing-cost
 * Body: { contactId: string }
 * Response: {
 *   creditCost: number,
 *   messageCount: number,
 *   userBalance: number,
 *   canAfford: boolean,
 *   estimatedDuration: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

interface EstimateRequest {
  contactId: string
}

interface EstimateResponse {
  creditCost: number
  messageCount: number
  userBalance: number
  canAfford: boolean
  estimatedDuration: string
  contactName: string
  hasExistingAnalysis: boolean
  lastAnalyzedAt: string | null
}

/**
 * Calculate credit cost for processing a contact
 *
 * Formula: base_cost + (message_tiers * tier_rate)
 *
 * Rationale:
 * - Base cost covers API overhead
 * - Tiered pricing for message volume (more messages = more analysis = more cost)
 * - Caps at 25 credits to prevent sticker shock
 */
function calculateProcessingCost(messageCount: number): number {
  const BASE_COST = 3

  // Tiered message costs
  const tiers = [
    { max: 50, rate: 0 },       // First 50 messages: free (included in base)
    { max: 200, rate: 0.02 },   // 51-200: 0.02 credits each = 3 credits max
    { max: 500, rate: 0.03 },   // 201-500: 0.03 credits each = 9 credits max
    { max: Infinity, rate: 0.02 } // 500+: 0.02 credits each (diminishing)
  ]

  let cost = BASE_COST
  let remaining = messageCount
  let prevMax = 0

  for (const tier of tiers) {
    const tierMessages = Math.min(remaining, tier.max - prevMax)
    if (tierMessages <= 0) break

    cost += tierMessages * tier.rate
    remaining -= tierMessages
    prevMax = tier.max
  }

  // Cap at 25 credits
  return Math.min(Math.ceil(cost), 25)
}

/**
 * Estimate duration based on message count
 */
function estimateDuration(messageCount: number): string {
  // Rough estimate: 1-2 seconds per 100 messages
  const estimatedSeconds = Math.max(5, Math.ceil(messageCount / 100) * 2)

  if (estimatedSeconds < 60) {
    return `${estimatedSeconds} segundos`
  } else {
    return `${Math.ceil(estimatedSeconds / 60)} minutos`
  }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client (to validate user token)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service client (for database operations bypassing RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse request body
    const { contactId }: EstimateRequest = await req.json()

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'contactId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[estimate-processing-cost] Estimating for contact ${contactId}, user ${user.id}`)

    // Get contact info
    const { data: contact, error: contactError } = await supabase
      .from('contact_network')
      .select('id, name, whatsapp_id, last_analysis_id, last_analyzed_at')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single()

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get message count for contact
    // Note: whatsapp_messages table may not exist yet, handle gracefully
    let messageCount = 0
    try {
      const { count, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('contact_whatsapp_id', contact.whatsapp_id)
        .eq('user_id', user.id)

      if (!msgError && count !== null) {
        messageCount = count
      }
    } catch {
      // Table may not exist, use estimated count based on last interaction
      console.log('[estimate-processing-cost] whatsapp_messages table not available, using estimate')
      messageCount = 100 // Default estimate
    }

    // Calculate cost
    const creditCost = calculateProcessingCost(messageCount)

    // Get user balance
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    // If no credits record, user gets default 50
    const userBalance = credits?.balance ?? 50

    // If credits record doesn't exist, create it
    if (creditsError && creditsError.code === 'PGRST116') {
      await supabase
        .from('user_credits')
        .insert({
          user_id: user.id,
          balance: 50,
          lifetime_earned: 50
        })
    }

    const response: EstimateResponse = {
      creditCost,
      messageCount,
      userBalance,
      canAfford: userBalance >= creditCost,
      estimatedDuration: estimateDuration(messageCount),
      contactName: contact.name,
      hasExistingAnalysis: !!contact.last_analysis_id,
      lastAnalyzedAt: contact.last_analyzed_at
    }

    console.log(`[estimate-processing-cost] Estimate: ${creditCost} credits for ${messageCount} messages`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error('[estimate-processing-cost] Error:', err.message)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
