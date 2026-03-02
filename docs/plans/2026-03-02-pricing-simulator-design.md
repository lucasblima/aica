# Pricing Simulator Dashboard — Design Document

**Session:** `biz-pricing-simulator`
**Date:** 2026-03-02
**Author:** Lucas + Claude
**Status:** Approved

---

## Problem Statement

AICA needs a tool to simulate how pricing variables (plan prices, credit limits, margins, churn, growth) affect profitability. Currently the COST_AUDIT.md has static projections, but any change requires manual recalculation. A live simulator with real usage data as baseline enables rapid pricing decisions.

## Goals

- Interactive admin-only page (`/admin/simulator`) for pricing simulation
- Adjust 20+ variables via sliders/inputs and see instant impact on P&L, unit economics, and margins
- Compare up to 3 pricing scenarios side-by-side
- Pull real usage data from Supabase as baseline for calculations
- Serve both founder (operational decisions) and investor (SaaS metrics) audiences

## Non-Goals

- Public-facing pricing page (separate work)
- Stripe/Asaas integration
- Automated pricing optimization (AI-driven)
- Mobile-responsive design (admin desktop tool)

---

## Architecture

### Page Structure

- **Route:** `/admin/simulator` (admin-only, RLS or profile flag)
- **Layout:** Sidebar (variable inputs) + Main area (3 tabs)
- **Computation:** 100% client-side JavaScript (no new API endpoints)
- **Data source:** `usage_logs` table for real baseline values (read-only)
- **Stack:** React + TypeScript + Recharts (already in project)

### Variable Panel (Sidebar)

| Group | Variables |
|-------|-----------|
| **Pricing** | Pro price (R$), Teams price (R$), Pro credits, Teams credits, Free credits |
| **Costs** | Supabase ($/m), Cloud Run ($/m), Gemini Flash ($/1M tokens), Gemini Pro ($/1M tokens), Exchange rate R$/$ |
| **Growth** | Initial users, monthly growth rate (%), seasonality multipliers (12 months) |
| **Conversion** | % Free-to-Pro, % Free-to-Teams, Pro monthly churn (%), Teams monthly churn (%) |
| **Usage** | Avg credit utilization (%), Flash vs Pro model mix (%), avg tokens per interaction |
| **Acquisition** | CAC (R$), organic vs paid channel mix (%) |

Default values populated from real Supabase data + COST_AUDIT.md constants.

---

## Tab 1: P&L Mensal (24-month Projection)

### Table

| Column | Description |
|--------|-------------|
| Month | 1-24 |
| Total Users | Cumulative |
| Free / Pro / Teams | Breakdown by plan |
| MRR (R$) | Monthly recurring revenue |
| Fixed Cost (R$) | Supabase + Cloud Run + domain |
| AI Cost (R$) | Gemini API variable cost |
| Gross Margin (R$) | MRR - Fixed - AI |
| Margin % | Gross Margin / MRR |

### Chart

Recharts `AreaChart` with:
- X-axis: months 1-24
- Stacked areas: Revenue (green), Fixed Cost (gray), AI Cost (amber)
- Right Y-axis line: Margin %
- Break-even month highlighted in green
- Infrastructure step-ups (Supabase tier upgrade) highlighted in yellow

### Calculation Logic

```
For each month m (1-24):
  seasonality = month_multiplier[m % 12]
  new_users = users[m-1] * growth_rate * seasonality
  churn_pro = pro[m-1] * churn_rate_pro
  churn_teams = teams[m-1] * churn_rate_teams
  conversion_pro = free[m-1] * conv_rate_pro
  conversion_teams = free[m-1] * conv_rate_teams

  free[m] = free[m-1] + new_users * 0.80 - conversion_pro - conversion_teams
  pro[m] = pro[m-1] + conversion_pro - churn_pro
  teams[m] = teams[m-1] + conversion_teams - churn_teams

  mrr[m] = pro[m] * price_pro + teams[m] * price_teams
  fixed_cost[m] = supabase + cloudrun + (step_up if users > threshold)
  ai_cost[m] = total_credits_consumed * cost_per_credit
  margin[m] = mrr[m] - fixed_cost[m] - ai_cost[m]
```

Infrastructure step-ups:
- Supabase Pro ($20/m) -> Team ($599/m) at ~1,000 users
- Cloud Run scales linearly: +$5/m per 500 users

---

## Tab 2: Unit Economics

### Metric Cards (4)

| Metric | Formula |
|--------|---------|
| LTV (Pro) | `price_pro * (1 / churn_rate_pro)` |
| LTV (Teams) | `price_teams * (1 / churn_rate_teams)` |
| CAC Payback | `CAC / price_pro` months |
| LTV/CAC Ratio | `blended_LTV / CAC` (target: >3x) |

### Additional Metrics (List)

- MRR, ARR (MRR * 12)
- ARPU (MRR / total_paying_users)
- Net Dollar Retention (NDR): `(start_MRR + expansion - churn) / start_MRR`
- Cost per credit (real vs charged) — margin per credit
- Free user subsidy ratio (how many free users 1 Pro covers)

### Chart

Recharts `BarChart` comparing LTV vs CAC per plan, with 3x reference line.

---

## Tab 3: Pricing Scenarios

### Layout

3 columns side-by-side, each independently configurable:

| Field | Scenario A (Current) | Scenario B | Scenario C |
|-------|---------------------|-----------|-----------|
| Pro price | R$39.90 | editable | editable |
| Pro credits | 5,000 | editable | editable |
| Teams price | R$149 | editable | editable |
| Teams credits | 20,000 | editable | editable |
| **MRR M12** | calculated | calculated | calculated |
| **MRR M24** | calculated | calculated | calculated |
| **Break-even** | month X | month Y | month Z |
| **Margin M24** | XX% | YY% | ZZ% |
| **LTV/CAC** | X.Xx | Y.Yx | Z.Zx |

Scenario A always pre-populated with current values. B and C are editable.

### Chart

Recharts `LineChart` with 3 lines (MRR trajectory per scenario over 24 months).

---

## Data Model

No new tables needed. Read from existing:

- `usage_logs` — real interaction data for baseline costs
- `action_credit_costs` — credit tier mapping
- `pricing_plans` — current plan definitions
- `user_subscriptions` — current subscriber count

All simulation state is local (React state). No persistence needed initially.

---

## Component Structure

```
src/modules/billing/pages/PricingSimulatorPage.tsx  (main page)
src/modules/billing/components/simulator/
  VariablePanel.tsx       (sidebar with all input groups)
  PLTab.tsx               (P&L table + area chart)
  UnitEconomicsTab.tsx    (metric cards + bar chart)
  PricingScenariosTab.tsx (3-column comparison + line chart)
  useSimulation.ts        (hook: all calculation logic)
  simulatorDefaults.ts    (default values from COST_AUDIT)
  types.ts                (SimulationInput, SimulationOutput, Scenario)
```

---

## Access Control

- Route guarded by admin check (user profile flag or hardcoded user_id list)
- No RLS changes needed (reads existing tables with authenticated user)
- No new Edge Functions (all computation client-side)

---

## Baseline Values (from COST_AUDIT.md)

| Variable | Default | Source |
|----------|---------|--------|
| Pro price | R$39.90 | pricing_plans |
| Teams price | R$149.00 | pricing_plans |
| Free credits | 500 | pricing_plans |
| Pro credits | 5,000 | pricing_plans |
| Teams credits | 20,000 | pricing_plans |
| Supabase cost | $20/m | COST_AUDIT |
| Cloud Run cost | $5/m | COST_AUDIT |
| Gemini Flash input | $0.10/1M | Google pricing |
| Gemini Flash output | $0.40/1M | Google pricing |
| Gemini Pro input | $1.25/1M | Google pricing |
| Gemini Pro output | $5.00/1M | Google pricing |
| Exchange rate | R$5.50/$ | COST_AUDIT |
| Growth rate | 10%/month | Assumption |
| Free-to-Pro conversion | 15% | Industry avg |
| Free-to-Teams conversion | 5% | Industry avg |
| Pro churn | 5%/month | SaaS avg |
| Teams churn | 3%/month | SaaS avg |
| Credit utilization | 50% | COST_AUDIT |
| CAC | R$50 | Assumption |
