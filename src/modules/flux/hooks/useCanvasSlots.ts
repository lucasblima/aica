/**
 * useCanvasSlots Hook
 *
 * CRUD operations for workout slots within a microcycle.
 * Handles optimistic state updates and Google Calendar sync.
 */

import { useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { MicrocycleService } from '../services/microcycleService';
import { syncEntityToGoogle, unsyncEntityFromGoogle } from '@/services/calendarSyncService';
import { fluxSlotToGoogleEvent } from '@/services/calendarSyncTransforms';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';
import { addXP, FLUX_XP_REWARDS } from '@/services/gamificationService';
import { supabase } from '@/services/supabaseClient';
import { createTrainingMoment } from '../services/fluxJourneyBridge';
import type {
  Microcycle,
  WorkoutSlot,
  CreateWorkoutSlotInput,
  UpdateWorkoutSlotInput,
  WorkoutTemplate,
  MicrocycleWeekFocus,
} from '../types/flow';

const log = createNamespacedLogger('useCanvasSlots');

export interface UseCanvasSlotsOptions {
  athleteId: string;
  weekNumber: number;
  activeMicrocycle: Microcycle | null;
  setActiveMicrocycle: React.Dispatch<React.SetStateAction<Microcycle | null>>;
  setSlots: React.Dispatch<React.SetStateAction<WorkoutSlot[]>>;
  setError: React.Dispatch<React.SetStateAction<Error | null>>;
}

export interface UseCanvasSlotsReturn {
  createSlot: (input: Omit<CreateWorkoutSlotInput, 'microcycle_id'>) => Promise<WorkoutSlot | null>;
  createSlotFromTemplate: (
    template: WorkoutTemplate,
    dayOfWeek: number,
    weekNumber?: number,
    startTime?: string
  ) => Promise<WorkoutSlot | null>;
  updateSlot: (input: UpdateWorkoutSlotInput) => Promise<WorkoutSlot | null>;
  deleteSlot: (slotId: string) => Promise<boolean>;
  markComplete: (
    slotId: string,
    completionData?: WorkoutSlot['completion_data']
  ) => Promise<WorkoutSlot | null>;
}

/** Sort comparator for slots: by week_number then day_of_week */
function sortSlots(a: WorkoutSlot, b: WorkoutSlot): number {
  if (a.week_number !== b.week_number) return a.week_number - b.week_number;
  return a.day_of_week - b.day_of_week;
}

export function useCanvasSlots({
  athleteId,
  weekNumber,
  activeMicrocycle,
  setActiveMicrocycle,
  setSlots,
  setError,
}: UseCanvasSlotsOptions): UseCanvasSlotsReturn {
  const createSlot = useCallback(
    async (input: Omit<CreateWorkoutSlotInput, 'microcycle_id'>): Promise<WorkoutSlot | null> => {
      let mcId = activeMicrocycle?.id;

      // If no active microcycle, try to fetch/create one on demand
      if (!mcId) {
        log.debug('No activeMicrocycle in state, fetching on demand for athlete:', athleteId);

        const { data: mc } = await MicrocycleService.getActiveMicrocycle(athleteId);
        if (mc) {
          mcId = mc.id;
          setActiveMicrocycle(mc);
        } else {
          const today = new Date();
          const monday = new Date(today);
          monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

          const { data: newMc, error: createMcError } =
            await MicrocycleService.createMicrocycle({
              athlete_id: athleteId,
              name: `Microciclo ${monday.toLocaleDateString('pt-BR')}`,
              week_1_focus: 'volume' as MicrocycleWeekFocus,
              week_2_focus: 'intensity' as MicrocycleWeekFocus,
              week_3_focus: 'intensity' as MicrocycleWeekFocus,
              week_4_focus: 'recovery' as MicrocycleWeekFocus,
              start_date: monday.toISOString().split('T')[0],
            });

          if (createMcError || !newMc) {
            log.error('Failed to create microcycle on demand:', createMcError);
            setError(new Error('Nao foi possivel criar o microciclo'));
            return null;
          }

          mcId = newMc.id;
          setActiveMicrocycle(newMc);
        }
      }

      log.debug('Creating slot:', { microcycle_id: mcId, ...input });

      const { data, error: createError } = await MicrocycleService.createSlot({
        ...input,
        microcycle_id: mcId,
      });

      if (createError) {
        log.error('Supabase createSlot error:', createError);
        setError(
          createError instanceof Error ? createError : new Error(String(createError))
        );
        return null;
      }

      log.debug('Slot created:', data?.id);

      if (data) {
        // Optimistic update
        setSlots((prev) => {
          const filtered = prev.filter((s) => s.id !== data.id);
          return [...filtered, data].sort(sortSlots);
        });

        // Sync to Google Calendar (non-blocking)
        if (activeMicrocycle?.start_date) {
          isGoogleCalendarConnected().then((connected) => {
            if (!connected) return;
            const eventData = fluxSlotToGoogleEvent(data, activeMicrocycle.start_date);
            syncEntityToGoogle('flux', data.id, eventData).catch((err) =>
              log.warn('Calendar sync failed for new slot:', err)
            );
          });
        }
      }

      return data;
    },
    [activeMicrocycle, athleteId, setActiveMicrocycle, setSlots, setError]
  );

  const createSlotFromTemplate = useCallback(
    async (
      template: WorkoutTemplate,
      dayOfWeek: number,
      week?: number,
      startTime?: string
    ): Promise<WorkoutSlot | null> => {
      return createSlot({
        template_id: template.id,
        week_number: week ?? weekNumber,
        day_of_week: dayOfWeek,
        start_time: startTime,
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
        setError(
          updateError instanceof Error ? updateError : new Error(String(updateError))
        );
        return null;
      }

      if (data) {
        setSlots((prev) =>
          prev.map((s) => (s.id === data.id ? data : s)).sort(sortSlots)
        );

        // Sync update to Google Calendar (non-blocking)
        if (activeMicrocycle?.start_date) {
          isGoogleCalendarConnected().then((connected) => {
            if (!connected) return;
            const eventData = fluxSlotToGoogleEvent(data, activeMicrocycle.start_date);
            syncEntityToGoogle('flux', data.id, eventData).catch((err) =>
              log.warn('Calendar sync failed for updated slot:', err)
            );
          });
        }
      }

      return data;
    },
    [activeMicrocycle, setSlots, setError]
  );

  const deleteSlot = useCallback(
    async (slotId: string): Promise<boolean> => {
      const { error: deleteError } = await MicrocycleService.deleteSlot(slotId);

      if (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError : new Error(String(deleteError))
        );
        return false;
      }

      setSlots((prev) => prev.filter((s) => s.id !== slotId));

      // Unsync from Google Calendar (non-blocking)
      isGoogleCalendarConnected().then((connected) => {
        if (!connected) return;
        unsyncEntityFromGoogle('flux', slotId).catch((err) =>
          log.warn('Calendar unsync failed for deleted slot:', err)
        );
      });

      return true;
    },
    [setSlots, setError]
  );

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

      if (data) {
        setSlots((prev) => prev.map((s) => (s.id === data.id ? data : s)));

        // Award XP for supervising workout (non-blocking)
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) addXP(user.id, FLUX_XP_REWARDS.workout_supervised).catch(() => {});
        });

        // Bridge: create Journey moment for coach (non-blocking)
        supabase
          .from('athletes')
          .select('id, name, modality, status, user_id')
          .eq('id', athleteId)
          .single()
          .then(({ data: athlete }) => {
            if (athlete) {
              createTrainingMoment(data, athlete as any).catch((e) =>
                log.warn('Journey bridge error (non-blocking):', e)
              );
            }
          });
      }

      return data;
    },
    [athleteId, setSlots, setError]
  );

  return {
    createSlot,
    createSlotFromTemplate,
    updateSlot,
    deleteSlot,
    markComplete,
  };
}
