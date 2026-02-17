/**
 * useCanvasCalendar Hook
 *
 * Fetches Google Calendar events for the Flux Canvas grid.
 * Supports coach calendar (authenticated user) and optionally
 * the athlete's calendar if they have connected Google Calendar.
 * Transforms events into BusySlot format for the WeeklyGrid overlay.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGoogleCalendarEvents } from '@/hooks/useGoogleCalendarEvents';
import type { TimelineEvent } from '@/services/googleCalendarService';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useCanvasCalendar');

export interface BusySlot {
  dayOfWeek: number; // 1-7 (Mon=1, Sun=7)
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  title: string;
  source: 'coach' | 'athlete';
  isAllDay: boolean;
}

export interface UseCanvasCalendarOptions {
  weekStartDate: Date; // Monday of the week to display
  athleteId?: string; // optional — to check athlete's calendar
}

export interface UseCanvasCalendarReturn {
  coachEvents: TimelineEvent[];
  athleteEvents: TimelineEvent[];
  busySlots: BusySlot[];
  showCoach: boolean;
  showAthlete: boolean;
  toggleCoach: () => void;
  toggleAthlete: () => void;
  isConnected: boolean;
  athleteCalendarConnected: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Convert an ISO datetime string to "HH:mm" format */
function toTimeString(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get the day of week (1=Mon, 7=Sun) from an ISO date string.
 * JS Date.getDay() returns 0=Sun, 1=Mon ... 6=Sat.
 */
function toDayOfWeek(isoString: string): number {
  const jsDay = new Date(isoString).getDay(); // 0=Sun
  return jsDay === 0 ? 7 : jsDay; // convert to 1=Mon, 7=Sun
}

/** Transform TimelineEvent[] into BusySlot[] for a given week */
function eventsToBusySlots(
  events: TimelineEvent[],
  source: 'coach' | 'athlete',
  weekStart: Date,
  weekEnd: Date
): BusySlot[] {
  return events
    .filter((e) => {
      const start = new Date(e.startTime);
      return start >= weekStart && start < weekEnd;
    })
    .map((e) => ({
      dayOfWeek: toDayOfWeek(e.startTime),
      startTime: e.isAllDay ? '00:00' : toTimeString(e.startTime),
      endTime: e.isAllDay ? '23:59' : toTimeString(e.endTime),
      title: e.title,
      source,
      isAllDay: e.isAllDay,
    }));
}

export function useCanvasCalendar(
  options: UseCanvasCalendarOptions
): UseCanvasCalendarReturn {
  const { weekStartDate, athleteId } = options;

  // Calculate week boundaries (Mon through next Mon)
  const weekEnd = useMemo(() => {
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStartDate.getTime()]);

  // Coach calendar via existing hook
  const {
    events: coachEvents,
    isConnected,
    isLoading: coachLoading,
    error: coachError,
    sync: coachSync,
  } = useGoogleCalendarEvents({
    autoSync: true,
    syncInterval: 300,
    startDate: weekStartDate,
    endDate: weekEnd,
  });

  // Athlete calendar state
  const [athleteEvents, setAthleteEvents] = useState<TimelineEvent[]>([]);
  const [athleteCalendarConnected, setAthleteCalendarConnected] = useState(false);
  const [athleteLoading, setAthleteLoading] = useState(false);
  const [athleteError, setAthleteError] = useState<string | null>(null);

  // Visibility toggles
  const [showCoach, setShowCoach] = useState(true);
  const [showAthlete, setShowAthlete] = useState(true);

  const toggleCoach = useCallback(() => setShowCoach((v) => !v), []);
  const toggleAthlete = useCallback(() => setShowAthlete((v) => !v), []);

  // Check if athlete has connected Google Calendar and fetch their busy slots
  const fetchAthleteCalendar = useCallback(async () => {
    if (!athleteId) {
      setAthleteCalendarConnected(false);
      setAthleteEvents([]);
      return;
    }

    try {
      setAthleteLoading(true);
      setAthleteError(null);

      // Use SECURITY DEFINER RPC to check athlete calendar connection (bypasses RLS safely)
      const { data: isConnected, error: rpcError } = await supabase
        .rpc('check_athlete_calendar_connected', { p_athlete_id: athleteId });

      if (rpcError) {
        log.error('Error checking athlete calendar:', rpcError);
        setAthleteCalendarConnected(false);
        return;
      }

      if (!isConnected) {
        log.debug('Athlete has no Google Calendar connection');
        setAthleteCalendarConnected(false);
        setAthleteEvents([]);
        return;
      }

      setAthleteCalendarConnected(true);

      // Fetch athlete's busy slots via Edge Function (privacy-safe FreeBusy API)
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'fetch-athlete-calendar',
        {
          body: {
            athleteId,
            startDate: weekStartDate.toISOString(),
            endDate: weekEnd.toISOString(),
          },
        }
      );

      if (fnError) {
        log.error('Error fetching athlete calendar:', fnError);
        setAthleteError('Erro ao buscar agenda do atleta');
        setAthleteEvents([]);
        return;
      }

      if (!response?.success || !response.busySlots) {
        log.warn('Athlete calendar fetch unsuccessful:', response?.error);
        setAthleteEvents([]);
        return;
      }

      // Map FreeBusy response to TimelineEvent[] for the existing eventsToBusySlots pipeline
      const events: TimelineEvent[] = response.busySlots.map(
        (slot: { start: string; end: string }, idx: number) => {
          const startMs = new Date(slot.start).getTime();
          const endMs = new Date(slot.end).getTime();
          const durationMin = Math.round((endMs - startMs) / 60000);
          return {
            id: `athlete-busy-${idx}`,
            title: 'Ocupado',
            startTime: slot.start,
            endTime: slot.end,
            duration: durationMin,
            isAllDay: false,
            source: 'google_calendar' as const,
          };
        }
      );

      log.debug('Athlete calendar fetched:', { busySlots: response.busySlots.length, events: events.length });
      setAthleteEvents(events);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching athlete calendar';
      setAthleteError(msg);
      log.error('Athlete calendar error:', err);
    } finally {
      setAthleteLoading(false);
    }
  }, [athleteId, weekStartDate.getTime(), weekEnd.getTime()]);

  // Fetch athlete calendar on mount and when athleteId changes
  useEffect(() => {
    fetchAthleteCalendar();
  }, [fetchAthleteCalendar]);

  // Compute combined busy slots from visible calendars
  const busySlots = useMemo<BusySlot[]>(() => {
    const slots: BusySlot[] = [];

    if (showCoach && coachEvents.length > 0) {
      slots.push(...eventsToBusySlots(coachEvents, 'coach', weekStartDate, weekEnd));
    }

    if (showAthlete && athleteEvents.length > 0) {
      slots.push(...eventsToBusySlots(athleteEvents, 'athlete', weekStartDate, weekEnd));
    }

    // Sort by day, then start time
    return slots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [coachEvents, athleteEvents, showCoach, showAthlete, weekStartDate, weekEnd]);

  // Combined refresh
  const refresh = useCallback(async () => {
    await Promise.all([coachSync(), fetchAthleteCalendar()]);
  }, [coachSync, fetchAthleteCalendar]);

  return {
    coachEvents,
    athleteEvents,
    busySlots,
    showCoach,
    showAthlete,
    toggleCoach,
    toggleAthlete,
    isConnected,
    athleteCalendarConnected,
    isLoading: coachLoading || athleteLoading,
    error: coachError || athleteError,
    refresh,
  };
}
