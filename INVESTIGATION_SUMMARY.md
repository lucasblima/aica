# Journey Module Investigation - Executive Summary

**Date:** January 9, 2026
**Investigation Scope:** Journey module (Minha Jornada) - Current state analysis
**Status:** ✅ Complete - Ready for implementation

---

## Quick Summary

The Journey module currently displays **life decades** (age progress) as its main timeline visualization. This has **no connection to actual user activities**. The required fix is to create a **unified activity timeline** that shows real user interactions across all modules.

**Good news:** All required data already exists in the database across 7 different tables. We just need to aggregate and display it.

---

## Key Findings

### 1. Current Problem
- ❌ **LifeDecadesStrip** shows only life decades (memento mori visualization)
- ❌ Timeline below it shows only manually captured moments
- ❌ No navigation/filtering by event type
- ❌ Missing: WhatsApp messages, task completions, approvals, system activities
- ❌ Broken interaction: Clicking decades doesn't filter events

### 2. Data Sources Available
✅ **7 event sources exist and have data:**

| Source | Table | Events | Data Quality |
|--------|-------|--------|--------------|
| WhatsApp | `whatsapp_messages` | Incoming/outgoing messages | ✅ Rich (sentiment, intent, topics) |
| Manual Moments | `moments` | User captures | ✅ Emotion, sentiment, tags |
| Tasks | `work_items` | Created, completed | ✅ Priority, status, descriptions |
| Approvals | `grant_responses` | Approved, rejected | ✅ Status, notes, timestamps |
| Activities | `whatsapp_user_activity` | System events | ✅ Connection, consent, analytics |
| Daily Questions | `daily_questions` | Q&A responses | ⏳ Partially implemented |
| Weekly Summaries | `weekly_summaries` | Summary generation | ✅ JSONB data available |

### 3. Navigability Issues
1. **Decade blocks are non-functional** - clicking doesn't filter
2. **No event type filtering** - can't toggle sources on/off
3. **No date range filtering** - can't change time window
4. **Search doesn't cover all events** - only searches moments
5. **No sub-navigation in timeline** - flat list only

### 4. Solution Complexity
- **Data Layer:** Low (queries exist, just need aggregation)
- **Service Layer:** Medium (need unifiedTimelineService)
- **UI Layer:** Medium (need new components + refactor)
- **Database:** None (no schema changes needed)
- **Total Effort:** 6-9 hours for MVP

---

## What Needs to Change

### Phase 1: Data & Types (2-3 hours)
Create three new files:
1. `types/unifiedEvent.ts` - Type definitions for unified events
2. `services/unifiedTimelineService.ts` - Aggregate events from 7 sources
3. `hooks/useUnifiedTimeline.ts` - React hook for timeline state

### Phase 2: UI Components (3-4 hours)
Create three new components:
1. `components/timeline/UnifiedTimelineView.tsx` - Main timeline display
2. `components/timeline/TimelineEventCard.tsx` - Individual event card
3. `components/timeline/TimelineFilter.tsx` - Source & date filtering

### Phase 3: Integration (1-2 hours)
Modify one file:
1. `views/JourneyFullScreen.tsx` - Replace LifeDecadesStrip with new timeline

---

## Expected Result

### Before
```
Timeline Viva Tab
├── Life Decades Strip (1-8, shows age progress)
├── List of moments only (manually captured)
└── Missing everything else
```

### After
```
Atividades Tab (renamed from Timeline Viva)
├── Timeline Filter Bar
│   ├── Source toggles: 💬 WhatsApp, 📝 Moments, ✓ Tasks, ✅ Approvals
│   └── Date range: Last 7/30/90 days, All time
├── Grouped by Day
│   ├── Today
│   │   ├── 14:23 💬 Message from João (positive sentiment)
│   │   ├── 12:45 ✓ Task completed: Design API
│   │   └── 09:15 📊 Analytics viewed
│   └── Yesterday
│       ├── 18:30 📝 Grateful moment
│       └── ...
└── Load More button
```

---

## Files to Modify/Create

### CREATE (6 new files)
- `src/modules/journey/types/unifiedEvent.ts` *(types)*
- `src/modules/journey/services/unifiedTimelineService.ts` *(data layer)*
- `src/modules/journey/hooks/useUnifiedTimeline.ts` *(react hook)*
- `src/modules/journey/components/timeline/UnifiedTimelineView.tsx` *(main component)*
- `src/modules/journey/components/timeline/TimelineEventCard.tsx` *(card component)*
- `src/modules/journey/components/timeline/TimelineFilter.tsx` *(filter bar)*

### MODIFY (1 file)
- `src/modules/journey/views/JourneyFullScreen.tsx` *(replace LifeDecadesStrip)*

### DELETE/ARCHIVE (1 file, optional)
- `src/modules/journey/components/ceramic/LifeDecadesStrip.tsx` *(or keep as optional feature)*

---

## Database

**No schema changes needed.** All required tables exist:
- ✅ whatsapp_messages
- ✅ moments
- ✅ work_items
- ✅ grant_responses
- ✅ whatsapp_user_activity
- ✅ daily_questions
- ✅ weekly_summaries

Optional: Create `unified_timeline_events` view for performance (not required for MVP).

---

## Implementation Approach

### Option A: Frontend Aggregation (RECOMMENDED - MVP)
- Fetch from each table separately in parallel
- Merge and sort in application code
- Faster to implement (6-9 hours)
- More flexible for filtering
- Better UX (no database join overhead)

### Option B: Database View
- Create `unified_timeline_events` view combining all sources
- Single query returns all events
- More complex SQL
- Harder to maintain
- Use if performance becomes issue

**Recommendation:** Start with Option A (frontend aggregation), optimize with Option B if needed.

---

## Key Metrics to Track

- ✅ Timeline shows all 7 event sources
- ✅ Filtering works (by source and date)
- ✅ Events load in < 500ms (50 per page)
- ✅ Proper pagination (load more works)
- ✅ Events sorted chronologically
- ✅ Sentiment/emotion visible
- ✅ Navigation between tabs works
- ✅ No console errors

---

## Documents Provided

1. **JOURNEY_INVESTIGATION_REPORT.md** (25 KB)
   - Comprehensive analysis of current state
   - Database schema details
   - Event mapping tables
   - Detailed recommendations

2. **JOURNEY_TIMELINE_ARCHITECTURE.md** (20 KB)
   - Visual diagrams of current vs. target
   - Data flow architecture
   - Component hierarchy
   - Type structure
   - Query patterns

3. **JOURNEY_IMPLEMENTATION_CODE_EXAMPLES.md** (35 KB)
   - Ready-to-implement code snippets
   - Type definitions
   - Service functions
   - React hook
   - Components (partial)

4. **INVESTIGATION_SUMMARY.md** (this file, 5 KB)
   - Executive overview
   - Quick reference

---

## Next Steps

1. **Review** these documents with the team
2. **Approve** the architecture and approach
3. **Implement Phase 1** (data layer - 2-3 hours)
4. **Implement Phase 2** (UI components - 3-4 hours)
5. **Test & iterate** (1-2 hours)
6. **Deploy** via GitHub trigger

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Performance (too many queries) | Medium | Medium | Implement pagination, use Promise.all() |
| Missing events | Low | High | Test all 7 data sources thoroughly |
| Navigation breaking | Low | Medium | Keep existing tabs, only replace timeline |
| Timeline grouped incorrectly | Low | Low | Test date grouping logic extensively |

---

## Success Criteria

- [ ] Users see real activities on timeline (not just life decades)
- [ ] Timeline shows events from all 7 sources
- [ ] Users can filter by source and date
- [ ] Navigation tabs all functional
- [ ] No regression in existing features
- [ ] Performance acceptable (< 1s load time)
- [ ] No console errors

---

## Questions?

See detailed documentation:
1. **Architecture details** → JOURNEY_TIMELINE_ARCHITECTURE.md
2. **Code examples** → JOURNEY_IMPLEMENTATION_CODE_EXAMPLES.md
3. **Full investigation** → JOURNEY_INVESTIGATION_REPORT.md

---

**Investigation completed by:** Claude Haiku 4.5
**Investigation date:** January 9, 2026
**Status:** Ready for implementation
