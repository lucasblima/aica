import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import Stripe from "https://esm.sh/stripe@14.14.0"

// ============================================================================
// TYPES
// ============================================================================

interface WebhookResult {
  received: boolean
  event_type: string
  processed: boolean
  error?: string
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCheckoutSessionCompleted(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.supabase_user_id
  const checkoutType = session.metadata?.checkout_type

  if (!userId) {
    console.error('[stripe-webhook] No user ID in session metadata')
    return
  }

  if (checkoutType === 'subscription') {
    // Handle subscription checkout
    const planId = session.metadata?.plan_id
    const subscriptionId = session.subscription as string

    console.log(`[stripe-webhook] Activating subscription ${subscriptionId} for user ${userId}`)

    await supabase
      .from('user_subscriptions')
      .update({
        plan_id: planId,
        stripe_subscription_id: subscriptionId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

  } else if (checkoutType === 'credits') {
    // Handle credit purchase
    const creditAmount = parseFloat(session.metadata?.credit_amount || '0')

    if (creditAmount <= 0) {
      console.error('[stripe-webhook] Invalid credit amount:', creditAmount)
      return
    }

    console.log(`[stripe-webhook] Adding R$${creditAmount} credits for user ${userId}`)

    // Record the credit transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: creditAmount,
        transaction_type: 'purchase',
        description: `Compra de R$${creditAmount} em creditos`,
        stripe_payment_intent_id: session.payment_intent as string,
      })

    // Update user's credit balance (via trigger or direct update)
    // The database trigger on credit_transactions will handle balance updates
  }
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.supabase_user_id

  if (!userId) {
    console.error('[stripe-webhook] No user ID in subscription metadata')
    return
  }

  console.log(`[stripe-webhook] Updating subscription ${subscription.id} status to ${subscription.status}`)

  const statusMap: Record<string, string> = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'past_due',
    'trialing': 'trialing',
    'incomplete': 'inactive',
    'incomplete_expired': 'cancelled',
    'paused': 'paused',
  }

  await supabase
    .from('user_subscriptions')
    .update({
      status: statusMap[subscription.status] || 'inactive',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.supabase_user_id

  if (!userId) {
    console.error('[stripe-webhook] No user ID in subscription metadata')
    return
  }

  console.log(`[stripe-webhook] Cancelling subscription ${subscription.id} for user ${userId}`)

  // Get the free plan ID
  const { data: freePlan } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('name', 'Free')
    .single()

  await supabase
    .from('user_subscriptions')
    .update({
      plan_id: freePlan?.id || null,
      stripe_subscription_id: null,
      status: 'cancelled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    console.error('[stripe-webhook] No subscription ID in invoice')
    return
  }

  console.log(`[stripe-webhook] Invoice payment failed for subscription ${subscriptionId}`)

  // Find the user with this subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error('[stripe-webhook] No subscription found for:', subscriptionId)
    return
  }

  // Update subscription status
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  // Queue notification to user
  await supabase
    .from('action_queue')
    .insert({
      user_id: subscription.user_id,
      action_type: 'notification',
      payload: {
        title: 'Falha no pagamento',
        message: 'Houve um problema ao processar seu pagamento. Por favor, atualize suas informacoes de pagamento para evitar a suspensao do servico.',
        type: 'warning',
      },
      priority: 'high',
    })
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Stripe webhooks don't need CORS since they come from Stripe servers
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Get the raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No Stripe signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('[stripe-webhook] Signature verification failed:', (err as Error).message)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[stripe-webhook] Received event: ${event.type}`)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const result: WebhookResult = {
      received: true,
      event_type: event.type,
      processed: false,
    }

    // Handle different event types
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(supabase, event.data.object as Stripe.Checkout.Session)
          result.processed = true
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
          result.processed = true
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
          result.processed = true
          break

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice)
          result.processed = true
          break

        case 'invoice.payment_succeeded':
          // Log successful payments for auditing
          console.log(`[stripe-webhook] Invoice payment succeeded: ${(event.data.object as Stripe.Invoice).id}`)
          result.processed = true
          break

        default:
          // Log unhandled events for future implementation
          console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
          result.processed = false
      }

    } catch (handlerError) {
      const err = handlerError as Error
      console.error(`[stripe-webhook] Handler error for ${event.type}:`, err.message)
      result.error = err.message
    }

    // Always return 200 to acknowledge receipt
    // Stripe will retry if we return non-2xx
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    const err = error as Error
    console.error('[stripe-webhook] Error:', err.message)

    // Return 500 only for configuration errors
    // Stripe will retry these
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
