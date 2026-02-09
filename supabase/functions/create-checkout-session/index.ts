import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import Stripe from "https://esm.sh/stripe@14.14.0"

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
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

// ============================================================================
// TYPES
// ============================================================================

interface CheckoutRequest {
  // For subscription checkout
  plan_id?: string
  // For one-time credit purchase
  credit_amount?: number
  // Required URLs
  success_url: string
  cancel_url: string
}

interface CheckoutResponse {
  checkout_url: string
  session_id: string
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    const supabaseUser = createClient(supabaseUrl, authHeader.replace('Bearer ', ''))

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: CheckoutRequest = await req.json()
    const { plan_id, credit_amount, success_url, cancel_url } = body

    // Validate request
    if (!plan_id && !credit_amount) {
      return new Response(
        JSON.stringify({ error: 'Either plan_id or credit_amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'success_url and cancel_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseClient
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = subscription?.stripe_customer_id

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Store customer ID
      await supabaseClient
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          plan_id: null,
          status: 'inactive',
        })
    }

    let session: Stripe.Checkout.Session

    if (plan_id) {
      // Subscription checkout
      const { data: plan, error: planError } = await supabaseClient
        .from('billing_plans')
        .select('stripe_price_id, name')
        .eq('id', plan_id)
        .single()

      if (planError || !plan?.stripe_price_id) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan_id or plan has no Stripe price configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: plan.stripe_price_id,
            quantity: 1,
          },
        ],
        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url,
        metadata: {
          supabase_user_id: user.id,
          plan_id,
          checkout_type: 'subscription',
        },
        subscription_data: {
          metadata: {
            supabase_user_id: user.id,
            plan_id,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      })

    } else if (credit_amount) {
      // One-time credit purchase
      if (credit_amount < 10 || credit_amount > 10000) {
        return new Response(
          JSON.stringify({ error: 'credit_amount must be between R$10 and R$10,000' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Convert BRL to cents
      const amountInCents = Math.round(credit_amount * 100)

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'brl',
              unit_amount: amountInCents,
              product_data: {
                name: `Creditos AICA - R$${credit_amount}`,
                description: `Compra de R$${credit_amount} em creditos para uso na plataforma AICA`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&credits=${credit_amount}`,
        cancel_url,
        metadata: {
          supabase_user_id: user.id,
          credit_amount: String(credit_amount),
          checkout_type: 'credits',
        },
        payment_intent_data: {
          metadata: {
            supabase_user_id: user.id,
            credit_amount: String(credit_amount),
          },
        },
      })
    } else {
      throw new Error('Invalid checkout request')
    }

    const response: CheckoutResponse = {
      checkout_url: session.url!,
      session_id: session.id,
    }

    console.log(`[create-checkout-session] Created session ${session.id} for user ${user.id}`)

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    const err = error as Error
    console.error('[create-checkout-session] Error:', err.message)

    // Handle Stripe-specific errors
    if (err.message.includes('Stripe')) {
      return new Response(
        JSON.stringify({ error: 'Payment service error. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
