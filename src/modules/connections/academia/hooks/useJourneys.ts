/**
 * useJourneys Hook
 *
 * Manages learning journeys with CRUD operations and progress tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { journeyService } from '../services/journeyService';
import type {
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('useJourneys');
  AcademiaJourney,
  CreateJourneyPayload,
  UpdateJourneyPayload,
  JourneyStatus,
} from '../types';

interface UseJourneysOptions {
  spaceId: string;
  status?: JourneyStatus;
  autoFetch?: boolean;
}

interface UseJourneysReturn {
  journeys: AcademiaJourney[];
  loading: boolean;
  error: Error | null;
  createJourney: (payload: CreateJourneyPayload) => Promise<AcademiaJourney>;
  updateJourney: (id: string, payload: UpdateJourneyPayload) => Promise<AcademiaJourney>;
  updateProgress: (id: string, completedModules: number) => Promise<AcademiaJourney>;
  logTime: (id: string, hours: number) => Promise<AcademiaJourney>;
  startJourney: (id: string) => Promise<AcademiaJourney>;
  completeJourney: (id: string) => Promise<AcademiaJourney>;
  pauseJourney: (id: string) => Promise<AcademiaJourney>;
  resumeJourney: (id: string) => Promise<AcademiaJourney>;
  deleteJourney: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing Academia learning journeys
 *
 * @example
 * ```tsx
 * const { journeys, loading, createJourney, updateProgress } = useJourneys({
 *   spaceId: 'space-123',
 *   status: 'active'
 * });
 *
 * // Create a new journey
 * await createJourney({
 *   title: 'React Mastery Course',
 *   journey_type: 'course',
 *   provider: 'Udemy',
 *   total_modules: 12
 * });
 *
 * // Update progress
 * await updateProgress(journeyId, 5);
 * ```
 */
export function useJourneys(options: UseJourneysOptions): UseJourneysReturn {
  const { user } = useAuth();
  const { spaceId, status, autoFetch = true } = options;

  const [journeys, setJourneys] = useState<AcademiaJourney[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch journeys
  const fetchJourneys = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const data = status
        ? await journeyService.getJourneysByStatus(spaceId, status)
        : await journeyService.getJourneys(spaceId);

      setJourneys(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error fetching journeys:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId, status]);

  // Create new journey
  const createJourney = useCallback(
    async (payload: CreateJourneyPayload): Promise<AcademiaJourney> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newJourney = await journeyService.createJourney(spaceId, payload);

        // Add to list if it matches current filter
        if (!status || newJourney.status === status) {
          setJourneys((prev) => [newJourney, ...prev]);
        }

        return newJourney;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId, status]
  );

  // Update journey
  const updateJourney = useCallback(
    async (id: string, payload: UpdateJourneyPayload): Promise<AcademiaJourney> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updatedJourney = await journeyService.updateJourney(id, payload);

        // Update in list
        setJourneys((prev) =>
          prev.map((journey) => (journey.id === id ? updatedJourney : journey))
        );

        return updatedJourney;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Update progress
  const updateProgress = useCallback(
    async (id: string, completedModules: number): Promise<AcademiaJourney> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updatedJourney = await journeyService.updateProgress(id, completedModules);

        setJourneys((prev) =>
          prev.map((journey) => (journey.id === id ? updatedJourney : journey))
        );

        return updatedJourney;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Log time
  const logTime = useCallback(
    async (id: string, hours: number): Promise<AcademiaJourney> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const updatedJourney = await journeyService.logTime(id, hours);

        setJourneys((prev) =>
          prev.map((journey) => (journey.id === id ? updatedJourney : journey))
        );

        return updatedJourney;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [user?.id]
  );

  // Start journey
  const startJourney = useCallback(
    async (id: string): Promise<AcademiaJourney> => {
      return updateJourney(id, { status: 'active', started_at: new Date().toISOString() });
    },
    [updateJourney]
  );

  // Complete journey
  const completeJourney = useCallback(
    async (id: string): Promise<AcademiaJourney> => {
      return updateJourney(id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_pct: 100,
      });
    },
    [updateJourney]
  );

  // Pause journey
  const pauseJourney = useCallback(
    async (id: string): Promise<AcademiaJourney> => {
      return updateJourney(id, { status: 'paused' });
    },
    [updateJourney]
  );

  // Resume journey
  const resumeJourney = useCallback(
    async (id: string): Promise<AcademiaJourney> => {
      return updateJourney(id, { status: 'active' });
    },
    [updateJourney]
  );

  // Delete journey
  const deleteJourney = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await journeyService.deleteJourney(id);

        // Remove from list
        setJourneys((prev) => prev.filter((journey) => journey.id !== id));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh journeys
  const refresh = useCallback(async () => {
    await fetchJourneys();
  }, [fetchJourneys]);

  // Auto-fetch on mount and dependencies change
  useEffect(() => {
    if (autoFetch && user?.id && spaceId) {
      fetchJourneys();
    }
  }, [autoFetch, user?.id, spaceId, fetchJourneys]);

  return {
    journeys,
    loading,
    error,
    createJourney,
    updateJourney,
    updateProgress,
    logTime,
    startJourney,
    completeJourney,
    pauseJourney,
    resumeJourney,
    deleteJourney,
    refresh,
  };
}

export default useJourneys;
