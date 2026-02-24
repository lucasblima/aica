# Flux Sprint: 8 Issues — 4 Cycles + Liberar Treino + Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 8 Flux issues: expand microcycles from 3→4 weeks, add "Liberar Treino" button, fix modality edits, add avatar, fix labels, fix feedback filtering, verify volume, fix workbox precache.

**Architecture:** DB migration first (constraints + columns), then frontend changes grouped by area (coach canvas vs athlete portal). The migration is the critical dependency — all frontend changes build on the 4-week structure.

**Tech Stack:** Supabase (PostgreSQL migration), React + TypeScript + Tailwind, vite-plugin-pwa (workbox)

---

## Issue Map

| Task | Issue | Area | Files |
|------|-------|------|-------|
| 1 | #380 | DB | Migration: 3→4 weeks |
| 2 | #380 | Canvas | MicrocycleGrid + types: 3→4 weeks |
| 3 | #381 | Canvas | "Liberar Treino" button |
| 4 | #384 | Coach | Fix modality update on athlete edit |
| 5 | #382 | Canvas | Avatar from Google auth |
| 6 | #379 | Portal | Fix labels on /meu-treino |
| 7 | #385 | Portal | Feedback exercises filter by cycle |
| 8 | #383 | Portal | Verify volume calculation |
| 9 | #378 | Infra | Workbox dontCacheBustURLsMatching |

---

## Task 1: DB Migration — 3→4 Weeks (#380)

**Files:**
- Create: `supabase/migrations/20260224200000_microcycles_4_weeks.sql`

**What changes:**
1. ALTER `microcycles` — drop 3-week duration constraint, add `week_4_focus` column
2. ALTER `workout_slots` — expand `week_number` CHECK from `1-3` to `1-4`
3. ALTER `scheduled_workouts` — expand `week_number` CHECK from `1-3` to `1-4`
4. ALTER `athlete_feedback_entries` — expand `week_number` CHECK from `1-3` to `1-4`
5. UPDATE `get_my_athlete_profile()` RPC — change `LEAST(3, ...)` to `LEAST(4, ...)`

**SQL:**

```sql
-- ============================================================================
-- Microcycles: 3 → 4 weeks
-- ============================================================================

-- 1. Drop the 3-week duration constraint
ALTER TABLE public.microcycles
  DROP CONSTRAINT IF EXISTS microcycle_duration;

-- 2. Add new 4-week duration constraint (28 days = 0-27 inclusive)
ALTER TABLE public.microcycles
  ADD CONSTRAINT microcycle_duration CHECK (end_date - start_date = 27);

-- 3. Add week_4_focus column
ALTER TABLE public.microcycles
  ADD COLUMN IF NOT EXISTS week_4_focus TEXT NOT NULL DEFAULT 'recovery'
    CHECK (week_4_focus IN ('volume', 'intensity', 'recovery', 'test'));

-- 4. Expand workout_slots week_number from 1-3 to 1-4
ALTER TABLE public.workout_slots
  DROP CONSTRAINT IF EXISTS workout_slots_week_number_check;

ALTER TABLE public.workout_slots
  ADD CONSTRAINT workout_slots_week_number_check CHECK (week_number BETWEEN 1 AND 4);

-- 5. Expand scheduled_workouts week_number from 1-3 to 1-4
ALTER TABLE public.scheduled_workouts
  DROP CONSTRAINT IF EXISTS scheduled_workouts_week_number_check;

ALTER TABLE public.scheduled_workouts
  ADD CONSTRAINT scheduled_workouts_week_number_check CHECK (week_number BETWEEN 1 AND 4);

-- 6. Expand athlete_feedback_entries week_number from 1-3 to 1-4
ALTER TABLE public.athlete_feedback_entries
  DROP CONSTRAINT IF EXISTS athlete_feedback_entries_week_number_check;

ALTER TABLE public.athlete_feedback_entries
  ADD CONSTRAINT athlete_feedback_entries_week_number_check CHECK (week_number BETWEEN 1 AND 4);

-- 7. Update get_my_athlete_profile() RPC — LEAST(3) → LEAST(4)
CREATE OR REPLACE FUNCTION public.get_my_athlete_profile()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'athlete_id', a.id,
    'athlete_name', a.name,
    'coach_name', COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = a.user_id),
      'Coach'
    ),
    'modality', a.modality,
    'level', a.level,
    'status', a.status,
    'active_microcycle', (
      SELECT json_build_object(
        'id', m.id,
        'name', m.name,
        'status', m.status,
        'start_date', m.start_date,
        'week_1_focus', m.week_1_focus,
        'week_2_focus', m.week_2_focus,
        'week_3_focus', m.week_3_focus,
        'week_4_focus', m.week_4_focus,
        'current_week', GREATEST(1, LEAST(4,
          EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM m.start_date) + 1
        )),
        'total_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id),
        'completed_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id AND ws.is_completed = true),
        'slots', (
          SELECT json_agg(
            json_build_object(
              'id', ws.id,
              'day_of_week', ws.day_of_week,
              'week_number', ws.week_number,
              'is_completed', ws.is_completed,
              'completed_at', ws.completed_at,
              'template', json_build_object(
                'id', wt.id,
                'name', wt.name,
                'category', wt.category,
                'duration', wt.duration,
                'intensity', wt.intensity
              )
            )
            ORDER BY ws.week_number, ws.day_of_week
          )
          FROM public.workout_slots ws
          JOIN public.workout_templates wt ON wt.id = ws.template_id
          WHERE ws.microcycle_id = m.id
        )
      )
      FROM public.microcycles m
      WHERE m.athlete_id = a.id
        AND m.status IN ('active', 'draft')
      ORDER BY m.created_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM public.athletes a
  WHERE a.auth_user_id = auth.uid()
  LIMIT 1;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Verify:** `npx supabase db push` then confirm RPC exists and week_4_focus column exists.

**Commit:** `fix(flux): migration 3→4 weeks for microcycles (#380)`

---

## Task 2: Frontend Types + Canvas Grid — 3→4 Weeks (#380)

**Files:**
- Modify: `src/modules/flux/types/flow.ts:134-136` — add `week_4_focus`
- Modify: `src/modules/flux/types/flow.ts:163-165` — add `week_4_focus` to CreateMicrocycleInput
- Modify: `src/modules/flux/components/canvas/MicrocycleGrid.tsx:409` — `[1,2,3]` → `[1,2,3,4]`
- Modify: `src/modules/flux/components/canvas/MicrocycleGrid.tsx:1-2` — update doc comment

**Changes:**

### flow.ts — Microcycle interface (line ~136)
Add after `week_3_focus`:
```typescript
week_4_focus: MicrocycleWeekFocus;
```

### flow.ts — CreateMicrocycleInput (line ~165)
Add after `week_3_focus`:
```typescript
week_4_focus: MicrocycleWeekFocus;
```

### MicrocycleGrid.tsx (line 409)
```tsx
// Before:
{[1, 2, 3].map((weekNum) => (
// After:
{[1, 2, 3, 4].map((weekNum) => (
```

### MicrocycleGrid.tsx doc comment (line 2)
```
// Before:
 * MicrocycleGrid - 3-week overview component for the Flux Canvas
// After:
 * MicrocycleGrid - 4-week overview component for the Flux Canvas
```

**Commit:** `fix(flux): expand canvas grid and types to 4 weeks (#380)`

---

## Task 3: "Liberar Treino" Button (#381)

**Files:**
- Modify: `src/modules/flux/views/CanvasEditorView.tsx` — add release button
- Modify: `src/modules/flux/services/microcycleService.ts` (or athleteService) — add `releaseMicrocycle()` method

**Design:**
- In the canvas header area, when microcycle `status === 'draft'`, show a prominent button: "Liberar Treino"
- Clicking it calls `microcycleService.updateStatus(id, 'active')`
- On success, toast "Treino liberado com sucesso!" and refresh
- When `status === 'active'`, show a badge "Liberado" instead

**Implementation needs exploring:** Find `CanvasEditorView` header area and the service that updates microcycle status.

**Commit:** `feat(flux): add "Liberar Treino" button for coach (#381)`

---

## Task 4: Fix Modality Update on Athlete Edit (#384)

**Files:**
- Modify: `src/modules/flux/hooks/useAthleteForm.ts:110-112` — load ALL modalities from `athlete_profiles`, not just primary

**Root Cause:** When editing, line 110-112 only loads the single `modality` field:
```typescript
modalityLevels: initialData.modality
  ? [{ modality: initialData.modality, level: 'iniciante' }]
  : [],
```

This ignores any additional modalities saved in `athlete_profiles` table. The `loadProfiles` effect (line 138) does load from `athlete_profiles` but check if it properly updates `formData.modalityLevels`.

**Fix:** Ensure `loadProfiles` correctly populates `modalityLevels` with ALL modalities from `athlete_profiles`, including their levels. The `syncProfilesForAthlete` call in `handleSaveAthlete` (FluxDashboard.tsx:368) should already save them — the issue is the LOADING side, not saving.

**Commit:** `fix(flux): load all modalities when editing athlete (#384)`

---

## Task 5: Avatar from Google Auth (#382)

**Files:**
- Modify: `src/modules/flux/views/AthleteDetailView.tsx:312-315` — use avatar_url if available
- Modify: RPC or query to include avatar_url from `auth.users.raw_user_meta_data->>'avatar_url'`

**Design:**
- If athlete has `auth_user_id`, fetch avatar from Google OAuth metadata
- Show as `<img>` with fallback to `<User />` icon
- The `get_my_athlete_profile` RPC can include avatar, OR the coach-side athlete list can join to `auth.users`

**Simplest approach:** Add `avatar_url` to the athletes table (populated by trigger from auth.users metadata when linked), then use it in AthleteDetailView.

**Commit:** `feat(flux): show athlete Google avatar in canvas (#382)`

---

## Task 6: Fix Labels on /meu-treino (#379)

**Files:**
- Modify: `src/modules/flux/views/AthletePortalView.tsx:331` — change "treinos" label
- Modify: `src/modules/flux/components/athlete/ProgressTimeline.tsx:150-165` — adjust dots/labels

**User wants:**
1. Blue dot text should say "Treinos" (already says "{completedSlots}/{totalSlots}")
2. Red dot = only prescribed modalities (not all)
3. Dash line = "TREINOS CUMPRIDOS"

**Changes:** Update the labels and ensure modality display only shows what the coach prescribed, not all available modalities.

**Commit:** `fix(flux): update labels on /meu-treino page (#379)`

---

## Task 7: Feedback Filter by Cycle (#385)

**Files:**
- Modify: `src/modules/flux/components/athlete/WeeklyFeedbackCard.tsx` — verify exercises filter
- Modify: `src/modules/flux/components/athlete/FeedbackTimeline.tsx` — filter by selectedWeek

**Issue:** Feedback (blue section) should show only exercises from the selected week/cycle, not all exercises.

**Check:** `WeeklyFeedbackCard` already receives `weekNumber={selectedWeek}`. Verify the query inside the component filters by `week_number` correctly.

**Commit:** `fix(flux): filter feedback exercises by selected cycle (#385)`

---

## Task 8: Verify Volume Calculation (#383)

**Files:**
- Read: `src/modules/flux/views/AthletePortalView.tsx:249`

**Current formula:** `completionPct = Math.round((micro.completed_slots / Math.max(micro.total_slots, 1)) * 100)`

This counts SLOTS (workouts) not actual training volume (duration/distance). Confirm with user if this is correct or if they want volume based on duration.

**Action:** Investigate + report findings. May not need code changes if the formula is correct.

---

## Task 9: Workbox Precache Fix (#378)

**Files:**
- Modify: `vite.config.ts:84-102` — add `dontCacheBustURLsMatching`

**Change:**
```typescript
workbox: {
  // ... existing config
  dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,  // ADD THIS
  globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
  // ... rest
}
```

This tells Workbox that files with content hashes in their names (Vite's `[hash]` pattern) don't need additional cache-busting, preventing 404s when hashes change between deploys.

**Commit:** `fix(infra): add dontCacheBustURLsMatching to workbox config (#378)`

---

## Execution Order (Dependencies)

```
Task 1 (DB migration) ──→ Task 2 (types + grid)
                       ──→ Task 3 (liberar treino)
                       ──→ Task 7 (feedback filter)

Task 4 (modality edit) — independent
Task 5 (avatar)        — independent
Task 6 (labels)        — independent
Task 8 (volume verify) — independent (read-only)
Task 9 (workbox)       — independent
```

**Parallel groups:**
- **Group 1 (sequential):** Task 1 → Task 2 → Task 3 → Task 7
- **Group 2 (parallel):** Task 4, Task 5, Task 6, Task 9
- **Group 3 (read-only):** Task 8
