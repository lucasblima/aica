/**
 * Disconnect WhatsApp Edge Function
 *
 * Logs out a WhatsApp instance from Evolution API without deleting it.
 * This allows the user to reconnect later using QR code or pairing code.
 *
 * Endpoint: POST /functions/v1/disconnect-whatsapp
 * Body: { sessionId: string } or empty (uses user's session)
 * Response: { success: boolean, message?: string, error?: string }
 *
 * Related: Issue #87 - WhatsApp Pairing Code
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { logoutInstance } from '../_shared/evolution-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DisconnectRequest {
  sessionId?: string // Optional: specific session ID to disconnect
}

interface DisconnectResponse {
  success: boolean
  message?: string
  sessionId?: string
  instanceName?: string
  error?: string
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // 3. Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured')
    }

    // Auth client (to validate user)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Service client (for database operations)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    console.log(`[disconnect-whatsapp] User ${user.id} requesting disconnect`)

    // 4. Parse request body (optional sessionId)
    let requestBody: DisconnectRequest = {}
    try {
      requestBody = await req.json()
    } catch {
      // Empty body is OK, we'll use user's default session
    }

    // 5. Get user's WhatsApp session
    const { data: session, error: sessionError } = await supabaseService
      .from('whatsapp_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', requestBody.sessionId || '')
      .single()

    // If no sessionId provided, get the most recent session
    if (!session && !requestBody.sessionId) {
      const { data: latestSession, error: latestError } = await supabaseService
        .from('whatsapp_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestError || !latestSession) {
        throw new Error('No WhatsApp session found for this user')
      }

      // Use latest session
      const session = latestSession
    }

    if (sessionError || !session) {
      throw new Error('WhatsApp session not found')
    }

    console.log(`[disconnect-whatsapp] Disconnecting session: ${session.instance_name}`)

    // 6. Check if already disconnected
    if (session.status === 'disconnected') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Already disconnected',
          sessionId: session.id,
          instanceName: session.instance_name,
        } as DisconnectResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 7. Call Evolution API to logout instance
    try {
      const logoutResult = await logoutInstance(session.instance_name)
      console.log(`[disconnect-whatsapp] Evolution API logout result:`, logoutResult)
    } catch (evolutionError) {
      console.error(`[disconnect-whatsapp] Evolution API error:`, evolutionError)
      // Continue anyway - update DB even if Evolution API fails
      // The instance might be already disconnected on Evolution side
    }

    // 8. Update session status in database
    const { error: updateError } = await supabaseService
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`)
    }

    console.log(`[disconnect-whatsapp] Session ${session.instance_name} disconnected successfully`)

    // 9. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'WhatsApp disconnected successfully',
        sessionId: session.id,
        instanceName: session.instance_name,
      } as DisconnectResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[disconnect-whatsapp] Error:', errorMessage, err)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      } as DisconnectResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
