import type { CalendarSyncAdapter, ExternalEventInput } from './types';
import type { CalendarEvent } from '../../types';
import type { TimelineEvent as GoogleTimelineEvent } from '../googleCalendarService';
import { upsertExternalEvent } from '../calendarEventService';

/**
 * Transform a GoogleCalendarService TimelineEvent into the normalized
 * ExternalEventInput shape expected by the sync adapter.
 *
 * The Google TimelineEvent has `id` prefixed with "google-" (e.g. "google-abc123").
 * We strip that prefix to store the raw Google event ID as external_id, since
 * the source column already identifies the provider.
 */
export function toExternalEventInput(event: GoogleTimelineEvent): ExternalEventInput {
  // Strip "google-" prefix added by transformGoogleEvent
  const externalId = event.id.startsWith('google-')
    ? event.id.slice('google-'.length)
    : event.id;

  return {
    externalId,
    title: event.title,
    description: event.description ?? null,
    startTime: event.startTime,
    endTime: event.endTime || null,
    allDay: event.isAllDay,
    location: null, // Google TimelineEvent doesn't carry location
    color: event.color ?? null,
    category: event.aicaModule ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * GoogleCalendarAdapter — persists Google Calendar events into the
 * calendar_events table using upsertExternalEvent.
 *
 * Design decision: The adapter does NOT fetch from the Google Calendar API
 * directly because the OAuth token is managed in React state (useGoogleCalendar
 * hook). Instead, callers pass already-fetched TimelineEvent[] from
 * googleCalendarService.fetchAndTransformEvents().
 *
 * Usage:
 * ```ts
 * const events = await fetchAndTransformEvents(startDate, endDate);
 * const persisted = await googleCalendarAdapter.persistEvents(userId, events.map(toExternalEventInput));
 * ```
 */
export const googleCalendarAdapter: CalendarSyncAdapter = {
  source: 'google',

  async persistEvents(userId: string, externalEvents: ExternalEventInput[]): Promise<CalendarEvent[]> {
    const synced: CalendarEvent[] = [];

    for (const event of externalEvents) {
      const calEvent = await upsertExternalEvent(userId, 'google', event.externalId, {
        title: event.title,
        description: event.description,
        start_time: event.startTime,
        end_time: event.endTime,
        all_day: event.allDay,
        location: event.location,
        color: event.color,
        category: event.category,
        timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      });
      synced.push(calEvent);
    }

    return synced;
  },
};

/**
 * Convenience function: transform + persist Google Calendar events in one call.
 *
 * @param userId - The authenticated user's UUID
 * @param googleEvents - TimelineEvent[] from googleCalendarService
 * @returns Persisted CalendarEvent rows
 */
export async function syncGoogleEventsToDb(
  userId: string,
  googleEvents: GoogleTimelineEvent[]
): Promise<CalendarEvent[]> {
  const inputs = googleEvents.map(toExternalEventInput);
  return googleCalendarAdapter.persistEvents(userId, inputs);
}
