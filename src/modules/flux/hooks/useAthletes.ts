/**
 * useAthletes Hook
 *
 * Real-time subscription to athletes table with loading and error states
 * Follows the pattern from useWhatsAppSessionSubscription with cancelled flag
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { Athlete } from '../types/flux';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AthleteService } from '../services/athleteService';

const log = createNamespacedLogger('useAthletes');

export interface UseAthletesOptions {
  status?: string;
  modality?: string;
  level?: string;
}

export function useAthletes(options?: UseAthletesOptions) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitiallyLoaded = useRef(false);

  const fetchAthletes = useCallback(async () => {
    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await AthleteService.getAthletes();

      if (fetchError) throw fetchError;

      // Apply local filters if provided
      let filtered = data || [];
      if (options?.status) {
        filtered = filtered.filter((a) => a.status === options.status);
      }
      if (options?.modality) {
        filtered = filtered.filter((a) => a.modality === options.modality);
      }
      if (options?.level) {
        filtered = filtered.filter((a) => a.level === options.level);
      }

      setAthletes(filtered);
      hasInitiallyLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      log.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options?.status, options?.modality, options?.level]);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  // Real-time subscription (separate effect to prevent race conditions)
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`athletes_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'athletes',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              log.debug('Athlete change detected:', payload.eventType);

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newAthlete = payload.new as Athlete;

                // Check if athlete passes filters
                let passes = true;
                if (options?.status && newAthlete.status !== options.status) passes = false;
                if (options?.modality && newAthlete.modality !== options.modality) passes = false;
                if (options?.level && newAthlete.level !== options.level) passes = false;

                setAthletes((prev) => {
                  const filtered = prev.filter((a) => a.id !== newAthlete.id);
                  return passes ? [...filtered, newAthlete].sort((a, b) => a.name.localeCompare(b.name)) : filtered;
                });
              } else if (payload.eventType === 'DELETE') {
                setAthletes((prev) => prev.filter((a) => a.id !== payload.old.id));
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
  }, [options?.status, options?.modality, options?.level]);

  return {
    athletes,
    isLoading,
    error,
    refresh: fetchAthletes,
  };
}
