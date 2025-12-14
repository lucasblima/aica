# Calendar Sync Quick Start Guide

## 1-Minute Setup

### Prerequisites
- Google Calendar already connected (via existing OAuth)
- Supabase backend available
- React component using @tanstack/react-query

### Installation (No npm package needed - already in codebase)

```bash
# All files are already in the project
# Just import what you need
```

## Common Use Cases

### Use Case 1: Add Sync Button to Event

```tsx
import { CalendarSyncButton } from '@/modules/connections/components/CalendarSyncButton';

export function EventCard({ event }) {
  return (
    <div>
      <h3>{event.title}</h3>
      <CalendarSyncButton
        eventId={event.id}
        spaceId={event.space_id}
        isAlreadySynced={!!event.google_event_id}
        size="md"
      />
    </div>
  );
}
```

### Use Case 2: Schedule with Conflict Checking

```tsx
import { useCalendarSync } from '@/modules/connections/hooks/useCalendarSync';
import { CalendarConflictAlert } from '@/modules/connections/components/CalendarConflictAlert';

export function ScheduleForm() {
  const [conflicts, setConflicts] = useState([]);
  const { checkConflicts } = useCalendarSync({ spaceId: 'my-space' });

  const handleSchedule = async (startTime, endTime) => {
    const found = await checkConflicts(startTime, endTime);
    if (found.length > 0) {
      setConflicts(found);
      return; // Show conflicts
    }
    // Proceed with scheduling
  };

  return (
    <>
      <CalendarConflictAlert conflicts={conflicts} />
      {/* Form */}
    </>
  );
}
```

### Use Case 3: Show Upcoming Events

```tsx
import { EventTimelineMini } from '@/modules/connections/components/EventTimelineMini';

export function Dashboard() {
  return (
    <EventTimelineMini
      spaceId="habitat-123"
      maxEvents={5}
      showGoogleCalendarIntegration
      onEventClick={(eventId) => navigate(`/events/${eventId}`)}
    />
  );
}
```

### Use Case 4: Configure Auto-Sync

```tsx
import { SpaceCalendarSettings } from '@/modules/connections/components/SpaceCalendarSettings';

export function SpaceSettings() {
  return (
    <SpaceCalendarSettings
      spaceId="my-space"
      onSave={(config) => console.log('Saved:', config)}
    />
  );
}
```

### Use Case 5: Full Calendar View (Habitat Maintenance)

```tsx
import { MaintenanceCalendarView } from '@/modules/connections/habitat/components/MaintenanceCalendarView';

export function MaintenancePage() {
  return (
    <MaintenanceCalendarView
      habitatSpaceId="habitat-123"
      propertyId="prop-456"
    />
  );
}
```

### Use Case 6: Schedule Mentorship (Academia)

```tsx
import { MentorshipScheduler } from '@/modules/connections/academia/components/MentorshipScheduler';

export function AcademiaPage() {
  return (
    <MentorshipScheduler
      academiaSpaceId="academia-123"
      onEventCreated={(eventId) => {
        console.log('Scheduled:', eventId);
      }}
    />
  );
}
```

### Use Case 7: Ritual Calendar Integration (Tribo)

```tsx
import { RitualCalendarSync } from '@/modules/connections/tribo/components/RitualCalendarSync';

export function RitualCard({ ritual }) {
  return (
    <RitualCalendarSync
      triboSpaceId={ritual.space_id}
      ritualId={ritual.id}
      ritualTitle={ritual.title}
      startTime={ritual.starts_at}
      endTime={ritual.ends_at}
      isRecurring={ritual.is_recurring}
      recurrenceRule={ritual.recurrence_rule}
      hasGoogleEventId={!!ritual.google_event_id}
      onSyncSuccess={() => refetch()}
    />
  );
}
```

## Service API Cheatsheet

### Calendar Sync Service

```typescript
import { calendarSyncService } from '@/modules/connections/services/calendarSyncService';

// Sync single event
const googleEventId = await calendarSyncService.syncEventToGoogle(eventId);

// Sync multiple
const results = await calendarSyncService.syncMultipleEvents([id1, id2]);

// Update in Google Calendar
await calendarSyncService.updateGoogleEvent(eventId);

// Remove from Google Calendar
await calendarSyncService.removeFromGoogle(eventId);

// Check for conflicts
const conflicts = await calendarSyncService.checkConflicts(startTime, endTime);

// Configure auto-sync
await calendarSyncService.enableAutoSync(spaceId, 30); // 30 minutes
await calendarSyncService.disableAutoSync(spaceId);

// Get config
const config = await calendarSyncService.getSpaceSyncStatus(spaceId);
```

### Reminder Service

```typescript
import { reminderService } from '@/modules/connections/services/reminderService';

// Set reminder (15 minutes before, as notification)
await reminderService.setReminder(eventId, 15, 'notification');

// Get all reminders for event
const reminders = await reminderService.getEventReminders(eventId);

// Get pending reminders (ready to send)
const pending = await reminderService.getPendingReminders();

// Mark as sent
await reminderService.markReminderAsSent(reminderId);

// Remove reminder
await reminderService.removeReminder(reminderId);
```

## Hook API Cheatsheet

```typescript
import { useCalendarSync } from '@/modules/connections/hooks/useCalendarSync';

const {
  // Mutations (use .mutate() or .mutateAsync())
  syncEvent,
  syncMultipleEvents,
  updateEvent,
  removeFromGoogle,

  // Functions
  checkConflicts,

  // Status
  syncStatus,
  syncStatusLoading,
  conflicts,

  // Commands
  enableAutoSync,
  disableAutoSync,
  manualSync,
  clearCache,
} = useCalendarSync({
  spaceId: 'habitat-123',
  autoSync: true,
  syncInterval: 300, // seconds
});

// Usage examples:
await syncEvent.mutateAsync(eventId);
const conflicts = await checkConflicts(start, end);
await enableAutoSync(30); // 30 minutes
```

## Component Props Cheatsheet

### CalendarSyncButton

```typescript
<CalendarSyncButton
  eventId="event-123"              // Required
  spaceId="space-456"              // Required
  isAlreadySynced={false}          // Optional
  onSuccess={(id) => {}}           // Optional
  onError={(err) => {}}            // Optional
  size="md"                        // Optional: 'sm' | 'md' | 'lg'
  variant="primary"                // Optional: 'primary' | 'secondary' | 'ghost'
  className="w-full"               // Optional
/>
```

### CalendarConflictAlert

```typescript
<CalendarConflictAlert
  conflicts={conflictsList}        // Required
  isLoading={false}                // Optional
  isError={false}                  // Optional
  error={null}                     // Optional
  onClose={() => {}}               // Optional
  suggestedTimes={[]}              // Optional
  className=""                     // Optional
/>
```

### EventTimelineMini

```typescript
<EventTimelineMini
  spaceId="space-123"              // Required
  maxEvents={5}                    // Optional
  showGoogleCalendarIntegration    // Optional
  onEventClick={(id) => {}}        // Optional
  className=""                     // Optional
/>
```

### SpaceCalendarSettings

```typescript
<SpaceCalendarSettings
  spaceId="space-123"              // Required
  onSave={(config) => {}}          // Optional
  className=""                     // Optional
/>
```

## Error Handling

All services and hooks handle errors gracefully. Always check the error state:

```typescript
// With mutations
if (syncEvent.isError) {
  console.error('Sync failed:', syncEvent.error.message);
}

// With functions
try {
  const conflicts = await checkConflicts(start, end);
} catch (error) {
  console.error('Conflict check failed:', error.message);
}
```

## Common Patterns

### Pattern 1: Sync on Create

```typescript
const createEvent = async (data) => {
  const event = await eventService.createEvent(spaceId, data);

  try {
    await syncEvent.mutateAsync(event.id);
  } catch (err) {
    console.warn('Sync failed, but event created locally:', err);
  }

  return event;
};
```

### Pattern 2: Validate Before Scheduling

```typescript
const scheduleEvent = async (start, end) => {
  // Check conflicts first
  const conflicts = await checkConflicts(start, end);
  if (conflicts.length > 0) {
    throw new Error(`${conflicts.length} conflicts detected`);
  }

  // Proceed with scheduling
  return createEvent(start, end);
};
```

### Pattern 3: Batch Sync

```typescript
const syncAllEvents = async (spaceId) => {
  const events = await eventService.getEvents(spaceId);
  const eventIds = events.map(e => e.id);

  const results = await syncMultipleEvents.mutateAsync(eventIds);
  console.log(`Synced ${results.size} events`);
};
```

### Pattern 4: Auto-Sync Configuration

```typescript
const setupAutoSync = async (spaceId) => {
  // Check if already configured
  const status = await calendarSyncService.getSpaceSyncStatus(spaceId);
  if (status?.auto_sync_enabled) {
    return; // Already configured
  }

  // Enable with 30-minute interval
  await enableAutoSync(30);
};
```

## Troubleshooting

### "Google Calendar not authorized"
- User hasn't connected Google Calendar yet
- Ensure `google_calendar_tokens` table has valid tokens
- Call `connectGoogleCalendar()` from Auth component

### "Token expired" error
- Automatic refresh should handle this
- If persists, user needs to re-authorize
- Check `token_expiry` in database

### Events not syncing
- Check browser console for 401/403 errors
- Verify Google Calendar API enabled in Google Cloud
- Ensure `calendar.events` scope is authorized
- Try calling `clearCache()` and retrying

### Conflicts not detecting
- Verify all events have `starts_at` and `ends_at` times
- Check if events are in same timezone
- Clear cache: `clearCache()`
- Verify database indexes exist

## Tips & Tricks

1. **Use `checkConflicts()` before creating events** - Prevent double-bookings
2. **Cache results with 5-minute TTL** - Conflicts computed efficiently
3. **Auto-sync interval 30+ minutes** - Balance between fresh data and API quota
4. **Set reminders 15+ minutes before** - Gives users time to prepare
5. **Download .ics for external sharing** - Works with any calendar app
6. **Test with multiple time zones** - Ensure correct handling
7. **Monitor sync status** - Use syncStatus to show users sync health

## Files Reference

| Feature | Main File | Hook | Components |
|---------|-----------|------|------------|
| Sync | calendarSyncService.ts | useCalendarSync | CalendarSyncButton |
| Conflicts | calendarSyncService.ts | useCalendarSync | CalendarConflictAlert |
| Timeline | eventService.ts | useCalendarSync | EventTimelineMini |
| Settings | calendarSyncService.ts | useCalendarSync | SpaceCalendarSettings |
| Habitat | habitatService.ts | useCalendarSync | MaintenanceCalendarView |
| Academia | journeyService.ts | useCalendarSync | MentorshipScheduler |
| Tribo | ritualService.ts | useCalendarSync | RitualCalendarSync |

## Documentation Links

- **Full API:** `docs/features/CONNECTIONS_CALENDAR_SYNC_INTEGRATION.md`
- **Delivery Report:** `CONNECTIONS_CALENDAR_SYNC_DELIVERY.md`
- **This Guide:** `docs/guides/CALENDAR_SYNC_QUICK_START.md`

## Getting Help

1. Check this quick start guide
2. Review full documentation
3. Check code comments and JSDoc
4. Test in browser console
5. Check browser network tab for API errors
6. Review Supabase dashboard for database errors

---

**Last Updated:** December 14, 2025
**Version:** 1.0
