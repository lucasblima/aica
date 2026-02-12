/**
 * useAutomations Hook
 *
 * Real-time subscription to workout_automations table with active filtering
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { WorkoutAutomation } from '../types/flow';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AutomationService } from '../services/automationService';

const log = createNamespacedLogger('useAutomations');

export interface UseAutomationsOptions {
  activeOnly?: boolean;
}

export function useAutomations(options?: UseAutomationsOptions) {
  const [automations, setAutomations] = useState<WorkoutAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitiallyLoaded = useRef(false);

  const fetchAutomations = useCallback(async () => {
    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = options?.activeOnly
        ? await AutomationService.getActiveAutomations()
        : await AutomationService.getAutomations();

      if (fetchError) throw fetchError;

      setAutomations(data || []);
      hasInitiallyLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      log.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options?.activeOnly]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  // Real-time subscription
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`workout_automations_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'workout_automations',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              log.debug('Automation change detected:', payload.eventType);

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newAutomation = payload.new as WorkoutAutomation;

                // Check if automation passes filters
                const passes = options?.activeOnly ? newAutomation.is_active : true;

                setAutomations((prev) => {
                  const filtered = prev.filter((a) => a.id !== newAutomation.id);
                  return passes
                    ? [...filtered, newAutomation].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      )
                    : filtered;
                });
              } else if (payload.eventType === 'DELETE') {
                setAutomations((prev) => prev.filter((a) => a.id !== payload.old.id));
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
  }, [options?.activeOnly]);

  return {
    automations,
    isLoading,
    error,
    refresh: fetchAutomations,
  };
}
