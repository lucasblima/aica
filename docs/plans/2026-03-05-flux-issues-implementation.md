# Flux Module — Unified Issues Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve 7 open Flux issues (#696, #699, #710, #706, #705, #698, #690) in 3 batches.

**Architecture:** 3 independent batches touching distinct files. Batch 1 = quick UI fixes (3 components). Batch 2 = logic corrections (2 components + 1 hook). Batch 3 = canvas layout redesign + discovery doc. Each batch produces one PR.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Ceramic Design System + Supabase

---

## Batch 1 — Quick Fixes (#696, #699, #710)

**Branch:** `fix/flux-batch1-quick-fixes`
**PR title:** `fix(flux): remove duplicate date, optional modalities, prescription button`

### Task 1: Remove duplicate date range from canvas grid header (#696)

**Files:**
- Modify: `src/modules/flux/components/canvas/WeeklyGrid.tsx:547-557`
- Modify: `src/modules/flux/components/canvas/CanvasEditorDrawer.tsx:337-342`

**Step 1: Remove date range from WeeklyGrid header**

In `WeeklyGrid.tsx`, replace lines 545-558 (the `<h2>` with inline date range) with just the week number:

```tsx
<h2 className="text-base font-bold text-ceramic-text-primary">
  Semana {weekNumber}
</h2>
```

Remove the entire `{startDate && (() => { ... })()}` block (lines 547-557).

**Step 2: Remove "Volume: XXX min" from WeeklyGrid header**

In `WeeklyGrid.tsx`, remove lines 563-565:

```tsx
// REMOVE these lines:
<span>
  Volume: <span className="font-bold text-ceramic-text-primary">{totalVolume} min</span>
</span>
```

Keep only the `{workouts.length} treino(s)` count.

**Step 3: Add highlight to active week tab in CanvasEditorDrawer**

In `CanvasEditorDrawer.tsx`, the active tab already has neumorphic shadow (line 331-332). Add a bottom border accent for stronger visual cue. Replace line 325:

```tsx
// FROM:
'bg-ceramic-base text-ceramic-text-primary'
// TO:
'bg-ceramic-base text-ceramic-text-primary border-b-2 border-amber-400'
```

**Step 4: Remove date range from week tabs**

In `CanvasEditorDrawer.tsx`, remove the date label from tabs. Replace lines 337-342:

```tsx
// FROM:
<span>Sem {week}</span>
{weekDateLabel && (
  <span className="ml-1.5 text-[10px] font-medium text-ceramic-text-secondary">
    {weekDateLabel}
  </span>
)}
// TO:
<span>Sem {week}</span>
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds with no new errors.

**Step 6: Commit**

```bash
git add src/modules/flux/components/canvas/WeeklyGrid.tsx src/modules/flux/components/canvas/CanvasEditorDrawer.tsx
git commit -m "fix(flux): remove duplicate date range and volume from canvas header (#696)"
```

---

### Task 2: Make modalities optional in Novo Atleta form (#699)

**Files:**
- Modify: `src/modules/flux/components/forms/AthleteFormDrawer.tsx:435`
- Modify: `src/modules/flux/hooks/useAthleteForm.ts:249-251,342-346`

**Step 1: Remove asterisk from section title**

In `AthleteFormDrawer.tsx`, line 435, change:

```tsx
// FROM:
2. Modalidades *
// TO:
2. Modalidades
```

**Step 2: Remove modality validation**

In `useAthleteForm.ts`, remove lines 249-251:

```typescript
// REMOVE:
if (!formData.modalityLevels || formData.modalityLevels.length === 0) {
  newErrors.modalityLevels = 'Selecione pelo menos uma modalidade';
}
```

**Step 3: Update isFormValid**

In `useAthleteForm.ts`, lines 342-346, remove the `modalityLevels.length > 0` check:

```typescript
// FROM:
const isFormValid =
  errorCount === 0 &&
  !!formData.name &&
  !!formData.phone &&
  formData.modalityLevels.length > 0;

// TO:
const isFormValid =
  errorCount === 0 &&
  !!formData.name &&
  !!formData.phone;
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/modules/flux/components/forms/AthleteFormDrawer.tsx src/modules/flux/hooks/useAthleteForm.ts
git commit -m "fix(flux): make modalities optional in athlete form (#699)"
```

---

### Task 3: Add prescription button to AthleteCard (#710)

**Files:**
- Modify: `src/modules/flux/components/AthleteCard.tsx:59-72,389-401`

**Step 1: Add onPrescreverClick prop**

In `AthleteCard.tsx`, add to the props interface (around line 59-72):

```typescript
onPrescreverClick?: () => void;
```

Destructure it in the component function parameters alongside `onWhatsAppClick`.

**Step 2: Add Prescrever button next to WhatsApp button**

After the WhatsApp button block (line 401), add:

```tsx
{onPrescreverClick && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onPrescreverClick();
    }}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
    title="Prescrever treino"
  >
    <Dumbbell className="w-4 h-4 text-amber-600" />
    <span className="text-xs font-bold text-amber-600">Prescrever</span>
  </button>
)}
```

Import `Dumbbell` from `lucide-react` at the top of the file (check if already imported).

**Step 3: Wire up in CRMCommandCenterView**

In `src/modules/flux/views/CRMCommandCenterView.tsx`, find where `AthleteCard` is rendered and add the prop:

```tsx
onPrescreverClick={() => navigate(`/flux/canvas/${athlete.id}`)}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/modules/flux/components/AthleteCard.tsx src/modules/flux/views/CRMCommandCenterView.tsx
git commit -m "feat(flux): add prescription button to athlete card in CRM (#710)"
```

---

### Task 4: Push Batch 1 and create PR

**Step 1: Build final check**

Run: `npm run build && npm run typecheck`

**Step 2: Push and create PR**

```bash
git push -u origin fix/flux-batch1-quick-fixes
gh pr create --title "fix(flux): quick fixes — date range, optional modalities, prescription button" --body "..."
```

Closes #696, #699, #710.

---

## Batch 2 — Logic Corrections (#706, #705)

**Branch:** `fix/flux-batch2-logic-fixes`
**PR title:** `fix(flux): remove modality colors from profile, investigate calendar sync`

### Task 5: Remove modality colors from Semana Atual (#706)

**Files:**
- Modify: `src/modules/flux/components/athlete/CurrentWeekList.tsx:60-73`

**Step 1: Replace getColors to always return neutral styling**

In `CurrentWeekList.tsx`, replace the `COLOR_MAP` (lines 60-67) and `getColors` (lines 71-73) with:

```typescript
const NEUTRAL_COLOR = {
  bg: 'bg-ceramic-cool',
  text: 'text-ceramic-text-primary',
  border: 'border-ceramic-border',
};

const DEFAULT_COLOR = {
  bg: 'bg-ceramic-cool/50',
  text: 'text-ceramic-text-secondary',
  border: 'border-ceramic-border/30',
};

function getColors(_hex: string) {
  return NEUTRAL_COLOR;
}
```

This makes all workout days use the same neutral ceramic styling regardless of modality.

**Step 2: Verify all exercises are shown**

The explore agent confirmed there is no exercise filtering (line 169-186 shows all exercises). No change needed — but verify by reading the component that the `.exercises` array is passed through unfiltered.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/modules/flux/components/athlete/CurrentWeekList.tsx
git commit -m "fix(flux): remove modality colors from Semana Atual in athlete profile (#706)"
```

---

### Task 6: Investigate and fix calendar sync (#705)

**Files:**
- Read: `src/modules/flux/hooks/useCanvasCalendar.ts`
- Read: `src/modules/flux/views/CanvasEditorView.tsx:232`

**Step 1: Investigate current state**

Read `CanvasEditorView.tsx` line 232 — confirm `busySlots` is still empty array.

The screenshot in #705 is from the canvas prescription view (`/flux/canvas/:athleteId`). But the explore agent found calendar was removed in #386. This means either:
- (a) The screenshot is from before #386 was deployed — issue is already fixed by the removal
- (b) Calendar was re-enabled in a later commit

Read the git log for `CanvasEditorView.tsx` to check:
```bash
git log --oneline --follow src/modules/flux/views/CanvasEditorView.tsx | head -10
```

**Step 2: If calendar is still empty (likely)**

Add a comment to issue #705 explaining:
```
Calendar integration in the canvas editor was removed in PR #386. The canvas no longer shows
any calendar events (busySlots is always empty). If you're still seeing calendar events,
please provide a fresh screenshot from the current production version.
```

Close #705 as resolved or request fresh reproduction.

**Step 3: If calendar was re-enabled**

Fix the user ID being passed. In `useCanvasCalendar.ts`:
- Coach calendar (line 99-110): Uses `useGoogleCalendarEvents` which uses the authenticated user — this is CORRECT
- Athlete calendar (line 126-208): Uses `athleteId` prop — this is CORRECT for showing athlete's busy slots

The bug would be in the DISPLAY layer confusing which events belong to which source. Check the `source` field mapping in the busySlots computation (lines 223-239).

**Step 4: Commit investigation results**

```bash
git commit -m "fix(flux): investigate calendar sync in canvas editor (#705)"
```

---

### Task 7: Push Batch 2 and create PR

```bash
git push -u origin fix/flux-batch2-logic-fixes
gh pr create --title "fix(flux): remove modality colors, investigate calendar sync" --body "..."
```

Closes #706. Updates #705 with investigation.

---

## Batch 3 — Canvas Redesign + Discovery (#698, #690)

**Branch:** `feat/flux-batch3-canvas-redesign`
**PR title:** `feat(flux): reorganize canvas layout + score methodology discovery`

### Task 8: Move filters from sidebar to toolbar (#698)

**Files:**
- Modify: `src/modules/flux/components/canvas/CanvasLibrarySidebar.tsx:152-210,310-353`
- Modify: `src/modules/flux/views/CanvasEditorView.tsx:541-568`
- Create: `src/modules/flux/components/canvas/CanvasFilterToolbar.tsx`

**Step 1: Create CanvasFilterToolbar component**

Create new component that renders modality tabs, zone filter, and volume filter in a horizontal compact layout. Extract the filter state and logic from `CanvasLibrarySidebar.tsx`.

```tsx
interface CanvasFilterToolbarProps {
  athleteModality?: string;
  libraryModality: string | null;
  setLibraryModality: (mod: string | null) => void;
  zoneFilter: string;
  setZoneFilter: (zone: string) => void;
  volumeFilter: string;
  setVolumeFilter: (vol: string) => void;
}
```

Layout: Single horizontal row with 3 groups separated by dividers:
- Modality pills (compact, same icons)
- Zone pills (Z1-Z5, smaller)
- Volume pills (<30, 30-60, >60, smaller)

**Step 2: Remove filters from CanvasLibrarySidebar**

Remove lines 152-210 (Zone + Volume filter sections) and lines 310-353 (Modality tabs) from `CanvasLibrarySidebar.tsx`. Keep only:
- Biblioteca header + search bar
- Template card list (scrollable)
- Footer with count + drag instruction

Increase sidebar width — change the outer container width from current value to `w-80` (320px).

**Step 3: Add toolbar to CanvasEditorView layout**

In `CanvasEditorView.tsx`, insert `CanvasFilterToolbar` between the header (`CanvasEditorDrawer`) and the 3-column layout. Pass filter state props.

```tsx
<CanvasEditorDrawer ... />
<CanvasFilterToolbar
  athleteModality={athlete?.modality}
  libraryModality={libraryModality}
  setLibraryModality={setLibraryModality}
  zoneFilter={zoneFilter}
  setZoneFilter={setZoneFilter}
  volumeFilter={volumeFilter}
  setVolumeFilter={setVolumeFilter}
/>
<div className="flex flex-1 overflow-hidden">
  ...
</div>
```

**Step 4: Lift filter state to CanvasEditorView**

The filter state (libraryModality, zoneFilter, volumeFilter) currently lives inside `CanvasLibrarySidebar`. Lift it to `CanvasEditorView` so both the toolbar and sidebar can access it. Pass as props to both components.

**Step 5: Verify drag-and-drop still works**

Ensure templates in sidebar are still draggable after the restructure. The drag handlers should be unaffected since they're on individual template cards.

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/modules/flux/components/canvas/CanvasFilterToolbar.tsx \
        src/modules/flux/components/canvas/CanvasLibrarySidebar.tsx \
        src/modules/flux/views/CanvasEditorView.tsx
git commit -m "feat(flux): move canvas filters to toolbar, widen sidebar (#698)"
```

---

### Task 9: Discovery — SCORE calculation methodology (#690)

**Files:**
- Create: `docs/plans/2026-03-05-flux-score-methodology.md`

**Step 1: Research sports science scoring models**

Research and document the following models:
- **TRIMP** (Training Impulse — Banister 1991): HR-based, time × intensity factor
- **TSS** (Training Stress Score — Coggan): Power-based for cycling (NP/FTP)^2 × duration
- **sRPE** (Session RPE): RPE × duration in minutes — simplest, works for all modalities
- **ATL/CTL/TSB**: Exponential moving averages of daily load (acute=7d, chronic=42d)
- **Readiness Score**: Combination of fatigue, sleep, stress, soreness

**Step 2: Map to current Flux data model**

The radar chart axes in Meu-Treino Feedback are:
- Volume adequado
- Intensidade adequada
- Alimentacao
- Cumpriu volume
- RPE/Intensidade
- Qualidade do sono

Document which data sources feed each axis:
- Feedback questionnaire (8 questions, 0-5 scale) — already collected via `WeeklyFeedbackCard`
- Workout slot data (planned vs completed)
- RPE from `completion_data.rpe_actual`

**Step 3: Propose implementation**

Recommend sRPE as primary load metric (works cross-modality, data already collected). Propose TSB model for fatigue/freshness tracking. Document API changes needed.

**Step 4: Save and commit**

```bash
git add docs/plans/2026-03-05-flux-score-methodology.md
git commit -m "docs(flux): score calculation methodology discovery (#690)"
```

---

### Task 10: Push Batch 3 and create PR

```bash
git push -u origin feat/flux-batch3-canvas-redesign
gh pr create --title "feat(flux): reorganize canvas layout + score methodology discovery" --body "..."
```

Closes #698, #690.

---

## Execution Order

```
Batch 1 (Tasks 1-4) ──┐
                       ├──> Batch 3 (Tasks 8-10) [depends on #696 grid header changes]
Batch 2 (Tasks 5-7) ──┘    Task 9 (#690) can run in parallel with Task 8 (#698)
```

## Verification

After all 3 PRs are merged:
- [ ] `npm run build` passes on main
- [ ] All 7 issues closed on GitHub
- [ ] Deploy to staging and verify visually
- [ ] Deploy to production after staging validation
