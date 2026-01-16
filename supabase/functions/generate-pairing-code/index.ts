/**
 * Generate Pairing Code Edge Function
 *
 * Generates a pairing code for the user's WhatsApp instance.
 * Multi-instance architecture: each user has their own Evolution API instance.
 *
 * Endpoint: POST /functions/v1/generate-pairing-code
 * Body: { phoneNumber: string }
 * Response: { success: boolean, code?: string, expiresAt?: string, error?: string }
 *
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 * Issue: #125 - Update generate-pairing-code for multi-instance
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PairingCodeRequest {
  phoneNumber: string
}

interface PairingCodeResponse {
  success: boolean
  code?: string
  expiresAt?: string
  sessionId?: string
  instanceName?: string
  error?: string
}

const PAIRING_CODE_EXPIRATION_SECONDS = 60

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
    console.log(`[generate-pairing-code] Token received (first 50 chars): ${token.substring(0, 50)}...`)

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError) {
      console.error(`[generate-pairing-code] Auth error: ${authError.message}`, authError)
      throw new Error(`Invalid authentication token: ${authError.message}`)
    }

    if (!user) {
      console.error('[generate-pairing-code] No user returned from getUser')
      throw new Error('Invalid authentication token: no user')
    }

    // 4. Parse and validate request
    const body: PairingCodeRequest = await req.json()

    if (!body.phoneNumber) {
      throw new Error('Phone number is required')
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = body.phoneNumber.replace(/\D/g, '')
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      throw new Error('Invalid phone number format. Use format: 5511987654321')
    }

    console.log(`[generate-pairing-code] User ${user.id} requesting pairing code for ${cleanPhone}`)

    // 5. Get or create user's WhatsApp session
    const { data: session, error: sessionError } = await supabaseService
      .rpc('get_or_create_whatsapp_session', { p_user_id: user.id })

    if (sessionError || !session) {
      console.error('[generate-pairing-code] Session error:', sessionError)
      throw new Error('Failed to get/create WhatsApp session')
    }

    console.log(`[generate-pairing-code] Session: ${session.instance_name}, status: ${session.status}`)

    // 6. If already connected, return error
    if (session.status === 'connected') {
      throw new Error('WhatsApp already connected. Disconnect first to reconnect.')
    }

    // 7. Get Evolution API credentials
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API credentials not configured')
    }

    // 8. Ensure instance exists in Evolution API
    const checkResponse = await fetch(
      `${evolutionApiUrl}/instance/fetchInstances?instanceName=${session.instance_name}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
      }
    )

    const existingInstances = await checkResponse.json()
    const instanceExists = Array.isArray(existingInstances) &&
      existingInstances.some((i: { name: string }) => i.name === session.instance_name)

    if (!instanceExists) {
      console.log(`[generate-pairing-code] Creating instance: ${session.instance_name}`)

      // Create the instance
      const createResponse = await fetch(
        `${evolutionApiUrl}/instance/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({
            instanceName: session.instance_name,
            qrcode: false,
            integration: 'WHATSAPP-BAILEYS',
          }),
        }
      )

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error(`[generate-pairing-code] Failed to create instance: ${errorText}`)
        throw new Error('Failed to create WhatsApp instance')
      }

      // Configure webhook
      const webhookUrl = `${supabaseUrl}/functions/v1/webhook-evolution`
      try {
        await fetch(
          `${evolutionApiUrl}/webhook/set/${session.instance_name}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey,
            },
            body: JSON.stringify({
              url: webhookUrl,
              webhook_by_events: true,
              webhook_base64: false,
              events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'QRCODE_UPDATED', 'CONTACTS_UPDATE'],
            }),
          }
        )
      } catch (e) {
        console.warn('[generate-pairing-code] Webhook config failed:', e)
      }
    }

    // 9. Generate pairing code via Evolution API
    console.log(`[generate-pairing-code] Requesting code for instance: ${session.instance_name}`)

    const pairingResponse = await fetch(
      `${evolutionApiUrl}/instance/connect/${session.instance_name}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
      }
    )

    if (!pairingResponse.ok) {
      const errorText = await pairingResponse.text()
      console.error(`[generate-pairing-code] Evolution API error: ${pairingResponse.status} - ${errorText}`)

      if (pairingResponse.status === 404) {
        throw new Error('Instance not found. Please try again.')
      }

      throw new Error(`Evolution API error: ${pairingResponse.status}`)
    }

    const pairingData = await pairingResponse.json()

    // 10. Extract pairing code
    const pairingCode = pairingData.pairingCode || pairingData.code

    if (!pairingCode) {
      // Check if already connected
      if (pairingData.instance?.state === 'open') {
        // Update session status
        await supabaseService.rpc('update_session_phone_info', {
          p_session_id: session.id,
          p_phone_number: cleanPhone,
        })
        throw new Error('Instance already connected. No pairing code needed.')
      }
      throw new Error('Failed to generate pairing code. Please try again.')
    }

    // 11. Record pairing attempt in database
    const expiresAt = new Date(Date.now() + PAIRING_CODE_EXPIRATION_SECONDS * 1000).toISOString()

    await supabaseService.rpc('record_pairing_attempt', {
      p_session_id: session.id,
      p_pairing_code: pairingCode,
      p_expires_at: expiresAt,
    })

    // 12. Format and return response
    const response: PairingCodeResponse = {
      success: true,
      code: pairingCode,
      expiresAt,
      sessionId: session.id,
      instanceName: session.instance_name,
    }

    console.log(`[generate-pairing-code] Code generated for user ${user.id}, instance: ${session.instance_name}`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error('[generate-pairing-code] Error:', err.message)

    const errorResponse: PairingCodeResponse = {
      success: false,
      error: err.message,
    }

    const status = err.message.includes('authentication') ? 401 :
                   err.message.includes('already connected') ? 409 : 400

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
