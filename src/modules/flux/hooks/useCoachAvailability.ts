/**
 * useCoachAvailability Hook
 *
 * Fetches coach calendar availability via the `fetch-coach-availability` Edge Function.
 * Returns busy time slots for a given date range so the Canvas can display overlay blocks.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useCoachAvailability');

export interface CoachBusySlot {
  start: string;
  end: string;
}

export interface UseCoachAvailabilityOptions {
  coachUserId: string;
}

export interface UseCoachAvailabilityReturn {
  busySlots: CoachBusySlot[];
  isLoading: boolean;
  error: Error | null;
  fetchAvailability: (startDate: string, endDate: string) => Promise<void>;
}

export function useCoachAvailability({ coachUserId }: UseCoachAvailabilityOptions): UseCoachAvailabilityReturn {
  const [busySlots, setBusySlots] = useState<CoachBusySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAvailability = useCallback(async (startDate: string, endDate: string) => {
    if (!coachUserId) return;
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('fetch-coach-availability', {
        body: { coachUserId, startDate, endDate },
      });

      if (fnError) throw fnError;

      if (data?.success && Array.isArray(data.busySlots)) {
        setBusySlots(data.busySlots);
        log.info('Coach availability fetched:', {
          coachUserId,
          slotCount: data.busySlots.length,
        });
      } else {
        setBusySlots([]);
        log.warn('Unexpected response from fetch-coach-availability:', data);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Erro ao buscar disponibilidade do coach');
      setError(e);
      log.error('Error fetching coach availability:', err);
    } finally {
      setIsLoading(false);
    }
  }, [coachUserId]);

  return {
    busySlots,
    isLoading,
    error,
    fetchAvailability,
  };
}
