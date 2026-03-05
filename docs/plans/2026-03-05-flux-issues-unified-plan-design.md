# Flux Module — Unified Issue Resolution Design

**Date:** 2026-03-05
**Session:** fix-flux-unified-issues
**Issues:** #696, #699, #710, #706, #705, #698, #690

## Overview

7 open issues affecting the Flux module, grouped into 3 execution batches by file affinity and complexity. Each batch produces one PR.

## Batch 1 — Quick Fixes (#696, #699, #710)

**Estimated effort:** ~30min | **Risk:** Low | **Files:** 4 independent components

### #696 — Remove duplicate date range in canvas header

- **File:** `src/modules/flux/components/canvas/CanvasGridContainer.tsx`
- **Problem:** "Semana 1 15/02 - 21/02" appears both in the week tabs AND in the grid header
- **Fix:** Remove the date range from the grid header line (`Semana 1 15/02 - 21/02`). Keep only "Semana 1" with week number. Add visual highlight (emboss shadow or underline) to the active week tab to make selection clearer.

### #699 — Make modalities optional in Novo Atleta form

- **Files:** `src/modules/flux/components/forms/AthleteFormDrawer.tsx`, `src/modules/flux/hooks/useAthleteForm.ts`
- **Problem:** Section "2. Modalidades *" is required — coaches sometimes need to create athletes before deciding modality
- **Fix:** Remove asterisk from section title. Remove validation that requires at least one modality+level pair in `useAthleteForm`. Keep the UI for selecting modalities but allow empty submission. Update `isFormValid` to only require name + phone.

### #710 — Add prescription button to athlete card in CRM

- **File:** `src/modules/flux/components/AthleteCard.tsx`
- **Problem:** No direct way to go from athlete card to prescription canvas — coach has to navigate through athlete detail first
- **Fix:** Add a small "Prescrever" icon button (Dumbbell or PenTool icon) to the AthleteCard. On click, navigate to `/flux/canvas/${athlete.id}`. Position: bottom row next to existing WhatsApp button.

## Batch 2 — Logic Corrections (#706, #705)

**Estimated effort:** ~1h | **Risk:** Medium | **Files:** 3-4 components + 1 hook

### #706 — Remove modality colors from Semana Atual in athlete profile

- **File:** `src/modules/flux/components/athlete/CurrentWeekList.tsx`, `src/modules/flux/views/AthleteDetailView.tsx`
- **Problem:** Current week shows colored pills per modality (green=Corrida, blue=Natacao). Coach wants neutral styling and ALL exercises listed.
- **Fix:** Remove color mapping from `getColors()` — use neutral ceramic styling for all days. Ensure exercise list shows ALL exercises for the week (verify no filtering is happening). Keep day labels (SEG, TER, etc.) and workout names but with uniform ceramic-cool background.

### #705 — Calendar sync showing wrong user's agenda

- **Files:** `src/modules/flux/hooks/useCanvasCalendar.ts`, `src/modules/flux/views/CanvasEditorView.tsx`
- **Problem:** Canvas prescription view shows the athlete's calendar events instead of the coach's. Coach (Lucas) sees Marcelo Nissenbaum's agenda.
- **Investigation needed:** The explore agent found that canvas editor has calendar integration REMOVED (#386) — `busySlots` is always empty array. But the screenshot shows events. Need to verify:
  1. Was calendar re-enabled after #386?
  2. Is the screenshot from AthletePortalView canvas mode (where calendar IS active)?
  3. If canvas editor does show events, check `useCanvasCalendar` — is it passing the coach's userId or the athlete's athleteId?
- **Likely fix:** In `useCanvasCalendar`, ensure the "coach calendar" fetches events for `auth.uid()` (the logged-in coach), not the athlete being prescribed. The athlete's calendar should show as "busy slots" only.

## Batch 3 — Canvas Redesign + Discovery (#698, #690)

**Estimated effort:** ~2-3h | **Risk:** Medium-High (#698), Zero (#690)

### #698 — Reorganize canvas prescription layout (follow screenshot annotations)

- **Files:** `src/modules/flux/components/canvas/CanvasLibrarySidebar.tsx`, `src/modules/flux/views/CanvasEditorView.tsx`, `src/modules/flux/components/canvas/CanvasGridContainer.tsx`
- **Problem:** Sidebar has too many filter sections taking space from template cards. Screenshot annotations show:
  - RED circle around sidebar filters (Modalidade, Zona, Volume) — these should MOVE to the grid header area
  - RED circle around week tabs (Sem 1, Sem 2...) — these should stay but without date ranges
  - BLUE circle around "Volume: 286 min" — REMOVE this
  - Arrow pointing up-right — filters move from sidebar to header/toolbar
- **Design:**
  1. **Sidebar (left):** Only template cards + search bar. Increase width from current to ~320px. Remove Modalidade tabs, Zona de Treino filter, Volume filter from here.
  2. **New Toolbar (above grid):** Add horizontal filter bar with: Modality pills, Zone pills (Z1-Z5), Volume pills (<30, 30-60, >60). Compact, single row.
  3. **Grid header:** Remove "Volume: XXX min" from the right side of "Semana X" header. Keep "X treino(s)" count.
  4. Ensure drag-and-drop still works (templates dragged from sidebar to grid).

### #690 — Discovery: SCORE calculation methodology

- **Output:** New doc `docs/plans/2026-03-05-flux-score-methodology.md`
- **Problem:** The radar chart in Meu-Treino Feedback tab shows "Visao Geral" with axes (Volume adequado, Intensidade, Alimentacao, etc.) but the scoring methodology is unknown/arbitrary.
- **Research scope:**
  - TRIMP (Training Impulse) — Banister model
  - TSS (Training Stress Score) — Coggan model for cycling
  - ATL/CTL/TSB (Acute/Chronic Training Load and Training Stress Balance)
  - RPE-based load calculations (session RPE x duration)
  - How to adapt these for multi-sport (triathlon, swimming, running, cycling, strength)
- **Deliverable:** Document with proposed calculation methodology, data sources needed, and implementation roadmap.

## Execution Strategy

### Agent Team Composition

```
Lead: Coordinator — orchestrates batches, reviews, creates PRs
Teammate 1: Quick Fixer — Batch 1 (#696, #699, #710)
Teammate 2: Logic Fixer — Batch 2 (#706, #705)
Teammate 3: Canvas Redesigner — Batch 3 #698
Teammate 4: Researcher — Batch 3 #690 (discovery doc)
```

All 4 teammates work in parallel (no file overlap).

### PR Strategy

- **PR 1:** `fix(flux): quick fixes — date range, optional modalities, prescription button`
- **PR 2:** `fix(flux): remove modality colors from profile, fix calendar sync`
- **PR 3:** `feat(flux): reorganize canvas layout + score methodology discovery`

### Verification Checklist

- [ ] `npm run build` passes after each batch
- [ ] `npm run typecheck` passes after each batch
- [ ] No regressions in existing Flux functionality
- [ ] Screenshots of before/after for UI changes
- [ ] Design doc committed

## Dependencies

- Batch 1 and Batch 2 are independent — can run in parallel
- Batch 3 depends on Batch 1 (#696 removes date from grid header, #698 also modifies grid header) — run after Batch 1
- #690 discovery has no code dependencies — can run anytime
