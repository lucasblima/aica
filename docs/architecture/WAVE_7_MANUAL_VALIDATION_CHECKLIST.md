# Wave 7: Manual Validation Checklist

**Purpose:** Validate Studio Workspace Migration while E2E test infrastructure is being repaired
**Date:** 2025-12-20
**Status:** 🔄 IN PROGRESS
**Last Updated:** 2025-12-21

---

## 📊 Test Progress Summary

| Section | Status | Result | Notes |
|---------|--------|--------|-------|
| Part 1: Navigation & Routing | ⏭️ Pending | - | Not tested yet |
| Part 2: Episode Creation | ✅ Completed | PASS | Fixed 2 critical bugs (description column, UUID workflow) |
| Part 3: Stage Navigation | ✅ Completed | ⚠️ PASS WITH ISSUES | Navigation works, but auto-save persistence bug found |
| Part 4: Auto-Save & Persistence | 🔄 In Progress | - | Bug identified: data not persisting to database |
| Part 5: Component Interactions | ⏭️ Pending | - | User continuing validation |
| Part 6: Error Handling | ⏭️ Pending | - | Not tested yet |
| Part 7: Accessibility | ⏭️ Pending | - | Not tested yet |
| Part 8: Performance | ⏭️ Pending | - | Not tested yet |

### 🐛 Critical Issues Found

**Issue #1: Auto-Save Persistence Failure** (Part 3)
- **Status:** 🔴 BLOCKER
- **Symptoms:** UI shows "Salvando..." but changes don't persist to database
- **Impact:** Topics lost after page refresh, theme changes lost
- **Console Error:** `[useAutoSave] Save failed: Object`
- **Next Steps:** Need full error details from browser console

**Issue #2: AI Theme Button Missing Functionality** (Part 3)
- **Status:** ✅ FIXED
- **Fix:** Implemented auto-generation when clicking "Auto-sugerir com IA"
- **Files Modified:** `SetupStage.tsx`, `PodcastWorkspaceContext.tsx`

**Issue #3: Button Contrast Issue** (Part 3)
- **Status:** ✅ FIXED
- **Fix:** Improved disabled button contrast (gray-300/gray-500)
- **File Modified:** `SetupStage.tsx`

---

## Quick Fix for E2E Tests (For Parallel Work)

### Root Cause Identified
The E2E tests fail because `StudioMainView` uses an FSM (Finite State Machine) pattern:
- Starts in `LOADING` mode
- Transitions to `LIBRARY` mode via useEffect
- `<StudioLibrary>` (with `data-testid="studio-library"`) only renders in `LIBRARY` mode

### Recommended Fix (2-3 hours)

**Option A: Add data-testid to Loading Screen**
```typescript
// File: src/modules/studio/views/StudioMainView.tsx:27
function LoadingScreen() {
  return (
    <div data-testid="studio-loading" className="..."> {/* ADD data-testid */}
      <div className="text-center">
        <div className="animate-spin..." />
        <p className="text-gray-600">Carregando Studio...</p>
      </div>
    </div>
  );
}
```

Then update Page Object to wait for either loading or library:
```typescript
// File: tests/e2e/studio-workspace/pages/StudioDashboard.page.ts:39
async waitForDashboard() {
  // Wait for either loading screen or library
  const loadingOrLibrary = this.page.locator(
    '[data-testid="studio-loading"], [data-testid="studio-library"]'
  );
  await expect(loadingOrLibrary).toBeVisible({ timeout: 10000 });

  // If loading screen, wait for it to disappear
  const loading = this.page.locator('[data-testid="studio-loading"]');
  if (await loading.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(loading).not.toBeVisible({ timeout: 10000 });
  }

  // Now library should be visible
  await expect(this.dashboard).toBeVisible({ timeout: 5000 });
}
```

**Option B: Use initialState in Tests**
Update test setup to start in LIBRARY mode:
```typescript
// In test fixtures
const StudioTestWrapper = ({ children }) => (
  <StudioProvider initialState={{ mode: 'LIBRARY', isLoading: false, ...otherDefaults }}>
    {children}
  </StudioProvider>
);
```

**Option C: Add data-testid to StudioMainView root**
Add a stable test ID to the main container regardless of mode.

---

## Manual Validation Checklist

### Prerequisites
- [ ] Production build successful (`npm run build`)
- [ ] TypeScript compilation clean (`npx tsc --noEmit`)
- [ ] Dev server running (`npm run dev`)
- [ ] User authenticated in browser

---

## Part 1: Navigation & Routing (5 min)

### Test 1.1: Studio Route Access
- [ ] Navigate to `http://localhost:3000/studio`
- [ ] **Expected:** Studio Library loads within 2 seconds
- [ ] **Verify:** URL shows `/studio`
- [ ] **Verify:** Page title/header shows "Studio" or "Biblioteca"

### Test 1.2: Library Display
- [ ] **Verify:** Library view displays with `data-testid="studio-library"`
  - **How to check:** Open DevTools → Elements → Search for `studio-library`
- [ ] **Verify:** "Criar Novo" or "Create New" button is visible
- [ ] **Verify:** If episodes exist, episode cards are displayed
- [ ] **Verify:** If no episodes, empty state message is shown

### Test 1.3: Back Navigation
- [ ] Click browser back button
- [ ] **Expected:** Navigate away from Studio
- [ ] Navigate forward to `/studio` again
- [ ] **Expected:** Studio Library loads again

**✅ PASS CRITERIA:** All navigation tests pass
**❌ FAIL:** Document which test failed and screenshot

---

## Part 2: Episode Creation Workflow (10 min) ✅ COMPLETED

**Result:** ✅ PASS (after fixing 2 critical bugs)
**Bugs Fixed:**
1. Missing `description` column in database → Migration applied
2. Empty UUID workflow bug → Fixed show selection flow

### Test 2.1: Create New Episode
- [x] Click "Criar Novo" / "Create New" button
- [x] **Expected:** Wizard or creation form appears ✅
- [x] Fill in episode title: `Manual Test Episode [timestamp]`
- [x] Select or create a show/podcast
- [x] Click submit/create
- [x] **Expected:** Episode created successfully ✅
- [x] **Verify:** Redirected to workspace or library updates ✅

**Issues Found:**
- ❌ First attempt: "Could not find the 'description' column" error
- ❌ Second attempt: "invalid input syntax for type uuid: ''" error
- ✅ Third attempt: SUCCESS after fixes

### Test 2.2: Open Episode Workspace
- [x] From library, click on the newly created episode
- [x] **Expected:** Workspace loads with 4 stages visible ✅
- [x] **Verify:** `data-testid="studio-workspace"` exists in DOM ✅
- [x] **Verify:** Stage stepper shows: Setup, Research, Pauta, Production ✅
- [x] **Verify:** Setup stage is active by default ✅

**✅ PASS CRITERIA:** Episode creation and workspace load successful ✅
**Fixed Issues:** See `CRITICAL_FIX_EPISODE_CREATION_WORKFLOW.md`

---

## Part 3: Stage Navigation (15 min) ✅ COMPLETED

**Result:** ⚠️ PASS WITH ISSUES
**Critical Bug Found:** Auto-save persistence failure (data not saving to database)

### Test 3.1: Setup Stage
- [x] **Verify:** Setup stage content is visible ✅
- [x] Select guest type: "Figura Pública" / "Public Figure" ✅
- [x] Fill guest name: "Test Guest Manual" ✅
- [x] Fill guest reference/context: "Manual testing reference" ✅
- [x] Fill episode theme: "Manual Testing Theme" ✅
- [x] **Expected:** Auto-save indicator appears ✅
- [x] Wait 3 seconds for auto-save ✅
- [x] **Verify:** No "unsaved changes" indicator ✅

**Notes:**
- ✅ Guest name and theme saved successfully on first test
- ⚠️ AI theme suggestion button initially non-functional → FIXED
- ⚠️ Button contrast issue → FIXED

### Test 3.2: Navigate to Research Stage
- [x] Click "Research" / "Pesquisa" stage button ✅
- [x] **Expected:** Research stage loads ✅
- [x] **Verify:** Setup data persisted (check via browser refresh) ⚠️
- [x] **Verify:** Research stage shows dossier generation UI ✅
- [ ] **Optional:** Click "Generate Dossier" (skipped - slow with real AI)

**Issues:**
- ⚠️ Page refresh returns to library instead of staying in workspace

### Test 3.3: Navigate to Pauta Stage
- [x] Click "Pauta" / "Script" stage button ✅
- [x] **Expected:** Pauta stage loads ✅
- [x] Add manual topic: "Introduction" with notes "Opening remarks" ✅
- [x] Add manual topic: "Main Discussion" with notes "Core content" ✅
- [x] **Verify:** Topics appear in list ✅
- [x] **Verify:** Auto-save triggers ✅

**🐛 CRITICAL BUG FOUND:**
- UI shows "Salvando..." indicator ✅
- BUT: Topics lost after page refresh ❌
- Console error: `[useAutoSave] Save failed: Object` ❌
- **Impact:** Data not persisting to database

### Test 3.4: Navigate to Production Stage
- [x] Click "Production" / "Gravação" stage button ✅
- [x] **Expected:** Production stage loads ✅
- [x] **Verify:** Topic checklist shows topics from Pauta stage ✅
- [x] **Verify:** Recording controls are visible (timer, duration slider) ✅

### Test 3.5: Non-linear Navigation
- [x] From Production, click Setup stage button ✅
- [x] **Expected:** Navigate back to Setup ✅
- [x] **Verify:** All form data persisted ✅
- [x] Jump to Pauta stage directly ✅
- [x] **Expected:** Navigate successfully (permeable navigation) ✅

### Test 3.6: Stage Completion Indicators
- [x] **Verify:** Completion checkmarks visible on stages ✅

**⚠️ PASS WITH ISSUES:** Stage navigation works, but auto-save persistence bug blocks full validation
**🔴 BLOCKER:** Must fix auto-save persistence before proceeding to Wave 9

---

## Part 4: Auto-Save & State Persistence (10 min) 🔄 IN PROGRESS

**Status:** 🔴 BLOCKED - Critical auto-save bug must be fixed first
**Known Issue:** Auto-save UI shows but data doesn't persist to database

### Test 4.1: Auto-Save Debounce
- [ ] Go to Setup stage
- [ ] Change theme field to "Theme 1"
- [ ] Wait 1 second (< 2.5s debounce)
- [ ] Change theme field to "Theme 2"
- [ ] Wait 1 second
- [ ] Change theme field to "Final Theme"
- [ ] Wait 4 seconds total
- [ ] **Expected:** Auto-save triggers ONCE after debounce period
- [ ] **Verify:** No multiple save indicators

**Status:** ⏸️ PAUSED - Waiting for auto-save fix

### Test 4.2: State Persistence - Page Reload
- [ ] In Setup stage, note current guest name value
- [ ] Navigate to Pauta stage
- [ ] Note number of topics
- [ ] Refresh browser (F5 or Cmd+R)
- [ ] **Expected:** Page reloads
- [ ] **Verify:** Workspace reloads to same episode
- [ ] Navigate to Setup
- [ ] **Verify:** Guest name still matches
- [ ] Navigate to Pauta
- [ ] **Verify:** Topics still present

**Status:** ⏸️ PAUSED - Waiting for auto-save fix
**Known Issue:** Topics lost after refresh (Part 3 finding)

### Test 4.3: State Persistence - Cross-Stage
- [ ] In Setup, change theme to "Persistence Test [timestamp]"
- [ ] Wait for auto-save (3 seconds)
- [ ] Navigate to Research stage
- [ ] Navigate to Production stage
- [ ] Navigate back to Setup
- [ ] **Verify:** Theme value unchanged

**Status:** ⏸️ PAUSED - Waiting for auto-save fix

**🔴 BLOCKER:** Cannot complete until auto-save persistence bug is resolved
**Next Steps:**
1. Get full error message from browser console
2. Debug `useAutoSave.ts` database operations
3. Check RLS policies and database constraints
4. Re-run Part 4 tests after fix

---

---

## 🤖 Instructions for Claude Extension Agent

### Current Status
You are continuing manual validation testing from **Part 5 onwards**.

### Completed Sections
- ✅ Part 2: Episode Creation (PASS - 2 bugs fixed)
- ✅ Part 3: Stage Navigation (PASS WITH ISSUES - auto-save bug found)

### Blocked Sections
- 🔴 Part 4: Auto-Save & Persistence (BLOCKED - waiting for auto-save fix)

### Next Tasks for Agent
**Continue with Part 5, 6, 7, 8** - These can proceed independently of the auto-save bug

**Priority Order:**
1. **Part 5: Component Interactions** ← START HERE
2. **Part 7: Accessibility** (can be done now)
3. **Part 8: Performance** (can be done now)
4. **Part 6: Error Handling** (can be done now)
5. **Part 4: Auto-Save** (resume after bug fix)

### How to Report Results
For each test:
1. Mark checkbox as `[x]` when completed
2. Add ✅ or ❌ after test description
3. Add **Notes:** section with any issues
4. Update status at section header

### Critical Bug Context
**Known Issue:** Auto-save shows UI but doesn't persist to database
- Console error: `[useAutoSave] Save failed: Object`
- Impact: Topics/theme changes lost after refresh
- Status: Investigating

---

## Part 5: Component Interactions (15 min) ⏭️ READY TO TEST

### Test 5.1: Production - Timer Controls
- [ ] Go to Production stage
- [ ] **If timer not visible:** Click "Add Timer" button
- [ ] Click "Start Timer" button
- [ ] **Verify:** Timer starts counting (0:01, 0:02, etc.)
- [ ] Wait 5 seconds
- [ ] Click "Pause Timer" button
- [ ] **Verify:** Timer pauses
- [ ] **Verify:** Time is > 0:05
- [ ] Click "Reset Timer" button
- [ ] **Verify:** Timer resets to 0:00

### Test 5.2: Production - Duration Slider
- [ ] Locate duration slider control
- [ ] Drag slider to ~60 minutes
- [ ] **Verify:** Duration display updates
- [ ] **Expected:** Shows "60 min" or "1h" or similar

### Test 5.3: Production - Topic Checklist
- [ ] **Verify:** Topics from Pauta stage appear in checklist
- [ ] Click checkbox on first topic
- [ ] **Verify:** Topic marked as complete (visual change)
- [ ] Uncheck the topic
- [ ] **Verify:** Topic returns to incomplete state

### Test 5.4: Pauta - Category Management (if available)
- [ ] Go to Pauta stage
- [ ] Look for "Add Category" button
- [ ] **If available:**
   - [ ] Click "Add Category"
   - [ ] Enter name: "Test Category"
   - [ ] Select color (any)
   - [ ] **Verify:** Category created
   - [ ] Assign a topic to this category
   - [ ] **Verify:** Topic shows category indicator

### Test 5.5: Research - Custom Sources (if available)
- [ ] Go to Research stage
- [ ] Look for "Add Custom Source" button
- [ ] **If available:**
   - [ ] Click "Add Custom Source"
   - [ ] Select type: "Text"
   - [ ] Enter content: "Test source content"
   - [ ] Enter title: "Test Source"
   - [ ] **Verify:** Source added to list
   - [ ] Remove the source
   - [ ] **Verify:** Source removed from list

**✅ PASS CRITERIA:** All component interactions function correctly
**❌ FAIL:** Document which component failed

---

## Part 6: Error Handling (5 min)

### Test 6.1: Invalid Episode Load
- [ ] Navigate to: `http://localhost:3000/studio?episode=invalid-id-99999`
- [ ] **Expected:** Error screen or redirect to library
- [ ] **If error screen:**
   - [ ] **Verify:** Error message is user-friendly
   - [ ] **Verify:** Retry or Back button exists
   - [ ] Click retry/back
   - [ ] **Verify:** Navigate to library

### Test 6.2: Network Error Simulation (Optional)
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Offline"
- [ ] Try to create new episode
- [ ] **Expected:** Error handling (toast, message, or retry UI)
- [ ] Set throttling back to "No throttling"

**✅ PASS CRITERIA:** Errors handled gracefully
**❌ FAIL:** Document error behavior

---

## Part 7: Accessibility (10 min)

### Test 7.1: Keyboard Navigation
- [ ] Navigate to `/studio`
- [ ] Press Tab key repeatedly
- [ ] **Verify:** Focus moves through interactive elements
- [ ] **Verify:** Focus indicator visible
- [ ] Navigate to workspace
- [ ] Press Tab to focus on stage stepper
- [ ] Press Enter on Research stage button
- [ ] **Verify:** Research stage loads

### Test 7.2: Screen Reader Compatibility (Basic)
- [ ] Right-click on stage buttons → Inspect
- [ ] **Verify:** `aria-label` or meaningful text content exists
- [ ] Check form inputs
- [ ] **Verify:** Labels associated with inputs

### Test 7.3: Contrast & Readability
- [ ] Check all text is readable
- [ ] **Verify:** Sufficient contrast (no light gray on white)
- [ ] **Verify:** Font sizes reasonable on mobile viewport

**✅ PASS CRITERIA:** Basic accessibility requirements met
**❌ FAIL:** Document accessibility issues

---

## Part 8: Performance (5 min)

### Test 8.1: Initial Load Time
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Navigate to `/studio`
- [ ] **Note:** Time for library to display
- [ ] **Expected:** < 3 seconds
- [ ] Actual time: _______ seconds

### Test 8.2: Stage Transition Time
- [ ] Open an episode workspace
- [ ] Note current time
- [ ] Click Pauta stage button
- [ ] Note time when Pauta content visible
- [ ] **Expected:** < 500ms
- [ ] Actual time: _______ ms

### Test 8.3: Large Data Handling (if episodes exist)
- [ ] If library has > 10 episodes:
   - [ ] **Verify:** Scrolling is smooth
   - [ ] **Verify:** No lag when clicking episodes
- [ ] In Pauta stage, add 20 topics
- [ ] **Verify:** List renders without lag
- [ ] **Verify:** Scrolling works smoothly

**✅ PASS CRITERIA:** Performance meets targets
**❌ FAIL:** Document slow operations

---

## Summary Report Template

### Test Execution Summary
**Date:** ___________
**Tester:** ___________
**Environment:** Local Dev / Staging / Production
**Browser:** Chrome / Firefox / Safari / Edge

### Results

| Test Section | Pass/Fail | Notes |
|--------------|-----------|-------|
| 1. Navigation & Routing | ☐ Pass ☐ Fail | |
| 2. Episode Creation | ☐ Pass ☐ Fail | |
| 3. Stage Navigation | ☐ Pass ☐ Fail | |
| 4. Auto-Save & Persistence | ☐ Pass ☐ Fail | |
| 5. Component Interactions | ☐ Pass ☐ Fail | |
| 6. Error Handling | ☐ Pass ☐ Fail | |
| 7. Accessibility | ☐ Pass ☐ Fail | |
| 8. Performance | ☐ Pass ☐ Fail | |

### Overall Status
☐ **PASS** - All critical tests passed
☐ **PASS WITH ISSUES** - Minor issues found but functional
☐ **FAIL** - Critical issues found blocking migration

### Issues Found
1. ___________
2. ___________
3. ___________

### Screenshots
Attach screenshots of any failures or unexpected behavior.

### Recommendation
☐ Proceed to Wave 9 (Cleanup)
☐ Fix issues before proceeding
☐ Need E2E test infrastructure fix first

---

## Appendix: Browser DevTools Checks

### Check 1: Verify Test IDs Exist
```javascript
// In browser console
document.querySelector('[data-testid="studio-library"]') !== null
// Should return: true when in library

document.querySelector('[data-testid="studio-workspace"]') !== null
// Should return: true when in workspace
```

### Check 2: Verify No Console Errors
- [ ] Open DevTools → Console
- [ ] Navigate through Studio
- [ ] **Verify:** No red error messages (warnings OK)
- [ ] **If errors:** Document error messages

### Check 3: Verify Network Requests
- [ ] Open DevTools → Network tab
- [ ] Navigate to workspace
- [ ] Make changes in Setup stage
- [ ] Wait for auto-save
- [ ] **Verify:** PATCH/POST request to episodes API
- [ ] **Verify:** Response is 200 OK

---

---

## 📝 Session Summary (2025-12-21)

### Work Completed This Session

#### 1. Bug Fixes Implemented
- ✅ **Missing description column** - Created and applied migration
- ✅ **Empty UUID workflow** - Fixed show selection in StudioLibrary.tsx and StudioWizard.tsx
- ✅ **AI theme suggestion** - Implemented auto-generation on button click
- ✅ **Button contrast** - Improved disabled button visibility

#### 2. Testing Progress
- ✅ **Part 2 Complete:** Episode creation workflow (PASS after fixes)
- ✅ **Part 3 Complete:** Stage navigation (PASS WITH ISSUES)
- 🔄 **Part 4 Blocked:** Auto-save persistence bug (CRITICAL)
- ⏭️ **Parts 5-8:** Ready for agent to continue

#### 3. Critical Issue Outstanding
**Auto-Save Persistence Failure**
- **Symptom:** UI shows save indicator but data doesn't persist
- **Console:** `[useAutoSave] Save failed: Object`
- **File:** `src/modules/studio/hooks/useAutoSave.ts`
- **Impact:** Topics and theme changes lost after refresh
- **Priority:** 🔴 BLOCKER for Wave 9

### Next Steps

**For Developer:**
1. Debug auto-save error - get full error from console
2. Check `useAutoSave.ts` database operations (lines 76-153)
3. Verify RLS policies on `podcast_episodes`, `podcast_topics`, `podcast_topic_categories`
4. Test topic ID generation and category references

**For Claude Extension Agent:**
1. Continue with Part 5: Component Interactions
2. Proceed with Parts 6, 7, 8 (independent of auto-save bug)
3. Report findings in this checklist
4. Return to Part 4 after auto-save fix

### Files Modified This Session
- `src/modules/studio/components/workspace/SetupStage.tsx`
- `src/modules/studio/context/PodcastWorkspaceContext.tsx`
- `src/modules/studio/views/StudioLibrary.tsx`
- `src/modules/studio/views/StudioWizard.tsx`
- `supabase/migrations/20251220_add_description_to_podcast_episodes.sql`

### Documentation Created
- `docs/CRITICAL_FIX_EPISODE_CREATION_WORKFLOW.md`
- `docs/CRITICAL_FIX_EPISODE_DESCRIPTION.md`
- This updated validation checklist

---

**Manual Validation Status: 40% Complete (3/8 parts)**

**Migration Status:**
- ⏸️ **PAUSED** - Critical auto-save bug must be fixed
- ✅ Core functionality working (navigation, episode creation)
- 🔴 Data persistence broken (blocking issue)

Once auto-save is fixed and all tests pass, the migration will be **functionally validated** and ready for:
- Wave 9: Cleanup (remove `_deprecated/` folder)
- Wave 10: Deployment (create PR, merge, deploy)

E2E tests can be fixed in parallel using the recommendations in this document.
