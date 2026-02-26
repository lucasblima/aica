# Credit Coupons & Admin Top-Up — Design Document

**Date:** 2026-02-26
**Session:** feat-credit-coupons
**Status:** Approved
**Approach:** #1 — Tudo no Banco (RPCs + tabelas)

## Problem

Users run out of credits with no way to replenish beyond daily claim. Admin has no mechanism to grant extra credits or distribute promotional codes.

## Solution

Two complementary features:
1. **Admin Top-Up** — Owner can grant credits to any user manually
2. **Coupon System** — Public codes that users redeem for credits, with full campaign management

## 1. Database Schema

### Table: `coupons`

```sql
CREATE TABLE coupons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT NOT NULL UNIQUE,
  credits              INTEGER NOT NULL CHECK (credits > 0),
  max_redemptions      INTEGER,              -- NULL = unlimited
  max_per_user         INTEGER DEFAULT 1,
  current_redemptions  INTEGER DEFAULT 0,
  allowed_plans        TEXT[],               -- NULL = any plan
  campaign             TEXT,                 -- grouping: 'onboarding', 'partner_x'
  starts_at            TIMESTAMPTZ DEFAULT NOW(),
  expires_at           TIMESTAMPTZ,          -- NULL = never expires
  is_active            BOOLEAN DEFAULT true,
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `coupon_redemptions`

```sql
CREATE TABLE coupon_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  credits     INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)  -- v1: max_per_user=1 enforced structurally
);
```

### RLS

- `coupons`: Users SELECT only `is_active = true`. Admin full access.
- `coupon_redemptions`: Users SELECT/INSERT own rows. Admin SELECT all.

## 2. RPCs

### `redeem_coupon(p_user_id UUID, p_code TEXT)`

Returns: `(success BOOLEAN, credits_earned INTEGER, new_balance INTEGER, message TEXT)`

Validations (in order):
1. Coupon exists (by UPPER(TRIM(code)))
2. is_active = true
3. starts_at <= NOW()
4. expires_at IS NULL OR > NOW()
5. current_redemptions < max_redemptions (or NULL)
6. User plan in allowed_plans (or NULL)
7. User hasn't redeemed yet (COUNT < max_per_user)

On success:
- INSERT coupon_redemptions
- UPDATE coupons.current_redemptions += 1
- UPDATE user_credits.balance += credits
- INSERT credit_transactions (type='admin_adjustment', description='Cupom: {code}')

### `admin_top_up(p_admin_id UUID, p_target_user_id UUID, p_amount INTEGER, p_reason TEXT)`

Returns: `(success BOOLEAN, new_balance INTEGER, message TEXT)`

- Verify admin UID
- UPDATE user_credits balance
- INSERT credit_transactions

### `admin_create_coupon(p_admin_id, p_code, p_credits, p_max_redemptions, p_max_per_user, p_allowed_plans, p_campaign, p_starts_at, p_expires_at)`

Returns: `(success BOOLEAN, coupon_id UUID, message TEXT)`

### `admin_list_coupons(p_admin_id UUID)`

Returns: TABLE of coupons with stats.

### `admin_toggle_coupon(p_admin_id UUID, p_coupon_id UUID, p_active BOOLEAN)`

Activate/deactivate existing coupon.

## 3. Frontend

### 3.1 — CreditBalanceWidget (coupon input)

- Button "Tenho um cupom" below daily claim
- Expands inline input + "Resgatar" button
- Success: animated toast + balance updates via Realtime
- Error: inline message with reason
- Collapses after success

### 3.2 — UsageDashboardPage (redemption history)

- New section "Cupons Resgatados"
- List: code, credits earned, date
- Empty state: "Nenhum cupom resgatado ainda"

### 3.3 — Admin Panel /admin/coupons

Route: `/admin/coupons`
Protection: `user.id === '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'`

Three sections:
1. **Top-Up Manual** — User ID, amount, reason, submit
2. **Criar Cupom** — Full form (code, credits, limits, plans, campaign, expiry)
3. **Cupons Existentes** — Table with toggle active/inactive

### 3.4 — Services & Hooks

```
couponService.ts     — RPC wrappers
useCouponRedemption  — widget (redeem + loading/error state)
useAdminCoupons      — admin panel (CRUD + list)
```

## 4. Security

| Rule | Implementation |
|------|---------------|
| Admin check | RPCs verify hardcoded admin UID |
| Race conditions | SELECT ... FOR UPDATE on coupon |
| Code normalization | UPPER(TRIM(p_code)) |
| RLS | Users: read active coupons + own redemptions. Admin: full |
| Route protection | Frontend UID check + redirect |
| Negative top-up | CHECK p_amount > 0 |

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| Concurrent redemption | UNIQUE constraint + FOR UPDATE |
| Coupon exhausted mid-redeem | Atomic increment + check |
| User deletion | No CASCADE — keep redemptions for audit |
| max_per_user > 1 (future) | Remove UNIQUE, use COUNT query, new migration |

## 6. Integration Points

- `credit_transactions.transaction_type = 'admin_adjustment'` (existing type)
- `user_credits` table updated atomically (existing)
- Realtime subscription on `user_credits` already exists in `useUserCredits`
- No new Edge Functions needed
