/**
 * useCanvasWorkouts Hook
 *
 * Manages workout_slots data for the Flux Canvas.
 * Fetches/creates microcycle, provides CRUD for slots,
 * and transforms slots into a week-indexed map for the WeeklyGrid.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { MicrocycleService } from '../services/microcycleService';
import type {
  Microcycle,
  WorkoutSlot,
  CreateWorkoutSlotInput,
  UpdateWorkoutSlotInput,
  WorkoutTemplate,
  MicrocycleWeekFocus,
} from '../types/flow';
import type { RealtimeChannel } from '@supabase/supabase-js';

const log = createNamespacedLogger('useCanvasWorkouts');

/** Slot data indexed by day for the WeeklyGrid (day 1=Mon through 7=Sun) */
export interface WeekWorkout {
  dayOfWeek: number; // 1-7 (Mon=1, Sun=7)
  slots: WorkoutSlot[];
}

export interface UseCanvasWorkoutsOptions {
  athleteId: string;
  weekNumber?: number; // 1-3 within microcycle, defaults to 1
}

export interface UseCanvasWorkoutsReturn {
  slots: WorkoutSlot[];
  weekWorkouts: WeekWorkout[];
  activeMicrocycle: Microcycle | null;
  isLoading: boolean;
  error: Error | null;
  createSlot: (input: Omit<CreateWorkoutSlotInput, 'microcycle_id'>) => Promise<WorkoutSlot | null>;
  createSlotFromTemplate: (
    template: WorkoutTemplate,
    dayOfWeek: number,
    weekNumber?: number
  ) => Promise<WorkoutSlot | null>;
  updateSlot: (input: UpdateWorkoutSlotInput) => Promise<WorkoutSlot | null>;
  deleteSlot: (slotId: string) => Promise<boolean>;
  markComplete: (
    slotId: string,
    completionData?: WorkoutSlot['completion_data']
  ) => Promise<WorkoutSlot | null>;
  refresh: () => Promise<void>;
}

export function useCanvasWorkouts(
  options: UseCanvasWorkoutsOptions
): UseCanvasWorkoutsReturn {
  const { athleteId, weekNumber = 1 } = options;

  const [activeMicrocycle, setActiveMicrocycle] = useState<Microcycle | null>(null);
  const [slots, setSlots] = useState<WorkoutSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const hasInitiallyLoaded = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Build weekWorkouts map: group slots by day_of_week for the active weekNumber
  const weekWorkouts = useMemo<WeekWorkout[]>(() => {
    const weekSlots = slots.filter((s) => s.week_number === weekNumber);
    const byDay = new Map<number, WorkoutSlot[]>();

    for (const slot of weekSlots) {
      const day = slot.day_of_week; // already 1-7 per type definition
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(slot);
    }

    // Return all 7 days (Mon=1 through Sun=7), even if empty
    return Array.from({ length: 7 }, (_, i) => {
      const dayOfWeek = i + 1;
      return {
        dayOfWeek,
        slots: (byDay.get(dayOfWeek) || []).sort((a, b) => {
          // Sort by time_of_day if present, fallback to created_at
          const aTime = (a as any).time_of_day || a.created_at;
          const bTime = (b as any).time_of_day || b.created_at;
          return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
        }),
      };
    });
  }, [slots, weekNumber]);

  // Fetch or auto-create microcycle, then fetch its slots
  const loadData = useCallback(async () => {
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
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // nearest past Monday

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
        const { data: { user } } = await supabase.auth.getUser();
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
        const { data: { user } } = await supabase.auth.getUser();
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

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newSlot = payload.new as WorkoutSlot;
                setSlots((prev) => {
                  const filtered = prev.filter((s) => s.id !== newSlot.id);
                  return [...filtered, newSlot].sort((a, b) => {
                    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
                    return a.day_of_week - b.day_of_week;
                  });
                });
              } else if (payload.eventType === 'DELETE') {
                setSlots((prev) => prev.filter((s) => s.id !== payload.old.id));
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

  // CRUD operations

  const createSlot = useCallback(
    async (input: Omit<CreateWorkoutSlotInput, 'microcycle_id'>): Promise<WorkoutSlot | null> => {
      if (!activeMicrocycle) {
        setError(new Error('No active microcycle'));
        return null;
      }

      const { data, error: createError } = await MicrocycleService.createSlot({
        ...input,
        microcycle_id: activeMicrocycle.id,
      });

      if (createError) {
        setError(createError instanceof Error ? createError : new Error(String(createError)));
        return null;
      }

      return data;
    },
    [activeMicrocycle]
  );

  const createSlotFromTemplate = useCallback(
    async (
      template: WorkoutTemplate,
      dayOfWeek: number,
      week?: number
    ): Promise<WorkoutSlot | null> => {
      return createSlot({
        template_id: template.id,
        week_number: week ?? weekNumber,
        day_of_week: dayOfWeek,
        name: template.name,
        duration: template.duration,
        intensity: template.intensity,
        modality: template.modality,
        exercise_structure: template.exercise_structure,
        ftp_percentage: template.ftp_percentage,
        pace_zone: template.pace_zone,
        css_percentage: template.css_percentage,
        rpe: template.rpe,
      });
    },
    [createSlot, weekNumber]
  );

  const updateSlot = useCallback(
    async (input: UpdateWorkoutSlotInput): Promise<WorkoutSlot | null> => {
      const { data, error: updateError } = await MicrocycleService.updateSlot(input);

      if (updateError) {
        setError(updateError instanceof Error ? updateError : new Error(String(updateError)));
        return null;
      }

      return data;
    },
    []
  );

  const deleteSlot = useCallback(async (slotId: string): Promise<boolean> => {
    const { error: deleteError } = await MicrocycleService.deleteSlot(slotId);

    if (deleteError) {
      setError(deleteError instanceof Error ? deleteError : new Error(String(deleteError)));
      return false;
    }

    return true;
  }, []);

  const markComplete = useCallback(
    async (
      slotId: string,
      completionData?: WorkoutSlot['completion_data']
    ): Promise<WorkoutSlot | null> => {
      const { data, error: completeError } = await MicrocycleService.completeSlot(
        slotId,
        completionData
      );

      if (completeError) {
        setError(
          completeError instanceof Error ? completeError : new Error(String(completeError))
        );
        return null;
      }

      return data;
    },
    []
  );

  return {
    slots,
    weekWorkouts,
    activeMicrocycle,
    isLoading,
    error,
    createSlot,
    createSlotFromTemplate,
    updateSlot,
    deleteSlot,
    markComplete,
    refresh: loadData,
  };
}
