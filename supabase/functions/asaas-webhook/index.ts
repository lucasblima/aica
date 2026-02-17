import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"

// ============================================================================
// ASAAS WEBHOOK — Processes Asaas payment events
// ============================================================================
//
// Required Supabase secrets:
//   ASAAS_WEBHOOK_TOKEN  — Custom token for webhook auth (Asaas has no HMAC)
//
// Events handled:
//   PAYMENT_RECEIVED / PAYMENT_CONFIRMED → Activate subscription
//   PAYMENT_OVERDUE                      → Mark past_due
//   PAYMENT_REFUNDED                     → Revert credits if purchase
//   SUBSCRIPTION_RENEWED                 → Reset monthly credits
//   SUBSCRIPTION_INACTIVATED             → Revert to free plan
// ============================================================================

interface AsaasWebhookEvent {
  event: string
  payment?: AsaasPayment
  subscription?: AsaasSubscriptionEvent
}

interface AsaasPayment {
  id: string
  customer: string
  subscription?: string
  billingType: string
  value: number
  status: string
  externalReference?: string
  invoiceUrl?: string
  confirmedDate?: string
  paymentDate?: string
}

interface AsaasSubscriptionEvent {
  id: string
  customer: string
  status: string
  value: number
  externalReference?: string
}

function parseExternalReference(ref: string | undefined): { supabase_user_id?: string; plan_id?: string } {
  if (!ref) return {}
  try {
    return JSON.parse(ref)
  } catch {
    // Legacy format — might be just a user ID string
    return { supabase_user_id: ref }
  }
}

async function handlePaymentConfirmed(
  supabase: ReturnType<typeof createClient>,
  payment: AsaasPayment,
): Promise<void> {
  const extRef = parseExternalReference(payment.externalReference)
  let userId = extRef.supabase_user_id
  let planId = extRef.plan_id

  // If no userId in externalReference, look up by asaas_customer_id
  if (!userId) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan_id')
      .eq('asaas_customer_id', payment.customer)
      .single()

    if (!sub) {
      console.error('[asaas-webhook] No user found for customer:', payment.customer)
      return
    }
    userId = sub.user_id
    planId = planId || sub.plan_id
  }

  console.log(`[asaas-webhook] Payment confirmed for user ${userId}, plan=${planId}`)

  // Activate subscription
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      payment_gateway: 'asaas',
      plan_id: planId || 'pro',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  // Reset monthly credits for the plan
  const { data: plan } = await supabase
    .from('pricing_plans')
    .select('monthly_credits')
    .eq('id', planId || 'pro')
    .single()

  const credits = plan?.monthly_credits ?? 2500

  await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      balance: credits,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  // Record credit transaction
  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: credits,
      transaction_type: 'monthly_reset',
      balance_after: credits,
      description: `Assinatura ativada via Asaas - plano ${planId}`,
      asaas_payment_id: payment.id,
    })
}

async function handlePaymentOverdue(
  supabase: ReturnType<typeof createClient>,
  payment: AsaasPayment,
): Promise<void> {
  const extRef = parseExternalReference(payment.externalReference)
  let userId = extRef.supabase_user_id

  if (!userId) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('asaas_customer_id', payment.customer)
      .single()

    if (!sub) {
      console.error('[asaas-webhook] No user found for overdue payment, customer:', payment.customer)
      return
    }
    userId = sub.user_id
  }

  console.log(`[asaas-webhook] Payment overdue for user ${userId}`)

  await supabase
    .from('user_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

async function handlePaymentRefunded(
  supabase: ReturnType<typeof createClient>,
  payment: AsaasPayment,
): Promise<void> {
  const extRef = parseExternalReference(payment.externalReference)
  let userId = extRef.supabase_user_id

  if (!userId) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('asaas_customer_id', payment.customer)
      .single()

    if (!sub) {
      console.error('[asaas-webhook] No user found for refund, customer:', payment.customer)
      return
    }
    userId = sub.user_id
  }

  console.log(`[asaas-webhook] Payment refunded for user ${userId}, amount: ${payment.value}`)

  // Record refund transaction
  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: 0,
      transaction_type: 'refund',
      balance_after: 0,
      description: `Reembolso Asaas - R$${payment.value}`,
      asaas_payment_id: payment.id,
    })
}

async function handleSubscriptionRenewed(
  supabase: ReturnType<typeof createClient>,
  payment: AsaasPayment,
): Promise<void> {
  // Subscription renewal comes as a new payment on the subscription
  const extRef = parseExternalReference(payment.externalReference)
  let userId = extRef.supabase_user_id
  let planId = extRef.plan_id

  if (!userId && payment.subscription) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan_id')
      .eq('asaas_subscription_id', payment.subscription)
      .single()

    if (!sub) {
      console.error('[asaas-webhook] No subscription found for renewal:', payment.subscription)
      return
    }
    userId = sub.user_id
    planId = planId || sub.plan_id
  }

  if (!userId) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan_id')
      .eq('asaas_customer_id', payment.customer)
      .single()

    if (!sub) {
      console.error('[asaas-webhook] No user found for renewal, customer:', payment.customer)
      return
    }
    userId = sub.user_id
    planId = planId || sub.plan_id
  }

  console.log(`[asaas-webhook] Subscription renewed for user ${userId}, plan=${planId}`)

  // Reset monthly credits
  const { data: plan } = await supabase
    .from('pricing_plans')
    .select('monthly_credits')
    .eq('id', planId || 'pro')
    .single()

  const credits = plan?.monthly_credits ?? 2500

  await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      balance: credits,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: credits,
      transaction_type: 'monthly_reset',
      balance_after: credits,
      description: `Renovacao mensal - plano ${planId}`,
      asaas_payment_id: payment.id,
    })

  // Update subscription period
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

async function handleSubscriptionInactivated(
  supabase: ReturnType<typeof createClient>,
  subscriptionEvent: AsaasSubscriptionEvent,
): Promise<void> {
  const extRef = parseExternalReference(subscriptionEvent.externalReference)
  let userId = extRef.supabase_user_id

  if (!userId) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('asaas_subscription_id', subscriptionEvent.id)
      .single()

    if (!sub) {
      const { data: subByCustomer } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('asaas_customer_id', subscriptionEvent.customer)
        .single()

      if (!subByCustomer) {
        console.error('[asaas-webhook] No user found for inactivated subscription:', subscriptionEvent.id)
        return
      }
      userId = subByCustomer.user_id
    } else {
      userId = sub.user_id
    }
  }

  console.log(`[asaas-webhook] Subscription inactivated for user ${userId}`)

  // Revert to free plan
  await supabase
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
    .eq('user_id', userId)
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Validate webhook token (Asaas sends it as a custom header)
    if (webhookToken) {
      const receivedToken = req.headers.get('asaas-access-token') || req.headers.get('x-webhook-token')
      if (receivedToken !== webhookToken) {
        console.error('[asaas-webhook] Invalid webhook token')
        return new Response(
          JSON.stringify({ error: 'Invalid webhook token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const body: AsaasWebhookEvent = await req.json()
    const eventType = body.event

    console.log(`[asaas-webhook] Received event: ${eventType}`)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let processed = false

    switch (eventType) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        if (body.payment) {
          // Check if this is part of a subscription (renewal) or first payment
          if (body.payment.subscription) {
            // Check if user already has active subscription
            const { data: existingSub } = await supabase
              .from('user_subscriptions')
              .select('status')
              .eq('asaas_subscription_id', body.payment.subscription)
              .single()

            if (existingSub?.status === 'active') {
              // This is a renewal payment
              await handleSubscriptionRenewed(supabase, body.payment)
            } else {
              // First payment — activate subscription
              await handlePaymentConfirmed(supabase, body.payment)
            }
          } else {
            await handlePaymentConfirmed(supabase, body.payment)
          }
          processed = true
        }
        break

      case 'PAYMENT_OVERDUE':
        if (body.payment) {
          await handlePaymentOverdue(supabase, body.payment)
          processed = true
        }
        break

      case 'PAYMENT_REFUNDED':
        if (body.payment) {
          await handlePaymentRefunded(supabase, body.payment)
          processed = true
        }
        break

      case 'SUBSCRIPTION_INACTIVATED':
      case 'SUBSCRIPTION_DELETED':
        if (body.subscription) {
          await handleSubscriptionInactivated(supabase, body.subscription)
          processed = true
        }
        break

      default:
        console.log(`[asaas-webhook] Unhandled event type: ${eventType}`)
    }

    return new Response(
      JSON.stringify({
        received: true,
        event_type: eventType,
        processed,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    const err = error as Error
    console.error('[asaas-webhook] Error:', err.message)

    // Always return 200 to avoid Asaas retrying indefinitely
    return new Response(
      JSON.stringify({ received: true, error: err.message }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
