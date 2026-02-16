-- ============================================================================
-- ADD stripe_price_id TO pricing_plans
-- Required by create-checkout-session Edge Function to create Stripe sessions
-- ============================================================================

ALTER TABLE public.pricing_plans
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

COMMENT ON COLUMN public.pricing_plans.stripe_price_id IS
    'Stripe Price ID for subscription checkout. NULL for free plan.';

-- Also add stripe_payment_intent_id to credit_transactions for purchase tracking
ALTER TABLE public.credit_transactions
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
