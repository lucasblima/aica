/**
 * useFluxAgendaEvents
 *
 * Fetches workout_slots for the current user across all active microcycles
 * and transforms them into TimelineEvent[] for the Agenda module.
 *
 * Maps (microcycle.start_date + week_number + day_of_week + start_time)
 * to actual ISO dates so they appear on the correct day in the Agenda.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { TimelineEvent } from '@/services/googleCalendarService';

const log = createNamespacedLogger('useFluxAgendaEvents');

const MODALITY_COLORS: Record<string, string> = {
  swimming: '#06B6D4',
  running: '#F97316',
  cycling: '#10B981',
  strength: '#A855F7',
  walking: '#3B82F6',
};

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

export function useFluxAgendaEvents(): {
  events: TimelineEvent[];
  isLoading: boolean;
} {
  const [slots, setSlots] = useState<FluxSlotRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSlots = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setIsLoading(false);
          return;
        }

        // Fetch all workout_slots from active/draft microcycles with their start_date
        const { data, error } = await supabase
          .from('workout_slots')
          .select(`
            id, name, duration, intensity, modality,
            week_number, day_of_week, start_time, completed,
            microcycles!inner(start_date, name)
          `)
          .eq('user_id', user.id)
          .in('microcycles.status', ['active', 'draft']);

        if (error) {
          log.error('Error fetching flux slots for agenda:', error);
          setIsLoading(false);
          return;
        }

        if (!cancelled) {
          setSlots((data as unknown as FluxSlotRow[]) || []);
        }
      } catch (err) {
        log.error('Unexpected error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSlots();
    return () => { cancelled = true; };
  }, []);

  const events = useMemo<TimelineEvent[]>(() => {
    return slots
      .filter((slot) => slot.start_time) // Only slots with a time
      .map((slot) => {
        // Calculate actual date from microcycle start_date + week_number + day_of_week
        const mcStart = new Date(slot.microcycles.start_date + 'T00:00:00');
        const dayOffset = (slot.week_number - 1) * 7 + (slot.day_of_week - 1);
        const slotDate = new Date(mcStart);
        slotDate.setDate(mcStart.getDate() + dayOffset);
        const dateStr = slotDate.toISOString().split('T')[0];

        const startISO = `${dateStr}T${slot.start_time}:00`;
        const endDate = new Date(new Date(startISO).getTime() + slot.duration * 60000);
        const endISO = endDate.toISOString();

        const color = MODALITY_COLORS[slot.modality] || '#F97316';
        const intensityLabel =
          slot.intensity === 'low' ? 'Leve' :
          slot.intensity === 'medium' ? 'Media' :
          slot.intensity === 'high' ? 'Alta' : slot.intensity;

        return {
          id: `flux-${slot.id}`,
          title: `${slot.name}`,
          description: `${slot.modality} · ${intensityLabel} · ${slot.duration}min`,
          startTime: startISO,
          endTime: endISO,
          duration: slot.duration,
          isAllDay: false,
          source: 'flux_workout' as const,
          color,
        };
      });
  }, [slots]);

  return { events, isLoading };
}
