/**
 * EDGE FUNCTION: disconnect-whatsapp
 *
 * Deploy via Supabase Dashboard:
 * 1. Go to: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions
 * 2. Click "Deploy a new function"
 * 3. Name: disconnect-whatsapp
 * 4. Copy ALL the code below and paste into the editor
 * 5. Click "Deploy function"
 *
 * NOTE: This version has logoutInstance inline (no _shared imports)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Helper: Call Evolution API to logout instance
 * Inline version (no imports from _shared)
 */
async function logoutInstance(instanceName: string) {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')

  if (!evolutionUrl || !evolutionKey) {
    throw new Error('Evolution API credentials not configured')
  }

  const response = await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured')
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Validate user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    console.log(`[disconnect-whatsapp] User ${user.id} requesting disconnect`)

    // Parse request body (optional sessionId)
    let requestBody: any = {}
    try {
      requestBody = await req.json()
    } catch {
      // Empty body is OK
    }

    // Get user's WhatsApp session
    let query = supabaseService
      .from('whatsapp_sessions')
      .select('*')
      .eq('user_id', user.id)

    if (requestBody.sessionId) {
      query = query.eq('id', requestBody.sessionId)
    } else {
      query = query.order('created_at', { ascending: false }).limit(1)
    }

    const { data: session, error: sessionError } = await query.single()

    if (sessionError || !session) {
      throw new Error('WhatsApp session not found for this user')
    }

    console.log(`[disconnect-whatsapp] Disconnecting: ${session.instance_name}`)

    // Check if already disconnected
    if (session.status === 'disconnected') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Already disconnected',
          sessionId: session.id,
          instanceName: session.instance_name,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Call Evolution API to logout
    try {
      const logoutResult = await logoutInstance(session.instance_name)
      console.log('[disconnect-whatsapp] Evolution API logout success:', logoutResult)
    } catch (evolutionError) {
      console.error('[disconnect-whatsapp] Evolution API error:', evolutionError)
      // Continue anyway - update DB even if Evolution fails
    }

    // Update database status
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

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'WhatsApp disconnected successfully',
        sessionId: session.id,
        instanceName: session.instance_name,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[disconnect-whatsapp] Error:', errorMessage)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
