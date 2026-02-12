/**
 * useMicrocycles Hook
 *
 * Real-time subscription to microcycles table with athlete filtering
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { Microcycle } from '../types/flow';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MicrocycleService } from '../services/microcycleService';

const log = createNamespacedLogger('useMicrocycles');

export interface UseMicrocyclesOptions {
  athleteId?: string;
  status?: string;
}

export function useMicrocycles(options?: UseMicrocyclesOptions) {
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitiallyLoaded = useRef(false);

  const fetchMicrocycles = useCallback(async () => {
    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      if (options?.athleteId) {
        const { data, error: fetchError } = await MicrocycleService.getMicrocyclesByAthlete(
          options.athleteId
        );

        if (fetchError) throw fetchError;

        let filtered = data || [];
        if (options.status) {
          filtered = filtered.filter((m) => m.status === options.status);
        }

        setMicrocycles(filtered);
      } else {
        // Fetch all microcycles for current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        let query = supabase
          .from('microcycles')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('start_date', { ascending: false });

        if (options?.status) {
          query = query.eq('status', options.status);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        setMicrocycles(data || []);
      }

      hasInitiallyLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      log.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options?.athleteId, options?.status]);

  useEffect(() => {
    fetchMicrocycles();
  }, [fetchMicrocycles]);

  // Real-time subscription
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`microcycles_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'microcycles',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              log.debug('Microcycle change detected:', payload.eventType);

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newMicrocycle = payload.new as Microcycle;

                // Check if microcycle passes filters
                let passes = true;
                if (options?.athleteId && newMicrocycle.athlete_id !== options.athleteId) passes = false;
                if (options?.status && newMicrocycle.status !== options.status) passes = false;

                setMicrocycles((prev) => {
                  const filtered = prev.filter((m) => m.id !== newMicrocycle.id);
                  return passes
                    ? [...filtered, newMicrocycle].sort(
                        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
                      )
                    : filtered;
                });
              } else if (payload.eventType === 'DELETE') {
                setMicrocycles((prev) => prev.filter((m) => m.id !== payload.old.id));
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
  }, [options?.athleteId, options?.status]);

  return {
    microcycles,
    isLoading,
    error,
    refresh: fetchMicrocycles,
  };
}
