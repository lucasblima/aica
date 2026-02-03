/**
 * Create User Instance Edge Function
 *
 * Creates or retrieves a WhatsApp Evolution API instance for a user.
 * Each user gets their own unique instance for multi-tenancy.
 *
 * Endpoint: POST /functions/v1/create-user-instance
 * Body: {} (empty, uses authenticated user)
 * Response: {
 *   success: boolean,
 *   session?: WhatsAppSession,
 *   instanceCreated?: boolean,
 *   error?: string
 * }
 *
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 * Issue: #124 - Edge Function create-user-instance
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppSession {
  id: string
  user_id: string
  instance_name: string
  status: string
  phone_number: string | null
  profile_name: string | null
  connected_at: string | null
  created_at: string
}

interface CreateInstanceResponse {
  success: boolean
  session?: WhatsAppSession
  instanceCreated?: boolean
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

    // Service client (to call RPC functions)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    console.log(`[create-user-instance] Processing request for user ${user.id}`)

    // 4. Get or create session using database function
    const { data: session, error: sessionError } = await supabaseService
      .rpc('get_or_create_whatsapp_session', { p_user_id: user.id })

    if (sessionError) {
      console.error('[create-user-instance] Session error:', sessionError)
      throw new Error(`Failed to get/create session: ${sessionError.message}`)
    }

    if (!session) {
      throw new Error('Failed to create session record')
    }

    console.log(`[create-user-instance] Session: ${session.instance_name}, status: ${session.status}`)

    // 5. If session is new (pending), create instance in Evolution API
    let instanceCreated = false

    if (session.status === 'pending') {
      const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
      const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

      if (!evolutionApiUrl || !evolutionApiKey) {
        throw new Error('Evolution API credentials not configured')
      }

      console.log(`[create-user-instance] Creating Evolution instance: ${session.instance_name}`)

      // Check if instance already exists
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
        // Create new instance
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
              qrcode: false, // We use pairing code, not QR
              integration: 'WHATSAPP-BAILEYS',
            }),
          }
        )

        if (!createResponse.ok) {
          const errorText = await createResponse.text()
          console.error(`[create-user-instance] Evolution API error: ${createResponse.status} - ${errorText}`)

          // Update session with error
          await supabaseService.rpc('update_whatsapp_session_status', {
            p_session_id: session.id,
            p_status: 'error',
            p_error_message: `Failed to create Evolution instance: ${errorText}`,
            p_error_code: `EVOLUTION_${createResponse.status}`,
          })

          throw new Error(`Failed to create Evolution instance: ${createResponse.status}`)
        }

        const createData = await createResponse.json()
        console.log(`[create-user-instance] Instance created:`, createData)
        instanceCreated = true

        // Store webhook URL if provided
        const webhookUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1/webhook-evolution'
        const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')

        // Configure webhook for the new instance
        // CRITICAL: Evolution API v2 requires 'webhook' wrapper object with proper key names
        // See: https://github.com/EvolutionAPI/evolution-api/issues/1220
        // Issue #91: Include webhook_secret for HMAC signature validation
        try {
          const webhookConfigResponse = await fetch(
            `${evolutionApiUrl}/webhook/set/${session.instance_name}`,
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
                  events: [
                    'CONNECTION_UPDATE',
                    'MESSAGES_UPSERT',
                    'QRCODE_UPDATED',
                    'CONTACTS_UPDATE',
                  ],
                  // Issue #91: Add secret for webhook signature validation
                  ...(webhookSecret && { secret: webhookSecret }),
                },
              }),
            }
          )

          if (webhookConfigResponse.ok) {
            console.log(`[create-user-instance] Webhook configured for ${session.instance_name}`)
          } else {
            const webhookErrorText = await webhookConfigResponse.text()
            console.warn(`[create-user-instance] Webhook config failed: ${webhookConfigResponse.status} - ${webhookErrorText}`)
          }
        } catch (webhookError) {
          console.warn(`[create-user-instance] Failed to configure webhook:`, webhookError)
          // Non-fatal, continue
        }
      } else {
        console.log(`[create-user-instance] Instance already exists: ${session.instance_name}`)
      }
    }

    // 6. Return success response
    const response: CreateInstanceResponse = {
      success: true,
      session: session as WhatsAppSession,
      instanceCreated,
    }

    console.log(`[create-user-instance] Success for user ${user.id}, instance: ${session.instance_name}`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error('[create-user-instance] Error:', err.message)

    const errorResponse: CreateInstanceResponse = {
      success: false,
      error: err.message,
    }

    const status = err.message.includes('authentication') ? 401 : 400

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
