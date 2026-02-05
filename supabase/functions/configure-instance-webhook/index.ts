/**
 * Configure Instance Webhook Edge Function
 *
 * Utility function to configure webhooks for existing Evolution API instances.
 * Use this to fix instances that were created before the webhook fix.
 *
 * Endpoint: POST /functions/v1/configure-instance-webhook
 * Body: { instanceName: string }
 * Response: { success: boolean, message?: string, error?: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConfigureWebhookRequest {
  instanceName?: string
  updateSessionStatus?: boolean
}

interface ConfigureWebhookResponse {
  success: boolean
  message?: string
  webhookConfigured?: boolean
  sessionUpdated?: boolean
  connectionState?: string
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    console.log(`[configure-instance-webhook] Request from user ${user.id}`)

    // 4. Parse request body
    let body: ConfigureWebhookRequest = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is OK - will use user's session
    }

    // 5. Get user's session or use provided instance name
    let instanceName = body.instanceName

    if (!instanceName) {
      const { data: session, error: sessionError } = await supabaseService
        .from('whatsapp_sessions')
        .select('instance_name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError || !session) {
        throw new Error('No WhatsApp session found. Please create an instance first.')
      }

      instanceName = session.instance_name
      console.log(`[configure-instance-webhook] Using session instance: ${instanceName}`)
    }

    // 6. Get Evolution API credentials
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API credentials not configured')
    }

    // 7. Check current connection state
    console.log(`[configure-instance-webhook] Checking connection state for ${instanceName}`)

    const stateResponse = await fetch(
      `${evolutionApiUrl}/instance/connectionState/${instanceName}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
      }
    )

    let connectionState = 'unknown'
    if (stateResponse.ok) {
      const stateData = await stateResponse.json()
      connectionState = stateData.state || stateData.instance?.state || 'unknown'
      console.log(`[configure-instance-webhook] Connection state: ${connectionState}`)
    }

    // 8. Configure webhook for the instance
    // CRITICAL: Evolution API v2 requires 'webhook' wrapper object
    // Issue #91: Include webhook_secret for HMAC signature validation
    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-evolution`
    const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')

    console.log(`[configure-instance-webhook] Configuring webhook: ${webhookUrl}`)

    const webhookResponse = await fetch(
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

    const webhookConfigured = webhookResponse.ok
    if (!webhookConfigured) {
      const errorText = await webhookResponse.text()
      console.error(`[configure-instance-webhook] Webhook config failed: ${webhookResponse.status} - ${errorText}`)
    } else {
      console.log(`[configure-instance-webhook] Webhook configured successfully`)
    }

    // 9. Update session status if connection is open
    let sessionUpdated = false
    if (body.updateSessionStatus !== false && connectionState === 'open') {
      console.log(`[configure-instance-webhook] Updating session status to 'connected'`)

      const { data: session } = await supabaseService
        .from('whatsapp_sessions')
        .select('id')
        .eq('instance_name', instanceName)
        .single()

      if (session) {
        const { error: updateError } = await supabaseService
          .rpc('update_whatsapp_session_status', {
            p_session_id: session.id,
            p_status: 'connected',
          })

        sessionUpdated = !updateError
        if (updateError) {
          console.error(`[configure-instance-webhook] Session update error:`, updateError)
        }
      }
    }

    // 10. Return response
    const response: ConfigureWebhookResponse = {
      success: true,
      message: `Instance ${instanceName} configured`,
      webhookConfigured,
      sessionUpdated,
      connectionState,
    }

    console.log(`[configure-instance-webhook] Success:`, response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error('[configure-instance-webhook] Error:', err.message)

    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
