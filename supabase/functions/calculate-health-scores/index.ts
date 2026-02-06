/**
 * Calculate Health Scores Edge Function
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Dual-mode function for health score calculation:
 * 1. Batch mode (service role): Recalculates all stale contacts (called by n8n cron)
 * 2. Single mode (authenticated): Recalculates specific contact on demand
 *
 * Endpoint: POST /functions/v1/calculate-health-scores
 *
 * Batch Mode (service role):
 *   Auth: Bearer $SERVICE_ROLE_KEY
 *   Body: {} or empty
 *   Response: { success, contactsProcessed, startedAt, completedAt, durationMs }
 *
 * Single Mode (authenticated user):
 *   Auth: Bearer $USER_TOKEN
 *   Body: { contactId: "uuid" }
 *   Response: { success, contactId, healthScore, previousScore, scoreDelta, trend, components, ... }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// Types
// ============================================================================

interface SingleCalculateRequest {
  contactId: string
}

interface HealthScoreComponents {
  frequency_score: number
  recency_score: number
  sentiment_score: number
  reciprocity_score: number
  depth_score: number
  total_score: number
  messages_analyzed: number
  days_since_last_message: number
  calculated_at: string
}

interface BatchCalculateResponse {
  success: boolean
  mode: 'batch'
  contactsProcessed: number
  startedAt: string
  completedAt: string
  durationMs: number
  error?: string
}

interface SingleCalculateResponse {
  success: boolean
  mode: 'single'
  contactId: string
  healthScore: number
  previousScore: number | null
  scoreDelta: number | null
  trend: 'improving' | 'stable' | 'declining' | 'new'
  components: HealthScoreComponents
  messagesAnalyzed: number
  durationMs: number
  error?: string
}

interface ErrorResponse {
  success: false
  error: string
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Check authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '').trim()

    // Check if it's the service role key by decoding the JWT and checking the role claim
    // This is more reliable than comparing raw tokens
    let isServiceRole = false
    try {
      // Decode JWT payload (base64url decode the second part)
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        isServiceRole = payload.role === 'service_role'
        console.log(`[calculate-health-scores] JWT role: ${payload.role}`)
      }
    } catch (e) {
      console.log(`[calculate-health-scores] Could not decode JWT: ${e}`)
    }

    // Parse request body
    let body: Partial<SingleCalculateRequest> = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Empty body is OK for batch mode
    }

    // Determine mode based on body content
    const isSingleMode = body.contactId !== undefined

    // Service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ========================================================================
    // Batch Mode: Service role only
    // ========================================================================
    if (!isSingleMode) {
      if (!isServiceRole) {
        return jsonResponse({ success: false, error: 'Batch mode requires service role authentication' }, 403)
      }

      console.log('[calculate-health-scores] Batch mode started')
      const batchStartedAt = new Date().toISOString()

      // Call the batch recalculation function
      const { data, error } = await supabase.rpc('batch_recalculate_health_scores')

      if (error) {
        console.error('[calculate-health-scores] Batch RPC error:', error)
        return jsonResponse({ success: false, error: error.message }, 500)
      }

      const contactsProcessed = data as number || 0
      const completedAt = new Date().toISOString()
      const durationMs = Date.now() - startTime

      const response: BatchCalculateResponse = {
        success: true,
        mode: 'batch',
        contactsProcessed,
        startedAt: batchStartedAt,
        completedAt,
        durationMs,
      }

      console.log(`[calculate-health-scores] Batch completed: ${contactsProcessed} contacts in ${durationMs}ms`)

      return jsonResponse(response, 200)
    }

    // ========================================================================
    // Single Mode: Authenticated user
    // ========================================================================
    const { contactId } = body as SingleCalculateRequest

    // Validate contactId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(contactId)) {
      return jsonResponse({ success: false, error: 'Invalid contactId format' }, 400)
    }

    let userId: string

    if (isServiceRole) {
      // Service role can act on any contact, but we need to get the user_id from the contact
      const { data: contact, error: contactError } = await supabase
        .from('contact_network')
        .select('user_id')
        .eq('id', contactId)
        .single()

      if (contactError || !contact) {
        return jsonResponse({ success: false, error: 'Contact not found' }, 404)
      }

      userId = contact.user_id
    } else {
      // Authenticated user mode - verify token
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

      if (authError || !user) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
      }

      userId = user.id

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await supabase
        .from('contact_network')
        .select('id, user_id')
        .eq('id', contactId)
        .eq('user_id', userId)
        .single()

      if (contactError || !contact) {
        return jsonResponse({ success: false, error: 'Contact not found' }, 404)
      }
    }

    console.log(`[calculate-health-scores] Single mode: contactId=${contactId}, userId=${userId}`)

    // Get previous score before recalculation
    const { data: previousData } = await supabase
      .from('contact_network')
      .select('health_score')
      .eq('id', contactId)
      .single()

    const previousScore = previousData?.health_score ?? null

    // Call the record_health_score function
    const { data: newScore, error: rpcError } = await supabase.rpc('record_health_score', {
      _user_id: userId,
      _contact_id: contactId,
    })

    if (rpcError) {
      console.error('[calculate-health-scores] Single RPC error:', rpcError)
      return jsonResponse({ success: false, error: rpcError.message }, 500)
    }

    // Fetch updated contact data
    const { data: updatedContact, error: fetchError } = await supabase
      .from('contact_network')
      .select('health_score, health_score_components, health_score_trend')
      .eq('id', contactId)
      .single()

    if (fetchError || !updatedContact) {
      console.error('[calculate-health-scores] Fetch error:', fetchError)
      return jsonResponse({ success: false, error: 'Failed to fetch updated contact' }, 500)
    }

    const components = updatedContact.health_score_components as HealthScoreComponents
    const durationMs = Date.now() - startTime

    const response: SingleCalculateResponse = {
      success: true,
      mode: 'single',
      contactId,
      healthScore: updatedContact.health_score ?? newScore,
      previousScore,
      scoreDelta: previousScore !== null ? (updatedContact.health_score ?? newScore) - previousScore : null,
      trend: (updatedContact.health_score_trend as SingleCalculateResponse['trend']) ?? 'new',
      components,
      messagesAnalyzed: components?.messages_analyzed ?? 0,
      durationMs,
    }

    console.log(`[calculate-health-scores] Single completed: score=${response.healthScore}, delta=${response.scoreDelta} in ${durationMs}ms`)

    return jsonResponse(response, 200)

  } catch (error) {
    const err = error as Error
    console.error('[calculate-health-scores] Error:', err.message)

    return jsonResponse({ success: false, error: err.message }, 500)
  }
})

// ============================================================================
// Helpers
// ============================================================================

function jsonResponse(data: BatchCalculateResponse | SingleCalculateResponse | ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
