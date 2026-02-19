/**
 * useCanvasDragDrop Hook
 *
 * Data loading and realtime subscription for canvas workout slots.
 * Fetches/creates microcycle and maintains slot state via Supabase Realtime.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { MicrocycleService } from '../services/microcycleService';
import type {
  Microcycle,
  WorkoutSlot,
  MicrocycleWeekFocus,
} from '../types/flow';
import type { RealtimeChannel } from '@supabase/supabase-js';

const log = createNamespacedLogger('useCanvasDragDrop');

export interface UseCanvasDragDropOptions {
  athleteId: string;
}

export interface UseCanvasDragDropReturn {
  activeMicrocycle: Microcycle | null;
  setActiveMicrocycle: React.Dispatch<React.SetStateAction<Microcycle | null>>;
  slots: WorkoutSlot[];
  setSlots: React.Dispatch<React.SetStateAction<WorkoutSlot[]>>;
  isLoading: boolean;
  error: Error | null;
  setError: React.Dispatch<React.SetStateAction<Error | null>>;
  refresh: () => Promise<void>;
}

/** Sort comparator for slots */
function sortSlots(a: WorkoutSlot, b: WorkoutSlot): number {
  if (a.week_number !== b.week_number) return a.week_number - b.week_number;
  return a.day_of_week - b.day_of_week;
}

export function useCanvasDragDrop({
  athleteId,
}: UseCanvasDragDropOptions): UseCanvasDragDropReturn {
  const [activeMicrocycle, setActiveMicrocycle] = useState<Microcycle | null>(null);
  const [slots, setSlots] = useState<WorkoutSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const hasInitiallyLoaded = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch or auto-create microcycle, then fetch its slots
  const loadData = useCallback(async () => {
    if (!athleteId || athleteId === '__none__') {
      setIsLoading(false);
      return;
    }

    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      // 1. Try to get active microcycle for athlete
      let { data: microcycle, error: mcError } =
        await MicrocycleService.getActiveMicrocycle(athleteId);

      if (mcError) throw mcError;

      // 2. If none exists, auto-create a draft
      if (!microcycle) {
        log.debug('No active microcycle found, creating draft for athlete:', athleteId);

        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

        const { data: newMc, error: createError } =
          await MicrocycleService.createMicrocycle({
            athlete_id: athleteId,
            name: `Microciclo ${monday.toLocaleDateString('pt-BR')}`,
            week_1_focus: 'volume' as MicrocycleWeekFocus,
            week_2_focus: 'intensity' as MicrocycleWeekFocus,
            week_3_focus: 'recovery' as MicrocycleWeekFocus,
            start_date: monday.toISOString().split('T')[0],
          });

        if (createError) throw createError;
        microcycle = newMc;
      }

      setActiveMicrocycle(microcycle);

      // 3. Fetch slots for the microcycle
      if (microcycle) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: slotsData, error: slotsError } = await supabase
          .from('workout_slots')
          .select('*')
          .eq('microcycle_id', microcycle.id)
          .eq('user_id', user.id)
          .order('week_number', { ascending: true })
          .order('day_of_week', { ascending: true });

        if (slotsError) throw slotsError;
        setSlots(slotsData || []);
      }

      hasInitiallyLoaded.current = true;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      log.error('Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription for workout_slots changes
  useEffect(() => {
    const microcycleId = activeMicrocycle?.id;
    if (!microcycleId) return;

    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`canvas_slots_${microcycleId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'workout_slots',
              filter: `microcycle_id=eq.${microcycleId}`,
            },
            (payload) => {
              log.debug('Slot change:', payload.eventType);

              if (
                payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE'
              ) {
                const newSlot = payload.new as WorkoutSlot;
                setSlots((prev) => {
                  const filtered = prev.filter((s) => s.id !== newSlot.id);
                  return [...filtered, newSlot].sort(sortSlots);
                });
              } else if (payload.eventType === 'DELETE') {
                setSlots((prev) =>
                  prev.filter((s) => s.id !== (payload.old as { id: string }).id)
                );
              }
            }
          )
          .subscribe();

        channelRef.current = channel;

        if (cancelled) {
          supabase.removeChannel(channel);
          channelRef.current = null;
        }
      } catch (err) {
        log.error('Subscription error:', err);
      }
    };

    setupSubscription();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activeMicrocycle?.id]);

  return {
    activeMicrocycle,
    setActiveMicrocycle,
    slots,
    setSlots,
    isLoading,
    error,
    setError,
    refresh: loadData,
  };
}
