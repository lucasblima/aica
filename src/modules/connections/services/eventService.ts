import { supabase } from '@/lib/supabase';
import { ConnectionEvent, CreateEventPayload, ConnectionSpace } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EventService');

/**
 * Date range filter for event queries
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Event Service
 *
 * Handles all CRUD operations and business logic for Connection Events.
 * Supports calendar integration, RSVP, and recurring events.
 */
export const eventService = {
  /**
   * Lists all events for a specific connection space.
   * Optionally filtered by date range. Ordered by start date (ascending).
   *
   * @param spaceId - The unique identifier of the connection space
   * @param dateRange - Optional date range filter
   * @param dateRange.start - Start date in ISO format
   * @param dateRange.end - End date in ISO format
   * @returns Promise resolving to an array of ConnectionEvent objects
   * @throws {Error} If the database query fails
   *
   * @example
   * // Get all events for a space
   * const events = await eventService.getEvents('space-123');
   *
   * @example
   * // Get events within a date range
   * const januaryEvents = await eventService.getEvents('space-123', {
   *   start: '2025-01-01T00:00:00Z',
   *   end: '2025-01-31T23:59:59Z'
   * });
   */
  async getEvents(spaceId: string, dateRange?: DateRange): Promise<ConnectionEvent[]> {
    try {
      let query = supabase
        .from('connection_events')
        .select('*')
        .eq('space_id', spaceId)
        .order('starts_at', { ascending: true });

      // Apply date range filter if provided
      if (dateRange) {
        query = query
          .gte('starts_at', dateRange.start)
          .lte('starts_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        log.error('Error fetching events:', { error, spaceId, dateRange });
        throw new Error(`Failed to fetch events: ${error.message}`);
      }

      return data as ConnectionEvent[];
    } catch (error) {
      log.error('Error in getEvents:', { error });
      throw error;
    }
  },

  /**
   * Fetches a single event by its ID.
   *
   * @param id - The unique identifier of the event
   * @returns Promise resolving to a ConnectionEvent object
   * @throws {Error} If event is not found or query fails
   *
   * @example
   * const event = await eventService.getEventById('event-123');
   * console.log(`Event: ${event.title} on ${event.starts_at}`);
   */
  async getEventById(id: string): Promise<ConnectionEvent> {
    try {
      const { data, error } = await supabase
        .from('connection_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        log.error('Error fetching event:', { error, id });
        throw new Error(`Failed to fetch event: ${error.message}`);
      }

      if (!data) {
        throw new Error('Event not found');
      }

      return data as ConnectionEvent;
    } catch (error) {
      log.error('Error in getEventById:', { error });
      throw error;
    }
  },

  /**
   * Creates a new event in a connection space.
   * The authenticated user becomes the event creator.
   *
   * @param spaceId - The unique identifier of the connection space
   * @param data - Event creation payload
   * @param data.title - Event title (required)
   * @param data.description - Event description (optional)
   * @param data.location - Event location (optional)
   * @param data.starts_at - Start date/time in ISO format (required)
   * @param data.ends_at - End date/time in ISO format (optional)
   * @param data.is_all_day - Whether this is an all-day event (default: false)
   * @param data.recurrence_rule - Recurrence rule in iCal format (optional)
   * @param data.event_type - Type of event (optional)
   * @param data.rsvp_enabled - Enable RSVP tracking (default: false)
   * @param data.rsvp_deadline - RSVP deadline date/time (optional)
   * @returns Promise resolving to the created ConnectionEvent
   * @throws {Error} If user is not authenticated
   * @throws {Error} If event creation fails
   *
   * @example
   * const event = await eventService.createEvent('space-123', {
   *   title: 'Team Meeting',
   *   description: 'Weekly sync',
   *   location: 'Conference Room A',
   *   starts_at: '2025-12-15T10:00:00Z',
   *   ends_at: '2025-12-15T11:00:00Z',
   *   rsvp_enabled: true
   * });
   */
  async createEvent(spaceId: string, data: CreateEventPayload): Promise<ConnectionEvent> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const eventPayload = {
        space_id: spaceId,
        created_by: user.id,
        title: data.title,
        description: data.description,
        location: data.location,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        is_all_day: data.is_all_day ?? false,
        recurrence_rule: data.recurrence_rule,
        event_type: data.event_type,
        rsvp_enabled: data.rsvp_enabled ?? false,
        rsvp_deadline: data.rsvp_deadline
      };

      const { data: eventData, error } = await supabase
        .from('connection_events')
        .insert(eventPayload)
        .select()
        .single();

      if (error) {
        log.error('Error creating event:', { error, spaceId, payload });
        throw new Error(`Failed to create event: ${error.message}`);
      }

      return eventData as ConnectionEvent;
    } catch (error) {
      log.error('Error in createEvent:', { error });
      throw error;
    }
  },

  /**
   * Updates an existing event.
   * Only the event creator or space owner can update the event.
   *
   * @param id - The unique identifier of the event to update
   * @param data - Partial update payload with fields to modify
   * @returns Promise resolving to the updated ConnectionEvent
   * @throws {Error} If user is not authenticated
   * @throws {Error} If user lacks permission to update the event
   * @throws {Error} If event is not found
   *
   * @example
   * const updated = await eventService.updateEvent('event-123', {
   *   title: 'Updated Meeting Title',
   *   location: 'New Location'
   * });
   */
  async updateEvent(id: string, data: Partial<CreateEventPayload>): Promise<ConnectionEvent> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the event to verify ownership/permissions
      const event = await this.getEventById(id);

      // Verify that the user is either the creator or an admin of the space
      const { data: space } = await supabase
        .from('connection_spaces')
        .select('owner_id')
        .eq('id', event.space_id)
        .single();

      const isSpaceOwner = space && space.owner_id === user.id;
      const isEventCreator = event.created_by === user.id;

      if (!isSpaceOwner && !isEventCreator) {
        throw new Error('You do not have permission to update this event');
      }

      const updatePayload = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: eventData, error } = await supabase
        .from('connection_events')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating event:', { error, id, payload });
        throw new Error(`Failed to update event: ${error.message}`);
      }

      if (!eventData) {
        throw new Error('Event not found');
      }

      return eventData as ConnectionEvent;
    } catch (error) {
      log.error('Error in updateEvent:', { error });
      throw error;
    }
  },

  /**
   * Deletes an event (hard delete).
   * Only the event creator or space owner can delete the event.
   * Warning: This is a permanent deletion.
   *
   * @param id - The unique identifier of the event to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {Error} If user is not authenticated
   * @throws {Error} If user lacks permission to delete the event
   * @throws {Error} If deletion fails
   *
   * @example
   * await eventService.deleteEvent('event-123');
   * console.log('Event permanently deleted');
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the event to verify ownership/permissions
      const event = await this.getEventById(id);

      // Verify that the user is either the creator or an admin of the space
      const { data: space } = await supabase
        .from('connection_spaces')
        .select('owner_id')
        .eq('id', event.space_id)
        .single();

      const isSpaceOwner = space && space.owner_id === user.id;
      const isEventCreator = event.created_by === user.id;

      if (!isSpaceOwner && !isEventCreator) {
        throw new Error('You do not have permission to delete this event');
      }

      const { error } = await supabase
        .from('connection_events')
        .delete()
        .eq('id', id);

      if (error) {
        log.error('Error deleting event:', { error, id });
        throw new Error(`Failed to delete event: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in deleteEvent:', { error });
      throw error;
    }
  },

  /**
   * Lists upcoming events across all user's active spaces.
   * Returns events with their associated space information.
   * Useful for dashboard widgets and upcoming event views.
   *
   * @param limit - Maximum number of events to return (default: 10)
   * @returns Promise resolving to array of events with embedded space data
   * @throws {Error} If user is not authenticated
   * @throws {Error} If database query fails
   *
   * @example
   * // Get next 10 upcoming events
   * const upcoming = await eventService.getUpcomingEvents();
   * upcoming.forEach(event => {
   *   console.log(`${event.title} at ${event.space.name}`);
   * });
   *
   * @example
   * // Get next 5 upcoming events
   * const nextFive = await eventService.getUpcomingEvents(5);
   */
  async getUpcomingEvents(limit: number = 10): Promise<(ConnectionEvent & { space: ConnectionSpace })[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, get all active spaces for the user
      const { data: spaces, error: spacesError } = await supabase
        .from('connection_spaces')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (spacesError) {
        log.error('Error fetching spaces:', { error: spacesError });
        throw new Error(`Failed to fetch spaces: ${spacesError.message}`);
      }

      if (!spaces || spaces.length === 0) {
        return [];
      }

      const spaceIds = spaces.map(s => s.id);
      const now = new Date().toISOString();

      // Fetch upcoming events from all user's spaces
      const { data: events, error: eventsError } = await supabase
        .from('connection_events')
        .select(`
          *,
          space:connection_spaces (*)
        `)
        .in('space_id', spaceIds)
        .gte('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (eventsError) {
        log.error('Error fetching upcoming events:', { error: eventsError });
        throw new Error(`Failed to fetch upcoming events: ${eventsError.message}`);
      }

      // Transform the data to match the expected type
      return (events || []).map(event => {
        const { space, ...eventData } = event;
        return {
          ...eventData,
          space: Array.isArray(space) ? space[0] : space
        } as ConnectionEvent & { space: ConnectionSpace };
      });
    } catch (error) {
      log.error('Error in getUpcomingEvents:', { error });
      throw error;
    }
  },
};
