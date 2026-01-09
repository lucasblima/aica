# Journey Module Investigation Report
## Current State Analysis & Timeline Redesign Requirements

**Date:** January 9, 2026
**Module:** Minha Jornada (Journey)
**Status:** Analysis Complete

---

## Executive Summary

The Journey module currently displays **life decades** (a memento mori visualization) in the timeline view, which does not reflect actual user interactions with Aica. The required redesign is to replace this with a **unified activity timeline** showing all user interactions across multiple channels and modules.

### Key Finding
The infrastructure for capturing user events already exists scattered across multiple tables. The challenge is aggregating and unifying them into a coherent timeline display.

---

## 1. CURRENT ISSUE: What's Happening Now

### 1.1 Current LifeDecadesStrip Component
**File:** `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\journey\components\ceramic\LifeDecadesStrip.tsx`

**What it does:**
- Shows 10-year age blocks (decades) based on user's birth_date
- Displays visual progression of life (memento mori concept)
- Current decade highlighted with progress indicator
- **Problem:** Hardcoded birth_date in JourneyFullScreen (line 293): `birthDate={new Date(1990, 0, 1)}`

**The Problem:**
```tsx
// Line 293 in JourneyFullScreen.tsx
<LifeDecadesStrip
  birthDate={new Date(1990, 0, 1)} // TODO: Get from user profile
  expectedLifespan={80}
/>
```

This shows:
- Decades 1-8 (80 years total)
- Current age, total life progress
- But NOTHING about actual user events/interactions
- Navigation is broken - clicking decades doesn't show related events

### 1.2 Current Timeline Tab Display
**File:** `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\journey\views\JourneyFullScreen.tsx` (lines 289-330)

**Current flow:**
1. LifeDecadesStrip displays (lines 292-295)
2. User moments displayed below (lines 312-318)
3. "Load More" button for pagination (lines 320-328)

**The moments shown are ONLY:**
- Manually captured moments (via MomentCapture)
- Text, audio, or combined content
- User-selected emotion
- User-added tags

**Missing from display:**
- WhatsApp interactions
- Work item completions
- Approvals/rejections
- System activities
- Cross-module interactions

---

## 2. REQUIRED TIMELINE: Event Sources & Data Structure

### 2.1 User Event Sources (Data Currently Exists)

#### A. **WHATSAPP INTERACTIONS**
**Table:** `whatsapp_messages`
**File:** `supabase/migrations/20251230_whatsapp_messages.sql`

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Direction and type
  direction TEXT (incoming | outgoing),
  message_type TEXT (text | audio | image | video | document),

  -- Content
  content_text TEXT,
  content_transcription TEXT,
  content_ocr TEXT,

  -- AI Analysis
  sentiment_score DECIMAL,
  sentiment_label TEXT,
  detected_intent TEXT,
  detected_topics TEXT[],

  -- Status
  processing_status TEXT,
  message_timestamp TIMESTAMPTZ,  -- ORIGINAL WHATSAPP TIME
  created_at TIMESTAMPTZ,

  -- Metadata
  contact_name TEXT,
  contact_phone TEXT
);
```

**Data Available:**
- Message direction (incoming/outgoing)
- Message type (text, audio, image, etc.)
- Content (text or transcription)
- Sentiment analysis
- Intent detection (question, complaint, gratitude, request, information)
- Topics/tags
- Timestamps (both message and processing time)
- Contact information

**Query Example:**
```sql
SELECT
  message_id,
  contact_name,
  direction,
  message_type,
  content_text || COALESCE(content_transcription, '') as content,
  sentiment_label,
  detected_intent,
  message_timestamp
FROM whatsapp_messages
WHERE user_id = $1
ORDER BY message_timestamp DESC
LIMIT 50;
```

#### B. **MOMENTS (Manual Captures)**
**Table:** `moments`
**File:** `supabase/migrations/20251206_journey_redesign.sql`

```sql
CREATE TABLE moments (
  id UUID PRIMARY KEY,
  user_id UUID,

  type TEXT (audio | text | both),
  content TEXT,
  audio_url TEXT,

  emotion TEXT,
  sentiment_data JSONB,

  tags TEXT[],
  location TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Data Available:**
- User-generated content
- Emotion selection (20+ emotions: happy, sad, anxious, etc.)
- Sentiment analysis (JSONB structure)
- Tags
- Location
- Timestamps

#### C. **WORK ITEMS (Atlas Module)**
**Table:** `work_items`
**File:** `supabase/migrations/20251208_create_work_items_table.sql`

```sql
CREATE TABLE work_items (
  id UUID PRIMARY KEY,
  user_id UUID,

  title TEXT,
  description TEXT,

  status TEXT (todo | in_progress | completed | cancelled),
  priority TEXT,

  completed_at TIMESTAMPTZ,
  scheduled_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Data Available:**
- Task completion events (completed_at)
- Task creation
- Status changes
- Priority information

#### D. **APPROVALS (Grant Module)**
**Table:** `grant_responses`
**File:** `supabase/migrations/20251209000001_add_approval_fields_to_responses.sql`

```sql
CREATE TABLE grant_responses (
  id UUID PRIMARY KEY,
  user_id UUID,

  approval_status TEXT (pending | approved | rejected | needs_revision),
  approval_notes TEXT,

  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ
);
```

**Data Available:**
- Approval decisions
- Rejection reasons
- Approval metadata (timestamps, notes)

#### E. **WHATSAPP ACTIVITIES (Gamification)**
**Table:** `whatsapp_user_activity`
**File:** `supabase/migrations/20250101_whatsapp_gamification_tracking.sql`

```sql
CREATE TABLE whatsapp_user_activity (
  id UUID PRIMARY KEY,
  user_id UUID,

  activity_type TEXT (
    connection | consent_grant | analytics_view |
    contact_analysis | anomaly_check
  ),

  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

**Data Available:**
- Connection events
- Consent grants
- Analytics views
- Contact analysis events
- Anomaly checks

#### F. **DAILY QUESTIONS (Journey)**
**Table:** `daily_questions`
**File:** `supabase/migrations/20251217_daily_questions_ai_integration.sql`

**Data Available:**
- Question answered events
- User responses
- Response timestamps

#### G. **WEEKLY SUMMARIES (Journey)**
**Table:** `weekly_summaries`
**File:** `supabase/migrations/20251206_journey_redesign.sql`

**Data Available:**
- Weekly summary generation (system event)
- User reflection additions

#### H. **CONSCIOUSNESS POINTS (Gamification)**
**Data:** Tracked in CP awards via RPC `award_consciousness_points()`

**Events that award CP:**
- Moment registered (+5 CP)
- Daily question answered (+10 CP)
- Weekly reflection added (+20 CP)
- WhatsApp interaction (various)

---

## 3. DATA SOURCES SUMMARY TABLE

| Source | Table | Event Type | Key Fields | Timestamp | Module |
|--------|-------|-----------|-----------|-----------|--------|
| **WhatsApp Message** | `whatsapp_messages` | incoming/outgoing message | direction, type, sentiment, intent | `message_timestamp` | Connections |
| **Manual Moment** | `moments` | user capture | emotion, sentiment, tags | `created_at` | Journey |
| **Task Creation** | `work_items` | task created | title, priority | `created_at` | Atlas |
| **Task Completion** | `work_items` | task completed | status=completed | `completed_at` | Atlas |
| **Approval** | `grant_responses` | approval decision | approval_status | `approved_at/rejected_at` | Grants |
| **Activity** | `whatsapp_user_activity` | system activity | activity_type | `created_at` | Connections |
| **Daily Question** | `daily_questions` | Q&A | response_text | `answered_at` | Journey |
| **Weekly Summary** | `weekly_summaries` | system summary | summary_data | `generated_at` | Journey |

---

## 4. UNIFIED EVENT DATA STRUCTURE

### 4.1 Proposed UnifiedTimelineEvent Type

```typescript
// File to create: src/modules/journey/types/unifiedEvent.ts

export interface UnifiedTimelineEvent {
  // Unique identifier
  id: string;

  // Event source and type
  source: 'whatsapp' | 'moment' | 'task' | 'approval' | 'activity' | 'question' | 'summary';
  eventType:
    | 'whatsapp_message_incoming'
    | 'whatsapp_message_outgoing'
    | 'moment_captured'
    | 'task_created'
    | 'task_completed'
    | 'approval_granted'
    | 'approval_rejected'
    | 'activity_tracked'
    | 'question_answered'
    | 'summary_generated'
    | 'cp_awarded';

  // Display information
  title: string;  // "Message from João", "Task completed: Design API", etc.
  description: string;
  icon: string;  // emoji or icon name
  color: string;  // Color class: text-blue-500, text-green-500, etc.

  // Event content
  content?: string;  // Message text, moment content, etc.
  metadata?: Record<string, any>;  // source-specific data

  // User-facing details
  sentiment?: {
    label: string;
    score: number;
  };
  tags?: string[];
  emotion?: string;

  // Timestamps
  eventTime: Date;  // When the event actually occurred
  displayTime: Date;  // What to show user (same or rounded)

  // Navigation
  sourceId: string;  // Reference to original record
  sourceTable: string;

  // Relationships
  relatedContacts?: {
    name: string;
    phone?: string;
    image?: string;
  }[];
}

// For timeline grouping (chronological sections)
export interface TimelineDay {
  date: Date;
  events: UnifiedTimelineEvent[];
  summaryStats?: {
    totalEvents: number;
    sentimentTrend?: 'positive' | 'negative' | 'neutral';
  };
}

// Filter options for timeline
export interface TimelineFilter {
  sources?: UnifiedTimelineEvent['source'][];
  eventTypes?: UnifiedTimelineEvent['eventType'][];
  startDate?: Date;
  endDate?: Date;
  sentiments?: string[];
  searchQuery?: string;
}
```

---

## 5. DATA SOURCES & EXISTING HOOKS/SERVICES

### 5.1 Current Services in Journey Module

**File:** `src/modules/journey/services/momentService.ts`
- `createMoment()` - Creates moment with CP award
- `getMoments()` - Fetch user moments with pagination
- `getMoment()` - Fetch single moment
- `updateMoment()` - Update moment
- `deleteMoment()` - Delete moment
- `getMomentsCount()` - Count moments

**File:** `src/modules/journey/hooks/useMoments.ts`
- `useMoments()` - Hook for moment CRUD
  - Returns: `moments`, `isLoading`, `create`, `update`, `delete`, `loadMore`
- `useSingleMoment()` - Hook for single moment

**File:** `src/modules/journey/services/consciousnessPointsService.ts`
- CP tracking and stats

**File:** `src/modules/journey/hooks/useConsciousnessPoints.ts`
- `useConsciousnessPoints()` - Fetch CP stats
- `useCPAnimation()` - CP animation state

**File:** `src/modules/journey/services/weeklySummaryService.ts`
- Weekly summary generation and retrieval

### 5.2 Services NOT Yet Created

These need to be created to fetch timeline events:

```typescript
// To create: src/modules/journey/services/unifiedTimelineService.ts

export async function getUnifiedTimeline(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    sources?: UnifiedTimelineEvent['source'][];
  }
): Promise<UnifiedTimelineEvent[]>

export async function getTimelineDay(
  userId: string,
  date: Date
): Promise<TimelineDay>

export async function searchTimeline(
  userId: string,
  query: string,
  limit?: number
): Promise<UnifiedTimelineEvent[]>
```

```typescript
// To create: src/modules/journey/hooks/useUnifiedTimeline.ts

export function useUnifiedTimeline(options?: {
  limit?: number;
  autoFetch?: boolean;
  filter?: TimelineFilter;
}): {
  events: UnifiedTimelineEvent[];
  days: TimelineDay[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}
```

---

## 6. NAVIGABILITY ISSUES IDENTIFIED

### 6.1 Current Navigation Problems

**Issue 1: Broken Decade Selection**
- LifeDecadesStrip decades are clickable but don't filter events
- No connection between visual selection and timeline display
- Decades array not stored in state for filtering

**Issue 2: Tab Navigation Works But Limited**
- Three tabs exist: Timeline Viva, Insights & Patterns, Busca
- Timeline only shows moments (correct)
- Insights shows weekly summary (correct)
- Search/Busca works but only searches moments, not all events

**Issue 3: No Sub-navigation**
- No way to filter timeline by event type
- No way to toggle individual sources on/off
- No way to jump to specific date ranges

**Issue 4: JourneyFullScreen Structure**
- Currently at: `src/modules/journey/views/JourneyFullScreen.tsx`
- Good: Proper 3-zone layout (Momento Presente, Timeline, Insights)
- Good: Tabs are functional
- Missing: Timeline sub-filters, event type toggles

### 6.2 Files Currently Involved

**Navigation/Layout:**
- `src/modules/journey/views/JourneyFullScreen.tsx` (main container)
- `src/modules/journey/views/JourneyMasterCard.tsx` (collapsed view)
- `src/modules/journey/views/JourneyCardCollapsed.tsx`

**Timeline Display:**
- `src/modules/journey/components/ceramic/LifeDecadesStrip.tsx` (to be replaced/refactored)
- `src/modules/journey/components/ceramic/CeramicMomentCard.tsx` (moment display)
- `src/modules/journey/components/timeline/MomentCard.tsx` (alternative moment display)

**Tabs & Panels:**
- Tabs defined in JourneyFullScreen lines 250-286
- Each tab content is conditional render (lines 289-385)

---

## 7. DESIGN RECOMMENDATION: Timeline Visualization Approach

### 7.1 Recommended Implementation

**Option 1: Chronological List Timeline (RECOMMENDED)**
- Keep current 3-zone layout
- Replace LifeDecadesStrip with:
  - Horizontal scrollable event filter bar (WhatsApp, Moments, Tasks, Approvals, etc.)
  - Timeline grouped by **day** (collapsible sections)
  - Each event shows: icon, type, title, time, sentiment/emotion
- Clicking event shows expanded details
- Performance: Paginated, load 50 events per scroll

**Option 2: Visual Timeline with Progress Bars**
- Similar to Instagram Stories layout
- Each source = horizontal strip showing last 14 days
- Hover over day shows events for that day
- More visual but more complex

**Option 3: Hybrid (Best UX)**
- Top: Horizontal filter bar (sources + date range)
- Middle: Week view with daily events blocks
- Bottom: Chronological list for selected day
- Like Google Calendar but for all events

---

## 8. RECOMMENDED MODIFICATIONS: Files to Change

### Phase 1: Data Layer (New Files)

**Create:**
1. `src/modules/journey/types/unifiedEvent.ts` - Event type definitions
2. `src/modules/journey/services/unifiedTimelineService.ts` - Fetch unified events
3. `src/modules/journey/hooks/useUnifiedTimeline.ts` - Timeline hook

**Modify:**
4. `src/modules/journey/services/momentService.ts` - Add unified event mapping

### Phase 2: Display Layer (Refactor Existing)

**Create:**
5. `src/modules/journey/components/timeline/UnifiedTimelineView.tsx` - New timeline component
6. `src/modules/journey/components/timeline/TimelineEventCard.tsx` - Event card
7. `src/modules/journey/components/timeline/TimelineFilter.tsx` - Filter bar

**Modify:**
8. `src/modules/journey/views/JourneyFullScreen.tsx` - Replace LifeDecadesStrip usage
9. Delete or archive: `LifeDecadesStrip.tsx` (or keep as optional memento mori view)

### Phase 3: Optional Enhancements

**Create:**
10. `src/modules/journey/components/timeline/TimelineStatsPanel.tsx` - Stats sidebar
11. `src/modules/journey/hooks/useTimelineStats.ts` - Stats aggregation

---

## 9. DATABASE SCHEMA ADDITIONS (If Needed)

### 9.1 Optional: Create Unified View for Performance

```sql
-- File: supabase/migrations/20260110_create_unified_timeline_view.sql

CREATE OR REPLACE VIEW unified_timeline_events AS
SELECT
  'whatsapp' as source,
  'whatsapp_message_' || direction as event_type,
  id,
  user_id,
  message_timestamp as event_time,
  contact_name || ': ' || COALESCE(content_text, '[Media]') as title,
  content_text as content,
  jsonb_build_object(
    'direction', direction,
    'type', message_type,
    'sentiment', sentiment_label,
    'intent', detected_intent,
    'contact_phone', contact_phone
  ) as metadata
FROM whatsapp_messages
WHERE deleted_at IS NULL

UNION ALL

SELECT
  'moment' as source,
  'moment_captured' as event_type,
  id,
  user_id,
  created_at as event_time,
  'Momento: ' || COALESCE(emotion || ' ', '') || LEFT(content, 50) as title,
  content,
  jsonb_build_object(
    'emotion', emotion,
    'sentiment', sentiment_data->>'sentiment',
    'tags', tags
  ) as metadata
FROM moments

UNION ALL

SELECT
  'task' as source,
  CASE WHEN status = 'completed' THEN 'task_completed' ELSE 'task_created' END as event_type,
  id,
  user_id,
  COALESCE(completed_at, created_at) as event_time,
  'Task: ' || title as title,
  description,
  jsonb_build_object(
    'status', status,
    'priority', priority,
    'completed_at', completed_at
  ) as metadata
FROM work_items

UNION ALL

SELECT
  'approval' as source,
  'approval_' || approval_status as event_type,
  id,
  user_id,
  COALESCE(approved_at, rejected_at, updated_at) as event_time,
  'Grant ' || approval_status,
  approval_notes,
  jsonb_build_object(
    'status', approval_status,
    'notes', approval_notes
  ) as metadata
FROM grant_responses;

-- Create index for performance
CREATE INDEX idx_unified_timeline_user_time
ON whatsapp_messages(user_id, message_timestamp DESC)
WHERE deleted_at IS NULL;
-- (Similar for other source tables)

-- RLS: Ensure view respects user's own data
ALTER VIEW unified_timeline_events OWNER TO postgres;
```

### 9.2 Simpler Approach: Application-Level Aggregation

Instead of database view, fetch from each table separately in service and merge in application (easier to maintain, more flexible).

---

## 10. NAVIGABILITY SOLUTIONS

### 10.1 Tab Enhancements

**Current Tabs (keep):**
- ✅ Timeline Viva (rename to "Atividades" or "Eventos")
- ✅ Insights & Patterns
- ✅ Busca (extend to search all events)

**New Sub-Navigation for Timeline Tab:**

```tsx
// Add filter bar above timeline
<div className="ceramic-tray p-2 flex gap-2">
  {/* Source filters */}
  <button className={`... ${filters.whatsapp ? 'active' : ''}`}>
    💬 WhatsApp
  </button>
  <button className={`... ${filters.moments ? 'active' : ''}`}>
    📝 Momentos
  </button>
  <button className={`... ${filters.tasks ? 'active' : ''}`}>
    ✓ Tarefas
  </button>
  <button className={`... ${filters.approvals ? 'active' : ''}`}>
    ✅ Aprovações
  </button>

  {/* Date range */}
  <select className="...">
    <option value="7">Última semana</option>
    <option value="30">Último mês</option>
    <option value="90">Últimos 3 meses</option>
    <option value="all">Tudo</option>
  </select>
</div>
```

### 10.2 Timeline Details Navigation

Each event card should have:
- Expandable details on click
- Related events link ("Ver momentos similares")
- Jump to source module button
- Context menu (copy, share, archive)

---

## 11. SUMMARY OF CHANGES REQUIRED

### Critical Changes
1. **Replace LifeDecadesStrip** with unified timeline component
2. **Create unifiedTimelineService.ts** to aggregate events from all sources
3. **Create UnifiedTimelineEvent type** for consistent event structure
4. **Create useUnifiedTimeline hook** for component integration
5. **Update JourneyFullScreen** to use new timeline view

### Important Changes
6. **Add timeline filter bar** for source/date filtering
7. **Extend search functionality** to cover all event types
8. **Update navigation** with sub-filters

### Optional Enhancements
9. **Add timeline statistics** (event counts, sentiment trends)
10. **Create unified database view** for performance optimization
11. **Add event grouping** by day/week/month
12. **Add related events** suggestions

---

## 12. RELATED FILES REFERENCE

**Current Journey Module Structure:**
```
src/modules/journey/
├── components/
│   ├── capture/
│   │   ├── AudioRecorder.tsx
│   │   ├── EmotionPicker.tsx
│   │   ├── MomentCapture.tsx
│   │   ├── QuickCapture.tsx
│   │   └── TagInput.tsx
│   ├── ceramic/
│   │   ├── CeramicMomentCard.tsx          (Uses moments)
│   │   ├── LifeDecadesStrip.tsx          (REPLACE/REFACTOR)
│   │   ├── LifeWeeksStrip.tsx
│   │   └── MicrophoneFAB.tsx
│   ├── insights/
│   │   ├── DailyQuestionCard.tsx
│   │   ├── PostCaptureInsight.tsx
│   │   └── WeeklySummaryCard.tsx
│   ├── timeline/
│   │   └── MomentCard.tsx                 (Alternative moment display)
│   ├── gamification/
│   │   └── ConsciousnessScore.tsx
│   └── JourneySearchPanel.tsx
├── hooks/
│   ├── useMoments.ts                      (Moments only)
│   ├── useConsciousnessPoints.ts
│   ├── useDailyQuestion.ts
│   ├── useJourneyFileSearch.ts
│   ├── useWeeklySummary.ts
│   └── useJourneyValidation.ts
├── services/
│   ├── aiAnalysisService.ts
│   ├── consciousnessPointsService.ts
│   ├── dailyQuestionService.ts
│   ├── momentIndexingService.ts
│   ├── momentPersistenceService.ts
│   ├── momentService.ts                  (Moments DB access)
│   ├── questionService.ts
│   └── weeklySummaryService.ts
├── types/
│   ├── consciousnessPoints.ts
│   ├── dailyQuestion.ts
│   ├── moment.ts
│   ├── persistenceTypes.ts
│   ├── sentiment.ts
│   ├── weeklySummary.ts
│   └── index.ts
└── views/
    ├── JourneyFullScreen.tsx              (MAIN VIEW - Modify)
    ├── JourneyMasterCard.tsx              (Collapsed view)
    ├── JourneyCardCollapsed.tsx
    └── JourneyMasterCard.examples.tsx
```

**Database Tables for Timeline:**
- `whatsapp_messages` - Messages
- `moments` - Manual captures
- `work_items` - Tasks
- `grant_responses` - Approvals
- `whatsapp_user_activity` - Activities
- `daily_questions` - Q&A
- `weekly_summaries` - Summaries

---

## Conclusion

The Journey module has good foundation but needs to pivot from showing life decades to showing actual user activities. All the data exists in the database; it just needs to be:

1. **Unified** (aggregate from multiple tables)
2. **Typed** (consistent event structure)
3. **Filtered** (user control over what they see)
4. **Displayed** (new timeline component)

**Estimated implementation:**
- Phase 1 (Data): 2-3 hours
- Phase 2 (UI): 3-4 hours
- Phase 3 (Polish): 1-2 hours
- **Total: 6-9 hours for MVP**

