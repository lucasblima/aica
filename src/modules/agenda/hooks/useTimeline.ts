import { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent, DateRange } from '../types';
import { fetchCalendarEvents } from '../services/calendarEventService';
import { getTimelineProviders } from '../providers/registry';
import { supabase } from '@/services/supabaseClient';

export interface UseTimelineOptions {
  userId: string;
  range: DateRange;
  enabled?: boolean;
}

export interface UseTimelineReturn {
  events: TimelineEvent[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useTimeline({ userId, range, enabled = true }: UseTimelineOptions): UseTimelineReturn {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const rangeStartTime = range.start.getTime();
  const rangeEndTime = range.end.getTime();

  useEffect(() => {
    if (!enabled || !userId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        const rangeStart = range.start.toISOString();
        const rangeEnd = range.end.toISOString();

        // 1. Fetch work_items with scheduled_time in range
        const workItemsPromise = supabase
          .from('work_items')
          .select('*')
          .eq('user_id', userId)
          .not('scheduled_time', 'is', null)
          .gte('scheduled_time', rangeStart)
          .lte('scheduled_time', rangeEnd)
          .order('scheduled_time', { ascending: true });

        // 2. Fetch calendar_events in range
        const calendarEventsPromise = fetchCalendarEvents(userId, range);

        // 3. Fetch from all registered timeline providers
        const providers = getTimelineProviders();
        const providerPromises = providers.map(p =>
          p.getEvents(userId, range).catch(err => {
            console.warn(`Timeline provider ${p.source} failed:`, err);
            return [] as TimelineEvent[];
          })
        );

        const [workItemsResult, calendarEvents, ...providerResults] = await Promise.all([
          workItemsPromise,
          calendarEventsPromise,
          ...providerPromises,
        ]);

        if (cancelled) return;

        // Transform work_items to TimelineEvent
        const workItemEvents: TimelineEvent[] = (workItemsResult.data || []).map(item => ({
          id: `work_item_${item.id}`,
          title: item.title,
          start: item.scheduled_time!,
          end: item.estimated_duration
            ? new Date(new Date(item.scheduled_time!).getTime() + item.estimated_duration * 60000).toISOString()
            : null,
          source: 'work_item',
          sourceId: item.id,
          color: item.priority === 'urgent' ? '#ef4444' : item.priority === 'high' ? '#f97316' : undefined,
          isReadOnly: false,
          metadata: {
            status: item.status,
            priority: item.priority,
            priority_quadrant: item.priority_quadrant,
            estimated_duration: item.estimated_duration,
          },
        }));

        // Transform calendar_events to TimelineEvent
        const calendarTimelineEvents: TimelineEvent[] = calendarEvents.map(event => ({
          id: `calendar_${event.id}`,
          title: event.title,
          start: event.start_time,
          end: event.end_time || null,
          allDay: event.all_day,
          source: `calendar_${event.source}`,
          sourceId: event.id,
          color: event.color || undefined,
          isReadOnly: event.source !== 'manual',
          metadata: {
            location: event.location,
            description: event.description,
            external_url: event.external_url,
          },
        }));

        // Flatten provider results
        const providerEvents = providerResults.flat();

        // Merge and sort by start time
        const allEvents = [...workItemEvents, ...calendarTimelineEvents, ...providerEvents]
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        setEvents(allEvents);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, rangeStartTime, rangeEndTime, enabled, refreshKey]);

  return { events, isLoading, error, refresh };
}
