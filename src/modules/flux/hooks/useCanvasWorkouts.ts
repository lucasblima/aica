/**
 * useCanvasWorkouts Hook
 *
 * Orchestrator that composes three focused sub-hooks:
 * - useCanvasDragDrop: Data loading + realtime subscriptions
 * - useCanvasSlots: CRUD operations with optimistic updates + calendar sync
 * - useCanvasLoadCalc: Week grouping + clearance checks
 *
 * Maintains the same public API for backward compatibility.
 */

import type {
  Microcycle,
  WorkoutSlot,
  CreateWorkoutSlotInput,
  UpdateWorkoutSlotInput,
  WorkoutTemplate,
} from '../types/flow';
import type { WorkoutClearanceResult } from '../types/parq';
import { useCanvasDragDrop } from './useCanvasDragDrop';
import { useCanvasSlots } from './useCanvasSlots';
import { useCanvasLoadCalc, type WeekWorkout } from './useCanvasLoadCalc';

export type { WeekWorkout };

export interface UseCanvasWorkoutsOptions {
  athleteId: string;
  weekNumber?: number;
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
    weekNumber?: number,
    startTime?: string
  ) => Promise<WorkoutSlot | null>;
  updateSlot: (input: UpdateWorkoutSlotInput) => Promise<WorkoutSlot | null>;
  deleteSlot: (slotId: string) => Promise<boolean>;
  markComplete: (
    slotId: string,
    completionData?: WorkoutSlot['completion_data']
  ) => Promise<WorkoutSlot | null>;
  refresh: () => Promise<void>;
  clearance: WorkoutClearanceResult | null;
  isCheckingClearance: boolean;
}

export function useCanvasWorkouts(
  options: UseCanvasWorkoutsOptions
): UseCanvasWorkoutsReturn {
  const { athleteId, weekNumber = 1 } = options;

  // Data loading + realtime
  const {
    activeMicrocycle,
    setActiveMicrocycle,
    slots,
    setSlots,
    isLoading,
    error,
    setError,
    refresh,
  } = useCanvasDragDrop({ athleteId });

  // CRUD operations
  const {
    createSlot,
    createSlotFromTemplate,
    updateSlot,
    deleteSlot,
    markComplete,
  } = useCanvasSlots({
    athleteId,
    weekNumber,
    activeMicrocycle,
    setActiveMicrocycle,
    setSlots,
    setError,
  });

  // Week grouping + clearance
  const { weekWorkouts, clearance, isCheckingClearance } = useCanvasLoadCalc({
    athleteId,
    weekNumber,
    slots,
  });

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
    refresh,
    clearance,
    isCheckingClearance,
  };
}
