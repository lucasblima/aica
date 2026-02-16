/**
 * Privacy Purge Edge Function
 * Issue #146: LGPD/GDPR Compliance - Auto-delete Raw Messages
 *
 * Manual trigger for privacy purge operations.
 * Requires admin role or service key authentication.
 *
 * Endpoint: POST /functions/v1/privacy-purge
 * Body: {
 *   retentionHours?: number (default: 24),
 *   batchSize?: number (default: 1000)
 * }
 * Response: {
 *   success: boolean,
 *   executionId: string,
 *   messagesPurged: number,
 *   bytesFreed: number,
 *   usersAffected: number,
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

interface PurgeRequest {
  retentionHours?: number
  batchSize?: number
}

interface PurgeResponse {
  success: boolean
  executionId?: string
  messagesPurged?: number
  bytesFreed?: number
  usersAffected?: number
  error?: string
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Check authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Check if it's the service role key (for cron jobs or admin access)
    const isServiceRole = token === supabaseServiceKey

    if (!isServiceRole) {
      // Verify user is admin
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user has admin role
      const { data: userProfile, error: profileError } = await createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || userProfile?.role !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse request body
    let body: PurgeRequest = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Empty body is OK
    }

    const retentionHours = body.retentionHours ?? 24
    const batchSize = body.batchSize ?? 1000

    // Validate parameters
    if (retentionHours < 1 || retentionHours > 720) { // Max 30 days
      return new Response(
        JSON.stringify({ success: false, error: 'retentionHours must be between 1 and 720' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (batchSize < 1 || batchSize > 10000) {
      return new Response(
        JSON.stringify({ success: false, error: 'batchSize must be between 1 and 10000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    console.log(`[privacy-purge] Starting purge with retention=${retentionHours}h, batch=${batchSize}`)

    // Call the database function
    const { data, error } = await supabase.rpc('trigger_privacy_purge_now', {
      p_retention_hours: retentionHours
    })

    if (error) {
      console.error('[privacy-purge] RPC error:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = data?.[0]

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'No result from purge function' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: PurgeResponse = {
      success: true,
      executionId: result.execution_id,
      messagesPurged: result.messages_purged,
      bytesFreed: result.bytes_freed_estimate,
      usersAffected: result.users_affected,
    }

    console.log(`[privacy-purge] Completed: ${JSON.stringify(response)}`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error('[privacy-purge] Error:', err.message)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
