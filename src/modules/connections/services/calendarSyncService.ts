import { supabase } from '@/lib/supabase';
import { eventService, DateRange } from './eventService';
import { getValidAccessToken } from '@/services/googleCalendarTokenService';
import { fetchCalendarEvents, transformGoogleEvent } from '@/services/googleCalendarService';
import { ConnectionEvent } from '../types';

/**
 * Calendar conflict detection result
 */
export interface CalendarConflict {
  eventId: string;
  title: string;
  source: 'connection' | 'google';
  starts_at: string;
  ends_at: string;
  duration_minutes?: number;
}

/**
 * Space sync configuration
 */
export interface SpaceSyncConfig {
  space_id: string;
  user_id: string;
  calendar_id: string;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Google Calendar event format
 */
interface GoogleCalendarEventDetail {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string }>;
  organizer?: { email: string };
  recurrence?: string[];
}

/**
 * Cache for conflict checks (5-minute TTL)
 */
const conflictCache = new Map<string, { data: CalendarConflict[]; timestamp: number }>();
const CONFLICT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calendar Sync Service
 *
 * Orchestrates synchronization between Connection Events and Google Calendar.
 * Handles bidirectional sync, conflict detection, and reminder management.
 */
export const calendarSyncService = {
  /**
   * Synchronizes a single Connection Event to Google Calendar.
   * Creates or updates the event in Google Calendar and stores the google_event_id.
   * If the event is already synced, it will be updated instead of created.
   *
   * @param eventId - The unique identifier of the Connection Event
   * @returns Promise resolving to the Google Calendar event ID
   * @throws {Error} If user is not authenticated with Google Calendar
   * @throws {Error} If Google Calendar API rate limit is exceeded
   * @throws {Error} If event creation/update fails
   *
   * @example
   * const googleEventId = await calendarSyncService.syncEventToGoogle('event-123');
   * console.log(`Synced to Google Calendar: ${googleEventId}`);
   */
  async syncEventToGoogle(eventId: string): Promise<string> {
    try {
      console.log('[calendarSyncService] 📤 Starting sync for event:', { eventId });

      // Check authentication
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Google Calendar not authorized. Please reconnect.');
      }

      // Fetch the connection event
      const event = await eventService.getEventById(eventId);

      // If already synced, update instead of create
      if (event.google_event_id) {
        return await this.updateGoogleEvent(eventId);
      }

      // Transform Connection Event to Google Calendar format
      const googleEventBody = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: this.formatGoogleDateTime(event.starts_at, event.is_all_day),
        end: event.ends_at
          ? this.formatGoogleDateTime(event.ends_at, event.is_all_day)
          : undefined,
        recurrence: event.recurrence_rule ? [event.recurrence_rule] : undefined,
      };

      // Create event in Google Calendar
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEventBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[calendarSyncService] ❌ Google Calendar API error:', error);

        // Handle rate limiting
        if (response.status === 429) {
          throw new Error('Google Calendar rate limit exceeded. Try again later.');
        }

        throw new Error(`Failed to sync event to Google Calendar: ${error.error?.message || response.statusText}`);
      }

      const googleEvent = await response.json();
      const googleEventId = googleEvent.id;

      console.log('[calendarSyncService] ✅ Event synced to Google Calendar:', { googleEventId });

      // Update Connection Event with google_event_id
      const updatedEvent = await eventService.updateEvent(eventId, {
        // Use the internal update mechanism
      });

      // Store google_event_id in the database
      const { error: updateError } = await supabase
        .from('connection_events')
        .update({ google_event_id: googleEventId })
        .eq('id', eventId);

      if (updateError) {
        console.error('[calendarSyncService] ⚠️ Error storing google_event_id:', updateError);
        throw new Error(`Failed to store Google event ID: ${updateError.message}`);
      }

      return googleEventId;
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error syncing event to Google:', error);
      throw error;
    }
  },

  /**
   * Synchronizes multiple Connection Events to Google Calendar in batch.
   * Continues processing even if some events fail (partial success).
   * Returns a map of Connection Event IDs to Google Event IDs for successful syncs.
   *
   * @param eventIds - Array of Connection Event IDs to sync
   * @returns Promise resolving to a Map of event ID to Google event ID
   * @throws Does not throw - errors are logged but processing continues
   *
   * @example
   * const results = await calendarSyncService.syncMultipleEvents([
   *   'event-123',
   *   'event-456',
   *   'event-789'
   * ]);
   * console.log(`Successfully synced ${results.size} events`);
   */
  async syncMultipleEvents(eventIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const errors: Array<{ eventId: string; error: Error }> = [];

    console.log('[calendarSyncService] 📤 Syncing multiple events:', { count: eventIds.length });

    for (const eventId of eventIds) {
      try {
        const googleEventId = await this.syncEventToGoogle(eventId);
        results.set(eventId, googleEventId);
      } catch (error) {
        errors.push({
          eventId,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    if (errors.length > 0) {
      console.warn('[calendarSyncService] ⚠️ Some events failed to sync:', errors);
    }

    console.log('[calendarSyncService] ✅ Bulk sync complete:', {
      successful: results.size,
      failed: errors.length,
    });

    return results;
  },

  /**
   * Updates an existing event in Google Calendar.
   * The event must already be synced (have a google_event_id).
   *
   * @param eventId - The unique identifier of the Connection Event
   * @returns Promise resolving to the Google Calendar event ID
   * @throws {Error} If user is not authenticated with Google Calendar
   * @throws {Error} If event is not synced to Google Calendar yet
   * @throws {Error} If update fails
   *
   * @example
   * const googleEventId = await calendarSyncService.updateGoogleEvent('event-123');
   * console.log(`Updated Google Calendar event: ${googleEventId}`);
   */
  async updateGoogleEvent(eventId: string): Promise<string> {
    try {
      console.log('[calendarSyncService] 🔄 Updating Google Calendar event:', { eventId });

      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Google Calendar not authorized.');
      }

      const event = await eventService.getEventById(eventId);

      if (!event.google_event_id) {
        throw new Error('Event not synced to Google Calendar yet.');
      }

      const googleEventBody = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: this.formatGoogleDateTime(event.starts_at, event.is_all_day),
        end: event.ends_at
          ? this.formatGoogleDateTime(event.ends_at, event.is_all_day)
          : undefined,
        recurrence: event.recurrence_rule ? [event.recurrence_rule] : undefined,
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.google_event_id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEventBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[calendarSyncService] ❌ Update failed:', error);
        throw new Error(`Failed to update Google Calendar event: ${error.error?.message}`);
      }

      const updatedEvent = await response.json();
      console.log('[calendarSyncService] ✅ Google event updated:', { googleEventId: updatedEvent.id });

      return updatedEvent.id;
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error updating Google event:', error);
      throw error;
    }
  },

  /**
   * Removes a Connection Event from Google Calendar.
   * Clears the google_event_id from the database after deletion.
   * Gracefully handles events that don't exist or aren't synced.
   *
   * @param eventId - The unique identifier of the Connection Event
   * @returns Promise that resolves when removal is complete
   * @throws {Error} If deletion fails (404 errors are ignored)
   *
   * @example
   * await calendarSyncService.removeFromGoogle('event-123');
   * console.log('Event removed from Google Calendar');
   */
  async removeFromGoogle(eventId: string): Promise<void> {
    try {
      console.log('[calendarSyncService] 🗑️ Removing event from Google Calendar:', { eventId });

      const token = await getValidAccessToken();
      if (!token) {
        console.warn('[calendarSyncService] ⚠️ Google Calendar not authorized, skipping removal');
        return;
      }

      const event = await eventService.getEventById(eventId);

      if (!event.google_event_id) {
        console.log('[calendarSyncService] ℹ️ Event not synced to Google Calendar');
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.google_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to remove event from Google Calendar: ${response.statusText}`);
      }

      // Clear google_event_id from database
      await supabase
        .from('connection_events')
        .update({ google_event_id: null })
        .eq('id', eventId);

      console.log('[calendarSyncService] ✅ Event removed from Google Calendar');
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error removing from Google:', error);
      throw error;
    }
  },

  /**
   * Imports events from Google Calendar into a Connection Space.
   * Creates Connection Events from Google Calendar events within the date range.
   * Skips events that are already imported (have matching google_event_id).
   *
   * @param spaceId - The unique identifier of the Connection Space
   * @param dateRange - Date range for import
   * @param dateRange.start - Start date in ISO format
   * @param dateRange.end - End date in ISO format
   * @returns Promise resolving to array of imported ConnectionEvent objects
   * @throws {Error} If user is not authenticated with Google Calendar
   * @throws {Error} If import fails
   *
   * @example
   * const imported = await calendarSyncService.importFromGoogle('space-123', {
   *   start: '2025-01-01T00:00:00Z',
   *   end: '2025-01-31T23:59:59Z'
   * });
   * console.log(`Imported ${imported.length} events from Google Calendar`);
   */
  async importFromGoogle(
    spaceId: string,
    dateRange: { start: string; end: string }
  ): Promise<ConnectionEvent[]> {
    try {
      console.log('[calendarSyncService] 📥 Importing events from Google Calendar:', {
        spaceId,
        dateRange,
      });

      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Google Calendar not authorized.');
      }

      // Fetch events from Google Calendar
      const googleEvents = await fetchCalendarEvents('primary', {
        timeMin: dateRange.start,
        timeMax: dateRange.end,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      const importedEvents: ConnectionEvent[] = [];

      for (const googleEvent of googleEvents) {
        try {
          // Check if event already exists
          const { data: existingEvent } = await supabase
            .from('connection_events')
            .select('id')
            .eq('google_event_id', googleEvent.id)
            .single();

          if (existingEvent) {
            console.log('[calendarSyncService] ℹ️ Event already imported:', { googleEventId: googleEvent.id });
            continue;
          }

          // Create Connection Event from Google Event
          const startTime = googleEvent.start.dateTime || googleEvent.start.date;
          const endTime = googleEvent.end.dateTime || googleEvent.end.date;

          const newEvent = await eventService.createEvent(spaceId, {
            title: googleEvent.summary,
            description: googleEvent.description,
            location: googleEvent.location,
            starts_at: startTime,
            ends_at: endTime,
            is_all_day: !googleEvent.start.dateTime,
            recurrence_rule: googleEvent.recurrence?.[0],
          });

          // Store Google Event ID
          await supabase
            .from('connection_events')
            .update({ google_event_id: googleEvent.id })
            .eq('id', newEvent.id);

          importedEvents.push(newEvent);
          console.log('[calendarSyncService] ✅ Event imported:', { eventId: newEvent.id, googleEventId: googleEvent.id });
        } catch (error) {
          console.warn('[calendarSyncService] ⚠️ Failed to import single event:', error);
          continue;
        }
      }

      console.log('[calendarSyncService] ✅ Import complete:', { count: importedEvents.length });
      return importedEvents;
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error importing from Google:', error);
      throw error;
    }
  },

  /**
   * Checks for time conflicts between Connection Events.
   * Detects overlapping events within the specified time range across all user spaces.
   * Results are cached for 5 minutes for performance optimization.
   *
   * @param starts_at - Start time in ISO format
   * @param ends_at - End time in ISO format
   * @param excludeEventId - Optional event ID to exclude from conflict check
   * @returns Promise resolving to array of conflicting events
   * @throws {Error} If user is not authenticated
   * @throws {Error} If database query fails
   *
   * @example
   * // Check for conflicts when creating a new event
   * const conflicts = await calendarSyncService.checkConflicts(
   *   '2025-12-14T10:00:00Z',
   *   '2025-12-14T11:00:00Z'
   * );
   * if (conflicts.length > 0) {
   *   console.log(`Warning: ${conflicts.length} conflicting events found`);
   * }
   *
   * @example
   * // Check conflicts when updating (exclude current event)
   * const conflicts = await calendarSyncService.checkConflicts(
   *   '2025-12-14T10:00:00Z',
   *   '2025-12-14T11:00:00Z',
   *   'event-123'
   * );
   */
  async checkConflicts(
    starts_at: string,
    ends_at: string,
    excludeEventId?: string
  ): Promise<CalendarConflict[]> {
    try {
      console.log('[calendarSyncService] 🔍 Checking for conflicts:', {
        starts_at,
        ends_at,
        excludeEventId,
      });

      // Check cache first
      const cacheKey = `${starts_at}-${ends_at}-${excludeEventId || ''}`;
      const cached = conflictCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CONFLICT_CACHE_TTL) {
        console.log('[calendarSyncService] 💾 Returning cached conflicts');
        return cached.data;
      }

      // Fetch all events in the time range from this connection space
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get all spaces for the user
      const { data: spaces } = await supabase
        .from('connection_spaces')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!spaces || spaces.length === 0) {
        return [];
      }

      const spaceIds = spaces.map(s => s.id);

      // Fetch events that overlap with the specified time range
      const { data: events, error } = await supabase
        .from('connection_events')
        .select('*')
        .in('space_id', spaceIds)
        .or(
          `and(starts_at.lt.${ends_at},ends_at.gt.${starts_at})` +
          `,and(starts_at.lt.${ends_at},is_all_day.eq.true)`
        );

      if (error) {
        console.error('[calendarSyncService] ❌ Error fetching events:', error);
        throw error;
      }

      // Filter and transform conflicts
      const conflicts: CalendarConflict[] = (events || [])
        .filter(event => {
          // Exclude the specified event
          if (excludeEventId && event.id === excludeEventId) {
            return false;
          }

          // Check if events overlap
          const eventStart = new Date(event.starts_at).getTime();
          const eventEnd = new Date(event.ends_at || event.starts_at).getTime();
          const rangeStart = new Date(starts_at).getTime();
          const rangeEnd = new Date(ends_at).getTime();

          return eventStart < rangeEnd && eventEnd > rangeStart;
        })
        .map(event => ({
          eventId: event.id,
          title: event.title,
          source: 'connection' as const,
          starts_at: event.starts_at,
          ends_at: event.ends_at || event.starts_at,
          duration_minutes: event.ends_at
            ? Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000)
            : 0,
        }));

      // Cache the results
      conflictCache.set(cacheKey, { data: conflicts, timestamp: Date.now() });

      console.log('[calendarSyncService] ✅ Conflict check complete:', { count: conflicts.length });
      return conflicts;
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error checking conflicts:', error);
      throw error;
    }
  },

  /**
   * Enables automatic synchronization for a Connection Space.
   * Creates or updates sync configuration in the database.
   * Events in the space will be automatically synced at the specified interval.
   *
   * @param spaceId - The unique identifier of the Connection Space
   * @param syncIntervalMinutes - Sync interval in minutes (default: 30)
   * @returns Promise that resolves when auto-sync is enabled
   * @throws {Error} If user is not authenticated
   * @throws {Error} If database update fails
   *
   * @example
   * // Enable auto-sync every 30 minutes (default)
   * await calendarSyncService.enableAutoSync('space-123');
   *
   * @example
   * // Enable auto-sync every 10 minutes
   * await calendarSyncService.enableAutoSync('space-123', 10);
   */
  async enableAutoSync(spaceId: string, syncIntervalMinutes: number = 30): Promise<void> {
    try {
      console.log('[calendarSyncService] 🔄 Enabling auto-sync for space:', {
        spaceId,
        syncIntervalMinutes,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if sync config already exists
      const { data: existingConfig } = await supabase
        .from('connection_space_sync_config')
        .select('id')
        .eq('space_id', spaceId)
        .single();

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('connection_space_sync_config')
          .update({
            auto_sync_enabled: true,
            sync_interval_minutes: syncIntervalMinutes,
            updated_at: new Date().toISOString(),
          })
          .eq('space_id', spaceId);

        if (error) {
          throw new Error(`Failed to update sync config: ${error.message}`);
        }
      } else {
        // Create new sync config
        const { error } = await supabase
          .from('connection_space_sync_config')
          .insert({
            space_id: spaceId,
            user_id: user.id,
            calendar_id: 'primary',
            auto_sync_enabled: true,
            sync_interval_minutes: syncIntervalMinutes,
          });

        if (error) {
          throw new Error(`Failed to create sync config: ${error.message}`);
        }
      }

      console.log('[calendarSyncService] ✅ Auto-sync enabled');
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error enabling auto-sync:', error);
      throw error;
    }
  },

  /**
   * Disables automatic synchronization for a Connection Space.
   * Updates the sync configuration but preserves other settings.
   *
   * @param spaceId - The unique identifier of the Connection Space
   * @returns Promise that resolves when auto-sync is disabled
   * @throws {Error} If database update fails
   *
   * @example
   * await calendarSyncService.disableAutoSync('space-123');
   * console.log('Auto-sync disabled for space');
   */
  async disableAutoSync(spaceId: string): Promise<void> {
    try {
      console.log('[calendarSyncService] 🛑 Disabling auto-sync for space:', { spaceId });

      const { error } = await supabase
        .from('connection_space_sync_config')
        .update({
          auto_sync_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('space_id', spaceId);

      if (error) {
        throw new Error(`Failed to disable auto-sync: ${error.message}`);
      }

      console.log('[calendarSyncService] ✅ Auto-sync disabled');
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error disabling auto-sync:', error);
      throw error;
    }
  },

  /**
   * Retrieves the sync configuration and status for a Connection Space.
   * Returns null if no sync configuration exists.
   *
   * @param spaceId - The unique identifier of the Connection Space
   * @returns Promise resolving to SpaceSyncConfig or null
   * @throws {Error} If database query fails
   *
   * @example
   * const syncStatus = await calendarSyncService.getSpaceSyncStatus('space-123');
   * if (syncStatus?.auto_sync_enabled) {
   *   console.log(`Auto-sync is enabled (interval: ${syncStatus.sync_interval_minutes} minutes)`);
   * }
   */
  async getSpaceSyncStatus(spaceId: string): Promise<SpaceSyncConfig | null> {
    try {
      const { data, error } = await supabase
        .from('connection_space_sync_config')
        .select('*')
        .eq('space_id', spaceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as SpaceSyncConfig | null;
    } catch (error) {
      console.error('[calendarSyncService] ❌ Error getting sync status:', error);
      throw error;
    }
  },

  /**
   * Helper: Format date/time for Google Calendar API
   */
  private formatGoogleDateTime(
    isoString: string,
    isAllDay: boolean
  ): { dateTime?: string; date?: string; timeZone?: string } {
    if (isAllDay) {
      // Extract date portion only (YYYY-MM-DD)
      return { date: isoString.split('T')[0] };
    }

    return {
      dateTime: isoString,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },

  /**
   * Clears the conflict cache.
   * Useful for testing or when you need to force a fresh conflict check.
   *
   * @example
   * calendarSyncService.clearConflictCache();
   * console.log('Conflict cache cleared - next check will query database');
   */
  clearConflictCache(): void {
    conflictCache.clear();
    console.log('[calendarSyncService] 💾 Conflict cache cleared');
  },
};
