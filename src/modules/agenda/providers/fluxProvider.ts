/**
 * Flux Timeline Provider
 *
 * Queries workout_slots from active/draft microcycles and transforms them
 * into TimelineEvent[] for the unified agenda timeline.
 *
 * Date calculation: microcycle.start_date + (week_number - 1) * 7 + (day_of_week - 1)
 * mirrors the logic in useFluxAgendaEvents hook.
 */

import type { TimelineProvider } from './types';
import type { TimelineEvent, DateRange } from '../types';
import { supabase } from '@/services/supabaseClient';

const MODALITY_COLORS: Record<string, string> = {
  swimming: '#06B6D4',
  running: '#F97316',
  cycling: '#10B981',
  strength: '#A855F7',
  walking: '#3B82F6',
};

const DEFAULT_COLOR = '#F97316';

interface FluxSlotRow {
  id: string;
  name: string;
  duration: number;
  intensity: string;
  modality: string;
  week_number: number;
  day_of_week: number;
  start_time: string | null;
  completed: boolean;
  microcycles: {
    start_date: string;
    name: string;
  };
}

function formatDatePart(n: number): string {
  return n.toString().padStart(2, '0');
}

function computeSlotDate(mcStartDate: string, weekNumber: number, dayOfWeek: number): string {
  const mcStart = new Date(mcStartDate + 'T00:00:00');
  const dayOffset = (weekNumber - 1) * 7 + (dayOfWeek - 1);
  const slotDate = new Date(mcStart);
  slotDate.setDate(mcStart.getDate() + dayOffset);
  return `${slotDate.getFullYear()}-${formatDatePart(slotDate.getMonth() + 1)}-${formatDatePart(slotDate.getDate())}`;
}

function computeEndTime(startISO: string, durationMinutes: number): string {
  const endMs = new Date(startISO).getTime() + durationMinutes * 60000;
  const ed = new Date(endMs);
  return `${ed.getFullYear()}-${formatDatePart(ed.getMonth() + 1)}-${formatDatePart(ed.getDate())}T${formatDatePart(ed.getHours())}:${formatDatePart(ed.getMinutes())}:${formatDatePart(ed.getSeconds())}`;
}

function intensityLabel(intensity: string): string {
  switch (intensity) {
    case 'low': return 'Leve';
    case 'medium': return 'Media';
    case 'high': return 'Alta';
    default: return intensity;
  }
}

export const fluxProvider: TimelineProvider = {
  source: 'flux',

  async getEvents(userId: string, range: DateRange): Promise<TimelineEvent[]> {
    const { data, error } = await supabase
      .from('workout_slots')
      .select(`
        id, name, duration, intensity, modality,
        week_number, day_of_week, start_time, completed,
        microcycles!inner(start_date, name)
      `)
      .eq('user_id', userId)
      .in('microcycles.status', ['active', 'draft']);

    if (error || !data) {
      return [];
    }

    const rangeStart = range.start.getTime();
    const rangeEnd = range.end.getTime();

    return (data as unknown as FluxSlotRow[])
      .filter((slot) => slot.start_time != null)
      .map((slot) => {
        const dateStr = computeSlotDate(
          slot.microcycles.start_date,
          slot.week_number,
          slot.day_of_week
        );
        const startISO = `${dateStr}T${slot.start_time}:00`;
        const endISO = computeEndTime(startISO, slot.duration);
        const color = MODALITY_COLORS[slot.modality] || DEFAULT_COLOR;

        return {
          id: `flux-${slot.id}`,
          title: slot.name,
          start: startISO,
          end: endISO,
          allDay: false,
          source: 'flux',
          sourceId: slot.id,
          color,
          icon: 'dumbbell',
          isReadOnly: true,
          metadata: {
            modality: slot.modality,
            intensity: slot.intensity,
            intensityLabel: intensityLabel(slot.intensity),
            duration: slot.duration,
            completed: slot.completed,
            microcycleName: slot.microcycles.name,
          },
        };
      })
      .filter((event) => {
        const eventTime = new Date(event.start).getTime();
        return eventTime >= rangeStart && eventTime <= rangeEnd;
      });
  },
};
