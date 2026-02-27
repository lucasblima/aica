# LifeRPG Engine Gaps — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify and complete all 8 LifeRPG gamification gaps so the engine works end-to-end.

**Architecture:** Audit-first approach — build check, verify each gap, fix what's broken, implement what's missing. The code is ~85% complete; most work is fixing table references, adding triggers, and wiring UI.

**Tech Stack:** React 18 + TypeScript, Supabase (PostgreSQL + pg_cron + Edge Functions), Vitest

---

## Phase 1: Build Audit

### Task 1: Verify build and typecheck pass

**Files:**
- None modified (audit only)

**Step 1: Run build**

Run: `npm run build`
Expected: SUCCESS (or capture errors)

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: SUCCESS (or capture errors)

**Step 3: Fix any errors found**

If errors exist in gamification-related files, fix them before proceeding.

**Step 4: Commit if fixes were needed**

```bash
git add -A && git commit -m "fix(gamification): resolve build errors in gamification services

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: Verify and Fix Each Gap

### Task 2: Fix badge evaluation table references (Gap 1+4)

**Critical bugs found during audit:**
- Line 184: `.from('tasks')` — table `tasks` does NOT exist. Correct table: `work_items`
- Lines 221, 237, 288: `.from('life_events')` — table `life_events` does NOT exist. Correct table: `moments`
- Line 411: `supabase.rpc('add_xp', ...)` — RPC `add_xp` does NOT exist in migrations. Should use `gamificationService.addXP()` instead.

**Files:**
- Modify: `src/services/badgeEvaluationService.ts`

**Step 1: Fix `tasks` → `work_items` reference**

In `src/services/badgeEvaluationService.ts`, line 184:

```typescript
// BEFORE (line 182-188):
    case 'tasks_priority': {
      // Query tasks by priority
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('priority', condition.priority)
        .eq('status', 'completed');

// AFTER:
    case 'tasks_priority': {
      // Query work_items by priority (Eisenhower quadrant)
      const { count } = await supabase
        .from('work_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('priority', condition.priority)
        .not('completed_at', 'is', null);
```

**Step 2: Fix `life_events` → `moments` for journal_entries**

In `src/services/badgeEvaluationService.ts`, line 221:

```typescript
// BEFORE (line 219-224):
    case 'journal_entries': {
      const { count } = await supabase
        .from('life_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'journal_entry');

// AFTER:
    case 'journal_entries': {
      const { count } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('moment_type', 'journal');
```

**Step 3: Fix `life_events` → `moments` for mood_checks**

In `src/services/badgeEvaluationService.ts`, line 237:

```typescript
// BEFORE (line 235-240):
    case 'mood_checks': {
      const { count } = await supabase
        .from('life_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('event_type', ['mood_check', 'check_in', 'reflection']);

// AFTER:
    case 'mood_checks': {
      const { count } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('moment_type', ['check_in', 'reflection', 'emotion']);
```

**Step 4: Fix `life_events` → `moments` for focus_sessions**

In `src/services/badgeEvaluationService.ts`, line 288:

```typescript
// BEFORE (line 284-291):
    case 'focus_sessions': {
      const minMinutes = condition.min_minutes || 0;
      const { count } = await supabase
        .from('life_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'focus_session')
        .gte('metadata->duration_minutes', minMinutes);

// AFTER:
    case 'focus_sessions': {
      const minMinutes = condition.min_minutes || 0;
      const { count } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('moment_type', 'focus_session')
        .gte('metadata->duration_minutes', minMinutes);
```

**Step 5: Fix `add_xp` RPC call → use addXP import**

In `src/services/badgeEvaluationService.ts`, add import and replace RPC call:

Add at top of file (after existing imports):
```typescript
import { addXP } from '@/services/gamificationService';
```

Then replace lines 410-413:
```typescript
// BEFORE:
    if (badge.xp_reward > 0) {
      await supabase.rpc('add_xp', {
        p_user_id: userId,
        p_xp_amount: badge.xp_reward,
      });
    }

// AFTER:
    if (badge.xp_reward > 0) {
      await addXP(userId, badge.xp_reward);
    }
```

**Step 6: Run typecheck to verify fixes**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/services/badgeEvaluationService.ts
git commit -m "fix(gamification): fix badge evaluation table references

- tasks → work_items (correct table name)
- life_events → moments (correct table name)
- supabase.rpc('add_xp') → gamificationService.addXP() (RPC doesn't exist)
- Fix column references: event_type → moment_type, status → completed_at

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Add pg_cron schedule for HP Decay (Gap 2)

**Context:** Edge Function `calculate-entity-decay` is fully implemented (413 LOC). It handles habitat, person, and organization decay. What's missing is the cron scheduling. The project already uses pg_cron extensively (20+ migrations with cron schedules).

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_liferpg_decay_cron.sql`

**Step 1: Check existing cron pattern**

Read `supabase/migrations/20260213040000_openclaw_cron_schedules.sql` for the established pattern of calling Edge Functions via pg_cron + pg_net.

**Step 2: Create migration**

Create `supabase/migrations/YYYYMMDDHHMMSS_liferpg_decay_cron.sql` with timestamp of creation time:

```sql
-- ============================================================================
-- LifeRPG: Weekly HP Decay Cron Job
-- Issue: #518 (Gap 2)
-- Requires: pg_cron, pg_net
-- ============================================================================

-- Schedule weekly HP decay calculation (every Sunday at 03:00 UTC)
SELECT cron.schedule(
  'liferpg-entity-decay',
  '0 3 * * 0',  -- Every Sunday at 03:00 UTC
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/calculate-entity-decay',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMENT ON COLUMN cron.job.jobname IS 'liferpg-entity-decay: Weekly HP and stat decay for entity personas. Runs Sunday 03:00 UTC.';
```

**Note:** The exact vault access pattern may differ from the project's existing approach. The implementer MUST read an existing cron migration first (e.g., `20260213040000_openclaw_cron_schedules.sql`) and match the exact pattern used there for calling Edge Functions.

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(liferpg): add pg_cron schedule for weekly HP decay

Schedules calculate-entity-decay Edge Function to run every Sunday at 03:00 UTC.
Uses existing pg_cron + pg_net pattern from openclaw cron schedules.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Wire weekly bonus CP trigger (Gap 7)

**Context:** `consciousnessPointsService.checkWeeklyBonus()` is fully implemented but NEVER called anywhere. It checks if user was active 5+ days this week and awards 25 CP bonus.

**Two options for trigger:**
- **Option A (recommended):** Call on dashboard load (once per session) in `useConsciousnessPoints` hook
- **Option B:** Add pg_cron job (weekly)

Going with Option A since it's simpler and doesn't require a migration.

**Files:**
- Modify: `src/hooks/useConsciousnessPoints.ts`

**Step 1: Add weekly bonus check to the hook**

In `src/hooks/useConsciousnessPoints.ts`, modify the `fetchData` callback to also check weekly bonus:

```typescript
// Inside fetchData callback, after fetching balance and history:
// Check weekly bonus (runs once per session load)
try {
  await consciousnessPointsService.checkWeeklyBonus(user.id);
} catch {
  // Non-critical, don't block UI
}
```

Specifically, add after line 116 (after the history fetch block, before the catch):

```typescript
      // Check weekly bonus (silent, non-blocking)
      try {
        await consciousnessPointsService.checkWeeklyBonus(user.id);
      } catch {
        // Weekly bonus check is non-critical
      }
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useConsciousnessPoints.ts
git commit -m "feat(gamification): wire weekly bonus CP trigger on dashboard load

checkWeeklyBonus() was implemented but never called.
Now triggers on useConsciousnessPoints hook mount (once per session).
Awards 25 CP if user was active 5+ days this week.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Verify Health Score → CP flow (Gap 5)

**Context:** The flow exists: `healthScoreService.recordRelationshipCare()` → `consciousnessPointsService.awardRelationshipCareCP()` → `awardCP('relationship_care')` → inserts into `cp_transactions`. The `contact_health_history` table also exists (migration `20260121000000`).

**Files:**
- None modified (verification only, unless bugs found)

**Step 1: Trace the full flow**

Verify these files connect properly:
1. `src/services/healthScoreService.ts:191` calls `consciousnessPointsService.awardRelationshipCareCP()`
2. `src/services/consciousnessPointsService.ts:241-255` calls `awardCP(userId, 'relationship_care', ...)`
3. `awardCP` (line 72-235) inserts into `cp_transactions` and updates `user_stats.consciousness_points`

**Step 2: Verify the badge condition for health_score_improved**

In `badgeEvaluationService.ts:268-281`, the `health_score_improved` condition queries `contact_health_history` with `.gt('score_delta', 0)`. Verify:
- `contact_health_history` table exists (confirmed: migration `20260121000000`)
- Column `score_delta` exists in that table

**Step 3: Check if `score_delta` column exists**

Read migration `supabase/migrations/20260121000000_contact_health_history.sql` and verify `score_delta` column.

**Step 4: If any issue found, fix and commit**

If `score_delta` column doesn't exist or the query needs fixing, make the necessary changes and commit.

---

### Task 6: Add Black Hat badges UI toggle (Gap 6)

**Context:** Backend is complete — `badgeEvaluationService.toggleBlackHatBadges(userId, enabled)` saves the preference to `user_stats.streak_trend.black_hat_enabled`. What's missing is a UI toggle.

The simplest approach: add a toggle within any existing gamification/badges UI component. Since this is a settings-type control, it should be placed in a badges panel or settings section.

**Files:**
- Modify: Whichever component displays badge information (search for badge-related UI components)
- The implementer should search: `grep -r "BadgeCategory\|badge.*catalog\|badge.*list" src/ --include="*.tsx"` to find the right component

**Step 1: Find the badges UI component**

Search for existing badge display components.

**Step 2: Add toggle**

Add a simple toggle switch with:
- Label: "Badges de Desafio (Black Hat)"
- Description: "Ativa badges que criam urgência. Desativado por padrão."
- State: Read from `user_stats.streak_trend.black_hat_enabled`
- Action: Call `badgeEvaluationService.toggleBlackHatBadges(userId, newValue)`

**Step 3: Typecheck and commit**

```bash
git commit -m "feat(gamification): add Black Hat badges toggle in UI

Adds opt-in toggle for Black Hat badges (urgency-based).
Disabled by default per RECIPE framework design.
Calls badgeEvaluationService.toggleBlackHatBadges() on toggle.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Verify CP transaction history (Gap 3)

**Context:** Table `cp_transactions` exists (migration `20260124000000`). `awardCP()` inserts transactions. `getCPHistory()` returns them. The hook `useConsciousnessPoints` has `includeHistory` option. Need to verify the full chain works.

**Files:**
- None modified (verification only)

**Step 1: Verify the chain**

1. `consciousnessPointsService.awardCP()` (line 167-169): Inserts into `cp_transactions` ✓
2. `consciousnessPointsService.getCPHistory()` (line 260-301): Reads from `cp_transactions` ✓
3. `useConsciousnessPoints` hook (line 111-116): Calls `getCPHistory` when `includeHistory: true` ✓

**Step 2: Verify `cp_transactions` migration has correct schema**

Read migration and confirm columns match the `CPTransaction` type:
- `id`, `user_id`, `amount`, `category`, `source`, `description`, `metadata`, `created_at`

**Step 3: If any discrepancy, fix and commit**

---

### Task 8: Verify leaderboard (Gap 8)

**Context:** Two leaderboard implementations exist:
1. `gamificationService.getLeaderboard()` — fetches all users into memory, sorts client-side
2. `consciousnessPointsService.getCPLeaderboard()` — same pattern
3. RPC `get_cp_leaderboard` exists in migration — server-side sort

**Files:**
- Potentially modify: `src/services/gamificationService.ts` (if optimization needed)

**Step 1: Verify the leaderboard query works**

Check that `getLeaderboard()` (line 1017-1044) references correct tables. It queries `user_stats` with join to `users` table. Verify `users` table/view exists.

**Step 2: Consider optimization**

If `user_stats` has a `users` foreign key, the join works. If not, the query will fail. The `get_cp_leaderboard` RPC is the safer path — it uses `profiles` table instead.

**Step 3: If join fails, switch to RPC**

Replace the in-memory sort with the database RPC for better performance:

```typescript
// Option: Use get_cp_leaderboard RPC instead of client-side sort
const { data } = await supabase.rpc('get_cp_leaderboard', { p_limit: limit });
```

**Step 4: Commit if changes made**

---

## Phase 3: Final Verification

### Task 9: Full build and typecheck

**Step 1: Run build**

Run: `npm run build`
Expected: SUCCESS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: SUCCESS

**Step 3: Run existing tests**

Run: `npm run test -- --run`
Expected: No regressions

---

## Phase 4: Update Issue and Create PR

### Task 10: Update issue #518 with results

**Step 1: Add comment to issue #518**

Update with:
- Which gaps were verified as already working
- Which gaps had bugs that were fixed
- Which gaps had missing features that were implemented
- Final status of each gap

**Step 2: Create PR**

```bash
git push -u origin feature/feat-liferpg-engine-gaps
gh pr create --title "feat(liferpg): complete engine gaps - verify and fix gamification system" --body "..."
```

---

## Task Dependencies

```
Task 1 (build audit) → Task 2, 3, 4, 5, 6, 7, 8 (all fixes)
Tasks 2-8 (independent, can be parallelized)
Tasks 2-8 → Task 9 (final verification)
Task 9 → Task 10 (PR)
```

## Agent Team Assignment

| Task | Owner | Rationale |
|------|-------|-----------|
| 1 (build) | Lead | Quick check, sets baseline |
| 2 (badge fix) | Implementer | Code changes needed |
| 3 (decay cron) | Implementer | Migration creation |
| 4 (weekly bonus) | Implementer | Hook modification |
| 5 (health→CP) | Auditor | Verification, maybe fix |
| 6 (black hat UI) | Implementer | Component creation |
| 7 (CP history) | Auditor | Verification only |
| 8 (leaderboard) | Auditor | Verification, maybe optimize |
| 9 (final check) | Reviewer | Full build + test |
| 10 (issue + PR) | Lead | Coordination |
