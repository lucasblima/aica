/**
 * useWorkoutSlots Hook
 *
 * Real-time subscription to workout_slots table with completion tracking
 * Includes automatic completion percentage calculation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { WorkoutSlot } from '../types/flow';
import type { RealtimeChannel } from '@supabase/supabase-js';

const log = createNamespacedLogger('useWorkoutSlots');

export function useWorkoutSlots(microcycleId: string) {
  const [slots, setSlots] = useState<WorkoutSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const hasInitiallyLoaded = useRef(false);

  const calculateCompletion = useCallback((slotsData: WorkoutSlot[]) => {
    const total = slotsData.length;
    const completed = slotsData.filter((s) => s.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error: fetchError } = await supabase
        .from('workout_slots')
        .select('*')
        .eq('microcycle_id', microcycleId)
        .eq('user_id', user.id)
        .order('week_number', { ascending: true })
        .order('day_of_week', { ascending: true });

      if (fetchError) throw fetchError;

      const slotsData = data || [];
      setSlots(slotsData);
      setCompletionPercentage(calculateCompletion(slotsData));
      hasInitiallyLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      log.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [microcycleId, calculateCompletion]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Real-time subscription for slot updates
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`workout_slots_${microcycleId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'workout_slots',
              filter: `microcycle_id=eq.${microcycleId}`,
            },
            (payload) => {
              log.debug('Slot change detected:', payload.eventType, payload.new?.id);

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newSlot = payload.new as WorkoutSlot;

                setSlots((prev) => {
                  const filtered = prev.filter((s) => s.id !== newSlot.id);
                  const updated = [...filtered, newSlot].sort((a, b) => {
                    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
                    return a.day_of_week - b.day_of_week;
                  });

                  // Recalculate completion
                  setCompletionPercentage(calculateCompletion(updated));

                  return updated;
                });
              } else if (payload.eventType === 'DELETE') {
                setSlots((prev) => {
                  const filtered = prev.filter((s) => s.id !== payload.old.id);
                  setCompletionPercentage(calculateCompletion(filtered));
                  return filtered;
                });
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
  }, [microcycleId, calculateCompletion]);

  return {
    slots,
    isLoading,
    error,
    completionPercentage,
    refresh: fetchSlots,
  };
}
