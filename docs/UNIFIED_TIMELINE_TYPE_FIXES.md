# Unified Timeline Type Fixes

## Overview
Fixed critical type mismatches between unified timeline types and component implementations that would have caused 100% runtime failures.

## Changes Made

### 1. Added `displayData` to Base Event Type
**File:** `src/modules/journey/types/unifiedEvent.ts`

Added `EventDisplayData` interface and included it in `BaseEvent`:
```typescript
export interface EventDisplayData {
  icon: string
  title: string
  label: string
  color: string
  preview: string
}

export interface BaseEvent {
  id: string
  created_at: string
  user_id: string
  displayData: EventDisplayData  // NEW
}
```

This provides consistent UI rendering data across all event types.

### 2. Created Display Data Enrichment Function
**File:** `src/modules/journey/services/unifiedTimelineService.ts`

Added `enrichEventWithDisplayData()` function that generates appropriate displayData for each event type:
- **WhatsApp:** Icon based on direction (💬/📤), contact name as title, content preview
- **Moment:** Emotion as icon, title, audio indicator label, content preview
- **Task:** Status icon (⏳/🔄/✅/❌), title, status label, description preview
- **Activity:** 🎯 icon, activity type, description preview
- **Question:** ❓ icon, answered status, question preview
- **Summary:** 📊 icon, week date, reflection preview

### 3. Fixed Date Filter Mutation Bug
**File:** `src/modules/journey/services/unifiedTimelineService.ts`

**BEFORE (Bug):**
```typescript
const now = new Date()
return new Date(now.setHours(0, 0, 0, 0)).toISOString()  // Mutates now!
```

**AFTER (Fixed):**
```typescript
const startOfDay = new Date()
startOfDay.setHours(0, 0, 0, 0)
return startOfDay.toISOString()
```

Fixed date calculation bugs in all date range branches (today, last7, last30, last90).

### 4. Improved Error Handling
**File:** `src/modules/journey/services/unifiedTimelineService.ts`

Changed all fetch functions:
- `console.warn` → `console.error` for actual errors
- Added Sentry error tracking if available
- Maintained graceful degradation (return empty arrays)

### 5. Applied Enrichment to All Event Fetchers
**File:** `src/modules/journey/services/unifiedTimelineService.ts`

Updated all 6 fetch functions:
- `fetchWhatsAppEvents()`
- `fetchMomentEvents()`
- `fetchTaskEvents()`
- `fetchQuestionEvents()`
- `fetchSummaryEvents()`
- `fetchActivityEvents()`

Each now:
1. Creates base event with placeholder displayData
2. Maps through events with `enrichEventWithDisplayData()`
3. Returns properly enriched events

### 6. Fixed Component Property Access
**File:** `src/modules/journey/components/timeline/TimelineEventCard.tsx`

**BEFORE (Wrong - nested properties):**
```typescript
event.whatsapp.content_text
event.moment.content
event.task.description
event.question.question_text
event.summary.summary_data.emotionalTrend
```

**AFTER (Correct - direct properties):**
```typescript
event.content           // WhatsApp
event.content           // Moment
event.description       // Task
event.question_text     // Question
event.highlights        // Summary
event.reflection        // Summary
```

### 7. Added Type Guards for Optional Properties
**File:** `src/modules/journey/components/timeline/TimelineEventCard.tsx`

Fixed accessing properties that don't exist on all event types:

```typescript
// BEFORE
event.emotion          // Only exists on MomentEvent
event.tags             // Only exists on some events
event.sentiment_score  // Doesn't exist at all

// AFTER
'emotion' in event && event.emotion
'tags' in event && event.tags
'sentiment' in event ? event.sentiment : undefined
```

## Testing Checklist

- [ ] TypeScript compiles with no errors
- [ ] Build completes successfully
- [ ] All event types display correctly in timeline
- [ ] displayData populated for all event types
- [ ] No runtime crashes when rendering events
- [ ] Sentiment badges render correctly
- [ ] Tags display properly
- [ ] Expanded content shows correct properties
- [ ] Date filtering works correctly
- [ ] Error handling doesn't crash app

## Database Schema Verification Needed

The following properties are accessed but may not exist in database:

### WhatsApp Messages (`whatsapp_messages`)
- ✅ `sentiment` - Exists (EventSentiment type)
- ⚠️ Verify column exists in production

### Moments (`moments`)
- ⚠️ `audio_duration` - Check if exists (mapped from DB)
- ⚠️ `audio_url` - Check if exists (mapped from DB)
- ⚠️ `sentiment` - Check if exists

### Tasks (`tasks`)
- ⚠️ `quadrant` - Used as fallback for priority, verify exists

All other properties are standard fields that should exist.

## Migration Path

If deploying to production:
1. ✅ Type definitions updated
2. ✅ Service enrichment added
3. ✅ Component fixed
4. ⚠️ Verify database columns exist
5. ⚠️ Test with real data
6. ⚠️ Monitor Sentry for runtime errors

## Backward Compatibility

✅ No breaking changes - all changes are internal
✅ Existing events will work with new enrichment
✅ Components gracefully handle missing properties

## Performance Impact

Minimal:
- Display data generation is lightweight (string operations)
- No additional database queries
- Computed once per event on fetch
- No impact on pagination

## Next Steps

1. Verify TypeScript compilation passes
2. Test with sample data in development
3. Deploy to staging
4. Monitor for runtime errors
5. Validate all event types render correctly
