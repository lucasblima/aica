# Studio Refactoring - Phase 3 & 4 Execution Plan

**Created:** 2025-12-18
**Status:** READY FOR EXECUTION
**Previous Phases:** Phase 1 (Context) and Phase 2 (Views) COMPLETE

---

## Executive Summary

This document outlines the parallel execution strategy for completing the Podcast to Studio refactoring. Six tasks remain, which have been analyzed for dependencies and organized into execution tracks for optimal parallel processing.

---

## Current State Analysis

### Completed Artifacts (Phases 1 & 2)

| File | Path | Status |
|------|------|--------|
| StudioContext.tsx | `src/modules/studio/context/StudioContext.tsx` | COMPLETE |
| StudioMainView.tsx | `src/modules/studio/views/StudioMainView.tsx` | COMPLETE |
| StudioLibrary.tsx | `src/modules/studio/views/StudioLibrary.tsx` | COMPLETE |
| StudioWizard.tsx | `src/modules/studio/views/StudioWizard.tsx` | COMPLETE |
| StudioWorkspace.tsx | `src/modules/studio/views/StudioWorkspace.tsx` | COMPLETE |
| studio.ts (types) | `src/modules/studio/types/studio.ts` | COMPLETE |

### Existing 4 Stages (Verified Present)

| Stage | Path | Status |
|-------|------|--------|
| SetupStage | `src/modules/podcast/components/stages/SetupStage.tsx` | EXISTS |
| ResearchStage | `src/modules/podcast/components/stages/ResearchStage.tsx` | EXISTS |
| PautaStage | `src/modules/podcast/components/stages/PautaStage.tsx` | EXISTS |
| ProductionStage | `src/modules/podcast/components/stages/ProductionStage.tsx` | EXISTS |

### Current Routing Architecture

The application uses a **hybrid routing system**:
- **React Router** for URL-based routes (`/connections/*`, `/guest-approval/*`, etc.)
- **ViewState** for internal view navigation (`vida`, `agenda`, `studio`, `podcast`, etc.)

Key file: `App.tsx` (root)
- Line 26: Lazy loads `PodcastCopilotView`
- Line 82: ViewState type includes both `'studio'` and `'podcast'`
- Lines 454-461: `renderStudio()` renders `PodcastCopilotView`

---

## Dependency Analysis

```
Task 7 (Routes) ────┬───> Task 9 (E2E Tests)
                    │
                    └───> Task 10 (Regression Tests)

Task 8 (Stages) ────────> INDEPENDENT (can verify anytime)

Task 11 (Deprecate) ────> INDEPENDENT (safe after routes work)

Task 12 (Build) ────────> MUST BE LAST (validates everything)
```

### Critical Dependencies

1. **Task 7 MUST complete before Task 9 & 10** - Tests require updated routes
2. **Task 8 can run in parallel** - Verification only, no modifications
3. **Task 11 can run after Task 7** - Deprecation after routes confirmed
4. **Task 12 MUST be last** - Final validation gate

---

## Execution Tracks

### Track A: Infrastructure (SEQUENTIAL - FIRST)

**Agent:** General Purpose (Frontend Architect)
**Duration:** ~30 minutes
**Priority:** CRITICAL

#### Task 7: Update Routes in App.tsx

**Objective:** Migrate from `PodcastCopilotView` to `StudioMainView` for `/studio` route

**Files to Modify:**
- `App.tsx` (root)
- `types.ts` (if needed)

**Changes Required:**

1. **Update lazy import (Line 26):**
```typescript
// BEFORE
const PodcastCopilotView = lazy(() => import('./src/views/PodcastCopilotView').then(m => ({ default: m.PodcastCopilotView })));

// AFTER
const StudioMainView = lazy(() => import('./src/modules/studio/views/StudioMainView'));
```

2. **Update StudioProvider wrapper (add to App.tsx):**
```typescript
import { StudioProvider } from './src/modules/studio/context/StudioContext';
```

3. **Update renderStudio function (Lines 454-461):**
```typescript
// BEFORE
const renderStudio = () => (
   <PodcastCopilotView
      userEmail={userEmail || undefined}
      onLogout={() => setIsAuthenticated(false)}
      onExit={() => setCurrentView('vida')}
      onNavVisibilityChange={setShowPodcastNav}
   />
);

// AFTER
const renderStudio = () => (
   <StudioProvider>
      <StudioMainView />
   </StudioProvider>
);
```

4. **Handle ViewState 'podcast' to 'studio' transition:**
- In `types.ts` line 82, keep both `'studio'` and `'podcast'` for backward compatibility
- In `src/pages/Home.tsx` line 369, verify `onNavigateToView('podcast')` maps correctly

**Acceptance Criteria:**
- [ ] App compiles with 0 TypeScript errors
- [ ] Navigation to Studio from Home works
- [ ] StudioLibrary renders on `/studio` route
- [ ] StudioProvider wraps the entire Studio module

---

#### Task 11: Deprecate PodcastCopilotView.tsx

**Objective:** Add deprecation notice without removing functionality (fallback safety)

**File:** `src/views/PodcastCopilotView.tsx`

**Changes Required:**

Add deprecation header at top of file (after imports):
```typescript
/**
 * @deprecated This component is DEPRECATED as of 2025-12-18
 *
 * MIGRATION STATUS: Replaced by StudioMainView
 * NEW LOCATION: src/modules/studio/views/StudioMainView.tsx
 *
 * This file is kept for reference and potential rollback.
 * DO NOT USE for new features.
 *
 * Migration Guide:
 * - StudioContext replaces internal useState for mode management
 * - StudioLibrary replaces PodcastLibrary
 * - StudioWizard replaces GuestIdentificationWizard integration
 * - StudioWorkspace routes to PodcastWorkspace
 *
 * The 4 stages (Setup, Research, Pauta, Production) remain in:
 * src/modules/podcast/components/stages/
 *
 * @see docs/architecture/STUDIO_REFACTORING_PLAN.md
 */
```

**Acceptance Criteria:**
- [ ] Clear deprecation notice added
- [ ] Migration path documented inline
- [ ] File NOT deleted (kept for rollback)
- [ ] No functional changes to the component

---

### Track B: Verification (INDEPENDENT - CAN RUN ANYTIME)

**Agent:** Podcast Copilot Agent
**Duration:** ~20 minutes
**Priority:** MEDIUM

#### Task 8: Verify 4 Stages Preservation

**Objective:** Ensure all 4 stages are properly integrated and accessible

**Files to Verify:**
1. `src/modules/podcast/components/stages/SetupStage.tsx`
2. `src/modules/podcast/components/stages/ResearchStage.tsx`
3. `src/modules/podcast/components/stages/PautaStage.tsx`
4. `src/modules/podcast/components/stages/ProductionStage.tsx`

**Verification Checklist:**

- [ ] **SetupStage** - Guest identification and show selection
  - Uses `usePodcastWorkspace()` context hook
  - Calls `searchGuestProfile` service
  - Transitions to ResearchStage

- [ ] **ResearchStage** - AI-powered guest research
  - Uses `usePodcastWorkspace()` context hook
  - Displays dossier information
  - Transitions to PautaStage

- [ ] **PautaStage** - Pauta/outline building
  - Uses `usePodcastWorkspace()` context hook
  - Topic management functionality
  - Transitions to ProductionStage

- [ ] **ProductionStage** - Recording mode
  - Uses `usePodcastWorkspace()` context hook
  - Timer and recording controls
  - Teleprompter integration

**Integration Points to Verify:**

1. `PodcastWorkspace` (called from `StudioWorkspace`) correctly renders stages
2. Stage transitions work via context actions
3. Data persists between stage transitions

**Acceptance Criteria:**
- [ ] All 4 stages import correctly
- [ ] Context hooks work in each stage
- [ ] Stage transitions are possible
- [ ] No broken imports or type errors

---

### Track C: Quality Assurance (AFTER Track A)

**Agent:** Testing & QA Agent
**Duration:** ~1 hour
**Priority:** HIGH

#### Task 9: Create E2E Tests for Studio

**Objective:** Write Playwright tests for critical Studio flows

**New Test File:** `tests/e2e/studio.spec.ts`

**Test Scenarios:**

```typescript
test.describe('Studio Module - E2E', () => {

  test('Test 1: Navigate to Studio from Home', async ({ page }) => {
    // Navigate to home
    // Click Studio card
    // Verify StudioLibrary renders
  });

  test('Test 2: Open existing project from library', async ({ page }) => {
    // Navigate to Studio
    // Click on a project card
    // Verify StudioWorkspace renders
    // Verify correct stage is shown
  });

  test('Test 3: Create new project via wizard', async ({ page }) => {
    // Navigate to Studio
    // Click "New Project" button
    // Complete wizard steps
    // Verify project created and workspace opens
  });

  test('Test 4: Stage navigation within workspace', async ({ page }) => {
    // Open a project
    // Navigate through stages
    // Verify each stage renders
  });

  test('Test 5: Back navigation from workspace to library', async ({ page }) => {
    // Open a project
    // Click back button
    // Verify return to StudioLibrary
  });

  test('Test 6: Race condition protection', async ({ page }) => {
    // Rapid navigation between views
    // Verify no state corruption
    // Verify no redirect loops
  });

});
```

**Critical Race Condition Tests:**

Based on previous issues in `PodcastCopilotView`, test for:
1. Rapid mode switching
2. Auth state changes during navigation
3. Multiple concurrent state updates
4. Browser back/forward button handling

**Acceptance Criteria:**
- [ ] All 6+ test scenarios pass
- [ ] No flaky tests (run 3x to verify stability)
- [ ] Race condition scenarios covered

---

#### Task 10: Workspace Regression Tests

**Objective:** Verify existing PodcastWorkspace functionality still works

**Test File to Update:** `tests/e2e/podcast-full-workflow.spec.ts`

**Verification Points:**

1. **Stage Flow:**
   - Setup -> Research -> Pauta -> Production
   - Each transition works correctly

2. **Data Persistence:**
   - Guest data persists across stages
   - Dossier information available in Production

3. **Teleprompter Integration:**
   - Opens correctly
   - Receives topic data

4. **Recording Flow:**
   - Timer starts/stops
   - Duration captured

**Acceptance Criteria:**
- [ ] All existing podcast tests pass
- [ ] No regression in functionality
- [ ] Data flows correctly through stages

---

### Track D: Final Validation (MUST BE LAST)

**Agent:** General Purpose (Build Engineer)
**Duration:** ~10 minutes
**Priority:** GATE

#### Task 12: Validate Build and TypeScript

**Objective:** Final verification that everything compiles and works

**Commands to Execute:**

```bash
# Clean build
npm run build

# TypeScript check
npx tsc --noEmit

# Lint check
npm run lint

# Test suite
npm run test
```

**Verification Checklist:**

- [ ] `npm run build` exits with code 0
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run lint` shows no critical errors
- [ ] All E2E tests pass

**Rollback Plan:**

If build fails:
1. Revert `App.tsx` changes
2. Keep `PodcastCopilotView` as primary route
3. Debug Studio module in isolation

---

## Execution Schedule

```
TIME      | TRACK A (Infra)    | TRACK B (Verify)   | TRACK C (QA)       | TRACK D (Final)
----------|--------------------|--------------------|--------------------|-----------------
T+0       | Task 7 START       | -                  | -                  | -
T+15      | Task 7 in progress | Task 8 START       | -                  | -
T+30      | Task 7 COMPLETE    | Task 8 in progress | -                  | -
T+35      | Task 11 START      | Task 8 COMPLETE    | -                  | -
T+45      | Task 11 COMPLETE   | -                  | Task 9 START       | -
T+60      | -                  | -                  | Task 9 in progress | -
T+90      | -                  | -                  | Task 9 COMPLETE    | -
T+95      | -                  | -                  | Task 10 START      | -
T+120     | -                  | -                  | Task 10 COMPLETE   | -
T+125     | -                  | -                  | -                  | Task 12 START
T+135     | -                  | -                  | -                  | Task 12 COMPLETE
```

**Total Estimated Time:** ~2.5 hours

---

## Agent Prompts

### Prompt for Track A Agent (General Purpose - Frontend)

```
You are implementing Task 7 and Task 11 of the Studio refactoring.

CONTEXT:
- StudioMainView is ready at src/modules/studio/views/StudioMainView.tsx
- StudioContext is ready at src/modules/studio/context/StudioContext.tsx
- Current routing uses PodcastCopilotView for 'studio' ViewState

TASK 7: Update App.tsx routes
1. Replace PodcastCopilotView lazy import with StudioMainView
2. Import StudioProvider from context
3. Wrap StudioMainView with StudioProvider in renderStudio()
4. Verify ViewState compatibility

TASK 11: Deprecate PodcastCopilotView
1. Add deprecation header comment
2. Document migration path
3. DO NOT delete the file

ACCEPTANCE:
- 0 TypeScript errors
- Studio navigation works from Home
- StudioLibrary renders correctly
```

### Prompt for Track B Agent (Podcast Copilot)

```
You are verifying Task 8 - Stage preservation.

CONTEXT:
- 4 stages exist in src/modules/podcast/components/stages/
- They use usePodcastWorkspace() hook from PodcastWorkspaceContext
- StudioWorkspace routes to PodcastWorkspace

TASK 8: Verify 4 Stages
1. Check each stage file exists and imports correctly
2. Verify usePodcastWorkspace() hook usage
3. Confirm stage transitions work
4. Document any issues found

DELIVERABLE:
- Verification report with pass/fail for each stage
- List of any issues or concerns
```

### Prompt for Track C Agent (Testing & QA)

```
You are implementing Tasks 9 and 10 - E2E and regression testing.

CONTEXT:
- Studio module replaces PodcastCopilotView
- Existing podcast tests are in tests/e2e/podcast-*.spec.ts
- Race conditions were a previous concern

TASK 9: Create Studio E2E tests
1. Create tests/e2e/studio.spec.ts
2. Cover navigation, project creation, stage flow
3. Include race condition protection tests

TASK 10: Run regression tests
1. Execute existing podcast test suite
2. Verify no functionality regression
3. Document any failures

ACCEPTANCE:
- All new tests pass
- All existing tests pass
- No flaky tests (verify with 3 runs)
```

---

## Risk Mitigation

### Known Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Route change breaks navigation | Medium | High | Keep PodcastCopilotView as fallback |
| Stage context mismatch | Low | Medium | Verify stages use correct context |
| Test flakiness | Medium | Low | Run tests multiple times |
| Build failure | Low | High | Incremental changes with checkpoints |

### Rollback Procedure

If critical issues arise:

1. **Immediate Rollback:**
   ```bash
   git checkout HEAD -- App.tsx
   git checkout HEAD -- types.ts
   ```

2. **Partial Rollback:**
   - Keep Studio module files
   - Revert only App.tsx routing
   - Debug in isolation

3. **Full Rollback:**
   ```bash
   git stash
   git checkout main
   ```

---

## Success Criteria

Phase 3 & 4 are COMPLETE when:

- [ ] Task 7: Routes updated and working
- [ ] Task 8: All 4 stages verified functional
- [ ] Task 9: E2E tests created and passing
- [ ] Task 10: Regression tests passing
- [ ] Task 11: PodcastCopilotView deprecated
- [ ] Task 12: Build passes with 0 errors

---

## Next Steps After Completion

1. **Documentation Update:**
   - Update CLAUDE.md with new module structure
   - Add Studio module to README

2. **Cleanup (Future Sprint):**
   - Remove deprecated PodcastCopilotView
   - Clean up ViewState type (remove 'podcast')
   - Consolidate duplicate types

3. **Enhancement (Future Sprint):**
   - Add Video project type to Studio
   - Add Article project type to Studio
   - Implement cross-project analytics
