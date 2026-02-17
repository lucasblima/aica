import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"

// ============================================================================
// MANAGE ASAAS SUBSCRIPTION — Get details, cancel, list payments
// ============================================================================
//
// Actions:
//   get_subscription  — Current subscription details from Asaas API
//   cancel_subscription — Cancel the Asaas subscription
//   get_payments       — Payment history from Asaas API
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
  'https://aica-5562559893.southamerica-east1.run.app',
  'https://dev.aica.guru',
  'https://aica.guru',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

function getAsaasBaseUrl(): string {
  const env = Deno.env.get('ASAAS_ENV') || 'sandbox'
  return env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'
}

async function asaasFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const apiKey = Deno.env.get('ASAAS_API_KEY')
  if (!apiKey) throw new Error('ASAAS_API_KEY not configured')

  const baseUrl = getAsaasBaseUrl()
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      ...(options.headers || {}),
    },
  })
}

interface ManageRequest {
  action: 'get_subscription' | 'cancel_subscription' | 'get_payments'
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const supabaseUser = createClient(supabaseUrl, authHeader.replace('Bearer ', ''))

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ManageRequest = await req.json()
    const { action } = body

    // Get user's subscription from DB
    const { data: sub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('asaas_subscription_id, asaas_customer_id, plan_id, status, payment_gateway')
      .eq('user_id', user.id)
      .single()

    if (subError || !sub) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma assinatura encontrada.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (sub.payment_gateway !== 'asaas' || !sub.asaas_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'Voce nao tem uma assinatura Asaas ativa.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subscriptionId = sub.asaas_subscription_id

    switch (action) {
      case 'get_subscription': {
        const resp = await asaasFetch(`/subscriptions/${subscriptionId}`)
        if (!resp.ok) {
          throw new Error(`Asaas API error: ${resp.status}`)
        }

        const asaasSub = await resp.json()

        return new Response(
          JSON.stringify({
            success: true,
            subscription: {
              id: asaasSub.id,
              status: asaasSub.status,
              value: asaasSub.value,
              cycle: asaasSub.cycle,
              nextDueDate: asaasSub.nextDueDate,
              billingType: asaasSub.billingType,
              description: asaasSub.description,
              plan_id: sub.plan_id,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      case 'cancel_subscription': {
        const resp = await asaasFetch(`/subscriptions/${subscriptionId}`, {
          method: 'DELETE',
        })

        if (!resp.ok) {
          const errBody = await resp.text()
          console.error(`[manage-asaas-subscription] Cancel failed: ${resp.status} ${errBody}`)
          throw new Error(`Erro ao cancelar assinatura: ${resp.status}`)
        }

        // Update local DB — revert to free
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: 'free',
            status: 'cancelled',
            asaas_subscription_id: null,
            payment_gateway: 'none',
            cancelled_at: new Date().toISOString(),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        console.log(`[manage-asaas-subscription] Cancelled subscription ${subscriptionId} for user ${user.id}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Assinatura cancelada com sucesso. Voce retornou ao plano Free.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      case 'get_payments': {
        const customerId = sub.asaas_customer_id
        if (!customerId) {
          return new Response(
            JSON.stringify({ success: true, payments: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const resp = await asaasFetch(`/payments?customer=${customerId}&limit=10&offset=0`)
        if (!resp.ok) {
          throw new Error(`Asaas API error: ${resp.status}`)
        }

        const data = await resp.json()
        const payments = (data.data || []).map((p: Record<string, unknown>) => ({
          id: p.id,
          value: p.value,
          status: p.status,
          billingType: p.billingType,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate,
          invoiceUrl: p.invoiceUrl,
          description: p.description,
        }))

        return new Response(
          JSON.stringify({ success: true, payments }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Acao desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    const err = error as Error
    console.error('[manage-asaas-subscription] Error:', err.message)

    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})
