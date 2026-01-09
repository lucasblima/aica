# Unified Timeline - Phase 1 Usage Guide

## Overview

Phase 1 provides the complete **data layer** for the unified timeline feature, aggregating events from 7 database sources into a single chronological view.

## Files Created

```
src/modules/journey/
├── types/unifiedEvent.ts          # Type definitions for all event types
├── services/unifiedTimelineService.ts  # Data aggregation service
└── hooks/useUnifiedTimeline.ts    # React state management hook
```

## Quick Start

### 1. Basic Timeline Display

```typescript
import { useUnifiedTimeline } from '@/modules/journey/hooks'

function TimelineView() {
  const { events, isLoading, error, hasMore, loadMore } = useUnifiedTimeline()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {events.map((event) => (
        <TimelineEventCard key={event.id} event={event} />
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  )
}
```

### 2. Filtered Timeline

```typescript
import { useUnifiedTimeline } from '@/modules/journey/hooks'

function FilteredTimeline() {
  const { events, filters, setFilters } = useUnifiedTimeline(undefined, {
    sources: ['whatsapp', 'moment'], // Only WhatsApp and moments
    dateRange: 'last7', // Last 7 days
  })

  return (
    <div>
      <FilterBar
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
      />
      <TimelineList events={events} />
    </div>
  )
}
```

### 3. Timeline Stats Dashboard

```typescript
import { useTimelineStats } from '@/modules/journey/hooks'

function StatsWidget() {
  const { stats, isLoading } = useTimelineStats(undefined, 'last30')

  if (isLoading || !stats) return <LoadingSpinner />

  return (
    <div>
      <h3>Total Events: {stats.totalEvents}</h3>
      <ul>
        <li>WhatsApp: {stats.eventsByType.whatsapp}</li>
        <li>Moments: {stats.eventsByType.moment}</li>
        <li>Tasks: {stats.eventsByType.task}</li>
        <li>Questions: {stats.eventsByType.question}</li>
      </ul>
    </div>
  )
}
```

### 4. Custom Event Rendering

```typescript
import {
  UnifiedEvent,
  isWhatsAppEvent,
  isMomentEvent,
  isTaskEvent,
} from '@/modules/journey/types'

function TimelineEventCard({ event }: { event: UnifiedEvent }) {
  // Use type guards for type-safe rendering
  if (isWhatsAppEvent(event)) {
    return (
      <div className="whatsapp-event">
        <span>{event.whatsapp.direction === 'incoming' ? '📥' : '📤'}</span>
        <p>{event.whatsapp.content_text}</p>
        <small>{event.whatsapp.contact_name}</small>
      </div>
    )
  }

  if (isMomentEvent(event)) {
    return (
      <div className="moment-event">
        <span>{event.emotion || '✨'}</span>
        <p>{event.moment.content}</p>
        {event.sentiment && <Badge sentiment={event.sentiment} />}
      </div>
    )
  }

  if (isTaskEvent(event)) {
    return (
      <div className="task-event">
        <span>✓</span>
        <p>{event.task.title}</p>
        <small>Completed: {new Date(event.task.completed_at!).toLocaleDateString()}</small>
      </div>
    )
  }

  // Generic fallback
  return (
    <div className="generic-event">
      <span>{event.displayData.icon}</span>
      <p>{event.displayData.title}</p>
    </div>
  )
}
```

## Available Filters

### Date Range Options

- `'last7'` - Last 7 days
- `'last30'` - Last 30 days (default)
- `'last90'` - Last 90 days
- `'all'` - All time

### Event Source Types

- `'whatsapp'` - WhatsApp messages
- `'moment'` - Manual moments
- `'task'` - Task completions
- `'activity'` - System activities
- `'question'` - Daily question responses
- `'summary'` - Weekly summaries
- `'approval'` - Grant approvals (future)

### Example: Custom Filters

```typescript
const { events, setFilters } = useUnifiedTimeline()

// Filter to show only WhatsApp messages from last week
setFilters({
  sources: ['whatsapp'],
  dateRange: 'last7',
})

// Filter by search term
setFilters({
  searchTerm: 'projeto',
})

// Filter by sentiment
setFilters({
  sentiments: ['positive', 'very_positive'],
})

// Filter by tags
setFilters({
  tags: ['#trabalho', '#saúde'],
})
```

## Service Layer (Direct Usage)

For cases where you need direct access without React state management:

```typescript
import {
  getUnifiedTimeline,
  getEventCount,
  getTimelineStats,
} from '@/modules/journey/services/unifiedTimelineService'

// Get events
const events = await getUnifiedTimeline(userId, {
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  types: ['whatsapp', 'moment'],
  limit: 50,
  offset: 0,
})

// Get total count
const total = await getEventCount(userId, {
  types: ['whatsapp'],
})

// Get statistics
const stats = await getTimelineStats(userId, {
  startDate: new Date('2024-01-01'),
})
```

## Type System

All events share a common base structure but have type-specific data:

```typescript
type UnifiedEvent =
  | WhatsAppEvent
  | MomentEvent
  | TaskEvent
  | ActivityEvent
  | QuestionEvent
  | SummaryEvent

// Common fields
interface BaseUnifiedEvent {
  id: string
  user_id: string
  created_at: string
  source_id: string
  type: UnifiedEventType
  displayData: {
    icon: string
    label: string
    color: string
    title: string
    preview?: string
  }
  sentiment?: Sentiment
  sentiment_score?: number
  emotion?: string
  tags?: string[]
}

// Type-specific data in separate fields
interface WhatsAppEvent extends BaseUnifiedEvent {
  type: 'whatsapp'
  whatsapp: {
    message_id: string
    direction: 'incoming' | 'outgoing'
    message_type: string
    contact_name?: string
    content_text?: string
    // ... more fields
  }
}
```

## Performance Considerations

1. **Pagination**: Default page size is 50 events
2. **Parallel Queries**: All 7 sources queried simultaneously
3. **Client-side Filtering**: Search, sentiment, and tags filtered in-memory
4. **Date Filtering**: Applied at database level for performance

## Error Handling

```typescript
const { events, error, refresh } = useUnifiedTimeline()

if (error) {
  // Handle error
  console.error('Timeline error:', error)

  // Retry
  return (
    <div>
      <p>Failed to load timeline</p>
      <button onClick={refresh}>Retry</button>
    </div>
  )
}
```

## Next Steps (Phase 2 - UI)

Phase 1 provides the data foundation. Phase 2 will implement:

- TimelineView component
- EventCard components
- FilterPanel component
- Stats dashboard
- Infinite scroll
- Real-time updates

## Database Sources

| Source | Table | Key Fields |
|--------|-------|------------|
| WhatsApp | `whatsapp_messages` | message_timestamp, content_text, direction |
| Moments | `moments` | created_at, content, emotion |
| Tasks | `work_items` | completed_at, title, status |
| Activities | `whatsapp_user_activity` | created_at, activity_type |
| Questions | `question_responses` | responded_at, response_text |
| Summaries | `weekly_summaries` | period_start, summary_data |

## Testing

To verify the data layer works:

```typescript
import { getUnifiedTimeline } from '@/modules/journey/services/unifiedTimelineService'

// Test in browser console
const userId = 'your-user-id'
const events = await getUnifiedTimeline(userId, { limit: 10 })
console.log('Events:', events)
```

## Known Limitations

1. **Approvals not implemented**: `grant_responses` table integration pending
2. **Client-side pagination**: Filtering happens in-memory (may need optimization for large datasets)
3. **No real-time updates**: Requires manual refresh (Phase 2 feature)
4. **No search indexing**: Full-text search is case-sensitive substring match

## Architecture Decisions

- **Discriminated Union**: All events use TypeScript discriminated unions for type safety
- **Application-level Aggregation**: Events merged in JavaScript (not database views)
- **Display Metadata**: Pre-computed `displayData` for rendering consistency
- **Type Guards**: Helper functions for safe type narrowing
- **Backward Compatible**: Uses existing tables, no schema changes required
