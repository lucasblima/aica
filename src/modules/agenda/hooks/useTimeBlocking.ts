import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';

export interface UseTimeBlockingReturn {
  scheduleTask: (taskId: string, scheduledTime: string, duration: number) => Promise<void>;
  unscheduleTask: (taskId: string) => Promise<void>;
  isScheduling: boolean;
}

/**
 * Snaps an ISO datetime string to the nearest 15-minute interval.
 * E.g. 10:07 → 10:00, 10:08 → 10:15, 10:22 → 10:15, 10:23 → 10:30
 */
export function snapTo15Min(isoString: string): string {
  const d = new Date(isoString);
  const minutes = d.getMinutes();
  const snapped = Math.round(minutes / 15) * 15;
  d.setMinutes(snapped, 0, 0);
  return d.toISOString();
}

/**
 * Hook to manage scheduling and unscheduling tasks on a daily timeline.
 *
 * - `scheduleTask` updates a work_item's `scheduled_time` (snapped to 15-min)
 *   and `estimated_duration`.
 * - `unscheduleTask` clears the `scheduled_time` from a work_item.
 * - `isScheduling` indicates if a mutation is in progress.
 */
export function useTimeBlocking(userId: string): UseTimeBlockingReturn {
  const [isScheduling, setIsScheduling] = useState(false);

  const scheduleTask = useCallback(async (taskId: string, scheduledTime: string, duration: number) => {
    setIsScheduling(true);
    try {
      const snappedTime = snapTo15Min(scheduledTime);
      const { error } = await supabase
        .from('work_items')
        .update({ scheduled_time: snappedTime, estimated_duration: duration })
        .eq('id', taskId)
        .eq('user_id', userId);
      if (error) throw error;
    } finally {
      setIsScheduling(false);
    }
  }, [userId]);

  const unscheduleTask = useCallback(async (taskId: string) => {
    setIsScheduling(true);
    try {
      const { error } = await supabase
        .from('work_items')
        .update({ scheduled_time: null })
        .eq('id', taskId)
        .eq('user_id', userId);
      if (error) throw error;
    } finally {
      setIsScheduling(false);
    }
  }, [userId]);

  return { scheduleTask, unscheduleTask, isScheduling };
}
