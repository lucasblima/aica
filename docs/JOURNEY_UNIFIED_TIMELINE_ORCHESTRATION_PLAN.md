# Journey Unified Timeline - Master Orchestration Plan

**Date:** January 9, 2026
**Feature:** Unified Activity Timeline for Minha Jornada
**Branch:** `feature/journey-unified-timeline`
**Estimated Time:** 6-9 hours
**Status:** Ready for Implementation

---

## Executive Summary

This document serves as the master orchestration plan for implementing a unified activity timeline in the Journey module (Minha Jornada) of Aica Life OS. The implementation replaces the non-functional LifeDecadesStrip with a real activity timeline aggregating events from 7 data sources.

### Strategic Objectives

1. **Replace** LifeDecadesStrip (memento mori visualization) with unified activity timeline
2. **Aggregate** events from 7 data sources (WhatsApp, moments, tasks, approvals, activities, questions, summaries)
3. **Add filtering** by source and date range
4. **Restore** full navigation (Timeline/Insights/Search tabs fully functional)
5. **Ensure** testability and clean deployability

### Success Criteria

- [ ] Timeline displays events from all 7 sources
- [ ] Users can filter by source and date range
- [ ] Events load in < 1 second (50 per page)
- [ ] Pagination works (load more button)
- [ ] Events sorted chronologically (newest first)
- [ ] Events grouped by day
- [ ] Sentiment/emotion visible per event
- [ ] All tabs functional (no navigation issues)
- [ ] No console errors
- [ ] TypeScript passes
- [ ] Build succeeds

---

## Orchestration Strategy

### Agent Coordination Model

This implementation follows a **parallel-sequential hybrid** model:

```
                          Master Architect (Orchestrator)
                                     |
              +----------------------+----------------------+
              |                      |                      |
        Phase 1 (Data)         Phase 2 (UI)          Phase 3 (Integration)
              |                      |                      |
    Backend Architect       UX Design Guardian      Master Architect
              |                      |                      |
    [Sequential Tasks]       [Parallel Tasks]        [Sequential]
```

### Agent Assignments

| Agent | Role | Phase | Deliverables |
|-------|------|-------|--------------|
| **Master Architect (You)** | Orchestrator | All | Plan, coordination, integration decisions |
| **Backend Architect** | Data Layer | 1 | Types, services, data aggregation |
| **UX Design Guardian** | UI Components | 2 | Timeline components, filter bar, event cards |
| **Testing QA** | Quality | 4 | Unit tests, integration tests |
| **General Purpose** | Integration | 3 | JourneyFullScreen modification |

---

## Git Branch Structure

### Branch Creation

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/journey-unified-timeline
```

### Commit Strategy

Each phase should have atomic commits:

```
Phase 1 Commits:
- feat(journey): Add UnifiedTimelineEvent types and interfaces
- feat(journey): Add unifiedTimelineService with 7-source aggregation
- feat(journey): Add useUnifiedTimeline React hook

Phase 2 Commits:
- feat(journey): Add TimelineEventCard component
- feat(journey): Add TimelineFilter component
- feat(journey): Add UnifiedTimelineView component

Phase 3 Commits:
- refactor(journey): Replace LifeDecadesStrip with UnifiedTimelineView
- chore(journey): Archive LifeDecadesStrip component
- docs(journey): Update CLAUDE.md with timeline architecture
```

---

## Phase 1: Data Layer (2-3 hours)

### Agent: Backend Architect (general-purpose)
### Priority: CRITICAL PATH

### Task 1.1: Create Type Definitions

**File:** `src/modules/journey/types/unifiedEvent.ts`

```typescript
// Core types to create:
- UnifiedTimelineEvent (interface)
- EventSource (type union: 7 sources)
- EventType (type union: 14+ event types)
- TimelineDay (interface for grouping)
- TimelineFilter (interface for filtering)
- TimelineStats (interface for stats)
- TimelineResponse (interface for API response)

// Helper functions:
- getEventIcon(eventType): string
- getEventColor(eventType): string
- groupEventsByDay(events): TimelineDay[]

// Type guards:
- isWhatsAppEvent(event): boolean
- isMomentEvent(event): boolean
- isTaskEvent(event): boolean
- isApprovalEvent(event): boolean
```

**Deliverable Checklist:**
- [ ] Create `unifiedEvent.ts` with all types
- [ ] Export from `types/index.ts`
- [ ] TypeScript compiles without errors

### Task 1.2: Create Service Layer

**File:** `src/modules/journey/services/unifiedTimelineService.ts`

```typescript
// Main function:
async getUnifiedTimeline(userId, options): Promise<TimelineResponse>
  - Parallel fetch from 7 tables using Promise.all()
  - Apply filters (date range, sources)
  - Merge and sort by eventTime DESC
  - Implement pagination (limit/offset)

// Helper functions (one per source):
- fetchWhatsAppMessages(userId, filter)
- fetchMoments(userId, filter)
- fetchWorkItems(userId, filter)
- fetchApprovals(userId, filter)
- fetchActivities(userId, filter)
- fetchDailyQuestions(userId, filter)
- fetchWeeklySummaries(userId, filter)

// Utility function:
- getTimelineStats(userId): Promise<TimelineStats>
```

**Data Source Query Patterns:**

| Source | Table | Key Fields | Timestamp Field |
|--------|-------|------------|-----------------|
| WhatsApp | `whatsapp_messages` | direction, sentiment_label, detected_intent | `message_timestamp` |
| Moments | `moments` | emotion, sentiment_data, tags | `created_at` |
| Tasks | `work_items` | status, priority, title | `completed_at` or `created_at` |
| Approvals | `grant_responses` | approval_status, approval_notes | `approved_at` or `rejected_at` |
| Activities | `whatsapp_user_activity` | activity_type, metadata | `created_at` |
| Questions | `daily_questions` | question, response_text | `answered_at` |
| Summaries | `weekly_summaries` | summary_data | `generated_at` |

**Deliverable Checklist:**
- [ ] Create `unifiedTimelineService.ts`
- [ ] Implement all 7 fetch functions
- [ ] Implement main aggregation function
- [ ] Export from `services/index.ts`
- [ ] Test with sample data (console.log verification)

### Task 1.3: Create React Hook

**File:** `src/modules/journey/hooks/useUnifiedTimeline.ts`

```typescript
// Hook signature:
function useUnifiedTimeline(options?: {
  limit?: number;
  autoFetch?: boolean;
  filter?: TimelineFilter;
}): {
  // State
  events: UnifiedTimelineEvent[];
  days: TimelineDay[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  filter: TimelineFilter;

  // Actions
  loadMore: () => void;
  refresh: () => void;
  updateFilter: (filter: Partial<TimelineFilter>) => void;
  toggleSourceFilter: (source: EventSource) => void;
  setDateRange: (days: number | 'all') => void;
}
```

**Deliverable Checklist:**
- [ ] Create `useUnifiedTimeline.ts`
- [ ] Implement state management
- [ ] Implement filter logic
- [ ] Implement pagination
- [ ] Export from `hooks/index.ts`
- [ ] Test hook in isolation

### Phase 1 Dependencies

```
Task 1.1 (Types) ---> Task 1.2 (Service) ---> Task 1.3 (Hook)
     |                      |                      |
     +----------------------+----------------------+
                           |
                    Phase 1 Complete
```

---

## Phase 2: UI Components (3-4 hours)

### Agent: UX Design Guardian (general-purpose as UI focus)
### Priority: HIGH

### Task 2.1: Create TimelineEventCard Component

**File:** `src/modules/journey/components/timeline/TimelineEventCard.tsx`

**Requirements:**
- Accepts `UnifiedTimelineEvent` prop
- Displays: icon, title, time, content preview
- Shows sentiment/emotion badges
- Shows tags if present
- Expandable for full content
- Ceramic design system styling
- Responsive layout

**Visual Structure:**
```
+--------------------------------------------------+
| [Icon] [Event Title]                    [12:45] |
| [Content preview truncated to 2 lines...]       |
| [Sentiment Badge] [Tag1] [Tag2]        [Expand] |
+--------------------------------------------------+
```

**Deliverable Checklist:**
- [ ] Create `TimelineEventCard.tsx`
- [ ] Implement all event type renderings
- [ ] Add expand/collapse functionality
- [ ] Style with ceramic design system
- [ ] Test responsiveness

### Task 2.2: Create TimelineFilter Component

**File:** `src/modules/journey/components/timeline/TimelineFilter.tsx`

**Requirements:**
- Source toggles (7 sources with icons)
- Date range selector (7/30/90 days, All)
- Active filters visually indicated
- Compact/responsive layout
- Ceramic tray styling

**Visual Structure:**
```
+---------------------------------------------------------------+
| [WhatsApp] [Moments] [Tasks] [Approvals] | [Last 7 days v]   |
| [Activities] [Questions] [Summaries]      |                   |
+---------------------------------------------------------------+
```

**Source Icons:**
- WhatsApp: `ChatBubbleLeftIcon`
- Moments: `PencilSquareIcon`
- Tasks: `CheckCircleIcon`
- Approvals: `DocumentCheckIcon`
- Activities: `ChartBarIcon`
- Questions: `QuestionMarkCircleIcon`
- Summaries: `DocumentTextIcon`

**Deliverable Checklist:**
- [ ] Create `TimelineFilter.tsx`
- [ ] Implement source toggles
- [ ] Implement date range selector
- [ ] Style with ceramic design
- [ ] Test filter interactions

### Task 2.3: Create UnifiedTimelineView Component

**File:** `src/modules/journey/components/timeline/UnifiedTimelineView.tsx`

**Requirements:**
- Main container component
- Uses `useUnifiedTimeline` hook
- Renders TimelineFilter
- Renders events grouped by day
- Day headers with event count
- Load More button
- Loading/empty states
- Framer-motion animations

**Visual Structure:**
```
+--------------------------------------------------+
| [TimelineFilter Component]                        |
+--------------------------------------------------+
| === Today (5 events) ===                         |
| [TimelineEventCard]                               |
| [TimelineEventCard]                               |
| [TimelineEventCard]                               |
|                                                   |
| === Yesterday (3 events) ===                      |
| [TimelineEventCard]                               |
| [TimelineEventCard]                               |
|                                                   |
| [Load More]                                       |
+--------------------------------------------------+
```

**Deliverable Checklist:**
- [ ] Create `UnifiedTimelineView.tsx`
- [ ] Integrate with useUnifiedTimeline hook
- [ ] Implement day grouping display
- [ ] Add loading skeleton
- [ ] Add empty state
- [ ] Add animations
- [ ] Test component integration

### Task 2.4: Create Index/Barrel Export

**File:** `src/modules/journey/components/timeline/index.ts`

```typescript
export { TimelineEventCard } from './TimelineEventCard'
export { TimelineFilter } from './TimelineFilter'
export { UnifiedTimelineView } from './UnifiedTimelineView'
export { MomentCard } from './MomentCard' // existing
```

### Phase 2 Dependencies

```
Task 2.1 (EventCard)  \
                       +---> Task 2.3 (UnifiedTimelineView)
Task 2.2 (Filter)     /              |
                                     |
                              Phase 2 Complete
```

**Note:** Tasks 2.1 and 2.2 can be implemented in parallel.

---

## Phase 3: Integration (1-2 hours)

### Agent: Master Architect / General Purpose
### Priority: CRITICAL

### Task 3.1: Modify JourneyFullScreen

**File:** `src/modules/journey/views/JourneyFullScreen.tsx`

**Changes Required:**

1. **Add imports:**
```typescript
import { UnifiedTimelineView } from '../components/timeline'
// Remove: LifeDecadesStrip import (or comment out)
```

2. **Replace lines 291-295:**
```typescript
// BEFORE:
<LifeDecadesStrip
  birthDate={new Date(1990, 0, 1)}
  expectedLifespan={80}
/>

// AFTER:
<UnifiedTimelineView />
```

3. **Optional: Rename tab:**
```typescript
// Line 260: "Timeline Viva" -> "Atividades"
```

4. **Keep existing tab structure** (no changes to Insights/Search tabs)

**Deliverable Checklist:**
- [ ] Import UnifiedTimelineView
- [ ] Replace LifeDecadesStrip usage
- [ ] Verify all tabs still work
- [ ] Test navigation
- [ ] No TypeScript errors

### Task 3.2: Update Module Exports

**Files to update:**
- `src/modules/journey/index.ts` - Add new exports if needed
- `src/modules/journey/types/index.ts` - Export unified event types
- `src/modules/journey/services/index.ts` - Export unified timeline service
- `src/modules/journey/hooks/index.ts` - Export unified timeline hook

### Task 3.3: Archive LifeDecadesStrip (Optional)

**Options:**
1. **Delete:** Remove file entirely
2. **Archive:** Move to `src/modules/journey/components/ceramic/archived/`
3. **Keep:** Leave in place but unused (not recommended)

**Recommended:** Option 2 (Archive) - preserves code history

### Phase 3 Dependencies

```
Phase 1 Complete + Phase 2 Complete
              |
              v
        Task 3.1 (JourneyFullScreen)
              |
              v
        Task 3.2 (Exports)
              |
              v
        Task 3.3 (Archive)
              |
              v
        Phase 3 Complete
```

---

## Phase 4: Testing & Validation (1-2 hours)

### Agent: Testing QA (testing-qa)
### Priority: HIGH

### Task 4.1: Unit Tests

**Create:** `src/modules/journey/services/__tests__/unifiedTimelineService.test.ts`

Test cases:
- [ ] `getUnifiedTimeline` returns events from all sources
- [ ] Pagination works correctly
- [ ] Date range filtering works
- [ ] Source filtering works
- [ ] Events sorted by timestamp DESC
- [ ] Empty state handled

**Create:** `src/modules/journey/hooks/__tests__/useUnifiedTimeline.test.ts`

Test cases:
- [ ] Hook initializes correctly
- [ ] `loadMore` increments offset
- [ ] `toggleSourceFilter` updates filter
- [ ] `setDateRange` updates filter
- [ ] `refresh` resets state

### Task 4.2: Integration Tests

**Manual testing checklist:**
- [ ] App starts without errors
- [ ] Journey page loads
- [ ] Timeline tab shows events
- [ ] All 7 event sources display
- [ ] Filtering by source works
- [ ] Filtering by date works
- [ ] Pagination works
- [ ] Insights tab still works
- [ ] Search tab still works
- [ ] No console errors

### Task 4.3: Visual Testing

- [ ] Desktop (1920px) - layout correct
- [ ] Tablet (768px) - responsive
- [ ] Mobile (375px) - touch-friendly
- [ ] Dark mode (if applicable)
- [ ] Animation smoothness

### Task 4.4: Performance Testing

- [ ] Initial load < 1 second
- [ ] Filter change < 500ms
- [ ] Load more < 500ms
- [ ] No memory leaks (check DevTools)
- [ ] No unnecessary re-renders

---

## Phase 5: Cleanup & Documentation (0.5-1 hour)

### Task 5.1: Code Quality

```bash
npm run lint        # Fix any warnings
npm run typecheck   # Ensure no type errors
npm run build       # Verify build succeeds
```

### Task 5.2: Documentation Updates

- [ ] Add JSDoc comments to new functions
- [ ] Update `CLAUDE.md` if needed
- [ ] Create usage examples in component comments

### Task 5.3: Final Commit

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(journey): Implement unified timeline with multi-source events

- Add UnifiedTimelineEvent types for 7 data sources
- Add unifiedTimelineService for parallel data aggregation
- Add useUnifiedTimeline React hook with filtering
- Add TimelineFilter, TimelineEventCard, UnifiedTimelineView components
- Replace LifeDecadesStrip with real activity timeline
- Add source and date range filtering
- Add pagination support

Closes #XX (if applicable)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin feature/journey-unified-timeline
```

---

## Deployment Checklist

### Pre-Deployment Verification

```bash
# Run all checks
npm run build && npm run typecheck && npm run lint

# Verify no test failures
npm run test

# Check bundle size (optional)
npm run build -- --report
```

### Deployment Steps

1. **Push to feature branch:**
```bash
git push origin feature/journey-unified-timeline
```

2. **Create Pull Request:**
```bash
gh pr create --title "feat(journey): Implement unified timeline with multi-source events" \
  --body "## Summary
- Replace LifeDecadesStrip with unified activity timeline
- Aggregate events from 7 data sources
- Add filtering by source and date range
- Add pagination support

## Test Plan
- [ ] Manual testing of timeline display
- [ ] Verify all 7 event sources show
- [ ] Test filtering functionality
- [ ] Test pagination
- [ ] Verify no regressions in other tabs

Generated with Claude Code"
```

3. **After PR merge, deploy triggers automatically via GitHub**

4. **Verify production:**
```bash
# Check deployment status
gcloud builds list --limit=5 --region=southamerica-east1
```

---

## Risk Assessment & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Performance (too many queries) | Medium | Medium | Use Promise.all(), implement pagination |
| Missing events from some sources | Low | High | Test all 7 sources thoroughly |
| Navigation breaking | Low | Medium | Keep existing tabs, only replace timeline |
| Timeline grouped incorrectly | Low | Low | Test date grouping logic |
| Type errors in aggregation | Medium | Low | Strong TypeScript types |
| UI not matching ceramic design | Low | Medium | Follow existing component patterns |

---

## File Creation Summary

### NEW FILES (6 files)

| File | Type | Phase | Owner |
|------|------|-------|-------|
| `src/modules/journey/types/unifiedEvent.ts` | Types | 1 | Backend Architect |
| `src/modules/journey/services/unifiedTimelineService.ts` | Service | 1 | Backend Architect |
| `src/modules/journey/hooks/useUnifiedTimeline.ts` | Hook | 1 | Backend Architect |
| `src/modules/journey/components/timeline/UnifiedTimelineView.tsx` | Component | 2 | UX Guardian |
| `src/modules/journey/components/timeline/TimelineEventCard.tsx` | Component | 2 | UX Guardian |
| `src/modules/journey/components/timeline/TimelineFilter.tsx` | Component | 2 | UX Guardian |

### MODIFY FILES (4+ files)

| File | Change | Phase |
|------|--------|-------|
| `src/modules/journey/views/JourneyFullScreen.tsx` | Replace LifeDecadesStrip | 3 |
| `src/modules/journey/types/index.ts` | Add exports | 3 |
| `src/modules/journey/services/index.ts` | Add exports | 3 |
| `src/modules/journey/hooks/index.ts` | Add exports | 3 |
| `src/modules/journey/components/timeline/index.ts` | Add exports | 2 |

### ARCHIVE FILES (1 file, optional)

| File | Action |
|------|--------|
| `src/modules/journey/components/ceramic/LifeDecadesStrip.tsx` | Move to `archived/` |

---

## Agent Delegation Commands

When delegating to specialist agents, use these prompts:

### For Backend Architect (Phase 1):
```
You are the Backend Architect for Aica Life OS. Implement Phase 1 of the unified timeline feature:

1. Create `src/modules/journey/types/unifiedEvent.ts` with:
   - UnifiedTimelineEvent interface
   - EventSource type (7 sources)
   - EventType type (14+ types)
   - TimelineDay, TimelineFilter, TimelineStats interfaces
   - Helper functions: getEventIcon, getEventColor, groupEventsByDay

2. Create `src/modules/journey/services/unifiedTimelineService.ts` with:
   - getUnifiedTimeline(userId, options) main function
   - 7 fetch helper functions (one per data source)
   - getTimelineStats(userId) function

3. Create `src/modules/journey/hooks/useUnifiedTimeline.ts` with:
   - State management for events, days, loading, error, hasMore
   - Actions: loadMore, refresh, updateFilter, toggleSourceFilter, setDateRange

Refer to JOURNEY_TIMELINE_ARCHITECTURE.md for data flow and type structures.
```

### For UX Design Guardian (Phase 2):
```
You are the UX Design Guardian for Aica Life OS. Implement Phase 2 of the unified timeline feature:

1. Create `TimelineEventCard.tsx` - Individual event card with:
   - Icon, title, time display
   - Content preview (truncated)
   - Sentiment/emotion badges
   - Tags display
   - Expand/collapse functionality
   - Ceramic design system styling

2. Create `TimelineFilter.tsx` - Filter bar with:
   - 7 source toggles with icons
   - Date range selector (7/30/90/all days)
   - Active filter visual indication
   - Ceramic tray styling

3. Create `UnifiedTimelineView.tsx` - Main container with:
   - Integration with useUnifiedTimeline hook
   - TimelineFilter rendering
   - Day grouping with headers
   - Load More button
   - Loading/empty states
   - Framer-motion animations

Use existing ceramic design patterns from CeramicMomentCard.tsx as reference.
```

### For Testing QA (Phase 4):
```
You are the Testing QA Agent for Aica Life OS. Create tests for the unified timeline feature:

1. Create unit tests for unifiedTimelineService.ts
2. Create unit tests for useUnifiedTimeline.ts
3. Document manual testing checklist
4. Verify no regressions in existing Journey features
```

---

## Timeline Estimate

| Phase | Duration | Parallelizable |
|-------|----------|----------------|
| Phase 1: Data Layer | 2-3 hours | No (sequential tasks) |
| Phase 2: UI Components | 3-4 hours | Partially (2.1 + 2.2 parallel) |
| Phase 3: Integration | 1-2 hours | No |
| Phase 4: Testing | 1-2 hours | Partially |
| Phase 5: Cleanup | 0.5-1 hour | No |
| **Total** | **7.5-12 hours** | |

**Optimistic path:** 6-7 hours (experienced developer, no blockers)
**Realistic path:** 8-10 hours (typical implementation)
**Pessimistic path:** 12+ hours (unexpected issues, debugging)

---

## Appendix: Quick Reference

### Event Type Icons

```typescript
const EVENT_ICONS = {
  whatsapp_message_in: 'ChatBubbleLeftIcon',
  whatsapp_message_out: 'ChatBubbleLeftRightIcon',
  moment_captured: 'PencilSquareIcon',
  task_created: 'PlusCircleIcon',
  task_completed: 'CheckCircleIcon',
  approval_granted: 'DocumentCheckIcon',
  approval_rejected: 'XCircleIcon',
  activity_tracked: 'ChartBarIcon',
  question_answered: 'QuestionMarkCircleIcon',
  summary_generated: 'DocumentTextIcon'
}
```

### Event Type Colors

```typescript
const EVENT_COLORS = {
  whatsapp_message_in: 'text-green-500',
  whatsapp_message_out: 'text-blue-500',
  moment_captured: 'text-amber-500',
  task_created: 'text-gray-500',
  task_completed: 'text-green-600',
  approval_granted: 'text-green-500',
  approval_rejected: 'text-red-500',
  activity_tracked: 'text-purple-500',
  question_answered: 'text-cyan-500',
  summary_generated: 'text-orange-500'
}
```

### Database Tables Reference

| Table | Module | Key Timestamp |
|-------|--------|---------------|
| `whatsapp_messages` | Connections | `message_timestamp` |
| `moments` | Journey | `created_at` |
| `work_items` | Atlas | `completed_at` / `created_at` |
| `grant_responses` | Grants | `approved_at` / `rejected_at` |
| `whatsapp_user_activity` | Connections | `created_at` |
| `daily_questions` | Journey | `answered_at` |
| `weekly_summaries` | Journey | `generated_at` |

---

**Document Version:** 1.0
**Last Updated:** January 9, 2026
**Author:** Master Architect (Claude Opus 4.5)
**Status:** Ready for Implementation
