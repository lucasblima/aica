# Journey Timeline Architecture
## Visual Overview & Data Flow

---

## Current State (Before)

```
┌─────────────────────────────────────────────────────────┐
│        JourneyFullScreen (Minha Jornada)                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ╔═══════════════════════════════════════════════════╗   │
│  ║  HEADER: Minha Jornada + Consciousness Points    ║   │
│  ╚═══════════════════════════════════════════════════╝   │
│                                                           │
│  ┌───────────────┬─────────────────────────────────┐    │
│  │  Zone 1       │  Zone 2 & 3: Timeline + Insights│    │
│  │  (Sidebar)    │                                 │    │
│  │               │  ┌─────────────────────────────┐│    │
│  │ • CP Score    │  │ Timeline | Insights | Search││    │
│  │ • Daily Q     │  └─────────────────────────────┘│    │
│  │               │                                 │    │
│  │               │  ┌─────────────────────────────┐│    │
│  │               │  │  LIFE DECADES STRIP (BROKEN)││    │
│  │               │  │                              ││    │
│  │               │  │ [Decade 1] [Decade 2] ... [8]││    │
│  │               │  │ (Shows age progress only)    ││    │
│  │               │  │ (Clicking does nothing)      ││    │
│  │               │  └─────────────────────────────┘│    │
│  │               │                                 │    │
│  │               │  ┌─────────────────────────────┐│    │
│  │               │  │  MOMENTS TIMELINE            ││    │
│  │               │  │                              ││    │
│  │               │  │ [Moment 1: Capturing...]     ││    │
│  │               │  │ [Moment 2: Reflecting...]    ││    │
│  │               │  │ [Moment 3: Journaling...]    ││    │
│  │               │  │                              ││    │
│  │               │  │ Only user-captured moments   ││    │
│  │               │  │ Missing: All other events    ││    │
│  │               │  └─────────────────────────────┘│    │
│  │               │                                 │    │
│  └───────────────┴─────────────────────────────────┘    │
│                                                           │
└─────────────────────────────────────────────────────────┘

DATA SOURCES NOT DISPLAYED:
❌ WhatsApp messages
❌ Task completions
❌ Approvals/rejections
❌ System activities
❌ User activities
```

---

## Target State (After Redesign)

```
┌─────────────────────────────────────────────────────────┐
│        JourneyFullScreen (Minha Jornada)                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ╔═══════════════════════════════════════════════════╗   │
│  ║  HEADER: Minha Jornada + Consciousness Points    ║   │
│  ╚═══════════════════════════════════════════════════╝   │
│                                                           │
│  ┌───────────────┬─────────────────────────────────┐    │
│  │  Zone 1       │  Zone 2 & 3: Timeline + Insights│    │
│  │  (Sidebar)    │                                 │    │
│  │               │  ┌─────────────────────────────┐│    │
│  │ • CP Score    │  │ Atividades | Insights | Search││   │
│  │ • Daily Q     │  └─────────────────────────────┘│    │
│  │               │                                 │    │
│  │               │  ┌─────────────────────────────┐│    │
│  │               │  │  TIMELINE FILTER BAR         ││    │
│  │               │  │                              ││    │
│  │               │  │ [💬 WhatsApp] [📝 Moments]   ││    │
│  │               │  │ [✓ Tarefas] [✅ Aprovações] ││    │
│  │               │  │ [Última semana ▼]            ││    │
│  │               │  └─────────────────────────────┘│    │
│  │               │                                 │    │
│  │               │  ┌─────────────────────────────┐│    │
│  │               │  │  UNIFIED TIMELINE            ││    │
│  │               │  │                              ││    │
│  │               │  │ ━━━━ Today                  ││    │
│  │               │  │  14:23 💬 Message from João  ││    │
│  │               │  │         "Olá! Tudo bem?"     ││    │
│  │               │  │         sentiment: positive  ││    │
│  │               │  │                              ││    │
│  │               │  │  12:45 ✓ Task Completed      ││    │
│  │               │  │         "Design API docs"    ││    │
│  │               │  │         priority: high       ││    │
│  │               │  │                              ││    │
│  │               │  │ ━━━━ Yesterday              ││    │
│  │               │  │  18:30 📝 Momento: Grateful  ││    │
│  │               │  │         "Today was amazing..." ││   │
│  │               │  │         emotion: 🥰          ││    │
│  │               │  │                              ││    │
│  │               │  │  09:15 📊 WhatsApp Activity  ││    │
│  │               │  │         "Analytics viewed"   ││    │
│  │               │  │                              ││    │
│  │               │  │  [Load More...]              ││    │
│  │               │  └─────────────────────────────┘│    │
│  │               │                                 │    │
│  └───────────────┴─────────────────────────────────┘    │
│                                                           │
└─────────────────────────────────────────────────────────┘

DATA SOURCES DISPLAYED:
✅ WhatsApp messages (incoming/outgoing)
✅ Task completions (from Atlas)
✅ Approvals/rejections (from Grants)
✅ System activities (analytics views, connections)
✅ Manual moments (existing)
✅ Daily questions (answered)
✅ Weekly summaries (generated)
```

---

## Event Type Mapping

```
Source Table          → Event Type              → Icon   Color
────────────────────────────────────────────────────────────────

WHATSAPP_MESSAGES
  direction=incoming  → whatsapp_message_in    → 💬    green
  direction=outgoing  → whatsapp_message_out   → 📤    blue

MOMENTS
  all                 → moment_captured         → 📝    amber

WORK_ITEMS
  status=completed    → task_completed         → ✓     green
  created             → task_created           → ⚙️     gray

GRANT_RESPONSES
  approved            → approval_granted       → ✅    green
  rejected            → approval_rejected      → ❌    red

WHATSAPP_USER_ACTIVITY
  connection          → activity_connection    → 🔗    blue
  analytics_view      → activity_analytics     → 📊    purple
  consent_grant       → activity_consent       → 🔐    indigo

DAILY_QUESTIONS
  answered            → question_answered      → ❓    cyan

WEEKLY_SUMMARIES
  generated           → summary_generated      → 📈    orange
```

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  USER ACTIONS ACROSS MODULES                                      │
└──────────────────────────────────────────────────────────────────┘
     │
     ├─→ WhatsApp Integration
     │   └─→ whatsapp_messages table
     │
     ├─→ Journey Module
     │   ├─→ moments table
     │   ├─→ daily_questions table
     │   └─→ weekly_summaries table
     │
     ├─→ Atlas Module
     │   └─→ work_items table
     │
     ├─→ Grants Module
     │   └─→ grant_responses table
     │
     └─→ Connections Module
         └─→ whatsapp_user_activity table

         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  unifiedTimelineService.ts (APPLICATION LAYER)                   │
│                                                                    │
│  getUnifiedTimeline(userId, filters)                             │
│    ├─ Query whatsapp_messages                                    │
│    ├─ Query moments                                              │
│    ├─ Query work_items                                           │
│    ├─ Query grant_responses                                      │
│    ├─ Query whatsapp_user_activity                               │
│    └─ Merge + Sort by timestamp + Return UnifiedTimelineEvent[] │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  useUnifiedTimeline(options) - React Hook                        │
│                                                                    │
│  Returns:                                                          │
│  - events: UnifiedTimelineEvent[]                                │
│  - days: TimelineDay[]                                           │
│  - isLoading: boolean                                            │
│  - filters: { sources, dates, sentiment }                        │
│  - loadMore(), refresh(), updateFilters()                        │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  React Components (UI Layer)                                      │
│                                                                    │
│  JourneyFullScreen                                               │
│  └─ UnifiedTimelineView                                          │
│     ├─ TimelineFilter (source + date toggles)                    │
│     └─ TimelineDay (grouped by date)                             │
│        └─ TimelineEventCard (individual event)                   │
│           ├─ Icon + Type + Time                                  │
│           ├─ Title + Preview                                     │
│           ├─ Sentiment/Emotion badges                            │
│           └─ Expand button (details)                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy (After Redesign)

```
JourneyFullScreen
├── Header
│   ├── Title + Icon
│   ├── CP Score
│   └── Add Moment + Help + Settings
│
└── Main Content (3-Zone Layout)
    ├── Zone 1: Sidebar
    │   ├── CP Score (detailed)
    │   └── Daily Question Card
    │
    └── Zone 2&3: Tabbed Content
        ├── Tab: "Atividades" (renamed from Timeline Viva)
        │   ├── TimelineFilter
        │   │   ├── Source toggles: WhatsApp, Moments, Tasks, Approvals
        │   │   └── Date range: Last 7/30/90 days, All
        │   │
        │   └── UnifiedTimelineView
        │       ├── TimelineDay (Today)
        │       │   ├── TimelineEventCard
        │       │   │   ├── Icon + Badge
        │       │   │   ├── Title + Time
        │       │   │   ├── Content preview
        │       │   │   └── [Expand]
        │       │   │
        │       │   └── TimelineEventCard
        │       │
        │       └── TimelineDay (Yesterday)
        │           └── [Events...]
        │
        ├── Tab: "Insights & Patterns" (unchanged)
        │   └── WeeklySummaryCard
        │
        └── Tab: "Busca" (extended scope)
            └── JourneySearchPanel
                (Now searches: moments, messages, tasks, approvals, activities)
```

---

## Type Structure

```typescript
// Core Event Type
UnifiedTimelineEvent {
  id: UUID
  source: 'whatsapp' | 'moment' | 'task' | 'approval' | 'activity' | 'question' | 'summary'
  eventType: 'whatsapp_message_in' | 'moment_captured' | 'task_completed' | ...

  // Display
  title: string                    // "Message from João"
  description: string              // "Olá! Tudo bem?"
  icon: string                     // "💬"
  color: string                    // "text-green-500"

  // Content
  content?: string                 // Full message/moment text
  metadata: Record<string, any>    // Source-specific data

  // Sentiment/Emotion
  sentiment?: { label, score }     // "positive", 0.8
  emotion?: string                 // "😊"
  tags?: string[]                  // ["#trabalho", "#gratidão"]

  // Timestamps
  eventTime: Date                  // When it actually happened
  displayTime: Date                // What to show user

  // Navigation
  sourceId: string                 // moment.id / message.id / etc
  sourceTable: string              // "moments" / "whatsapp_messages" / etc
}

// Grouped for display
TimelineDay {
  date: Date
  events: UnifiedTimelineEvent[]
  summaryStats?: {
    totalEvents: number
    sentimentTrend: 'positive' | 'negative' | 'neutral'
  }
}

// Filtering
TimelineFilter {
  sources?: ['whatsapp', 'moment', 'task']
  startDate?: Date
  endDate?: Date
  sentiments?: ['positive', 'neutral']
  searchQuery?: string
}
```

---

## Database Query Patterns (Optimized)

### Pattern 1: Get events for date range
```sql
SELECT * FROM whatsapp_messages
WHERE user_id = $1
  AND message_timestamp BETWEEN $2 AND $3
ORDER BY message_timestamp DESC
LIMIT 50;

SELECT * FROM moments
WHERE user_id = $1
  AND created_at BETWEEN $2 AND $3
ORDER BY created_at DESC
LIMIT 50;

-- (repeat for work_items, grant_responses, etc.)
```

### Pattern 2: Get events with sentiment
```sql
SELECT
  id, sentiment_label, message_timestamp
FROM whatsapp_messages
WHERE user_id = $1
  AND sentiment_label IN ('positive', 'very_positive')
ORDER BY message_timestamp DESC;
```

### Pattern 3: Filter by event source
```sql
-- User has selected only WhatsApp + Tasks
-- Fetch from whatsapp_messages and work_items
-- Skip moments, approvals, activities
```

---

## Performance Considerations

### Current Bottlenecks
- ❌ Multiple individual queries (1 per source table)
- ❌ No pagination per source
- ❌ Full text search not optimized
- ❌ No caching

### Solutions
1. **Batch Queries**: Fetch all sources in parallel Promise.all()
2. **Pagination**: Load 50 events per scroll (distributed across sources)
3. **Indexes**: Ensure indexes on (user_id, timestamp) for each table
4. **Caching**: Cache timeline for 5 minutes, invalidate on new events
5. **Optional View**: Create unified_timeline_events view (see schema section)

### Index Verification Needed
```sql
-- Check existing indexes:
\d whatsapp_messages
\d moments
\d work_items
\d grant_responses

-- Key indexes to ensure exist:
idx_whatsapp_messages_user_timestamp  ✓ (exists)
idx_moments_user_id                   ✓ (exists)
idx_moments_created_at                ✓ (exists)
idx_work_items_user_id                ✓ (exists)
-- More checks in JOURNEY_INVESTIGATION_REPORT.md
```

---

## Navigation Flow (User Perspective)

```
User opens "Minha Jornada"
│
├─ Sees CP Score + Daily Question (Zona 1)
│
├─ Clicks "Atividades" tab (Zona 2&3)
│  │
│  ├─ Sees Timeline Filter
│  │  (Default: All sources, Last 7 days)
│  │
│  ├─ Clicks "💬 WhatsApp" filter
│  │  └─ Timeline updates to show only messages
│  │
│  ├─ Clicks "Última semana ▼" → "Último mês"
│  │  └─ Timeline expands to show more events
│  │
│  └─ Scrolls down
│     ├─ Sees events grouped by day
│     ├─ Clicks event to expand
│     │  └─ Shows full content + sentiment + related items
│     └─ Clicks [Load More]
│        └─ Loads next 50 events
│
├─ Clicks "Insights & Patterns" tab
│  └─ Shows weekly summary (unchanged)
│
└─ Clicks "Busca" tab
   ├─ Searches all events
   └─ Shows results across all sources
```

---

## File Creation Checklist

### NEW FILES (Create)
- [ ] `src/modules/journey/types/unifiedEvent.ts` (Type definitions)
- [ ] `src/modules/journey/services/unifiedTimelineService.ts` (Data fetching)
- [ ] `src/modules/journey/hooks/useUnifiedTimeline.ts` (React hook)
- [ ] `src/modules/journey/components/timeline/UnifiedTimelineView.tsx` (Main component)
- [ ] `src/modules/journey/components/timeline/TimelineEventCard.tsx` (Event card)
- [ ] `src/modules/journey/components/timeline/TimelineFilter.tsx` (Filter bar)

### MODIFY FILES (Update)
- [ ] `src/modules/journey/views/JourneyFullScreen.tsx` (Use new timeline)
- [ ] `src/modules/journey/index.ts` (Barrel exports)

### ARCHIVE/DELETE (Optional)
- [ ] `src/modules/journey/components/ceramic/LifeDecadesStrip.tsx` (Replace or keep as optional)

### DATABASE (Optional, Performance)
- [ ] `supabase/migrations/20260110_create_unified_timeline_view.sql` (View for optimization)

---

## Timeline Implementation Milestones

**Milestone 1: Data Layer** (2-3 hours)
- Create UnifiedTimelineEvent types
- Create unifiedTimelineService (parallel queries)
- Create useUnifiedTimeline hook
- Test queries with sample data

**Milestone 2: Basic Display** (2-3 hours)
- Create UnifiedTimelineView component
- Create TimelineEventCard component
- Integrate into JourneyFullScreen
- Display events chronologically

**Milestone 3: Filtering & Polish** (2 hours)
- Create TimelineFilter component
- Add source toggles (WhatsApp, Moments, Tasks, etc.)
- Add date range selector
- Add expand/collapse interactions

**Milestone 4: Enhancement** (1-2 hours, optional)
- Timeline statistics sidebar
- Related events suggestions
- Performance optimization (caching)
- Search across all events

---

## Success Metrics

- ✅ Timeline displays events from all 7 sources
- ✅ Users can filter by source + date
- ✅ Events grouped by day
- ✅ Pagination works (load 50 at a time)
- ✅ Sentiment/emotion badges visible
- ✅ No navigation issues (all tabs work)
- ✅ Response time < 500ms for 50 events
- ✅ No console errors

