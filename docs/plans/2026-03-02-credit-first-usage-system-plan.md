# Credit-First Usage System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken token tracking, recalculate credit costs based on real data with 200% margin, simplify the Usage Dashboard for basic users with an advanced toggle.

**Architecture:** Edge Functions pass `usageMetadata` from Gemini responses to the `log_interaction` RPC. Credit costs in `action_credit_costs` DB table are recalculated from real token data. Frontend `UsageDashboardPage` hides model/cost columns behind an "Advanced Mode" toggle.

**Tech Stack:** Supabase Edge Functions (Deno), PostgreSQL migrations, React 18 + TypeScript + Tailwind CSS (Ceramic Design System)

**Team:** Agent Team approved. Suggested composition:
- **Lead (Coordinator):** Breaks tasks, reviews, synthesizes
- **Teammate 1 (Backend):** Fix Edge Functions token tracking
- **Teammate 2 (Frontend):** Redesign UsageDashboardPage + update credit costs
- **Teammate 3 (Docs):** Write COST_AUDIT.md with real data

---

## Task 1: Fix token tracking — `generate-questions` Edge Function

**Files:**
- Modify: `supabase/functions/generate-questions/index.ts` (around line 770-783)

**Context:** This function generates daily questions for the Journey module. It calls Gemini but hardcodes `p_tokens_in: 0, p_tokens_out: 0` at line 777-778. The Gemini response object has `usageMetadata` but it's not being extracted.

**Step 1:** Find where the Gemini call happens and where `usageMetadata` could be extracted.

Search for `generateContent` or `model.` calls in the file. The response has `.response.usageMetadata` with `promptTokenCount` and `candidatesTokenCount`.

**Step 2:** Extract usageMetadata from the Gemini response

After the Gemini call, add:
```typescript
const usageMetadata = response.response?.usageMetadata;
```

**Step 3:** Pass real tokens to log_interaction

Change from:
```typescript
p_tokens_in: 0,
p_tokens_out: 0,
```
To:
```typescript
p_tokens_in: usageMetadata?.promptTokenCount || 0,
p_tokens_out: usageMetadata?.candidatesTokenCount || 0,
```

**Step 4:** Commit
```bash
git add supabase/functions/generate-questions/index.ts
git commit -m "fix(tracking): pass real tokens in generate-questions Edge Function"
```

---

## Task 2: Fix token tracking — `gemini-chat` stream path

**Files:**
- Modify: `supabase/functions/gemini-chat/index.ts` (around line 2848-2857)

**Context:** The non-stream path (line 2977-2983) correctly passes `usageMetadata`. But the STREAM path (line 2850-2856) hardcodes `p_tokens_in: 0, p_tokens_out: 0`. For streaming, the aggregated `usageMetadata` is available in the stream completion callback.

**Step 1:** Find the stream log_interaction call around line 2850

**Step 2:** Check if `usageMetadata` is available at that point in the stream handler. If streaming uses `generateContentStream`, the aggregated usage comes from `response.usageMetadata` after stream completes.

**Step 3:** Replace hardcoded zeros with actual values:
```typescript
p_tokens_in: usageMetadata?.promptTokenCount || 0,
p_tokens_out: usageMetadata?.candidatesTokenCount || 0,
```

If usageMetadata is not in scope at the stream log point, capture it from the stream's `response()` method.

**Step 4:** Commit
```bash
git add supabase/functions/gemini-chat/index.ts
git commit -m "fix(tracking): pass real tokens in gemini-chat stream path"
```

---

## Task 3: Fix token tracking — `media-processor` Edge Function

**Files:**
- Modify: `supabase/functions/media-processor/index.ts` (around line 840-848)

**Context:** Logs `analyze_moment` action with `p_tokens_in: 0, p_tokens_out: 0`. Processes audio/media with Gemini.

**Step 1:** Find the Gemini call in the media processing flow

**Step 2:** Extract `usageMetadata` from the Gemini response

**Step 3:** Pass real tokens:
```typescript
p_tokens_in: usageMetadata?.promptTokenCount || 0,
p_tokens_out: usageMetadata?.candidatesTokenCount || 0,
```

**Step 4:** Commit
```bash
git add supabase/functions/media-processor/index.ts
git commit -m "fix(tracking): pass real tokens in media-processor Edge Function"
```

---

## Task 4: Fix token tracking — `process-edital` Edge Function

**Files:**
- Modify: `supabase/functions/process-edital/index.ts` (around line 709-717)

**Context:** Logs `parse_statement` action for grants/edital processing. 23 of 26 entries logged with 0 tokens. This is a heavy function (~13K avg tokens when working).

**Step 1:** Find the Gemini generateContent call

**Step 2:** Extract `usageMetadata` from the response

**Step 3:** Pass real tokens to log_interaction at line 716-717

**Step 4:** Commit
```bash
git add supabase/functions/process-edital/index.ts
git commit -m "fix(tracking): pass real tokens in process-edital Edge Function"
```

---

## Task 5: Fix token tracking — `process-document` Edge Function

**Files:**
- Modify: `supabase/functions/process-document/index.ts` (around line 1176-1184)

**Context:** Also logs `parse_statement` action. Similar pattern to process-edital.

**Step 1-3:** Same pattern — find Gemini call, extract usageMetadata, pass to log_interaction

**Step 4:** Commit
```bash
git add supabase/functions/process-document/index.ts
git commit -m "fix(tracking): pass real tokens in process-document Edge Function"
```

---

## Task 6: Fix token tracking — `query-edital` Edge Function

**Files:**
- Modify: `supabase/functions/query-edital/index.ts` (around line 264-272)

**Context:** Logs `generate_field_content` action with 0 tokens.

**Step 1-3:** Same pattern

**Step 4:** Commit
```bash
git add supabase/functions/query-edital/index.ts
git commit -m "fix(tracking): pass real tokens in query-edital Edge Function"
```

---

## Task 7: Fix token tracking — `process-contact-analysis` Edge Function

**Files:**
- Modify: `supabase/functions/process-contact-analysis/index.ts` (around line 376-384)

**Context:** Logs `whatsapp_sentiment` action with 0 tokens.

**Step 1-3:** Same pattern

**Step 4:** Commit
```bash
git add supabase/functions/process-contact-analysis/index.ts
git commit -m "fix(tracking): pass real tokens in process-contact-analysis Edge Function"
```

---

## Task 8: Fix token tracking — `process-organization-document` Edge Function

**Files:**
- Modify: `supabase/functions/process-organization-document/index.ts` (around line 524-532)

**Context:** Logs `parse_statement` action with 0 tokens.

**Step 1-3:** Same pattern

**Step 4:** Commit
```bash
git add supabase/functions/process-organization-document/index.ts
git commit -m "fix(tracking): pass real tokens in process-organization-document Edge Function"
```

---

## Task 9: Fix token tracking — `reanalyze-moments` Edge Function

**Files:**
- Modify: `supabase/functions/reanalyze-moments/index.ts` (around line 286-294)

**Context:** Logs `analyze_moment` action with 0 tokens. Batch reanalysis.

**Step 1-3:** Same pattern. Note: this does batch processing so may need to accumulate tokens across iterations.

**Step 4:** Commit
```bash
git add supabase/functions/reanalyze-moments/index.ts
git commit -m "fix(tracking): pass real tokens in reanalyze-moments Edge Function"
```

---

## Task 10: Fix token tracking — `generate-contact-embeddings` Edge Function

**Files:**
- Modify: `supabase/functions/generate-contact-embeddings/index.ts` (around line 355-363)

**Context:** Logs `text_embedding` action with 0 tokens. Embedding model has very low cost but should still track tokens.

**Step 1-3:** Same pattern — embeddings API response also has `usageMetadata`

**Step 4:** Commit
```bash
git add supabase/functions/generate-contact-embeddings/index.ts
git commit -m "fix(tracking): pass real tokens in generate-contact-embeddings Edge Function"
```

---

## Task 11: Fix token tracking — remaining Edge Functions with hardcoded 0

**Files:** Check and fix any of these that have `p_tokens_in: 0`:
- `supabase/functions/build-user-profile/index.ts` (~line 282)
- `supabase/functions/generate-interview-questions/index.ts` (~line 379)
- `supabase/functions/process-interview-response/index.ts` (~line 275)
- `supabase/functions/plan-and-execute/index.ts` (~line 172, 262)
- `supabase/functions/synthesize-user-patterns/index.ts` (~line 170)
- `supabase/functions/run-life-council/index.ts` (~line 315)

**Step 1:** Read each file, find if `p_tokens_in` is hardcoded to 0

**Step 2:** For each broken one, extract usageMetadata and pass real values

**Step 3:** Commit all remaining fixes together
```bash
git add supabase/functions/*/index.ts
git commit -m "fix(tracking): pass real tokens in remaining Edge Functions"
```

---

## Task 12: Update credit costs — Migration

**Files:**
- Create: `supabase/migrations/20260302000000_update_action_credit_costs.sql`

**Context:** Recalculate credit costs based on real usage data with 200% margin (3x cost). Formula: `credits = max(1, round(avg_cost_USD × 3 / 0.0002))`

**Step 1:** Write the migration

```sql
-- Update action credit costs based on real usage data analysis (March 2026)
-- Formula: credits = max(1, round(avg_cost_USD × 3 / 0.0002))
-- 1 credit ≈ $0.0002 USD real cost, with 3x margin built in

-- Tier: basic (1 credit) — actions costing < $0.0003 USD
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'analyze_moment_sentiment';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'evaluate_quality';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'generate_daily_question';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'text_embedding';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'classify_intent';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'chat';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'chat_aica';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'analyze_moment';
UPDATE public.action_credit_costs SET credits = 1, tier = 'basic' WHERE action = 'generate_tags';

-- Tier: standard (2 credits) — actions costing $0.0003-$0.0006 USD
UPDATE public.action_credit_costs SET credits = 2, tier = 'standard' WHERE action = 'build_conversation_threads';
UPDATE public.action_credit_costs SET credits = 2, tier = 'standard' WHERE action = 'route_entities_to_modules';
UPDATE public.action_credit_costs SET credits = 2, tier = 'standard' WHERE action = 'whatsapp_sentiment';
UPDATE public.action_credit_costs SET credits = 2, tier = 'standard' WHERE action = 'generate_report';
UPDATE public.action_credit_costs SET credits = 2, tier = 'standard' WHERE action = 'generate_briefing';
UPDATE public.action_credit_costs SET credits = 2, tier = 'standard' WHERE action = 'generate_field_content';

-- Tier: advanced (3 credits) — actions costing $0.0006-$0.001 USD
UPDATE public.action_credit_costs SET credits = 3, tier = 'advanced' WHERE action = 'build_contact_dossier';
UPDATE public.action_credit_costs SET credits = 3, tier = 'advanced' WHERE action = 'research_guest';
UPDATE public.action_credit_costs SET credits = 3, tier = 'advanced' WHERE action = 'generate_pauta_outline';
UPDATE public.action_credit_costs SET credits = 3, tier = 'advanced' WHERE action = 'pattern_synthesis';

-- Tier: premium (5 credits) — actions costing $0.001-$0.003 USD
UPDATE public.action_credit_costs SET credits = 5, tier = 'premium' WHERE action = 'life_council';
UPDATE public.action_credit_costs SET credits = 5, tier = 'premium' WHERE action = 'generate_weekly_summary';

-- Tier: ultra (8 credits) — actions costing > $0.003 USD (heavy PDF processing)
UPDATE public.action_credit_costs SET credits = 8, tier = 'premium' WHERE action = 'parse_statement';

-- Add new actions discovered in usage_logs that are not yet in the table
INSERT INTO public.action_credit_costs (action, credits, tier, description) VALUES
    ('chat_aica_stream', 1, 'basic', 'AICA chat assistant (streaming)'),
    ('transcribe_audio', 1, 'basic', 'Audio transcription via Gemini'),
    ('analyze_content_realtime', 1, 'basic', 'Real-time content analysis'),
    ('extract_task_from_voice', 1, 'basic', 'Voice-to-task extraction'),
    ('generate_post_capture_insight', 1, 'basic', 'Post-capture insight generation'),
    ('generate_dossier', 3, 'advanced', 'Full dossier generation'),
    ('generate_pauta_questions', 3, 'advanced', 'Podcast pauta question generation'),
    ('generate_ice_breakers', 2, 'standard', 'Ice breaker generation for guests'),
    ('chat_with_agent', 1, 'basic', 'Specialized agent chat'),
    ('build_profile', 2, 'standard', 'User profile building'),
    ('plan_and_execute', 3, 'advanced', 'Multi-step plan execution'),
    ('interview_extract_insights', 2, 'standard', 'Interview insight extraction'),
    ('generate_interview_followup', 2, 'standard', 'Interview follow-up generation'),
    ('atlas_prioritize', 2, 'standard', 'Atlas task prioritization'),
    ('atlas_suggest', 1, 'basic', 'Atlas task suggestions'),
    ('atlas_breakdown', 2, 'standard', 'Atlas task breakdown')
ON CONFLICT (action) DO UPDATE SET
    credits = EXCLUDED.credits,
    tier = EXCLUDED.tier,
    description = EXCLUDED.description;
```

**Step 2:** Apply migration locally
```bash
npx supabase db push
```

**Step 3:** Verify
```bash
npx supabase db diff
```

**Step 4:** Commit
```bash
git add supabase/migrations/20260302000000_update_action_credit_costs.sql
git commit -m "feat(billing): recalculate credit costs from real usage data (3x margin)"
```

---

## Task 13: Update frontend credit costs constant

**Files:**
- Modify: `src/types/aiCost.ts` (lines 174-201)

**Context:** The `ACTION_CREDIT_COSTS` constant mirrors the DB table. Update to match the new values.

**Step 1:** Replace the `ACTION_CREDIT_COSTS` object:

```typescript
export const ACTION_CREDIT_COSTS: Record<string, number> = {
  // Tier: basic (1 credit) — light operations
  analyze_moment_sentiment: 1,
  evaluate_quality: 1,
  generate_daily_question: 1,
  text_embedding: 1,
  classify_intent: 1,
  chat: 1,
  chat_aica: 1,
  chat_aica_stream: 1,
  analyze_moment: 1,
  generate_tags: 1,
  transcribe_audio: 1,
  analyze_content_realtime: 1,
  extract_task_from_voice: 1,
  generate_post_capture_insight: 1,
  chat_with_agent: 1,
  atlas_suggest: 1,
  // Tier: standard (2 credits) — moderate operations
  build_conversation_threads: 2,
  route_entities_to_modules: 2,
  whatsapp_sentiment: 2,
  generate_report: 2,
  generate_briefing: 2,
  generate_field_content: 2,
  generate_ice_breakers: 2,
  build_profile: 2,
  interview_extract_insights: 2,
  generate_interview_followup: 2,
  atlas_prioritize: 2,
  atlas_breakdown: 2,
  // Tier: advanced (3 credits) — heavy operations
  build_contact_dossier: 3,
  research_guest: 3,
  generate_pauta_outline: 3,
  generate_pauta_questions: 3,
  pattern_synthesis: 3,
  generate_dossier: 3,
  plan_and_execute: 3,
  // Tier: premium (5 credits) — premium AI operations
  life_council: 5,
  generate_weekly_summary: 5,
  // Tier: ultra (8 credits) — heavy PDF processing
  parse_statement: 8,
};
```

**Step 2:** Commit
```bash
git add src/types/aiCost.ts
git commit -m "feat(billing): update ACTION_CREDIT_COSTS to match real usage data"
```

---

## Task 14: Redesign UsageDashboardPage — Basic View

**Files:**
- Modify: `src/modules/billing/pages/UsageDashboardPage.tsx`

**Context:** Currently 783 lines with 6 stat cards and a table showing model/cost/tokens. Simplify to 4 cards in basic mode, hide model+cost+tokens columns.

**Step 1:** Add advanced mode state (persisted in localStorage)

At the top of the component, add:
```typescript
const [advancedMode, setAdvancedMode] = useState(() => {
  try {
    return localStorage.getItem('usage_advanced_mode') === 'true';
  } catch {
    return false;
  }
});

const toggleAdvancedMode = useCallback(() => {
  setAdvancedMode(prev => {
    const next = !prev;
    try { localStorage.setItem('usage_advanced_mode', String(next)); } catch {}
    return next;
  });
}, []);
```

**Step 2:** Replace the 6 stats cards grid with 4 cards (basic) or 5 cards (advanced)

Basic cards:
1. "Interacoes Hoje" — keep as-is
2. "Creditos Restantes" — keep, show balance
3. "Plano" — keep
4. "Creditos Usados (30d)" — NEW: show total credits consumed (sum `credits_used` from usage_logs)

When `advancedMode` is ON, add:
5. "Custo Real (30d)" — show `formatCurrencyShort(summary.total_cost_30d)`

Remove entirely: "Custo Medio/Interacao", "Modelo mais usado" cards

**Step 3:** Add the Advanced Mode toggle button near the page title

```tsx
<button
  onClick={toggleAdvancedMode}
  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
    ${advancedMode
      ? 'bg-amber-100 text-amber-700 border border-amber-200'
      : 'text-ceramic-text-secondary hover:bg-ceramic-text-secondary/10'
    }"
>
  {advancedMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
  {advancedMode ? 'Modo Basico' : 'Modo Avancado'}
</button>
```

Add `Eye, EyeOff` to the lucide-react imports.

**Step 4:** Simplify the interactions table

Basic mode columns: Acao, Modulo, Creditos, Data
Advanced mode columns: Acao, Modulo, Creditos, Modelo, Tokens (in/out), Custo R$, Data

Use `advancedMode` to conditionally render columns:
```tsx
{advancedMode && (
  <th className="...hidden md:table-cell">Modelo</th>
)}
{advancedMode && (
  <th className="...hidden md:table-cell">Tokens</th>
)}
{advancedMode && (
  <th className="...">Custo</th>
)}
```

Same pattern for `<td>` cells in the tbody.

**Step 5:** Add `credits_used` to the `UsageLog` interface and query

Update the interface:
```typescript
interface UsageLog {
  id: string;
  action: string;
  module: string | null;
  model_used: string | null;
  tokens_input: number;
  tokens_output: number;
  cost_brl: number;
  credits_used: number;  // ADD THIS
  created_at: string;
}
```

Update the select query (line 181):
```typescript
.select('id, action, module, model_used, tokens_input, tokens_output, cost_brl, credits_used, created_at')
```

**Step 6:** Add credits column to the basic table

Replace the "Custo" column in basic mode with "Creditos":
```tsx
<td className="px-3 py-3 text-ceramic-text-primary text-right font-medium">
  {log.credits_used ?? 1}
</td>
```

**Step 7:** Add 30-day credits summary

In the `loadData` function, add after the cost calculation:
```typescript
const totalCredits30d = costData?.reduce((sum, row) => sum + ((row as any).credits_used || 1), 0) ?? 0;
```

Update the `DailyUsageSummary` interface to include `total_credits_30d: number` and the costData select to include `credits_used`.

**Step 8:** Run build to verify
```bash
npm run build && npm run typecheck
```

**Step 9:** Commit
```bash
git add src/modules/billing/pages/UsageDashboardPage.tsx
git commit -m "feat(billing): redesign UsageDashboard with credit-first basic view and advanced toggle"
```

---

## Task 15: Write COST_AUDIT.md

**Files:**
- Create: `docs/COST_AUDIT.md`

**Context:** Document all project costs, credit formula derivation, and margin analysis.

**Step 1:** Write the cost audit document with these sections:

1. **Fixed Monthly Costs**
   - Supabase Pro: $20 USD/month (aica-staging project)
   - Google Cloud Run: estimate from GCP billing (ask user for exact number or estimate ~$5-10/month based on typical low-traffic usage)
   - Firebase Hosting: Free tier (10GB bandwidth)
   - Domains: aica.guru + dev.aica.guru (estimate ~$15/year = ~$1.25/month)
   - **Total fixed: ~$26-31/month**

2. **Variable Costs (Gemini API)**
   - Pricing table (per 1M tokens, USD):
     - gemini-2.5-flash: $0.10 input / $0.40 output
     - gemini-2.5-pro: $1.25 input / $5.00 output
     - text-embedding-004: negligible
   - Real data: 757 interactions in ~35 days = R$ 0.59 total = ~$0.11 USD
   - Average cost per interaction: ~$0.00015 USD

3. **Credit Formula**
   - 1 credit = ~$0.0002 USD of real cost
   - 3x margin factor built into credit pricing
   - Tier table with all actions

4. **Margin Analysis by Plan**
   - Free (500 credits): cost ~R$0.45/month + rateio
   - Pro (5000 credits, R$39.90): ~89% gross margin
   - Teams (20000 credits, R$149): ~88% gross margin

5. **Break-Even Analysis**
   - Fixed costs: ~$26-31/month
   - Per Free user cost: ~$0.11/month (at 1000 users scale)
   - Need ~1 Pro user per ~9 Free users to break even on variable costs
   - Need ~3 Pro users total to cover fixed infra costs

6. **Scaling Projections** (table at 100, 500, 1000, 5000 users)

**Step 2:** Commit
```bash
git add docs/COST_AUDIT.md
git commit -m "docs(billing): add comprehensive cost audit with margin analysis"
```

---

## Task 16: Final integration commit + PR

**Step 1:** Run full build verification
```bash
npm run build && npm run typecheck && npm run lint
```

**Step 2:** Push branch and create PR
```bash
git push -u origin audit-usage-credit-system
gh pr create --title "feat(billing): credit-first usage system with real cost tracking" --body "$(cat <<'EOF'
## Summary
- Fix token tracking in ~10 Edge Functions that logged 0 tokens (40% of interactions)
- Recalculate credit costs based on real usage data with 200% margin (3x cost)
- Simplify Usage Dashboard: basic view shows only credits, advanced toggle reveals model/cost/tokens
- Add comprehensive cost audit document with margin analysis

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Verify usage_logs show non-zero tokens after Edge Function deploys
- [ ] Verify UsageDashboardPage basic view hides model/cost columns
- [ ] Verify advanced toggle shows full details
- [ ] Verify credit values match new tier system

## Design doc
See `docs/plans/2026-03-02-credit-first-usage-system-design.md`

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 3:** Wait for PR checks and address comments

---

## Dependency Order

```
Tasks 1-11 (fix tracking) — PARALLEL, independent Edge Functions
    ↓
Task 12 (migration) — after tracking fixed
    ↓
Task 13 (frontend constants) — after migration
Task 14 (UI redesign) — can start in parallel with Task 13
    ↓
Task 15 (cost audit doc) — can start anytime, no code deps
    ↓
Task 16 (PR) — after all tasks complete
```

## Team Assignment

| Teammate | Tasks | Files |
|----------|-------|-------|
| Backend  | 1-11 | `supabase/functions/*/index.ts` |
| Frontend | 12-14 | `supabase/migrations/`, `src/types/aiCost.ts`, `src/modules/billing/pages/UsageDashboardPage.tsx` |
| Docs     | 15 | `docs/COST_AUDIT.md` |
| Lead     | 16 | PR creation, review coordination |
