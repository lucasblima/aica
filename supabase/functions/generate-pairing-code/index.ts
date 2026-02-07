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
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

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
  serverTime?: string
  sessionId?: string
  instanceName?: string
  error?: string
}

const PAIRING_CODE_EXPIRATION_SECONDS = 60

/**
 * Configure webhook for an Evolution API instance
 * Issue #91: Include webhook_secret for HMAC signature validation
 */
async function configureInstanceWebhook(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  supabaseUrl: string
): Promise<void> {
  const webhookUrl = `${supabaseUrl}/functions/v1/webhook-evolution`
  const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')

  try {
    // CRITICAL: Evolution API v2 requires 'webhook' wrapper object with proper key names
    // See: https://github.com/EvolutionAPI/evolution-api/issues/1220
    const response = await fetch(
      `${evolutionApiUrl}/webhook/set/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: true,
            webhookBase64: false,
            events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'QRCODE_UPDATED', 'CONTACTS_UPDATE'],
            // Issue #91: Add secret for webhook signature validation
            ...(webhookSecret && { secret: webhookSecret }),
          },
        }),
      }
    )

    if (response.ok) {
      console.log(`[generate-pairing-code] Webhook configured for ${instanceName} (with secret: ${!!webhookSecret})`)
    } else {
      const errorText = await response.text()
      console.warn(`[generate-pairing-code] Webhook config warning: ${response.status} - ${errorText}`)
    }
  } catch (e) {
    console.warn('[generate-pairing-code] Webhook config failed:', e)
  }
}

/**
 * Check the connection state of an Evolution API instance.
 */
async function checkInstanceState(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${evolutionApiUrl}/instance/connectionState/${instanceName}`,
      {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    const state = data?.instance?.state || data?.state || null
    console.log(`[generate-pairing-code] Instance ${instanceName} state: ${state}`)
    return state
  } catch (e) {
    console.warn(`[generate-pairing-code] Could not check instance state:`, e)
    return null
  }
}

/**
 * Delete an Evolution API instance so it can be recreated fresh.
 */
async function deleteInstance(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
): Promise<boolean> {
  try {
    // First try to logout (graceful disconnect)
    await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': evolutionApiKey },
    })

    // Then delete the instance
    const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': evolutionApiKey },
    })

    console.log(`[generate-pairing-code] Instance ${instanceName} deleted: ${response.ok}`)
    return response.ok
  } catch (e) {
    console.warn(`[generate-pairing-code] Could not delete instance:`, e)
    return false
  }
}

/**
 * Create a fresh Evolution API instance and configure its webhook.
 */
async function createInstance(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  supabaseUrl: string,
): Promise<boolean> {
  const createResponse = await fetch(
    `${evolutionApiUrl}/instance/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: false,
        integration: 'WHATSAPP-BAILEYS',
      }),
    }
  )

  if (createResponse.ok) {
    console.log(`[generate-pairing-code] Instance created: ${instanceName}`)
    await configureInstanceWebhook(evolutionApiUrl, evolutionApiKey, instanceName, supabaseUrl)
    return true
  }

  const errorBody = await createResponse.text()
  console.error(`[generate-pairing-code] Instance creation failed: ${createResponse.status} - ${errorBody}`)
  return false
}

/**
 * Ensure Evolution API instance exists using optimistic creation pattern.
 * Avoids TOCTOU race condition by attempting creation first and handling conflicts.
 *
 * @returns Object with success status and whether instance was newly created
 */
async function ensureInstanceExists(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  supabaseUrl: string
): Promise<{ success: boolean; created: boolean }> {

  // OPTIMISTIC: Try to create first (no check) to avoid TOCTOU race condition
  const createResponse = await fetch(
    `${evolutionApiUrl}/instance/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: false,
        integration: 'WHATSAPP-BAILEYS',
      }),
    }
  )

  if (createResponse.ok) {
    // Instance created successfully - configure webhook
    console.log(`[generate-pairing-code] Instance created: ${instanceName}`)
    await configureInstanceWebhook(evolutionApiUrl, evolutionApiKey, instanceName, supabaseUrl)
    return { success: true, created: true }
  }

  // Check if error indicates instance already exists
  const errorBody = await createResponse.text()
  const isAlreadyExists = createResponse.status === 409 ||
    errorBody.toLowerCase().includes('already exists') ||
    errorBody.toLowerCase().includes('instance name already in use') ||
    errorBody.toLowerCase().includes('already in use')

  if (isAlreadyExists) {
    console.log(`[generate-pairing-code] Instance already exists: ${instanceName}`)
    return { success: true, created: false }
  }

  // Actual error - not a conflict
  console.error(`[generate-pairing-code] Instance creation failed: ${createResponse.status} - ${errorBody}`)
  throw new Error('Failed to create WhatsApp instance')
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

    // 8. Ensure instance exists in Evolution API (optimistic creation pattern)
    // Uses create-then-handle-conflict instead of check-then-create to avoid TOCTOU race condition
    const instanceResult = await ensureInstanceExists(
      evolutionApiUrl,
      evolutionApiKey,
      session.instance_name,
      supabaseUrl
    )

    if (instanceResult.created) {
      console.log(`[generate-pairing-code] New instance created and webhook configured: ${session.instance_name}`)
      // Wait for Evolution API to finish initializing the instance
      // Without this delay, /instance/connect returns pairingCode: null
      console.log(`[generate-pairing-code] Waiting 3s for instance initialization...`)
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // 9. Generate pairing code via Evolution API
    // CORRECT: GET /instance/connect/{instance}?number={phoneNumber}
    // The phone number MUST be passed as query parameter to get pairing code
    // Without ?number=, it returns QR code only (pairingCode: null)
    // See: https://github.com/EvolutionAPI/evolution-api/issues/1220
    console.log(`[generate-pairing-code] Requesting code for instance: ${session.instance_name}, phone: ${cleanPhone}`)

    const pairingResponse = await fetch(
      `${evolutionApiUrl}/instance/connect/${session.instance_name}?number=${cleanPhone}`,
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
    let pairingCode = pairingData.pairingCode || pairingData.code

    if (!pairingCode) {
      // Check instance state to determine recovery strategy
      const instanceState = pairingData.instance?.state ||
        await checkInstanceState(evolutionApiUrl, evolutionApiKey, session.instance_name)

      if (instanceState === 'open') {
        // Already connected — update DB and inform frontend
        await supabaseService.rpc('update_session_phone_info', {
          p_session_id: session.id,
          p_phone_number: cleanPhone,
        })
        throw new Error('Instance already connected. No pairing code needed.')
      }

      // Instance is in a stale state (close, connecting, or unknown)
      // Recovery: delete stale instance, recreate, and retry pairing code
      console.log(`[generate-pairing-code] Pairing code was null (state: ${instanceState}). Recovering...`)

      const deleted = await deleteInstance(evolutionApiUrl, evolutionApiKey, session.instance_name)
      if (!deleted) {
        throw new Error('Failed to recover stale instance. Please try again.')
      }

      const created = await createInstance(evolutionApiUrl, evolutionApiKey, session.instance_name, supabaseUrl)
      if (!created) {
        throw new Error('Failed to recreate instance. Please try again.')
      }

      // Wait for instance initialization
      console.log(`[generate-pairing-code] Waiting 3s for fresh instance initialization...`)
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Retry pairing code generation
      console.log(`[generate-pairing-code] Retrying pairing code for fresh instance...`)
      const retryResponse = await fetch(
        `${evolutionApiUrl}/instance/connect/${session.instance_name}?number=${cleanPhone}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
        }
      )

      if (!retryResponse.ok) {
        const retryError = await retryResponse.text()
        console.error(`[generate-pairing-code] Retry failed: ${retryResponse.status} - ${retryError}`)
        throw new Error('Failed to generate pairing code after recovery. Please try again.')
      }

      const retryData = await retryResponse.json()
      pairingCode = retryData.pairingCode || retryData.code

      if (!pairingCode) {
        console.error(`[generate-pairing-code] Retry still returned no code:`, retryData)
        throw new Error('Failed to generate pairing code. Please try again.')
      }

      console.log(`[generate-pairing-code] Recovery successful! Code generated on retry.`)
    }

    // 11. Record pairing attempt and save phone number to session
    const expiresAt = new Date(Date.now() + PAIRING_CODE_EXPIRATION_SECONDS * 1000).toISOString()

    await supabaseService.rpc('record_pairing_attempt', {
      p_session_id: session.id,
      p_pairing_code: pairingCode,
      p_expires_at: expiresAt,
    })

    // Save phone number to session (used by frontend to resume pairing flow)
    await supabaseService
      .from('whatsapp_sessions')
      .update({ phone_number: cleanPhone, status: 'connecting' })
      .eq('id', session.id)

    // 12. Format and return response
    const response: PairingCodeResponse = {
      success: true,
      code: pairingCode,
      expiresAt,
      serverTime: new Date().toISOString(),
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
