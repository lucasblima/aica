# AICA Billing & Chat System Schema Documentation

**Migration:** `20260114_billing_chat_system.sql`
**Issue:** #132 - AICA Billing, Rate Limiting & Chat System
**Created:** 2026-01-14

---

## Overview

This migration implements a comprehensive billing, rate limiting, and unified chat system for AICA Life OS. It includes:

1. **Billing Plans** - Tiered pricing with token limits
2. **User Subscriptions** - Stripe integration for payments
3. **Token Usage Tracking** - 4-hour window rate limiting
4. **Action Queue** - Queue actions when rate limited
5. **Credit Transactions** - R$ credit purchases for overage
6. **Unified Chat** - WhatsApp + Web + Voice channels

---

## 1. Billing Plans (`billing_plans`)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(50) | Plan name (Free, Pro, Teams, Enterprise) |
| `price_brl_monthly` | DECIMAL(10,2) | Monthly price in Brazilian Reais |
| `premium_tokens_per_window` | INTEGER | Gemini 2.0 Flash Thinking tokens (4h) |
| `standard_tokens_per_window` | INTEGER | Gemini 1.5 Flash-8B tokens (4h) |
| `lite_tokens_per_window` | INTEGER | Gemini Nano tokens (4h) |
| `window_duration_hours` | INTEGER | Window duration (default: 4 hours) |
| `max_concurrent_requests` | INTEGER | Max simultaneous AI requests |
| `bonus_credits_brl` | DECIMAL(10,2) | Bonus R$ credits included |
| `features` | JSONB | Feature flags per plan |
| `is_active` | BOOLEAN | Plan availability |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Seed Data

| Plan | Price (R$/month) | Premium | Standard | Lite | Concurrent | Bonus Credits |
|------|------------------|---------|----------|------|------------|---------------|
| **Free** | R$ 0.00 | 0 | 1,000 | 5,000 | 1 | R$ 0 |
| **Pro** | R$ 49.90 | 5,000 | 20,000 | 50,000 | 3 | R$ 25 |
| **Teams** | R$ 149.90 | 20,000 | 100,000 | 200,000 | 10 | R$ 100 |
| **Enterprise** | R$ 499.90 | 100,000 | 500,000 | 1,000,000 | 50 | R$ 500 |

### Usage Example

```sql
-- Get all active billing plans
SELECT * FROM billing_plans WHERE is_active = true;

-- Get specific plan details
SELECT
  name,
  price_brl_monthly,
  premium_tokens_per_window,
  features
FROM billing_plans
WHERE name = 'Pro';
```

---

## 2. User Subscriptions (`user_subscriptions`)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `auth.users(id)` |
| `plan_id` | UUID | References `billing_plans(id)` |
| `status` | VARCHAR(20) | `active`, `cancelled`, `past_due`, `trialing` |
| `stripe_subscription_id` | VARCHAR(255) | Stripe subscription ID |
| `stripe_customer_id` | VARCHAR(255) | Stripe customer ID |
| `current_period_start` | TIMESTAMPTZ | Billing cycle start |
| `current_period_end` | TIMESTAMPTZ | Billing cycle end |
| `cancel_at_period_end` | BOOLEAN | Cancel at end of period |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Usage Example

```sql
-- Get current user's subscription
SELECT
  us.status,
  bp.name AS plan_name,
  bp.price_brl_monthly,
  us.current_period_end
FROM user_subscriptions us
JOIN billing_plans bp ON bp.id = us.plan_id
WHERE us.user_id = auth.uid();

-- Check if user has active subscription
SELECT EXISTS (
  SELECT 1 FROM user_subscriptions
  WHERE user_id = auth.uid() AND status = 'active'
);
```

---

## 3. Token Usage (`token_usage`)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `auth.users(id)` |
| `model_tier` | VARCHAR(20) | `premium`, `standard`, `lite` |
| `tokens_used` | INTEGER | Tokens consumed in window |
| `window_start` | TIMESTAMPTZ | Window start (4h blocks) |
| `window_end` | TIMESTAMPTZ | Window end |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Token Windows

Windows are 4-hour blocks starting at:
- `00:00 UTC` (00:00 - 04:00)
- `04:00 UTC` (04:00 - 08:00)
- `08:00 UTC` (08:00 - 12:00)
- `12:00 UTC` (12:00 - 16:00)
- `16:00 UTC` (16:00 - 20:00)
- `20:00 UTC` (20:00 - 24:00)

### Usage Example

```sql
-- Get current user's token usage in current window
SELECT
  model_tier,
  tokens_used,
  window_start,
  window_end
FROM token_usage
WHERE user_id = auth.uid()
  AND window_start = date_trunc('hour', NOW()) -
      (EXTRACT(HOUR FROM NOW())::INTEGER % 4) * INTERVAL '1 hour';

-- Get total tokens used today
SELECT
  model_tier,
  SUM(tokens_used) AS total_tokens
FROM token_usage
WHERE user_id = auth.uid()
  AND created_at >= CURRENT_DATE
GROUP BY model_tier;
```

---

## 4. Action Queue (`action_queue`)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `auth.users(id)` |
| `action_type` | VARCHAR(100) | Action identifier |
| `action_payload` | JSONB | Full action context |
| `priority` | INTEGER | 1-10 (10=highest) |
| `scheduled_for` | TIMESTAMPTZ | When to execute |
| `status` | VARCHAR(20) | `pending`, `processing`, `completed`, `failed` |
| `processed_at` | TIMESTAMPTZ | Processing timestamp |
| `error_message` | TEXT | Error details if failed |
| `retry_count` | INTEGER | Retry attempts |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Action Types

Common action types:
- `generate_dossier` - Podcast guest dossier generation
- `transcribe_audio` - Audio transcription
- `analyze_sentiment` - Sentiment analysis
- `parse_edital` - Grant document parsing
- `process_bank_statement` - Finance document processing

### Usage Example

```sql
-- Queue an action when rate limited
INSERT INTO action_queue (
  user_id,
  action_type,
  action_payload,
  priority,
  scheduled_for
) VALUES (
  auth.uid(),
  'generate_dossier',
  '{"guest_name": "João Silva", "linkedin_url": "https://..."}'::jsonb,
  8, -- High priority
  NOW()
);

-- Get pending actions for current user
SELECT
  action_type,
  priority,
  scheduled_for,
  created_at
FROM action_queue
WHERE user_id = auth.uid()
  AND status = 'pending'
ORDER BY priority DESC, scheduled_for;
```

---

## 5. Credit Transactions (`credit_transactions`)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `auth.users(id)` |
| `transaction_type` | VARCHAR(20) | `purchase`, `usage`, `bonus`, `refund` |
| `amount_brl` | DECIMAL(10,2) | R$ amount (negative for usage) |
| `credits_amount` | DECIMAL(10,2) | Credits added/removed |
| `stripe_payment_intent_id` | VARCHAR(255) | Stripe payment ID |
| `description` | TEXT | Transaction description |
| `metadata` | JSONB | Extra data |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Usage Example

```sql
-- Get user's current credit balance
SELECT public.get_user_credit_balance(auth.uid()) AS balance;

-- Get recent transactions
SELECT
  transaction_type,
  amount_brl,
  credits_amount,
  description,
  created_at
FROM credit_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Record credit purchase
INSERT INTO credit_transactions (
  user_id,
  transaction_type,
  amount_brl,
  credits_amount,
  stripe_payment_intent_id,
  description
) VALUES (
  auth.uid(),
  'purchase',
  50.00,
  50.00,
  'pi_xxx',
  'Credit purchase - R$ 50.00'
);
```

---

## 6. Chat Messages (`chat_messages`)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `auth.users(id)` |
| `channel` | VARCHAR(20) | `whatsapp`, `web`, `voice` |
| `direction` | VARCHAR(10) | `inbound`, `outbound` |
| `content` | TEXT | Message content |
| `content_type` | VARCHAR(20) | `text`, `audio`, `image`, `video`, `document` |
| `model_used` | VARCHAR(100) | AI model name |
| `tokens_input` | INTEGER | Input tokens |
| `tokens_output` | INTEGER | Output tokens |
| `whatsapp_message_id` | VARCHAR(255) | Evolution API message ID |
| `whatsapp_phone_number` | VARCHAR(20) | E.164 phone number |
| `parent_message_id` | UUID | Parent message for threading |
| `metadata` | JSONB | Extra data |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Usage Example

```sql
-- Get recent chat messages for current user
SELECT
  channel,
  direction,
  content,
  content_type,
  model_used,
  tokens_input + tokens_output AS total_tokens,
  created_at
FROM chat_messages
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;

-- Get WhatsApp conversation thread
SELECT
  direction,
  content,
  created_at
FROM chat_messages
WHERE user_id = auth.uid()
  AND channel = 'whatsapp'
  AND (id = $1 OR parent_message_id = $1)
ORDER BY created_at;

-- Record a chat message
INSERT INTO chat_messages (
  user_id,
  channel,
  direction,
  content,
  content_type,
  model_used,
  tokens_input,
  tokens_output
) VALUES (
  auth.uid(),
  'web',
  'inbound',
  'Como posso melhorar minha produtividade?',
  'text',
  'gemini-1.5-flash-8b',
  15,
  120
);
```

---

## 7. Helper Functions

### `check_token_availability(user_id, model_tier, tokens_needed)`

Check if user has enough tokens available in current window.

**Parameters:**
- `user_id` (UUID) - User ID
- `model_tier` (VARCHAR) - `'premium'`, `'standard'`, or `'lite'`
- `tokens_needed` (INTEGER) - Tokens required

**Returns:** `BOOLEAN` - `true` if tokens available, `false` otherwise

**Example:**
```sql
-- Check if user can use 500 standard tokens
SELECT public.check_token_availability(
  auth.uid(),
  'standard',
  500
);
```

---

### `record_token_usage(user_id, model_tier, tokens_used)`

Record token consumption for current window.

**Parameters:**
- `user_id` (UUID) - User ID
- `model_tier` (VARCHAR) - `'premium'`, `'standard'`, or `'lite'`
- `tokens_used` (INTEGER) - Tokens consumed

**Returns:** `VOID`

**Example:**
```sql
-- Record 250 premium tokens used
SELECT public.record_token_usage(
  auth.uid(),
  'premium',
  250
);
```

---

### `get_user_credit_balance(user_id)`

Get user's current R$ credit balance.

**Parameters:**
- `user_id` (UUID) - User ID

**Returns:** `DECIMAL(10,2)` - Credit balance

**Example:**
```sql
-- Get current user's credit balance
SELECT public.get_user_credit_balance(auth.uid()) AS balance;
```

---

### `get_user_plan_details(user_id)`

Get user's current plan details with token limits.

**Parameters:**
- `user_id` (UUID) - User ID

**Returns:** Table with columns:
- `plan_name` (VARCHAR) - Plan name
- `premium_tokens` (INTEGER) - Premium tokens per window
- `standard_tokens` (INTEGER) - Standard tokens per window
- `lite_tokens` (INTEGER) - Lite tokens per window
- `max_concurrent` (INTEGER) - Max concurrent requests
- `bonus_credits` (DECIMAL) - Bonus credits included
- `status` (VARCHAR) - Subscription status

**Example:**
```sql
-- Get current user's plan details
SELECT * FROM public.get_user_plan_details(auth.uid());
```

---

## 8. Security (RLS Policies)

All tables have Row-Level Security enabled with the following policies:

### Billing Plans
- ✅ **Public read** for active plans (anyone can view pricing)

### User Subscriptions
- ✅ Users can **SELECT** their own subscription
- ✅ Users can **INSERT** their own subscription
- ✅ Users can **UPDATE** their own subscription

### Token Usage
- ✅ Users can **SELECT** their own usage
- ✅ Users can **INSERT** their own usage

### Action Queue
- ✅ Users can **SELECT** their own actions
- ✅ Users can **INSERT** their own actions
- ✅ Users can **UPDATE** their own actions

### Credit Transactions
- ✅ Users can **SELECT** their own transactions
- ✅ Users can **INSERT** their own transactions

### Chat Messages
- ✅ Users can **SELECT** their own messages
- ✅ Users can **INSERT** their own messages
- ✅ Users can **UPDATE** their own messages

---

## 9. Integration Guide

### Stripe Webhook Handler

Create an Edge Function to handle Stripe webhooks:

```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  )

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      // Update user_subscriptions table
      break
    case 'invoice.payment_succeeded':
      // Add bonus credits to credit_transactions
      break
    case 'customer.subscription.deleted':
      // Update subscription status to 'cancelled'
      break
  }

  return new Response(JSON.stringify({ received: true }))
})
```

---

### Rate Limiting Logic

Implement rate limiting in Edge Functions:

```typescript
// Check if user has tokens available
const { data: hasTokens } = await supabase.rpc('check_token_availability', {
  p_user_id: userId,
  p_model_tier: 'standard',
  p_tokens_needed: 500
})

if (!hasTokens) {
  // Queue action for later
  await supabase.from('action_queue').insert({
    user_id: userId,
    action_type: 'generate_dossier',
    action_payload: { guest_name: 'João Silva' },
    priority: 8
  })

  return { queued: true, message: 'Rate limit reached. Action queued.' }
}

// Proceed with action
const result = await callGeminiAPI()

// Record token usage
await supabase.rpc('record_token_usage', {
  p_user_id: userId,
  p_model_tier: 'standard',
  p_tokens_used: result.tokensUsed
})
```

---

## 10. Indexes for Performance

### Key Indexes
- `idx_user_subscriptions_user_id` - Fast user subscription lookups
- `idx_token_usage_window` - Fast window-based token queries
- `idx_action_queue_priority` - Efficient queue processing
- `idx_chat_messages_user_id` - Fast chat history retrieval

### Composite Index for Token Windows
```sql
CREATE INDEX idx_token_usage_window
  ON token_usage(user_id, model_tier, window_start DESC);
```

---

## 11. Migration Instructions

### Apply Migration

```bash
# Local development
npx supabase db push

# Production (via migration)
npx supabase db push --db-url "postgresql://..."
```

### Verify Migration

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'billing_plans',
    'user_subscriptions',
    'token_usage',
    'action_queue',
    'credit_transactions',
    'chat_messages'
  );

-- Verify seed data
SELECT name, price_brl_monthly FROM billing_plans ORDER BY price_brl_monthly;

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%billing%' OR tablename LIKE '%chat%';
```

---

## 12. Common Queries

### Get User's Token Usage Summary
```sql
SELECT
  model_tier,
  SUM(tokens_used) AS total_tokens,
  COUNT(*) AS window_count
FROM token_usage
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY model_tier;
```

### Get Pending Actions Count
```sql
SELECT COUNT(*) AS pending_actions
FROM action_queue
WHERE user_id = auth.uid()
  AND status = 'pending';
```

### Get Chat Activity by Channel
```sql
SELECT
  channel,
  COUNT(*) AS message_count,
  SUM(tokens_input + tokens_output) AS total_tokens
FROM chat_messages
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY channel;
```

---

## 13. Maintenance

### Cleanup Old Token Usage Records
```sql
-- Delete token usage older than 90 days
DELETE FROM token_usage
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Archive Completed Actions
```sql
-- Archive completed actions older than 30 days
UPDATE action_queue
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{archived}',
  'true'
)
WHERE status = 'completed'
  AND processed_at < NOW() - INTERVAL '30 days';
```

---

## 14. Testing

### Test Token Availability
```sql
-- Test with mock data
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT
  auth.uid(),
  id,
  'active'
FROM billing_plans
WHERE name = 'Pro';

-- Check token availability
SELECT public.check_token_availability(auth.uid(), 'standard', 500);
```

### Test Action Queue
```sql
-- Insert test action
INSERT INTO action_queue (user_id, action_type, action_payload, priority)
VALUES (
  auth.uid(),
  'test_action',
  '{"test": true}'::jsonb,
  5
);

-- Verify RLS policies
SELECT * FROM action_queue WHERE user_id = auth.uid();
```

---

## 15. Related Documentation

- **Stripe Integration:** See `docs/STRIPE_INTEGRATION.md`
- **Rate Limiting:** See `docs/RATE_LIMITING.md`
- **WhatsApp Integration:** See `docs/WHATSAPP_CHAT.md`
- **Architecture:** See `docs/architecture/backend_architecture.md`

---

**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5
**Last Updated:** 2026-01-14
