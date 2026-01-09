# Journey Unified Timeline - Task Tracker

Use this file to track implementation progress. Check off tasks as completed.

---

## Pre-Implementation Setup

- [ ] Create feature branch: `git checkout -b feature/journey-unified-timeline`
- [ ] Verify clean working tree: `git status`
- [ ] Pull latest main: `git pull origin main`

---

## Phase 1: Data Layer (2-3 hours)

### 1.1 Type Definitions
**File:** `src/modules/journey/types/unifiedEvent.ts`
**Agent:** Backend Architect

- [ ] Create `UnifiedTimelineEvent` interface
- [ ] Create `EventSource` type union
- [ ] Create `EventType` type union
- [ ] Create `TimelineDay` interface
- [ ] Create `TimelineFilter` interface
- [ ] Create `TimelineStats` interface
- [ ] Create `TimelineResponse` interface
- [ ] Implement `getEventIcon(eventType)` helper
- [ ] Implement `getEventColor(eventType)` helper
- [ ] Implement `groupEventsByDay(events)` helper
- [ ] Create type guards (isWhatsAppEvent, etc.)
- [ ] Export from `types/index.ts`
- [ ] TypeScript compiles: `npm run typecheck`

### 1.2 Service Layer
**File:** `src/modules/journey/services/unifiedTimelineService.ts`
**Agent:** Backend Architect

- [ ] Implement `fetchWhatsAppMessages(userId, filter)`
- [ ] Implement `fetchMoments(userId, filter)`
- [ ] Implement `fetchWorkItems(userId, filter)`
- [ ] Implement `fetchApprovals(userId, filter)`
- [ ] Implement `fetchActivities(userId, filter)`
- [ ] Implement `fetchDailyQuestions(userId, filter)`
- [ ] Implement `fetchWeeklySummaries(userId, filter)`
- [ ] Implement `getUnifiedTimeline(userId, options)` with Promise.all()
- [ ] Implement `getTimelineStats(userId)`
- [ ] Add error handling for all queries
- [ ] Export from `services/index.ts`
- [ ] Test with console.log verification

### 1.3 React Hook
**File:** `src/modules/journey/hooks/useUnifiedTimeline.ts`
**Agent:** Backend Architect

- [ ] Create hook with state: `events`, `days`, `isLoading`, `error`, `hasMore`
- [ ] Create filter state management
- [ ] Implement `fetchTimeline(offset)` function
- [ ] Implement `loadMore()` function
- [ ] Implement `refresh()` function
- [ ] Implement `updateFilter(newFilter)` function
- [ ] Implement `toggleSourceFilter(source)` function
- [ ] Implement `setDateRange(days)` function
- [ ] Add auto-fetch on mount
- [ ] Add refetch on filter change
- [ ] Export from `hooks/index.ts`

### Phase 1 Checkpoint
- [ ] All types created and exported
- [ ] Service fetches from all 7 sources
- [ ] Hook provides all required state and actions
- [ ] `npm run typecheck` passes
- [ ] Commit: `feat(journey): Add UnifiedTimelineEvent types, service, and hook`

---

## Phase 2: UI Components (3-4 hours)

### 2.1 TimelineEventCard
**File:** `src/modules/journey/components/timeline/TimelineEventCard.tsx`
**Agent:** UX Design Guardian

- [ ] Accept `UnifiedTimelineEvent` prop
- [ ] Display event icon based on type
- [ ] Display event title
- [ ] Display formatted time (HH:mm)
- [ ] Display content preview (truncated)
- [ ] Show sentiment/emotion badges
- [ ] Show tags if present
- [ ] Implement expand/collapse
- [ ] Add hover effects (ceramic style)
- [ ] Style with ceramic design system
- [ ] Make responsive

### 2.2 TimelineFilter
**File:** `src/modules/journey/components/timeline/TimelineFilter.tsx`
**Agent:** UX Design Guardian

- [ ] Create source toggles section
  - [ ] WhatsApp toggle (ChatBubbleLeftIcon)
  - [ ] Moments toggle (PencilSquareIcon)
  - [ ] Tasks toggle (CheckCircleIcon)
  - [ ] Approvals toggle (DocumentCheckIcon)
  - [ ] Activities toggle (ChartBarIcon)
  - [ ] Questions toggle (QuestionMarkCircleIcon)
  - [ ] Summaries toggle (DocumentTextIcon)
- [ ] Create date range selector
  - [ ] Last 7 days option
  - [ ] Last 30 days option
  - [ ] Last 90 days option
  - [ ] All time option
- [ ] Show active filters visually
- [ ] Implement `onSourceToggle()` callback
- [ ] Implement `onDateRangeChange()` callback
- [ ] Style with ceramic tray
- [ ] Make responsive

### 2.3 UnifiedTimelineView
**File:** `src/modules/journey/components/timeline/UnifiedTimelineView.tsx`
**Agent:** UX Design Guardian

- [ ] Import and use `useUnifiedTimeline()` hook
- [ ] Render loading state (skeleton)
- [ ] Render empty state (no events)
- [ ] Render TimelineFilter component
- [ ] Group events by day
- [ ] Show day headers with event count
- [ ] Map events to TimelineEventCard
- [ ] Render "Load More" button
- [ ] Add framer-motion animations
- [ ] Style with ceramic design
- [ ] Make responsive

### 2.4 Barrel Export
**File:** `src/modules/journey/components/timeline/index.ts`

- [ ] Export TimelineEventCard
- [ ] Export TimelineFilter
- [ ] Export UnifiedTimelineView
- [ ] Keep existing MomentCard export

### Phase 2 Checkpoint
- [ ] All 3 components created
- [ ] Components use ceramic design
- [ ] Components are responsive
- [ ] Visual inspection passed
- [ ] Commit: `feat(journey): Add unified timeline UI components`

---

## Phase 3: Integration (1-2 hours)

### 3.1 JourneyFullScreen Modification
**File:** `src/modules/journey/views/JourneyFullScreen.tsx`
**Agent:** Master Architect / General Purpose

- [ ] Add import: `import { UnifiedTimelineView } from '../components/timeline'`
- [ ] Remove/comment: `LifeDecadesStrip` import
- [ ] Replace lines 292-295 (LifeDecadesStrip) with `<UnifiedTimelineView />`
- [ ] Optional: Rename "Timeline Viva" to "Atividades"
- [ ] Verify all tabs still work
- [ ] No TypeScript errors

### 3.2 Update Module Exports

- [ ] `src/modules/journey/types/index.ts` - Add unified event exports
- [ ] `src/modules/journey/services/index.ts` - Add service export
- [ ] `src/modules/journey/hooks/index.ts` - Add hook export

### 3.3 Archive LifeDecadesStrip (Optional)

- [ ] Create folder: `src/modules/journey/components/ceramic/archived/`
- [ ] Move `LifeDecadesStrip.tsx` to archived folder
- [ ] Update barrel export in `ceramic/index.ts`

### Phase 3 Checkpoint
- [ ] JourneyFullScreen uses UnifiedTimelineView
- [ ] All exports updated
- [ ] App starts without errors
- [ ] Timeline tab shows unified events
- [ ] Other tabs still work
- [ ] Commit: `refactor(journey): Replace LifeDecadesStrip with UnifiedTimelineView`

---

## Phase 4: Testing & Validation (1-2 hours)

### 4.1 Functional Testing

**Event Display:**
- [ ] WhatsApp messages display correctly
- [ ] Moments display correctly
- [ ] Tasks display correctly
- [ ] Approvals display correctly
- [ ] Activities display correctly
- [ ] Questions display correctly
- [ ] Summaries display correctly
- [ ] Event times are accurate
- [ ] Sentiment colors correct
- [ ] Emotion emojis display
- [ ] Tags show correctly

**Filtering:**
- [ ] Source filtering works (toggle each on/off)
- [ ] Date range filtering works (7/30/90/all)
- [ ] Multiple filters work together
- [ ] Clearing filters resets view

**Pagination:**
- [ ] Initial load shows up to 50 events
- [ ] "Load More" button appears when hasMore
- [ ] "Load More" loads next batch
- [ ] No duplicate events on load more

### 4.2 UI/UX Testing

**Visual:**
- [ ] Consistent with ceramic design system
- [ ] Proper spacing and alignment
- [ ] Icons display correctly
- [ ] Colors readable (contrast)

**Responsive:**
- [ ] Desktop (1920px) - correct layout
- [ ] Tablet (768px) - responsive
- [ ] Mobile (375px) - touch-friendly

**Animation:**
- [ ] Smooth transitions
- [ ] No jank or stuttering

### 4.3 Performance Testing

- [ ] Initial load < 1 second
- [ ] Filter change < 500ms
- [ ] Load more < 500ms
- [ ] No console errors
- [ ] No memory leaks

### 4.4 Regression Testing

- [ ] Moment capture still works
- [ ] Daily questions still work
- [ ] Weekly summaries still work
- [ ] CP score displays
- [ ] Insights tab works
- [ ] Search tab works

---

## Phase 5: Cleanup & Documentation (0.5-1 hour)

### 5.1 Code Quality

- [ ] Run `npm run lint` - fix warnings
- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run build` - build succeeds
- [ ] Remove console.log statements
- [ ] Remove TODO/FIXME (or document intentional ones)
- [ ] Remove unused imports

### 5.2 Documentation

- [ ] Add JSDoc comments to new functions
- [ ] Add prop documentation to components
- [ ] Update CLAUDE.md if architecture changes warrant it

### 5.3 Final Commit & Push

```bash
git add -A
git status  # Review changes
git commit -m "feat(journey): Implement unified timeline with multi-source events

- Add UnifiedTimelineEvent types for 7 data sources
- Add unifiedTimelineService for parallel data aggregation
- Add useUnifiedTimeline React hook with filtering
- Add TimelineFilter, TimelineEventCard, UnifiedTimelineView components
- Replace LifeDecadesStrip with real activity timeline
- Add source and date range filtering
- Add pagination support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push origin feature/journey-unified-timeline
```

---

## Deployment

### Pre-Deploy Verification

- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (if tests exist)

### Deploy Steps

- [ ] Push to feature branch
- [ ] Create PR via GitHub
- [ ] PR review (if required)
- [ ] Merge to main
- [ ] Deploy triggers automatically
- [ ] Verify production: `gcloud builds list --limit=5 --region=southamerica-east1`

---

## Success Criteria Checklist

- [ ] Timeline displays events from all 7 sources
- [ ] Users can filter by source and date range
- [ ] Events load in < 1 second
- [ ] Pagination works
- [ ] Events sorted chronologically (newest first)
- [ ] Events grouped by day
- [ ] Sentiment/emotion visible per event
- [ ] All tabs functional
- [ ] No console errors
- [ ] TypeScript passes
- [ ] Build succeeds
- [ ] Deployed to production

---

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1 | 2-3h | __h | |
| Phase 2 | 3-4h | __h | |
| Phase 3 | 1-2h | __h | |
| Phase 4 | 1-2h | __h | |
| Phase 5 | 0.5-1h | __h | |
| **Total** | **7.5-12h** | **__h** | |

---

**Start Date:** ____/____/2026
**Completion Date:** ____/____/2026
**Implementing Agent:** ________________
