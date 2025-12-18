# StudioLibrary Testing Guide

## Pre-Testing Checklist

- [ ] Build passes: `npm run build` ✅
- [ ] No TypeScript errors
- [ ] Database (Supabase) is accessible
- [ ] User is authenticated

## Manual Testing Scenarios

### Scenario 1: Initial Load

**Steps:**
1. Navigate to component with StudioLibrary mounted
2. Observe initial state

**Expected Results:**
- [ ] Header displays "Estúdio Aica" and "PODCAST COPILOT"
- [ ] "Criar Novo" button visible in top-left
- [ ] Shows grid loads with skeleton placeholders (0.5s-1s)
- [ ] Skeletons replaced with actual show cards

**Actual Results:** _____________________

### Scenario 2: Empty State

**Setup:** User has no podcast shows

**Steps:**
1. Load component
2. Wait for shows to load

**Expected Results:**
- [ ] No shows grid rendered
- [ ] Empty state displays:
  - Mic icon in box
  - "Nenhum podcast ainda" title
  - Descriptive text
  - "Criar Primeiro Podcast" button
- [ ] Button is clickable

**Actual Results:** _____________________

### Scenario 3: Show List Display

**Setup:** User has 3-5 podcast shows

**Steps:**
1. Load component
2. Observe shows rendering

**Expected Results:**
- [ ] Shows grid displays (2, 3, or 4 columns based on screen size)
- [ ] Each show card shows:
  - [ ] Cover image (or Mic icon if no image)
  - [ ] Show title (max 2 lines, truncated)
  - [ ] Episode count badge (amber color)
  - [ ] Hover effect: scale[1.02], arrow appears
  - [ ] Color change on hover (to amber-600)

**Test on Devices:**
- [ ] Mobile (< 768px): 2 columns
- [ ] Tablet (768px-1023px): 3 columns
- [ ] Desktop (> 1024px): 4 columns

**Actual Results:** _____________________

### Scenario 4: Create New Show

**Steps:**
1. Click "Criar Novo" button
2. Modal appears
3. Enter show title and description
4. Click create button in modal

**Expected Results:**
- [ ] `CreatePodcastDialog` modal appears
- [ ] Modal has title input field
- [ ] Modal has description input field
- [ ] Create button is disabled until title entered
- [ ] After submission:
  - [ ] Modal closes
  - [ ] Loading state appears
  - [ ] New show appears in list
  - [ ] onCreateNew() callback fires

**Error Cases:**
- [ ] Empty title: Button disabled or error shown
- [ ] Network error: Error message displayed

**Actual Results:** _____________________

### Scenario 5: Select Show

**Setup:** User has at least one show with episodes

**Steps:**
1. Click on a show card
2. Observe behavior

**Expected Results:**
- [ ] Show card selected (no navigation occurs - callback only)
- [ ] onSelectShow(showId) callback fires
- [ ] Episodes expand/load below show grid
- [ ] "Episódios" header appears

**Callback Verification:**
- [ ] Console.log onSelectShow in parent component
- [ ] Verify correct showId passed

**Actual Results:** _____________________

### Scenario 6: Load Episodes

**Setup:** Show is selected and expanded

**Steps:**
1. Wait for episodes to load
2. Observe episodes grid

**Expected Results:**
- [ ] Episodes section appears with "Episódios" header
- [ ] If episodes exist:
  - [ ] Episodes load with skeleton (< 1s)
  - [ ] Grid displays episodes (2-4 columns)
  - [ ] "Novo Ep." button at end of row
- [ ] If no episodes:
  - [ ] Empty state with message
  - [ ] "Criar Episódio" button

**Episode Card Display:**
- [ ] Episode title (max 2 lines)
- [ ] Guest name (max 1 line)
- [ ] Status badge (blue)
- [ ] Hover effect (scale, arrow, blue color)

**Actual Results:** _____________________

### Scenario 7: Select Episode

**Setup:** Episodes list is displayed

**Steps:**
1. Click on an episode card
2. Observe callback

**Expected Results:**
- [ ] onSelectProject(project) callback fires
- [ ] Correct StudioProject object passed with:
  - [ ] id = episode.id
  - [ ] type = 'podcast'
  - [ ] title = episode title
  - [ ] showId = show.id
  - [ ] showTitle = show title
  - [ ] status = episode status
  - [ ] metadata.guestName populated
  - [ ] metadata.episodeTheme populated
  - [ ] createdAt and updatedAt as Date objects
- [ ] No navigation occurs

**Callback Verification:**
- [ ] Console.log onSelectProject in parent
- [ ] Verify all fields correct

**Actual Results:** _____________________

### Scenario 8: Create Episode from Library

**Setup:** Episode list is displayed

**Steps:**
1. Click "Novo Ep." button in episodes section
2. Observe callback

**Expected Results:**
- [ ] onSelectShow(showId) callback fires (not onCreateNew)
- [ ] Correct showId passed

**Actual Results:** _____________________

### Scenario 9: Collapse Show

**Setup:** Show is expanded with episodes visible

**Steps:**
1. Click same show again
2. Observe collapse behavior

**Expected Results:**
- [ ] Episodes section hides
- [ ] expandedShowId state clears
- [ ] Episodes still cached (no reload if re-expanded)

**Actual Results:** _____________________

### Scenario 10: Multiple Shows Expansion

**Steps:**
1. Expand show A (episodes load)
2. Expand show B (episodes load)
3. Collapse show A
4. Expand show A again

**Expected Results:**
- [ ] Only one show expanded at a time
- [ ] When show A re-expanded, episodes load from cache (no spinner)
- [ ] No duplicate episodes

**Actual Results:** _____________________

### Scenario 11: Network Errors

**Setup:** Supabase is disconnected or slow

**Steps:**
1. Load component
2. Wait for timeout
3. Observe behavior

**Expected Results:**
- [ ] Errors logged to console (non-blocking)
- [ ] UI doesn't crash
- [ ] Empty state shown (no shows loaded)
- [ ] User can retry by refresh

**Actual Results:** _____________________

### Scenario 12: Responsiveness

**Test on Devices:**

**Mobile (375px):**
- [ ] 2-column grid
- [ ] Text readable
- [ ] Touch targets adequate (40px+)
- [ ] No horizontal scroll
- [ ] Header readable

**Tablet (768px):**
- [ ] 3-column grid
- [ ] Spacing proportional
- [ ] No layout break

**Desktop (1440px):**
- [ ] 4-column grid
- [ ] Spacing comfortable
- [ ] No overflow

**Actual Results:** _____________________

### Scenario 13: Performance

**Measurements:**

**Initial Load:**
- [ ] Shows list fetches in < 1s
- [ ] Grid renders in < 0.5s
- [ ] Total to interactive < 1.5s

**Episode Load:**
- [ ] Episodes fetch < 0.5s for 10 episodes
- [ ] Expand animation smooth
- [ ] No UI blocking

**Memory:**
- [ ] No memory leaks on multiple expand/collapse cycles
- [ ] Console clear of warnings

**Actual Results:** _____________________

### Scenario 14: Accessibility

**Keyboard Navigation:**
- [ ] Tab through shows
- [ ] Tab through episodes
- [ ] Tab to buttons
- [ ] Enter/Space activates buttons
- [ ] Logical tab order

**Screen Reader:**
- [ ] Show titles announced
- [ ] Episode counts described
- [ ] Buttons labeled
- [ ] Empty states described

**Visual:**
- [ ] Focus indicators visible
- [ ] Color not sole indicator (icons/text used)
- [ ] Contrast sufficient
- [ ] Text sizes readable

**Actual Results:** _____________________

### Scenario 15: Edge Cases

**Case 1: Show with no cover image**
- [ ] Mic icon displays
- [ ] Gradient background visible
- [ ] No broken image
- [ ] Layout unchanged

**Case 2: Very long show title**
- [ ] Title truncated at 2 lines
- [ ] Ellipsis shown
- [ ] No overflow
- [ ] Layout unaffected

**Case 3: Episode with no guest name**
- [ ] "No guest assigned" text shows
- [ ] Layout unaffected
- [ ] No console errors

**Case 4: Episode with missing status**
- [ ] Defaults to 'draft'
- [ ] Badge shows draft status
- [ ] No error

**Case 5: Rapid show selection**
- [ ] Clicking multiple shows quickly handled gracefully
- [ ] Only latest show expanded
- [ ] No race conditions
- [ ] No duplicate episodes

**Actual Results:** _____________________

## Type Safety Validation

```typescript
// Verify StudioProject conversion
const project = episodeToProject(episodeData, showData);

// Check all required fields present:
✓ id: string
✓ type: 'podcast'
✓ title: string
✓ showId?: string
✓ showTitle?: string
✓ status: 'draft' | 'in_progress' | 'completed' | 'archived'
✓ createdAt: Date
✓ updatedAt: Date
✓ metadata: PodcastProjectMetadata

// Verify callback signatures:
✓ onSelectShow: (showId: string) => void
✓ onSelectProject: (project: StudioProject) => void
✓ onCreateNew: () => void
```

**Type Check Results:** _____________________

## Integration Testing

### With StudioMainView (FSM)

**Test Flow:**
1. Mount StudioMainView
2. Verify initial mode = 'LIBRARY'
3. Click show card
4. Verify onSelectShow calls handler
5. Verify FSM transitions to correct mode

**Expected Result:** _____________________

### With Database

**Test:**
1. Create new show in Supabase
2. Refresh StudioLibrary
3. Verify new show appears

**Expected Result:** _____________________

## Performance Profiling

### React DevTools Profiler

1. Open React DevTools → Profiler
2. Record component render
3. Note render time (should be < 50ms for shows list)
4. Check for unnecessary re-renders

**Results:** _____________________

### Network Tab

1. Open DevTools → Network
2. Filter to XHR/Fetch
3. Monitor show and episode loads
4. Verify queries are optimized

**Queries:**
- [ ] podcast_shows_with_stats: < 100ms
- [ ] podcast_episodes: < 100ms (per show)

**Results:** _____________________

## Sign-off Checklist

- [ ] All scenarios tested and passing
- [ ] No console errors
- [ ] No console warnings
- [ ] Responsive on all devices
- [ ] Accessibility verified
- [ ] Performance acceptable
- [ ] Type safety confirmed
- [ ] Integration tested
- [ ] Edge cases handled
- [ ] Documentation complete

## Issues Found

| Issue | Severity | Status | Solution |
|-------|----------|--------|----------|
| | | | |

## Tester Information

**Tested By:** _____________________
**Date:** _____________________
**Device:** _____________________
**Browser:** _____________________
**OS:** _____________________

**Overall Status:** ✅ PASS / ❌ FAIL

---

## Rollback Plan

If critical issues found:
1. Revert commit `20cd102`
2. Revert to previous PodcastLibrary
3. File issue with reproduction steps
4. Fix and re-test
