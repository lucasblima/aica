import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"

// ============================================================================
// ASAAS CHECKOUT — Creates subscription via Asaas API v3
// ============================================================================
//
// Required Supabase secrets:
//   ASAAS_API_KEY    — Asaas API key ($aact_...)
//   ASAAS_ENV        — 'sandbox' or 'production'
//
// Flow:
//   1. Auth user via JWT
//   2. Create/reuse Asaas customer
//   3. Create subscription with billingType=UNDEFINED (user chooses PIX/card/boleto)
//   4. Return checkout_url (Asaas hosted payment page)
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

interface CheckoutRequest {
  plan_id: string
  success_url?: string
  cancel_url?: string
}

interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj?: string
}

interface AsaasSubscription {
  id: string
  status: string
  invoiceUrl?: string
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

async function findOrCreateCustomer(
  userId: string,
  email: string,
  name: string | null,
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  // Check if we already have an Asaas customer ID stored
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('asaas_customer_id')
    .eq('user_id', userId)
    .single()

  if (sub?.asaas_customer_id) {
    return sub.asaas_customer_id
  }

  // Search Asaas by email first
  const searchResp = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`)
  const searchData = await searchResp.json()

  if (searchData.data?.length > 0) {
    const existingId = searchData.data[0].id
    // Store for future lookups
    await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        asaas_customer_id: existingId,
        plan_id: 'free',
        status: 'active',
        payment_gateway: 'none',
      }, { onConflict: 'user_id' })
    return existingId
  }

  // Create new customer
  const createResp = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: name || email.split('@')[0],
      email,
      externalReference: userId,
      notificationDisabled: false,
    }),
  })

  if (!createResp.ok) {
    const errBody = await createResp.text()
    throw new Error(`Failed to create Asaas customer: ${createResp.status} ${errBody}`)
  }

  const customer: AsaasCustomer = await createResp.json()

  // Store customer ID
  await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      asaas_customer_id: customer.id,
      plan_id: 'free',
      status: 'active',
      payment_gateway: 'none',
    }, { onConflict: 'user_id' })

  return customer.id
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

    const body: CheckoutRequest = await req.json()
    const { plan_id } = body

    if (!plan_id || plan_id === 'free') {
      return new Response(
        JSON.stringify({ error: 'plan_id is required and must be a paid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Lookup plan pricing
    const { data: plan, error: planError } = await supabaseAdmin
      .from('pricing_plans')
      .select('id, name, price_brl_monthly')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plano nao encontrado ou inativo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (plan.price_brl_monthly <= 0) {
      return new Response(
        JSON.stringify({ error: 'Plano gratuito nao requer checkout.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find or create Asaas customer
    const customerId = await findOrCreateCustomer(
      user.id,
      user.email!,
      user.user_metadata?.full_name ?? null,
      supabaseAdmin,
    )

    // Create Asaas subscription
    // billingType: UNDEFINED lets the user choose payment method (PIX, card, boleto)
    const origin = req.headers.get('origin') || 'https://aica.guru'
    const successUrl = body.success_url || `${origin}/pricing?asaas_success=true`
    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1) // First charge tomorrow
    const dueDateStr = nextDueDate.toISOString().split('T')[0] // YYYY-MM-DD

    const subResp = await asaasFetch('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: plan.price_brl_monthly,
        nextDueDate: dueDateStr,
        cycle: 'MONTHLY',
        description: `AICA ${plan.name} - Assinatura Mensal`,
        externalReference: JSON.stringify({
          supabase_user_id: user.id,
          plan_id: plan.id,
        }),
        callback: {
          successUrl,
          autoRedirect: true,
        },
      }),
    })

    if (!subResp.ok) {
      const errBody = await subResp.text()
      console.error(`[create-asaas-checkout] Subscription creation failed: ${subResp.status} ${errBody}`)
      throw new Error(`Erro ao criar assinatura Asaas: ${subResp.status}`)
    }

    const subscription: AsaasSubscription = await subResp.json()

    // Store Asaas subscription ID
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        asaas_subscription_id: subscription.id,
        payment_gateway: 'asaas',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    // Get the payment link for the first invoice
    // Asaas creates the first payment automatically with the subscription
    const paymentsResp = await asaasFetch(`/subscriptions/${subscription.id}/payments`)
    const paymentsData = await paymentsResp.json()

    let checkoutUrl = subscription.invoiceUrl || ''
    let pixData = null

    if (paymentsData.data?.length > 0) {
      const firstPayment = paymentsData.data[0]
      checkoutUrl = firstPayment.invoiceUrl || checkoutUrl

      // If the payment has a PIX QR code, include it
      if (firstPayment.id) {
        try {
          const pixResp = await asaasFetch(`/payments/${firstPayment.id}/pixQrCode`)
          if (pixResp.ok) {
            const pixInfo = await pixResp.json()
            if (pixInfo.encodedImage || pixInfo.payload) {
              pixData = {
                qr_code_base64: pixInfo.encodedImage || null,
                copy_paste: pixInfo.payload || null,
                expiration_date: pixInfo.expirationDate || null,
                payment_id: firstPayment.id,
              }
            }
          }
        } catch {
          // PIX data is optional — checkout URL fallback works
          console.log('[create-asaas-checkout] PIX QR code not available yet')
        }
      }
    }

    // If no invoice URL, construct the hosted checkout URL
    if (!checkoutUrl) {
      const asaasEnv = Deno.env.get('ASAAS_ENV') || 'sandbox'
      const domain = asaasEnv === 'production' ? 'www.asaas.com' : 'sandbox.asaas.com'
      checkoutUrl = `https://${domain}/c/${subscription.id}`
    }

    console.log(`[create-asaas-checkout] Created subscription ${subscription.id} for user ${user.id}, plan=${plan_id}`)

    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        subscription_id: subscription.id,
        pix_data: pixData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    const err = error as Error
    console.error('[create-asaas-checkout] Error:', err.message)

    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})
