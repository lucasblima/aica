/**
 * usePerformanceTests Hook
 *
 * Fetches performance test history for an athlete, with real-time updates.
 * Provides create/delete mutations and trend data for charts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import {
  PerformanceTestService,
  type PerformanceTest,
  type PerformanceTestType,
  type CreatePerformanceTestInput,
} from '../services/performanceTestService';
import type { RealtimeChannel } from '@/services/supabaseClient';

const log = createNamespacedLogger('usePerformanceTests');

export interface UsePerformanceTestsOptions {
  athleteId: string;
  testType?: PerformanceTestType;
}

export interface UsePerformanceTestsReturn {
  tests: PerformanceTest[];
  isLoading: boolean;
  error: Error | null;
  createTest: (input: Omit<CreatePerformanceTestInput, 'athlete_id'>) => Promise<PerformanceTest | null>;
  deleteTest: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePerformanceTests({
  athleteId,
  testType,
}: UsePerformanceTestsOptions): UsePerformanceTestsReturn {
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitiallyLoaded = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchTests = useCallback(async () => {
    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = testType
        ? await PerformanceTestService.getTestsByType(athleteId, testType)
        : await PerformanceTestService.getTestsByAthlete(athleteId);

      if (fetchError) throw fetchError;

      setTests(data || []);
      hasInitiallyLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      log.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, testType]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Real-time subscription for this athlete's performance tests
  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`perf_tests_${athleteId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'performance_tests',
              filter: `athlete_id=eq.${athleteId}`,
            },
            (payload) => {
              log.debug('Performance test change:', payload.eventType);

              if (payload.eventType === 'INSERT') {
                const newTest = payload.new as PerformanceTest;
                if (testType && newTest.test_type !== testType) return;
                setTests((prev) => [newTest, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as PerformanceTest;
                setTests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
              } else if (payload.eventType === 'DELETE') {
                setTests((prev) => prev.filter((t) => t.id !== payload.old.id));
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
  }, [athleteId, testType]);

  const createTest = useCallback(
    async (input: Omit<CreatePerformanceTestInput, 'athlete_id'>): Promise<PerformanceTest | null> => {
      const { data, error: createError } = await PerformanceTestService.createTest({
        ...input,
        athlete_id: athleteId,
      });

      if (createError) {
        log.error('Create error:', createError);
        setError(createError instanceof Error ? createError : new Error(String(createError)));
        return null;
      }

      return data;
    },
    [athleteId]
  );

  const deleteTest = useCallback(async (id: string): Promise<boolean> => {
    const { error: deleteError } = await PerformanceTestService.deleteTest(id);

    if (deleteError) {
      log.error('Delete error:', deleteError);
      setError(deleteError instanceof Error ? deleteError : new Error(String(deleteError)));
      return false;
    }

    // Optimistic removal (real-time will confirm)
    setTests((prev) => prev.filter((t) => t.id !== id));
    return true;
  }, []);

  return {
    tests,
    isLoading,
    error,
    createTest,
    deleteTest,
    refresh: fetchTests,
  };
}
