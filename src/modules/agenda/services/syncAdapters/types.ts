import type { CalendarEvent } from '../../types';

/**
 * CalendarSyncAdapter — interface for syncing external calendar events
 * into the local calendar_events table.
 *
 * Because external calendar APIs (Google, Apple, Outlook) typically require
 * OAuth tokens managed by React hooks, adapters accept pre-fetched events
 * rather than fetching them directly. This keeps auth concerns in the UI layer
 * and the adapter focused on transform + persist.
 */
export interface CalendarSyncAdapter {
  /** Provider identifier matching CalendarEvent.source */
  source: CalendarEvent['source'];

  /**
   * Persist pre-fetched external events into calendar_events.
   *
   * @param userId - The authenticated user's UUID
   * @param externalEvents - Events already fetched from the external API,
   *   in the provider's transformed format (e.g. TimelineEvent from googleCalendarService)
   * @returns The persisted CalendarEvent rows
   */
  persistEvents(userId: string, externalEvents: ExternalEventInput[]): Promise<CalendarEvent[]>;

  /**
   * Push a local CalendarEvent to the external provider.
   * Optional — not all providers support write-back.
   */
  pushToExternal?(event: CalendarEvent): Promise<void>;
}

/**
 * Normalized input for persisting an external event.
 * Maps to the fields needed by upsertExternalEvent.
 */
export interface ExternalEventInput {
  /** The event's ID in the external system (e.g. Google event ID) */
  externalId: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  allDay: boolean;
  location?: string | null;
  color?: string | null;
  category?: string | null;
  timezone?: string;
}
