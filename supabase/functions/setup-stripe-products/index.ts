import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import Stripe from "https://esm.sh/stripe@14.14.0"

// ============================================================================
// SETUP STRIPE PRODUCTS — Idempotent one-time setup
// ============================================================================
// Creates Stripe products and prices for AICA plans, then updates
// pricing_plans.stripe_price_id in the database.
//
// Call once after initial deploy:
//   curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/setup-stripe-products \
//     -H "Authorization: Bearer <service_role_key>"
//
// Products created:
//   - AICA Pro: R$39.90/month (5,000 credits)
//   - AICA Teams: R$149.00/month (20,000 credits)
//   - Free plan: no Stripe product needed
//
// Idempotent: searches for existing products by metadata before creating.
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
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

interface PlanConfig {
  plan_id: string
  product_name: string
  price_brl_cents: number
  monthly_credits: number
  features: string[]
}

const PLANS: PlanConfig[] = [
  {
    plan_id: 'pro',
    product_name: 'AICA Pro',
    price_brl_cents: 3990, // R$39.90
    monthly_credits: 5000,
    features: [
      'Todos os modulos',
      '5000 creditos/mes',
      'Suporte prioritario',
    ],
  },
  {
    plan_id: 'teams',
    product_name: 'AICA Teams',
    price_brl_cents: 14900, // R$149.00
    monthly_credits: 20000,
    features: [
      'Tudo do Pro',
      '20000 creditos/mes',
      'API access',
      'Dashboard de uso',
      'Suporte dedicado',
    ],
  },
]

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
      throw new Error('STRIPE_SECRET_KEY not configured. Set it with: supabase secrets set STRIPE_SECRET_KEY=sk_test_...')
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results: Array<{
      plan_id: string
      product_id: string
      price_id: string
      status: 'created' | 'existing'
    }> = []

    for (const plan of PLANS) {
      console.log(`[setup-stripe-products] Processing plan: ${plan.plan_id}`)

      // Check if product already exists via metadata search
      const existingProducts = await stripe.products.search({
        query: `metadata["aica_plan_id"]:"${plan.plan_id}"`,
      })

      let productId: string
      let priceId: string
      let status: 'created' | 'existing' = 'created'

      if (existingProducts.data.length > 0) {
        // Product exists — find its active price
        const product = existingProducts.data[0]
        productId = product.id
        console.log(`[setup-stripe-products] Found existing product: ${productId}`)

        const prices = await stripe.prices.list({
          product: productId,
          active: true,
          limit: 1,
        })

        if (prices.data.length > 0) {
          priceId = prices.data[0].id
          status = 'existing'
          console.log(`[setup-stripe-products] Found existing price: ${priceId}`)
        } else {
          // Product exists but no active price — create one
          const price = await stripe.prices.create({
            product: productId,
            currency: 'brl',
            unit_amount: plan.price_brl_cents,
            recurring: { interval: 'month' },
            metadata: { aica_plan_id: plan.plan_id },
          })
          priceId = price.id
          console.log(`[setup-stripe-products] Created new price: ${priceId}`)
        }
      } else {
        // Create product + price
        const product = await stripe.products.create({
          name: plan.product_name,
          description: `${plan.monthly_credits} creditos/mes. ${plan.features.join(', ')}`,
          metadata: {
            aica_plan_id: plan.plan_id,
            monthly_credits: String(plan.monthly_credits),
          },
        })
        productId = product.id
        console.log(`[setup-stripe-products] Created product: ${productId}`)

        const price = await stripe.prices.create({
          product: productId,
          currency: 'brl',
          unit_amount: plan.price_brl_cents,
          recurring: { interval: 'month' },
          metadata: { aica_plan_id: plan.plan_id },
        })
        priceId = price.id
        console.log(`[setup-stripe-products] Created price: ${priceId}`)
      }

      // Update pricing_plans in database
      const { error: updateError } = await supabase
        .from('pricing_plans')
        .update({ stripe_price_id: priceId })
        .eq('id', plan.plan_id)

      if (updateError) {
        console.error(`[setup-stripe-products] DB update error for ${plan.plan_id}:`, updateError)
        throw new Error(`Failed to update pricing_plans for ${plan.plan_id}: ${updateError.message}`)
      }

      console.log(`[setup-stripe-products] Updated DB: ${plan.plan_id} → ${priceId}`)
      results.push({ plan_id: plan.plan_id, product_id: productId, price_id: priceId, status })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stripe products configured successfully',
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    console.error('[setup-stripe-products] Error:', err.message)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
