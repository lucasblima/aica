/**
 * useSpaceEvents Hook
 *
 * Manages events for a connection space.
 * Handles event CRUD operations and upcoming events tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { eventService, DateRange } from '../services/eventService';
import type { ConnectionEvent, CreateEventPayload, ConnectionSpace } from '../types';

interface UseSpaceEventsReturn {
  events: ConnectionEvent[];
  loading: boolean;
  error: Error | null;
  createEvent: (payload: CreateEventPayload) => Promise<ConnectionEvent>;
  updateEvent: (eventId: string, payload: Partial<CreateEventPayload>) => Promise<ConnectionEvent>;
  deleteEvent: (eventId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing space events
 *
 * @example
 * ```tsx
 * const { events, loading, createEvent, updateEvent, deleteEvent } = useSpaceEvents(spaceId, {
 *   start: '2024-01-01',
 *   end: '2024-01-31'
 * });
 *
 * // Create an event
 * await createEvent({
 *   title: 'Team Meeting',
 *   starts_at: '2024-01-15T10:00:00Z',
 *   location: 'Office'
 * });
 *
 * // Update event
 * await updateEvent(eventId, { title: 'Updated Meeting' });
 *
 * // Delete event
 * await deleteEvent(eventId);
 * ```
 */
export function useSpaceEvents(
  spaceId: string | undefined,
  dateRange?: DateRange
): UseSpaceEventsReturn {
  const { user } = useAuth();
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await eventService.getEvents(spaceId, dateRange);
      setEvents(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId, dateRange]);

  // Create new event
  const createEvent = useCallback(
    async (payload: CreateEventPayload): Promise<ConnectionEvent> => {
      if (!user?.id || !spaceId) throw new Error('User not authenticated or space ID missing');

      try {
        setLoading(true);
        setError(null);

        const newEvent = await eventService.createEvent(spaceId, payload);

        // Add to local state
        setEvents((prev) => [...prev, newEvent].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        ));

        return newEvent;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId]
  );

  // Update event
  const updateEvent = useCallback(
    async (eventId: string, payload: Partial<CreateEventPayload>): Promise<ConnectionEvent> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updatedEvent = await eventService.updateEvent(eventId, payload);

        // Update local state
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? updatedEvent : e)).sort(
            (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
          )
        );

        return updatedEvent;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Delete event
  const deleteEvent = useCallback(
    async (eventId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await eventService.deleteEvent(eventId);

        // Remove from local state
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh events
  const refresh = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (user?.id && spaceId) {
      fetchEvents();
    }
  }, [user?.id, spaceId, fetchEvents]);

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    refresh,
  };
}

/**
 * Hook for fetching upcoming events across all user's spaces
 *
 * @example
 * ```tsx
 * const { upcomingEvents, loading } = useUpcomingEvents(10);
 * ```
 */
export function useUpcomingEvents(limit: number = 5) {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<(ConnectionEvent & { space: ConnectionSpace })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUpcomingEvents = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await eventService.getUpcomingEvents(limit);
      setUpcomingEvents(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching upcoming events:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  useEffect(() => {
    if (user?.id) {
      fetchUpcomingEvents();
    }
  }, [user?.id, fetchUpcomingEvents]);

  return {
    upcomingEvents,
    loading,
    error,
    refresh: fetchUpcomingEvents,
  };
}

export default useSpaceEvents;
