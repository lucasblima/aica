/**
 * useCrossModuleEvents
 *
 * Lightweight hook that fetches events from all registered timeline
 * providers (Flux, Finance, Studio, etc.) and returns them in the
 * Google Calendar TimelineEvent shape used by AgendaPageShell views.
 *
 * This replaces useFluxAgendaEvents by fetching from ALL providers,
 * not just Flux. Provider failures are isolated — one failing provider
 * doesn't break others.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { getTimelineProviders } from '../providers/registry';
import type { TimelineEvent as AgendaTimelineEvent, DateRange } from '../types';
import type { TimelineEvent as CalendarTimelineEvent } from '@/services/googleCalendarService';

const log = createNamespacedLogger('useCrossModuleEvents');

/** Transform agenda module TimelineEvent to Google Calendar TimelineEvent shape */
function toCalendarEvent(event: AgendaTimelineEvent): CalendarTimelineEvent {
  const durationMs = event.end
    ? new Date(event.end).getTime() - new Date(event.start).getTime()
    : 0;
  const durationMinutes = Math.round(durationMs / 60000);

  return {
    id: event.id,
    title: event.title,
    startTime: event.start,
    endTime: event.end || event.start,
    description: String(event.metadata?.subtitle || event.metadata?.description || ''),
    isAllDay: event.allDay ?? false,
    duration: durationMinutes || 0,
    color: event.color,
    source: event.source,
    aicaModule: event.source,
  };
}

export interface UseCrossModuleEventsOptions {
  /** Date range for events. Defaults to today + 7 days. */
  range?: DateRange;
  /** Enable/disable fetching. Default true. */
  enabled?: boolean;
}

export interface UseCrossModuleEventsReturn {
  events: CalendarTimelineEvent[];
  isLoading: boolean;
  refresh: () => void;
}

export function useCrossModuleEvents(
  options: UseCrossModuleEventsOptions = {}
): UseCrossModuleEventsReturn {
  const { enabled = true } = options;

  const [providerEvents, setProviderEvents] = useState<AgendaTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Default range: today to 7 days from now
  const range = useMemo<DateRange>(() => {
    if (options.range) return options.range;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }, [options.range?.start?.getTime(), options.range?.end?.getTime()]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProviderEvents() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setIsLoading(false);
          return;
        }

        const providers = getTimelineProviders();
        if (providers.length === 0) {
          setProviderEvents([]);
          setIsLoading(false);
          return;
        }

        const results = await Promise.all(
          providers.map(p =>
            p.getEvents(user.id, range).catch(err => {
              log.warn(`Provider ${p.source} failed:`, err);
              return [] as AgendaTimelineEvent[];
            })
          )
        );

        if (!cancelled) {
          const allEvents = results.flat().sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
          );
          setProviderEvents(allEvents);
        }
      } catch (err) {
        log.error('Error fetching cross-module events:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    setIsLoading(true);
    fetchProviderEvents();
    return () => { cancelled = true; };
  }, [enabled, range.start.getTime(), range.end.getTime(), refreshKey]);

  const events = useMemo(
    () => providerEvents.map(toCalendarEvent),
    [providerEvents]
  );

  return { events, isLoading, refresh };
}
