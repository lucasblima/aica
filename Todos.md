# Refactoring Task List - Protocol "Solo-Dev"

## Overview
This document organizes all refactoring tasks from `plano_refatoracao.md` into executable units optimized for parallel execution by specialist agents.

**Critical Rules:**
- Always create disposable branches for each phase
- Project MUST compile without errors before any commit (`npm run build` or `tsc`)
- If something breaks and takes >1h to fix, `git reset --hard` and rethink strategy

---

## Phase 0: Iron Laws (Prerequisites)
**Agent:** DevOps / Git Specialist
**Parallelizable:** No - Must be done first
**Priority:** Critical
**Dependencies:** None

- [ ] **Task 0.1:** Create disposable branches for each phase
  - `refach/auth-swap` (for Phase A)
  - `refach/purge-legacy` (for Phase B)
  - `refach/architecture` (for Phase C)
- [ ] **Task 0.2:** Verify current build status (`npm run build` and `tsc`)
- [ ] **Task 0.3:** Document rollback strategy and test `git reset --hard` capability

---

## Phase A: Surgical Authentication (High Stakes)
**Agent:** Frontend-Architect / Auth Specialist
**Parallelizable:** Tasks A.1, A.2, and A.3 are sequential
**Priority:** Critical
**Dependencies:** Phase 0 must be complete
**Branch:** `refach/auth-swap`

### A.1 - Audit & Safety Net
**Complexity:** Medium
**Estimated Time:** 2-3 hours

- [ ] **Task A.1.1:** Create `src/components/debug/TestAuth.tsx`
  - Validate `useAuth` hook functionality
  - Test `isAuthenticated` state
  - Test `user` object
  - Verify state reflects real Supabase state
- [ ] **Task A.1.2:** Temporarily add TestAuth component to `App.tsx`
- [ ] **Task A.1.3:** Run manual testing of auth flows
- [ ] **Task A.1.4:** Document current auth behavior baseline

### A.2 - Authentication Swap
**Complexity:** High
**Estimated Time:** 4-6 hours
**Dependencies:** Task A.1 must be complete

- [ ] **Task A.2.1:** In `AppContent` (App.tsx), remove `useEffect` monitoring auth (lines 156-220)
- [ ] **Task A.2.2:** Replace local states with `useAuth()` destructuring:
  - Replace `isAuthenticated` state
  - Replace `userId` state
  - Replace `userEmail` state
- [ ] **Task A.2.3:** Validate redirect flow to `/landing` remains intact
- [ ] **Task A.2.4:** Test all auth-dependent routes and components
- [ ] **Task A.2.5:** Run `npm run build` to verify no compilation errors

### A.3 - Cleanup
**Complexity:** Low
**Estimated Time:** 1 hour
**Dependencies:** Task A.2 must be complete

- [ ] **Task A.3.1:** Remove unused imports in `App.tsx` (direct `supabase` client, etc.)
- [ ] **Task A.3.2:** Remove TestAuth component from `App.tsx`
- [ ] **Task A.3.3:** Remove `src/components/debug/TestAuth.tsx` file
- [ ] **Task A.3.4:** Final build verification
- [ ] **Task A.3.5:** Commit changes to `refach/auth-swap` branch

---

## Phase B: The Great Purge (Legacy Cleanup)
**Agent:** Code-Archaeologist / Cleanup Specialist
**Parallelizable:** Tasks B.1 and B.2 can run in parallel, B.3 must be sequential after
**Priority:** High
**Dependencies:** Phase A must be complete
**Branch:** `refach/purge-legacy`

### B.1 - Atlas Module Removal
**Complexity:** High
**Estimated Time:** 3-4 hours
**Parallelizable with:** B.2

- [ ] **Task B.1.1:** Audit all Atlas dependencies
  - Search for all imports from `src/modules/atlas`
  - Document all files using Atlas components
- [ ] **Task B.1.2:** Clean `AgendaView.tsx`
  - Remove imports: `useAtlasTasks`, `TaskCreationInput`, `TaskList`, `ProjectList`
  - Remove `useMemo` for `mergedMatrixTasks`
  - Remove all `AtlasTask` references
- [ ] **Task B.1.3:** Clean `grantTaskSync.ts`
  - Deactivate or remove functions interacting with Atlas
  - Ensure `grants` module doesn't break during sync attempts
- [ ] **Task B.1.4:** Verify build after Atlas cleanup
- [ ] **Task B.1.5:** Run tests to ensure no hidden dependencies

### B.2 - Podcast Module Removal
**Complexity:** Medium
**Estimated Time:** 2-3 hours
**Parallelizable with:** B.1

- [ ] **Task B.2.1:** Audit all Podcast dependencies
  - Search for all imports from `src/modules/podcast`
  - Document all files using Podcast components
- [ ] **Task B.2.2:** Clean `App.tsx` lazy loading
  - Remove `PodcastCopilotView` from lazy imports
  - Remove `GuestApprovalPage` from lazy imports
- [ ] **Task B.2.3:** Clean Routes in `App.tsx`
  - Remove `/podcast` route
  - Remove `/guest-approval` route
- [ ] **Task B.2.4:** Clean `src/views/PodcastCopilotView.tsx` references
- [ ] **Task B.2.5:** Verify build after Podcast cleanup
- [ ] **Task B.2.6:** Run tests to ensure no hidden dependencies

### B.3 - Quarantine (Move to Deprecated)
**Complexity:** Low
**Estimated Time:** 1 hour
**Dependencies:** Tasks B.1 and B.2 must be complete

- [ ] **Task B.3.1:** Create `src/_deprecated/` directory
- [ ] **Task B.3.2:** Move `src/modules/podcast` to `src/_deprecated/podcast`
- [ ] **Task B.3.3:** Move `src/modules/atlas` to `src/_deprecated/atlas`
- [ ] **Task B.3.4:** Run final build to verify no hidden imports
- [ ] **Task B.3.5:** Run full test suite
- [ ] **Task B.3.6:** Update `.gitignore` if needed to exclude deprecated folder from certain checks
- [ ] **Task B.3.7:** Commit changes to `refach/purge-legacy` branch

---

## Phase C: Architectural Restructuring
**Agent:** Frontend-Architect / Structure Specialist
**Parallelizable:** Tasks C.1 and C.2 can run in parallel, C.3 must be sequential after
**Priority:** Medium
**Dependencies:** Phase B must be complete
**Branch:** `refach/architecture`

### C.1 - Router Extraction
**Complexity:** Medium
**Estimated Time:** 2-3 hours
**Parallelizable with:** C.2

- [ ] **Task C.1.1:** Create `src/routes/` directory
- [ ] **Task C.1.2:** Create `src/routes/AppRouter.tsx`
- [ ] **Task C.1.3:** Extract all `<Routes>` structure from `App.tsx`
- [ ] **Task C.1.4:** Move route definitions to `AppRouter.tsx`
- [ ] **Task C.1.5:** Import and use `AppRouter` in `App.tsx`
- [ ] **Task C.1.6:** Verify all routes still work correctly
- [ ] **Task C.1.7:** Test navigation flows
- [ ] **Task C.1.8:** Run build verification

### C.2 - Provider Consolidation
**Complexity:** Medium
**Estimated Time:** 2-3 hours
**Parallelizable with:** C.1

- [ ] **Task C.2.1:** Create `src/providers/` directory
- [ ] **Task C.2.2:** Create `src/providers/AppProviders.tsx`
- [ ] **Task C.2.3:** Identify all providers currently in `App.tsx`:
  - `NavigationProvider`
  - `StudioProvider`
  - Any other context providers
- [ ] **Task C.2.4:** Encapsulate all providers in `AppProviders.tsx`
- [ ] **Task C.2.5:** Export single `AppProviders` component
- [ ] **Task C.2.6:** Test provider functionality
- [ ] **Task C.2.7:** Run build verification

### C.3 - App.tsx Minimization
**Complexity:** Low
**Estimated Time:** 1-2 hours
**Dependencies:** Tasks C.1 and C.2 must be complete

- [ ] **Task C.3.1:** Import `AppProviders` from `src/providers/AppProviders.tsx`
- [ ] **Task C.3.2:** Import `AppRouter` from `src/routes/AppRouter.tsx`
- [ ] **Task C.3.3:** Reduce `App.tsx` to ~20 lines of orchestration
- [ ] **Task C.3.4:** Verify final structure:
  ```tsx
  // App.tsx should only orchestrate Providers + Router
  <AppProviders>
    <AppRouter />
  </AppProviders>
  ```
- [ ] **Task C.3.5:** Remove all unused imports from `App.tsx`
- [ ] **Task C.3.6:** Add comments for clarity
- [ ] **Task C.3.7:** Run final build verification
- [ ] **Task C.3.8:** Run full test suite
- [ ] **Task C.3.9:** Commit changes to `refach/architecture` branch

---

## Phase D: Integration & Validation
**Agent:** QA / Integration Specialist
**Parallelizable:** No - Must be done after all phases
**Priority:** Critical
**Dependencies:** Phases A, B, and C must be complete

- [ ] **Task D.1:** Merge `refach/auth-swap` into integration branch
- [ ] **Task D.2:** Merge `refach/purge-legacy` into integration branch
- [ ] **Task D.3:** Merge `refach/architecture` into integration branch
- [ ] **Task D.4:** Resolve any merge conflicts
- [ ] **Task D.5:** Run full build (`npm run build` and `tsc`)
- [ ] **Task D.6:** Run full test suite
- [ ] **Task D.7:** Manual testing of all critical paths:
  - Authentication flow
  - All remaining routes
  - Navigation
  - User session management
- [ ] **Task D.8:** Performance testing
- [ ] **Task D.9:** Document changes in CHANGELOG or migration guide
- [ ] **Task D.10:** Create PR to main branch
- [ ] **Task D.11:** Code review
- [ ] **Task D.12:** Merge to main after approval

---

## Risk Assessment & Monitoring

### Critical Risks Identified
1. **App.tsx (684 lines):** Manages session, routing, and global state in coupled way
2. **Toxic Legacy:**
   - `src/modules/podcast`: Referenced in `App.tsx` and `src/views/PodcastCopilotView.tsx`
   - `src/modules/atlas`: Coupled to `AgendaView.tsx` and `grantTaskSync.ts`
3. **Technical Debt:** Direct Supabase imports in UI components (difficult to test in isolation)

### Monitoring Checklist
- [ ] Track build status after each major task
- [ ] Monitor test coverage changes
- [ ] Track bundle size changes
- [ ] Document any new issues discovered during refactoring

---

## Parallel Execution Strategy

### Wave 1 (After Phase 0)
**Can run in parallel:** NO
- Phase A (Auth) must complete first due to criticality

### Wave 2 (After Phase A)
**Can run in parallel:** YES
- Task B.1 (Atlas Removal) - Agent: code-archaeologist-1
- Task B.2 (Podcast Removal) - Agent: code-archaeologist-2

### Wave 3 (After Wave 2, B.3 complete)
**Can run in parallel:** YES
- Task C.1 (Router Extraction) - Agent: frontend-architect-1
- Task C.2 (Provider Consolidation) - Agent: frontend-architect-2

### Wave 4 (After Wave 3)
**Can run in parallel:** NO
- Task C.3 (App.tsx Minimization) - Sequential
- Phase D (Integration) - Sequential

---

## Agent Assignment Recommendations

### Phase A
- **Primary:** frontend-architect or auth-specialist
- **Backup:** senior-frontend-dev
- **Skills needed:** React hooks, Supabase auth, state management

### Phase B
- **Primary:** code-archaeologist or cleanup-specialist
- **Can split:** B.1 and B.2 to different agents
- **Skills needed:** Dependency analysis, import tracing, build systems

### Phase C
- **Primary:** frontend-architect or structure-specialist
- **Can split:** C.1 and C.2 to different agents
- **Skills needed:** React architecture, routing, context/providers

### Phase D
- **Primary:** qa-specialist or integration-lead
- **Skills needed:** Testing, integration, git workflow, code review

---

## Success Criteria

### Per Phase
- [ ] Build passes without errors
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No runtime errors in development
- [ ] All critical user flows work

### Overall Success
- [ ] `App.tsx` reduced from 684 lines to ~20 lines
- [ ] Legacy modules (`podcast`, `atlas`) moved to `_deprecated`
- [ ] Authentication uses `useAuth` hook consistently
- [ ] Routing extracted to `AppRouter.tsx`
- [ ] Providers consolidated in `AppProviders.tsx`
- [ ] No direct Supabase imports in UI components (where possible)
- [ ] Codebase more maintainable and testable

---

## Emergency Rollback Procedures

If any phase takes >1 hour to fix:
1. Stop immediately
2. Run `git status` to assess changes
3. Run `git reset --hard` to rollback
4. Document what went wrong
5. Reassess strategy before retrying
6. Consider breaking task into smaller pieces

---

## Notes

- This refactoring follows a **safety-first** approach
- Each phase has clear boundaries and rollback points
- Parallelization opportunities are clearly marked
- Dependencies are explicitly noted
- All tasks are actionable and verifiable
- Build verification is mandatory at multiple checkpoints
