/**
 * useCanvasLoadCalc Hook
 *
 * Computes week-indexed workout data and manages clearance checks.
 * Groups slots by day_of_week for the WeeklyGrid.
 */

import { useState, useEffect, useMemo } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { ParQService } from '../services/parqService';
import type { WorkoutClearanceResult } from '../types/parq';
import type { WorkoutSlot } from '../types/flow';

const log = createNamespacedLogger('useCanvasLoadCalc');

/** Slot data indexed by day for the WeeklyGrid (day 1=Mon through 7=Sun) */
export interface WeekWorkout {
  dayOfWeek: number;
  slots: WorkoutSlot[];
}

export interface UseCanvasLoadCalcOptions {
  athleteId: string;
  weekNumber: number;
  slots: WorkoutSlot[];
}

export interface UseCanvasLoadCalcReturn {
  weekWorkouts: WeekWorkout[];
  clearance: WorkoutClearanceResult | null;
  isCheckingClearance: boolean;
}

export function useCanvasLoadCalc({
  athleteId,
  weekNumber,
  slots,
}: UseCanvasLoadCalcOptions): UseCanvasLoadCalcReturn {
  const [clearance, setClearance] = useState<WorkoutClearanceResult | null>(null);
  const [isCheckingClearance, setIsCheckingClearance] = useState(false);

  // Check workout clearance on mount
  useEffect(() => {
    if (!athleteId || athleteId === '__none__') return;
    let cancelled = false;

    const checkClearance = async () => {
      setIsCheckingClearance(true);
      try {
        const { data } = await ParQService.checkWorkoutClearance(athleteId);
        if (!cancelled && data) setClearance(data);
      } catch (err) {
        log.error('Clearance check error:', err);
      } finally {
        if (!cancelled) setIsCheckingClearance(false);
      }
    };

    checkClearance();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  // Build weekWorkouts map: group slots by day_of_week for the active weekNumber
  const weekWorkouts = useMemo<WeekWorkout[]>(() => {
    const weekSlots = slots.filter((s) => s.week_number === weekNumber);
    const byDay = new Map<number, WorkoutSlot[]>();

    for (const slot of weekSlots) {
      const day = slot.day_of_week;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(slot);
    }

    // Return all 7 days (Mon=1 through Sun=7), even if empty
    return Array.from({ length: 7 }, (_, i) => {
      const dayOfWeek = i + 1;
      return {
        dayOfWeek,
        slots: (byDay.get(dayOfWeek) || []).sort((a, b) => {
          const aTime = a.start_time || a.created_at;
          const bTime = b.start_time || b.created_at;
          return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
        }),
      };
    });
  }, [slots, weekNumber]);

  return {
    weekWorkouts,
    clearance,
    isCheckingClearance,
  };
}
