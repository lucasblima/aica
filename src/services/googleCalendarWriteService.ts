/**
 * Google Calendar Write Service
 *
 * Pure API wrapper for creating, updating, and deleting Google Calendar events.
 * Uses existing token management from googleCalendarTokenService.
 * Detects 403 (insufficient scope) and throws ScopeUpgradeRequired.
 */

import { createNamespacedLogger } from '@/lib/logger';
import { getValidAccessToken } from './googleAuthService';

const log = createNamespacedLogger('GoogleCalendarWriteService');

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export class ScopeUpgradeRequired extends Error {
  constructor() {
    super('Calendar write scope not available. User must re-consent with calendar.events scope.');
    this.name = 'ScopeUpgradeRequired';
  }
}

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface GoogleCalendarEventResponse extends GoogleCalendarEventInput {
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
}

async function getTokenOrThrow(): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('Google Calendar token not available. Connect Google Calendar first.');
  }
  return token;
}

function handleErrorResponse(status: number, errorData: Record<string, unknown>): never {
  if (status === 403) {
    const message = (errorData?.error as Record<string, unknown>)?.message as string || '';
    if (message.includes('insufficientPermissions') || message.includes('Forbidden')) {
      throw new ScopeUpgradeRequired();
    }
    throw new Error(`Google Calendar access denied: ${message}`);
  }
  if (status === 401) {
    throw new Error('Google Calendar token expired. Please reconnect.');
  }
  const msg = (errorData?.error as Record<string, unknown>)?.message as string || 'Unknown';
  throw new Error(`Google Calendar API error (${status}): ${msg}`);
}

/**
 * Create a new event in Google Calendar
 */
export async function createCalendarEvent(
  event: GoogleCalendarEventInput,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEventResponse> {
  const token = await getTokenOrThrow();

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;

  log.debug('[createCalendarEvent] Creating event:', { summary: event.summary });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    handleErrorResponse(response.status, errorData);
  }

  const data = await response.json();
  log.debug('[createCalendarEvent] Event created:', { id: data.id });
  return data;
}

/**
 * Update an existing event in Google Calendar (PATCH for partial updates)
 */
export async function updateCalendarEvent(
  eventId: string,
  event: Partial<GoogleCalendarEventInput>,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEventResponse> {
  const token = await getTokenOrThrow();

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  log.debug('[updateCalendarEvent] Updating event:', { eventId, summary: event.summary });

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    handleErrorResponse(response.status, errorData);
  }

  const data = await response.json();
  log.debug('[updateCalendarEvent] Event updated:', { id: data.id });
  return data;
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteCalendarEvent(
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const token = await getTokenOrThrow();

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  log.debug('[deleteCalendarEvent] Deleting event:', { eventId });

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // 204 = success, 410 = already deleted — both OK
  if (!response.ok && response.status !== 204 && response.status !== 410) {
    const errorData = await response.json().catch(() => ({}));
    handleErrorResponse(response.status, errorData);
  }

  log.debug('[deleteCalendarEvent] Event deleted:', { eventId });
}
