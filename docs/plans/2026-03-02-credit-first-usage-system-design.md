# Credit-First Usage System — Design Document

**Session:** `audit-usage-credit-system`
**Date:** 2026-03-02
**Author:** Lucas + Claude
**Status:** Approved

---

## Problem Statement

The current Usage Dashboard exposes internal implementation details (AI model names, BRL costs, token counts) that are meaningless to end users and create pricing transparency risks. Additionally:

1. **~40% of interactions log tokens = 0** — tracking is incomplete across Edge Functions
2. **Credit values are arbitrary** (1-5 per action) — not correlated with real cost
3. **No cost audit document** exists — making it impossible to calculate per-user margins
4. **UI shows too much technical detail** for basic users

## Goals

- Fix token tracking across all Edge Functions and frontend callers
- Recalculate credit costs per action based on real token usage + 200% margin (3x cost)
- Simplify the Usage Dashboard for basic users (credits only, no model/cost)
- Add "Advanced Mode" toggle for power users
- Create a cost audit document mapping all project costs

## Non-Goals

- Admin-only cost dashboard (future work)
- Stripe/Asaas payment integration changes
- Plan pricing changes (stays at Free=500, Pro=5000, Teams=20000)
- Real-time usage notifications

---

## Part 1 — Fix Token Tracking

### Current State

757 interactions logged (Jan 26 – Mar 02, 2026). Of these:
- **~40% log tokens_input = 0, tokens_output = 0, cost_brl = 0**
- Affected actions: `generate_daily_question` (278 of 333), `evaluate_quality` (24), `chat_aica` (24), `parse_statement` (23 of 26), `generate_dossier` (5), `generate_pauta_*` (9), `generate_ice_breakers` (3), `classify_intent` (2)

### Root Cause

Two patterns cause zero tokens:

1. **Edge Functions not extracting `usageMetadata`** from Gemini response before calling `log_interaction` RPC
2. **Frontend `trackAIUsage()` calls** where GeminiClient response tokens are not passed through

### Solution

Audit every Edge Function that calls Gemini and ensure:
```typescript
const result = await model.generateContent(prompt);
const usage = result.response.usageMetadata;

// Pass to log_interaction RPC
await supabase.rpc('log_interaction', {
  p_action: 'action_name',
  p_model: 'gemini-2.5-flash',
  p_tokens_input: usage?.promptTokenCount ?? 0,
  p_tokens_output: usage?.candidatesTokenCount ?? 0,
  // ... rest
});
```

**Estimated scope:** ~10-15 Edge Functions + ~5 frontend `trackAIUsage()` call sites.

### Edge Functions to Audit

| Function | Module | Issue |
|----------|--------|-------|
| `generate-daily-question` | journey | Logs 0 tokens on newer path |
| `gemini-chat` | coordinator | Some `chat_aica` logs show 0 |
| `parse-bank-statement` | grants/finance | 23 of 26 entries = 0 tokens |
| `evaluate-moment-quality` | journey | 24 entries with 0 tokens |
| `classify-intent` | journey | 2 entries with 0 tokens |
| `generate-dossier` | connections | All 5 entries = 0 tokens |
| `generate-pauta-outline` | studio | All 3 entries = 0 tokens |
| `generate-pauta-questions` | studio | All 3 entries = 0 tokens |
| `generate-ice-breakers` | studio | All 3 entries = 0 tokens |

---

## Part 2 — Credit Cost Formula

### Formula

```
1 credit ≈ $0.0002 USD of real AI cost
credits_per_action = max(1, round(avg_cost_USD × 3 / 0.0002))
```

Where:
- `avg_cost_USD` = average (tokens_input × input_price + tokens_output × output_price) per action
- `3` = 200% margin factor (3× cost)
- `0.0002` = normalization factor (1 credit base value in USD)

### Real Data (from Supabase usage_logs)

| Action | Model | Avg Tokens | Avg Cost USD | ×3 Margin | Credits |
|--------|-------|-----------|-------------|-----------|---------|
| `life_council` | Pro | 2814 | $0.0029 | $0.0087 | **5** |
| `parse_statement` (heavy) | Flash | 13205 | $0.0046 | $0.0138 | **8** |
| `build_contact_dossier` | Flash | 2182 | $0.0006 | $0.0018 | **3** |
| `route_entities_to_modules` | Flash | 2727 | $0.0005 | $0.0015 | **2** |
| `pattern_synthesis` | Pro | 4159 | $0.0009 | $0.0027 | **3** |
| `pattern_synthesis` | Flash | 2300 | $0.0005 | $0.0015 | **2** |
| `build_conversation_threads` | Flash | 1102 | $0.0004 | $0.0012 | **2** |
| `generate_report` | Flash | ~2000 | $0.0004 | $0.0012 | **2** |
| `generate_briefing` | Flash | ~1500 | $0.0003 | $0.0009 | **2** |
| `chat` / `chat_aica` | Flash | ~800 | $0.0002 | $0.0006 | **1** |
| `analyze_moment` | Flash | 730 | $0.0002 | $0.0006 | **1** |
| `transcribe_audio` | Flash | 915 | $0.0002 | $0.0006 | **1** |
| `generate_daily_question` | Flash | 1000 | $0.0002 | $0.0006 | **1** |
| `evaluate_quality` | Flash | 550 | $0.0002 | $0.0006 | **1** |
| `analyze_moment_sentiment` | Flash | 500 | $0.0002 | $0.0006 | **1** |
| `classify_intent` | Flash | 613 | $0.0001 | $0.0003 | **1** |
| `analyze_content_realtime` | Flash | 202 | $0.00003 | $0.00009 | **1** |
| `text_embedding` | Embed | ~200 | $0.000001 | $0.000003 | **1** |

### Tier Summary

| Tier | Credits | Actions |
|------|---------|---------|
| Micro (1) | 1 | sentiment, quality, classify, daily_question, embedding, realtime, transcribe, chat, analyze_moment |
| Medium (2) | 2 | conversation_threads, route_entities, pattern_synthesis (Flash), generate_report, generate_briefing |
| Heavy (3) | 3 | build_dossier, pattern_synthesis (Pro), research_guest |
| Premium (5) | 5 | life_council (Pro), generate_weekly_summary |
| Ultra (8) | 8 | parse_statement (heavy PDF processing) |

### Margin Validation

**Free plan (500 credits/month):**
- Assuming average 1.2 credits/interaction → ~417 interactions/month
- Real cost: 417 × $0.0002 = $0.083 USD/month ≈ R$ 0.45/month
- Rateio infra fixa: ~$20 Supabase + ~$5 Cloud Run = $25/month ÷ N users
- At 100 users: $0.25/user + $0.083 variable = **$0.33/user/month** (Free plan costs AICA)
- At 1000 users: $0.025/user + $0.083 variable = **$0.11/user/month**

**Pro plan (R$39.90/month, 5000 credits):**
- Real cost: ~4166 interactions × $0.0002 = $0.83 USD ≈ R$ 4.50
- Revenue: R$ 39.90 - R$ 4.50 = **R$ 35.40 gross margin (89%)**

**Teams plan (R$149/month, 20000 credits):**
- Real cost: ~16666 interactions × $0.0002 = $3.33 USD ≈ R$ 18
- Revenue: R$ 149 - R$ 18 = **R$ 131 gross margin (88%)**

---

## Part 3 — UI Redesign (UsageDashboardPage)

### Current State (783 lines)

6 stat cards: Interações Hoje, Créditos, Plano, Custo Total 30d, Custo Médio/Interação, Modelo mais usado

Table columns: Ação, Módulo, Modelo, Tokens, Custo, Data

### New Design — Basic View (default)

**4 stat cards:**
1. **Interações Hoje** — `X / limite` with progress bar (keep)
2. **Créditos Restantes** — balance + % of plan used bar (keep, enhanced)
3. **Plano Atual** — plan name + "Upgrade" CTA if Free (keep)
4. **Créditos Usados (30d)** — total credits consumed, no BRL (replaces "Custo Total")

**Removed from basic:** "Custo Médio/Interação", "Modelo mais usado"

**Bar chart:** Keep as-is (14-day interactions)

**Interactions table (basic):**

| Ação | Módulo | Créditos | Data |
|------|--------|----------|------|

**Removed:** Modelo, Tokens, Custo R$ columns

**Credit transactions table:** Keep as-is (already credit-focused)

**Daily Claim button:** Keep as-is

### New Design — Advanced Mode (toggle)

Toggle button: "Modo Avançado" with Eye icon, persisted in `localStorage`

When ON, interactions table expands:

| Ação | Módulo | Créditos | Modelo | Tokens (in/out) | Custo R$ | Data |
|------|--------|----------|--------|-----------------|----------|------|

Additional card appears:
5. **Custo Real (30d)** — R$ total cost

### Component Changes

**Modified files:**
- `src/modules/billing/pages/UsageDashboardPage.tsx` — main redesign
- `src/types/aiCost.ts` — update `ACTION_CREDIT_COSTS` with new values

**No new files needed.**

---

## Part 4 — Cost Audit Document

Separate deliverable: `docs/COST_AUDIT.md`

Contents:
1. **Fixed monthly costs** — Supabase ($20), Cloud Run (estimate), Firebase Hosting (free tier), domains
2. **Variable costs** — Gemini API pricing per model, actual cost per action
3. **Credit formula** — with derivation and real data backing
4. **Margin analysis** — per plan (Free, Pro, Teams)
5. **Break-even analysis** — how many paid users needed to cover Free tier costs
6. **Scaling projections** — cost at 100, 1000, 10000 users

---

## Implementation Order

1. **Fix tracking** (backend) — Edge Functions audit + token extraction
2. **Update credit costs** (DB + frontend) — new `ACTION_CREDIT_COSTS` + migration for `action_credit_costs` table
3. **Redesign UI** (frontend) — simplify `UsageDashboardPage`
4. **Write cost audit** (docs) — document all costs and margins

---

## Files Affected

| File | Change Type |
|------|-------------|
| `supabase/functions/generate-daily-question/index.ts` | Fix token tracking |
| `supabase/functions/gemini-chat/index.ts` | Verify token tracking |
| `supabase/functions/parse-bank-statement/index.ts` | Fix token tracking |
| `supabase/functions/evaluate-moment-quality/index.ts` | Fix token tracking |
| `supabase/functions/classify-intent/index.ts` | Fix token tracking |
| `supabase/functions/generate-dossier/index.ts` | Fix token tracking |
| `supabase/functions/generate-pauta-outline/index.ts` | Fix token tracking |
| `supabase/functions/generate-pauta-questions/index.ts` | Fix token tracking |
| `supabase/functions/generate-ice-breakers/index.ts` | Fix token tracking |
| `src/types/aiCost.ts` | Update ACTION_CREDIT_COSTS |
| `src/modules/billing/pages/UsageDashboardPage.tsx` | UI redesign |
| `supabase/migrations/YYYYMMDD_update_action_credit_costs.sql` | DB credit values |
| `docs/COST_AUDIT.md` | New: cost audit document |
