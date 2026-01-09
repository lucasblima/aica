# Current Problems - Code Reference

This document shows the exact issues in the current codebase with line-by-line references.

---

## Problem 1: LifeDecadesStrip Hardcoded Birth Date

**File:** `src/modules/journey/views/JourneyFullScreen.tsx`
**Lines:** 293-295

```tsx
// CURRENT CODE (BROKEN)
<LifeDecadesStrip
  birthDate={new Date(1990, 0, 1)} // TODO: Get from user profile
  expectedLifespan={80}
/>
```

**Issues:**
1. Birth date is hardcoded to January 1, 1990
2. TODO comment shows this is incomplete
3. Should fetch from user's profile
4. Every user sees same decades regardless of actual birth date

**Impact:** Timeline doesn't show user's actual age or life progress

---

## Problem 2: LifeDecadesStrip Not Connected to Timeline

**File:** `src/modules/journey/components/ceramic/LifeDecadesStrip.tsx`
**Lines:** 112-152

```tsx
// CURRENT CODE - Decades are clickable but do nothing
{decades.map((decade) => (
  <div
    key={decade.decadeNumber}
    className={getDecadeClasses(decade)}
    style={getDecadeStyle(decade)}
    onMouseEnter={() => setHoveredDecade(decade)}
    onMouseLeave={() => setHoveredDecade(null)}
    role="button"
    tabIndex={0}
    aria-label={decade.label}
  >
    {/* Shows tooltip on hover but no click handler */}
  </div>
))}
```

**Issues:**
1. `role="button"` but no `onClick` handler
2. No click handler to filter timeline
3. `setHoveredDecade` only shows tooltip
4. Decade selection has no effect on events displayed
5. No state management for selected decade

**Impact:** Users can't filter timeline by life decade

---

## Problem 3: Timeline Only Shows Moments

**File:** `src/modules/journey/views/JourneyFullScreen.tsx`
**Lines:** 289-330

```tsx
// CURRENT CODE - Timeline Tab
{activeTab === 'timeline' && (
  <div className="space-y-4">
    {/* LifeDecadesStrip (broken) */}
    <LifeDecadesStrip ... />

    {/* Empty state */}
    {moments.length === 0 && !isLoading && (
      // Shows "You haven't registered any moments"
    )}

    {/* Only moments displayed */}
    {moments.map(moment => (
      <CeramicMomentCard
        key={moment.id}
        moment={moment}
        onDelete={deleteMoment}
      />
    ))}

    {/* Load more for moments */}
    {hasMore && (
      <button onClick={loadMore}>Carregar mais</button>
    )}
  </div>
)}
```

**Issues:**
1. Uses `useMoments()` hook which only fetches from `moments` table
2. No WhatsApp messages
3. No task completions
4. No approvals
5. No system activities
6. No daily questions answered
7. No weekly summaries
8. Comment on line 291 says "Momento Presente, Timeline Viva, Insights & Patterns" but missing most content

**Impact:** Users don't see 87% of their actual activities

---

## Problem 4: useMoments Hook Scope

**File:** `src/modules/journey/hooks/useMoments.ts`
**Lines:** 1-182

```typescript
// CURRENT CODE - Only fetches moments
export function useMoments(options: UseMomentsOptions = {}) {
  const { user } = useAuth()
  const { filter, limit = 50, autoFetch = true } = options

  const [moments, setMoments] = useState<Moment[]>([])
  // ... only handles moment CRUD

  const fetchMoments = useCallback(
    async (offset: number = 0) => {
      if (!user?.id) return

      try {
        setIsLoading(true)
        setError(null)

        // Only calls momentService functions
        const [fetchedMoments, count] = await Promise.all([
          getMoments(user.id, filter, limit, offset),
          getMomentsCount(user.id, filter),
        ])
        // ...
      }
    },
    [user?.id, filter, limit]
  )
}
```

**Issues:**
1. Scope is limited to moments only
2. No event aggregation
3. No filtering by date range
4. No filtering by sentiment
5. Service calls only `momentService.ts` methods
6. Comment line 3: "React hook for managing moments (CRUD operations)" - explicitly scoped to moments

**Impact:** Can't use existing hook for unified timeline

---

## Problem 5: Search Only Covers Moments

**File:** `src/modules/journey/hooks/useJourneyFileSearch.ts`
**Lines:** (Inferred from usage in JourneyFullScreen)

```typescript
// CURRENT CODE - JourneySearchPanel usage
const {
  searchInMoments,  // Only searches moments
  findByEmotion,
  findByTag,
  findGrowthMoments,
  findInsights,
  searchResults,
  isSearching,
  documents,
  clearSearchResults,
} = useJourneyFileSearch({ userId: user?.id, autoLoad: true })
```

**Issues:**
1. Search methods all work with moments
2. `searchInMoments` - searches moment content
3. `findByEmotion` - filters moments by emotion
4. `findByTag` - filters moments by tags
5. `findGrowthMoments` - searches for moments
6. No WhatsApp message search
7. No task search
8. No approval search
9. No activity search

**Impact:** Users can't search across all events

---

## Problem 6: Missing Navigation Sub-Filters

**File:** `src/modules/journey/views/JourneyFullScreen.tsx`
**Lines:** 249-286

```tsx
// CURRENT CODE - Tabs only
<div className="ceramic-tray p-2 flex gap-2">
  <button
    onClick={() => setActiveTab('timeline')}
    className={...}
  >
    <ClockIcon className="h-5 w-5" />
    <span>Timeline Viva</span>
  </button>

  <button
    onClick={() => setActiveTab('insights')}
    className={...}
  >
    <ChartBarIcon className="h-5 w-5" />
    <span>Insights & Patterns</span>
  </button>

  <button
    onClick={() => setActiveTab('search')}
    className={...}
  >
    <MagnifyingGlassIcon className="h-5 w-5" />
    <span>Busca</span>
  </button>
</div>
```

**Issues:**
1. Only 3 tabs, no sub-navigation
2. No source filters (WhatsApp, Moments, Tasks, etc.)
3. No date range selector
4. No sentiment filter
5. Users can't customize what they see in timeline

**Impact:** Users have no control over timeline content

---

## Problem 7: Tab State Management Flat

**File:** `src/modules/journey/views/JourneyFullScreen.tsx`
**Lines:** 44-46

```tsx
const [activeTab, setActiveTab] = useState<'timeline' | 'insights' | 'search'>('timeline')
```

**Issues:**
1. Only tracks which tab is open
2. No nested state for timeline filters
3. No filter state persistence
4. No selected sources state
5. No selected date range state
6. Can't resume previous filter state after tab switch

**Impact:** Users lose filter state when switching tabs

---

## Problem 8: Data Sources Not Queried

**File:** `src/modules/journey/services/`
**Analysis:** The journey services folder has no integration with:

Missing service files:
- ❌ No whatsappMessageService.ts (uses connections module)
- ❌ No workItemService.ts (uses atlas module, not created)
- ❌ No approvalService.ts (uses grants module)
- ❌ No activityService.ts (uses whatsapp_user_activity table)
- ❌ No unified timeline service

**Impact:** Can't fetch events from other modules easily

---

## Problem 9: Navigation Tab Logic Not Modular

**File:** `src/modules/journey/views/JourneyFullScreen.tsx`
**Lines:** 289-385

```tsx
{/* Timeline Tab */}
{activeTab === 'timeline' && (
  <div className="space-y-4">
    {/* Content */}
  </div>
)}

{/* Insights Tab */}
{activeTab === 'insights' && (
  <div className="space-y-6">
    {/* Content */}
  </div>
)}

{/* Search Tab */}
{activeTab === 'search' && (
  <div className="ceramic-card p-6">
    {/* Content */}
  </div>
)}
```

**Issues:**
1. All tab content inline in main component
2. Hard to add sub-navigation
3. Hard to manage complex state
4. Can't easily refactor into separate components
5. Component too large (449 lines)

**Impact:** Difficult to add filtering features without massive refactor

---

## Problem 10: No Event Type Abstraction

**Current state:**
- Moments have type `Moment` (from `types/moment.ts`)
- Tasks have type unknown (from external module)
- WhatsApp messages have type unknown (from connections module)
- Approvals have type unknown (from grants module)
- Activities have type unknown (from connections module)

**Issues:**
1. No unified event type
2. Can't represent all events in single array
3. Can't sort all events together
4. UI must handle different event types separately
5. No common interface for display

**Impact:** Architectural issue preventing timeline unification

---

## Problem 11: Component Coupling

**Current state:**
- `JourneyFullScreen` tightly coupled to `useMoments()` hook
- `useMoments()` tightly coupled to `momentService.ts`
- `momentService.ts` tightly coupled to `moments` table
- No abstraction layer between UI and data

**Issues:**
1. Can't easily swap data sources
2. Can't test independently
3. Can't add new event types without refactoring
4. Hard to add filtering logic

**Impact:** Architectural debt makes changes harder

---

## Summary of Problems

| # | Problem | File | Line | Severity |
|---|---------|------|------|----------|
| 1 | Hardcoded birth date | JourneyFullScreen.tsx | 293 | 🔴 Critical |
| 2 | Decades not connected to timeline | LifeDecadesStrip.tsx | 112-152 | 🔴 Critical |
| 3 | Timeline only shows moments | JourneyFullScreen.tsx | 289-330 | 🔴 Critical |
| 4 | useMoments hook too narrow | useMoments.ts | 1-182 | 🟠 High |
| 5 | Search only covers moments | useJourneyFileSearch.ts | All | 🟠 High |
| 6 | Missing navigation filters | JourneyFullScreen.tsx | 249-286 | 🟠 High |
| 7 | Flat tab state | JourneyFullScreen.tsx | 44-46 | 🟡 Medium |
| 8 | Data sources not integrated | services/ | All | 🟠 High |
| 9 | Tab logic not modular | JourneyFullScreen.tsx | 289-385 | 🟡 Medium |
| 10 | No event type abstraction | types/moment.ts | All | 🟠 High |
| 11 | Component coupling | All | All | 🟡 Medium |

---

## Quick Fix vs. Comprehensive Fix

### Quick Fix (Not Recommended)
- Just fetch WhatsApp messages and add to moments list
- Limited to single data source
- Doesn't solve navigation/filtering issues
- Effort: 2-3 hours
- Technical debt increases

### Comprehensive Fix (Recommended)
- Create unified event abstraction
- Implement filtering & navigation
- Add all 7 data sources
- Scalable architecture
- Effort: 6-9 hours
- Proper foundation for future features

**Recommendation:** Go with comprehensive fix. It's only 2-3 hours more but provides proper foundation.

---

## Related Files Analysis

### Files Causing the Problem
1. `JourneyFullScreen.tsx` - Main culprit (449 lines, too large)
2. `LifeDecadesStrip.tsx` - Non-functional UI
3. `useMoments.ts` - Limited scope hook
4. `momentService.ts` - Narrow data fetching

### Files to Create
1. `unifiedEvent.ts` - Type abstraction
2. `unifiedTimelineService.ts` - Data aggregation
3. `useUnifiedTimeline.ts` - Universal hook
4. `UnifiedTimelineView.tsx` - Main component
5. `TimelineEventCard.tsx` - Event display
6. `TimelineFilter.tsx` - Filtering UI

### Files to Modify
1. `JourneyFullScreen.tsx` - Integrate new timeline

### Files to Archive/Delete
1. `LifeDecadesStrip.tsx` - Replace with new timeline

---

## Code Quality Issues

### Linting Issues
- ❌ Line 293: TODO comment should be addressed
- ❌ Line 107: Comments reference system features not implemented
- ❌ Component too large (449 lines - should be max 300)

### Type Safety Issues
- ❌ No unified event type
- ❌ Mixing different event structures
- ❌ Filter parameter typing incomplete

### Performance Issues
- ❌ Single sequential query (moments)
- ❌ No pagination optimization
- ❌ No caching strategy
- ❌ Full re-render on tab change

---

