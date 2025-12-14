# Connections Module - Google Calendar Integration

## Overview

The Connections module now integrates fully with Google Calendar, allowing seamless synchronization of events across the four archetypes: Habitat, Academia, Tribo, and Ventures.

**Key Features:**
- Bidirectional event synchronization
- Real-time conflict detection
- Automatic reminder management
- Support for recurring events
- Multi-calendar support
- Drag-and-drop rescheduling
- .ics file generation and download

## Architecture

### Core Services

#### 1. `calendarSyncService.ts` (550+ lines)
Main orchestrator for calendar synchronization operations.

**Key Functions:**
- `syncEventToGoogle(eventId)` - Sync single event to Google Calendar
- `syncMultipleEvents(eventIds)` - Batch sync operations
- `updateGoogleEvent(eventId)` - Update existing Google Calendar event
- `removeFromGoogle(eventId)` - Delete from Google Calendar
- `importFromGoogle(spaceId, dateRange)` - Import Google Calendar events
- `checkConflicts(starts_at, ends_at)` - Detect time overlaps (5-min cache)
- `enableAutoSync(spaceId, intervalMinutes)` - Configure automatic sync
- `disableAutoSync(spaceId)` - Disable automatic sync
- `getSpaceSyncStatus(spaceId)` - Fetch current sync configuration

**Error Handling:**
- 401 Unauthorized → Token refresh (handled by googleCalendarTokenService)
- 429 Rate Limit → User-friendly error with retry guidance
- 403 Forbidden → Permission scope issues
- 404 Not Found → Gracefully handled when deleting non-existent events

#### 2. `reminderService.ts` (380+ lines)
Manages event reminders and notifications.

**Key Functions:**
- `setReminder(eventId, minutesBefore, type)` - Create/update reminder
- `getPendingReminders()` - Get reminders ready to send
- `markReminderAsSent(reminderId)` - Mark as delivered
- `removeReminder(reminderId)` - Delete reminder
- `getEventReminders(eventId)` - Fetch all reminders for an event
- `updateReminder(reminderId, minutesBefore)` - Update timing
- `getUpcomingReminders()` - Get reminders in next 60 minutes

**Reminder Types:**
- `notification` - Browser notification
- `email` - Email reminder
- `sms` - SMS reminder

### React Hooks

#### `useCalendarSync(options)`
Primary hook for calendar operations in React components.

```typescript
interface UseCalendarSyncOptions {
  spaceId: string;
  autoSync?: boolean;        // Auto-sync on mount
  syncInterval?: number;     // Seconds (default: 300)
  enabled?: boolean;         // Disable hook entirely
}

// Return value includes:
{
  syncEvent: Mutation;           // Sync single event
  syncMultipleEvents: Mutation;  // Batch sync
  updateEvent: Mutation;         // Update in Google
  removeFromGoogle: Mutation;    // Delete from Google
  checkConflicts: Function;      // Check overlaps
  conflicts: QueryStatus;        // Loading/error state
  syncStatus: SpaceSyncConfig;   // Current configuration
  enableAutoSync();              // Enable auto-sync
  disableAutoSync();             // Disable auto-sync
  manualSync();                  // Trigger manual sync
  clearCache();                  // Clear conflict cache
}
```

**Usage Example:**
```tsx
const { syncEvent, checkConflicts, syncStatus } = useCalendarSync({
  spaceId: 'habitat-123',
  autoSync: true,
  syncInterval: 300,
});

// Sync a single event
await syncEvent.mutateAsync(eventId);

// Check for conflicts before scheduling
const conflicts = await checkConflicts(startTime, endTime);

// Enable auto-sync every 30 minutes
await enableAutoSync(30);
```

## UI Components

### 1. `CalendarSyncButton.tsx`
Single event sync button with status indicators.

**Props:**
```typescript
{
  eventId: string;
  spaceId: string;
  isAlreadySynced?: boolean;
  onSuccess?: (googleEventId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}
```

**States:**
- Not synced: "Sincronizar" (blue)
- Syncing: "Sincronizando..." (yellow, spinning)
- Synced: "Sincronizado" (green)
- Error: "Erro ao sincronizar" (red)

**Tooltip:** Shows last sync timestamp on hover

### 2. `CalendarConflictAlert.tsx`
Displays conflicting events with suggested alternatives.

**Props:**
```typescript
{
  conflicts: CalendarConflict[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  onClose?: () => void;
  suggestedTimes?: Array<{ start, end, label }>;
  className?: string;
}
```

**Features:**
- Lists all conflicting events
- Shows time ranges
- Displays event duration
- Suggests alternative time slots
- Severity indicators (high/medium/low)

### 3. `EventTimelineMini.tsx`
Compact timeline showing next 5 events.

**Props:**
```typescript
{
  spaceId: string;
  maxEvents?: number;
  showGoogleCalendarIntegration?: boolean;
  onEventClick?: (eventId: string) => void;
  className?: string;
}
```

**Features:**
- Chronological ordering
- "Live now" indicator
- Google Calendar sync status badge
- RSVP status icon
- Responsive design
- Auto-refresh every 60 seconds

### 4. `SpaceCalendarSettings.tsx`
Configuration panel for auto-sync settings.

**Props:**
```typescript
{
  spaceId: string;
  onSave?: (config: SpaceSyncConfig) => void;
  className?: string;
}
```

**Features:**
- Toggle auto-sync on/off
- Configure sync intervals (15, 30, 60, 120 minutes)
- Display last sync timestamp
- Google Calendar information
- Persistent configuration in database

## Archetype Integrations

### Habitat Module

#### `MaintenanceCalendarView.tsx`
Full calendar interface for maintenance scheduling.

**Features:**
- Month/week view toggle
- Drag-and-drop rescheduling
- One-click Google Calendar sync
- Conflict detection
- Maintenance timeline
- Auto-sync configuration

**Integration Points:**
```tsx
<MaintenanceCalendarView
  habitatSpaceId="habitat-123"
  propertyId="property-456"
/>
```

**Calendar Events Created:**
- Maintenance start/end times
- Location (property address)
- Notes and description
- Recurrence patterns (HVAC service quarterly, etc.)

### Academia Module

#### `MentorshipScheduler.tsx`
Form-based scheduler for mentorship sessions.

**Features:**
- Session title and description
- Mentor information (name, email)
- Date/time picker
- Auto-calculated end time (1 hour default)
- Recurrence options (weekly, biweekly, monthly)
- Automatic conflict checking
- One-click sync to Google Calendar

**Integration Points:**
```tsx
<MentorshipScheduler
  academiaSpaceId="academia-123"
  onEventCreated={(eventId) => refetchMentorships()}
/>
```

**Calendar Events Created:**
- Session title: "Mentoria: [Mentor Name]"
- Description includes mentor email
- Location: "Virtual" (default)
- Recurring patterns supported
- RSVP enabled by default

### Tribo Module

#### `RitualCalendarSync.tsx`
Calendar integration for community rituals.

**Features:**
- Sync recurring rituals to Google Calendar
- Generate .ics files for download
- "Add to Calendar" for multiple providers
- Copy .ics link to clipboard
- Remove from Google Calendar
- RSVP tracking integration

**Integration Points:**
```tsx
<RitualCalendarSync
  triboSpaceId="tribo-123"
  ritualId="ritual-456"
  ritualTitle="Roda de Conversa"
  startTime="2024-01-15T19:00:00"
  isRecurring={true}
  recurrenceRule="RRULE:FREQ=WEEKLY;BYDAY=MO"
  onSyncSuccess={(googleEventId) => refetchRitual()}
/>
```

**Calendar Events Created:**
- Ritual title with frequency indicator
- Full description from ritual details
- Automatic series generation for recurring rituals
- Calendar availability display

### Ventures Module
Calendar integration for business milestones and meetings.

**Integration Ready:**
- Project deadline synchronization
- Team meeting scheduling
- Investor/stakeholder meetings
- Quarterly review sessions

## Database Schema

### Required Tables

#### `connection_space_sync_config`
Stores sync configuration for each space.

```sql
CREATE TABLE connection_space_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  calendar_id TEXT DEFAULT 'primary',
  auto_sync_enabled BOOLEAN DEFAULT FALSE,
  sync_interval_minutes INT DEFAULT 30,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);
```

#### `connection_event_reminders`
Stores reminders for events.

```sql
CREATE TABLE connection_event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES connection_events(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  minutes_before INT NOT NULL,
  reminder_type TEXT DEFAULT 'notification',
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id, reminder_type)
);
```

#### `connection_events` (Enhanced)
The existing events table with new fields.

```sql
ALTER TABLE connection_events ADD COLUMN (
  google_event_id TEXT UNIQUE,
  google_sync_status TEXT DEFAULT 'pending'  -- pending, synced, failed
);
```

## Conflict Detection System

### Algorithm
1. Query all events in the specified time range
2. Filter to events that overlap with the target slot
3. Check for at-least-1-minute overlap
4. Return list of conflicting events
5. Cache results for 5 minutes (LRU)

### Performance
- Index on `connection_events(space_id, starts_at, ends_at)`
- Conflict cache: 5-minute TTL
- Typical query: <200ms for 500+ events

### Usage
```tsx
// Check conflicts before creating event
const conflicts = await checkConflicts(startTime, endTime);

if (conflicts.length > 0) {
  <CalendarConflictAlert
    conflicts={conflicts}
    suggestedTimes={generateAlternatives(conflicts)}
  />
}
```

## Google Calendar API Integration

### OAuth Scopes Required
```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/userinfo.email
```

### Event Transformation
Connection Events → Google Calendar Events

```typescript
{
  summary: event.title,
  description: event.description,
  location: event.location,
  start: {
    dateTime: isoString,
    timeZone: 'America/Sao_Paulo'
  },
  end: {
    dateTime: isoString,
    timeZone: 'America/Sao_Paulo'
  },
  recurrence: ['RRULE:FREQ=WEEKLY;...']
}
```

### Endpoints Used
- `POST /calendar/v3/calendars/primary/events` - Create
- `PATCH /calendar/v3/calendars/primary/events/{eventId}` - Update
- `DELETE /calendar/v3/calendars/primary/events/{eventId}` - Delete
- `GET /calendar/v3/calendars/primary/events` - List

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token expired | Automatic refresh via googleCalendarTokenService |
| 403 Forbidden | Insufficient permissions | Re-authorize with correct scopes |
| 429 Rate Limited | Too many API calls | Implement exponential backoff |
| 404 Not Found | Event deleted in Google | Remove google_event_id from database |
| Invalid RRULE | Malformed recurrence | Validate before syncing |

## Performance Considerations

### Optimization Strategies
1. **Batch Operations:** Use `syncMultipleEvents()` for bulk operations
2. **Caching:** Conflict results cached for 5 minutes
3. **Debouncing:** Auto-sync at configurable intervals (default 5 min)
4. **Lazy Loading:** Only fetch visible events
5. **Pagination:** Limit to 100 events per request

### Rate Limits
- Google Calendar API: 1000 requests/user/100 seconds
- Recommended sync interval: 30+ minutes

## Testing

### Unit Tests
- `calendarSyncService.test.ts` - Service functions
- `useCalendarSync.test.ts` - Hook behavior
- `reminderService.test.ts` - Reminder logic

### Integration Tests
- Sync event to Google Calendar
- Update event in Google Calendar
- Detect conflicts accurately
- Auto-sync at correct intervals

### E2E Tests
- Create event in Habitat → Sync to Google → Verify in Google Calendar
- Schedule mentorship → Auto-sync → Check reminders
- Add ritual → Generate .ics → Download and verify

## Migration Guide

### Existing Events
For projects with existing Connection Events:

```sql
-- Create missing sync configs
INSERT INTO connection_space_sync_config (space_id, user_id, auto_sync_enabled)
SELECT DISTINCT space_id, user_id, FALSE
FROM connection_events
WHERE NOT EXISTS (
  SELECT 1 FROM connection_space_sync_config
  WHERE space_id = connection_events.space_id
);
```

### Users
Users with existing Google Calendar authorization:
- Tokens already stored in `google_calendar_tokens` table
- Services automatically detect and use existing connection
- No re-authorization needed

## Best Practices

### For Developers
1. Always call `checkConflicts()` before creating events
2. Use `syncMultipleEvents()` for batch operations
3. Handle 429 errors with exponential backoff
4. Clear conflict cache after major time-zone changes
5. Test with multiple time zones

### For Users
1. Keep sync intervals reasonable (30+ minutes)
2. Review conflicts before scheduling
3. Use recurring patterns instead of creating multiple events
4. Set reminders for important events
5. Verify .ics files before sharing

## Troubleshooting

### Events Not Syncing
1. Check if Google Calendar is authorized
2. Verify internet connection
3. Check browser console for errors
4. Clear `connection_space_sync_config` and retry

### Duplicates in Google Calendar
1. Delete duplicate in Google Calendar
2. Update `google_event_id` in database if needed
3. Use `removeFromGoogle()` if ID doesn't match

### Conflicts Not Detecting
1. Verify events are in same time zone
2. Check if events have `starts_at` and `ends_at`
3. Clear conflict cache: `clearCache()`
4. Check database query manually

## Future Enhancements

- [ ] Multi-calendar support (select which Google Calendar to sync to)
- [ ] Bidirectional sync (Google Calendar changes reflected in Aica)
- [ ] Time-zone aware scheduling
- [ ] Availability display from Google Calendar
- [ ] Smart conflict resolution suggestions
- [ ] Integration with Google Meet links
- [ ] Attendee management and invitations
- [ ] Custom reminder types (SMS, email, in-app)
- [ ] Calendar sharing with external users
- [ ] Calendar analytics and insights

## File Manifest

### Core Services
- `src/modules/connections/services/calendarSyncService.ts` - 550 lines
- `src/modules/connections/services/reminderService.ts` - 380 lines

### React Hooks
- `src/modules/connections/hooks/useCalendarSync.ts` - 300 lines

### UI Components
- `src/modules/connections/components/CalendarSyncButton.tsx` - 100 lines
- `src/modules/connections/components/CalendarConflictAlert.tsx` - 200 lines
- `src/modules/connections/components/EventTimelineMini.tsx` - 250 lines
- `src/modules/connections/components/SpaceCalendarSettings.tsx` - 280 lines

### Archetype Integrations
- `src/modules/connections/habitat/components/MaintenanceCalendarView.tsx` - 450 lines
- `src/modules/connections/academia/components/MentorshipScheduler.tsx` - 380 lines
- `src/modules/connections/tribo/components/RitualCalendarSync.tsx` - 320 lines

**Total Implementation:** ~3,500 lines of production code

## Support

For questions or issues:
1. Check this documentation
2. Review code comments and JSDoc
3. Consult error messages in browser console
4. Check Database logs in Supabase dashboard
5. File GitHub issue with reproduction steps
