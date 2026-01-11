/**
 * Generate Pairing Code Edge Function
 *
 * Gera código de pareamento para vincular WhatsApp via Evolution API.
 *
 * Endpoint: POST /functions/v1/generate-pairing-code
 * Body: { phoneNumber: string, instanceName?: string }
 * Response: { success: boolean, code?: string, expiresAt?: string, error?: string }
 *
 * Issue: #87
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PairingCodeRequest {
  phoneNumber: string
  instanceName?: string
}

interface PairingCodeResponse {
  success: boolean
  code?: string
  expiresAt?: string
  error?: string
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Validar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // 3. Validar usuário com Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    // 4. Parse request body
    const body: PairingCodeRequest = await req.json()

    if (!body.phoneNumber) {
      throw new Error('Phone number is required')
    }

    // 5. Validar formato do telefone (remover caracteres não numéricos)
    const cleanPhone = body.phoneNumber.replace(/\D/g, '')
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      throw new Error('Invalid phone number format. Use format: 5511987654321')
    }

    // 6. Obter instanceName
    const instanceName = body.instanceName || Deno.env.get('EVOLUTION_INSTANCE_NAME')
    if (!instanceName) {
      throw new Error('Instance name is required')
    }

    // 7. Chamar Evolution API
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API credentials not configured')
    }

    console.log(`[generate-pairing-code] Generating code for ${cleanPhone} on instance ${instanceName}`)

    const evolutionResponse = await fetch(
      `${evolutionApiUrl}/instance/connect/${instanceName}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
      }
    )

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text()
      console.error(`[generate-pairing-code] Evolution API error: ${evolutionResponse.status} - ${errorText}`)

      // Tratar erros específicos
      if (evolutionResponse.status === 404) {
        throw new Error('Instance not found. Please check instance configuration.')
      }
      if (evolutionResponse.status === 400) {
        throw new Error('Invalid request to Evolution API')
      }

      throw new Error(`Evolution API error: ${evolutionResponse.status}`)
    }

    const evolutionData = await evolutionResponse.json()

    // 8. Extrair código de pareamento
    // Evolution API retorna { pairingCode: "XXXX-XXXX" } ou { code: "..." }
    const pairingCode = evolutionData.pairingCode || evolutionData.code

    if (!pairingCode) {
      // Se não tiver código, pode ser que já esteja conectado
      if (evolutionData.instance?.state === 'open') {
        throw new Error('Instance already connected. No pairing code needed.')
      }
      throw new Error('Failed to generate pairing code. Please try again.')
    }

    // 9. Formatar resposta
    const response: PairingCodeResponse = {
      success: true,
      code: pairingCode,
      expiresAt: new Date(Date.now() + 60000).toISOString(), // Código expira em ~60s
    }

    console.log(`[generate-pairing-code] Code generated successfully for user ${user.id}`)

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
