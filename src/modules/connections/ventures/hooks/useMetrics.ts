import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { metricsService } from '../services';
import type {
  VenturesMetrics,
  CreateMetricsPayload,
  UpdateMetricsPayload,
  PeriodType,
} from '../types';

interface UseMetricsReturn {
  metrics: VenturesMetrics[];
  currentMetrics: VenturesMetrics | null;
  loading: boolean;
  error: Error | null;
  createMetrics: (payload: CreateMetricsPayload) => Promise<VenturesMetrics>;
  updateMetrics: (id: string, payload: UpdateMetricsPayload) => Promise<VenturesMetrics>;
  deleteMetrics: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing metrics for an entity
 *
 * @example
 * ```tsx
 * const { metrics, currentMetrics, createMetrics } = useMetrics(entityId);
 * ```
 */
export function useMetrics(entityId: string | undefined): UseMetricsReturn {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<VenturesMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<VenturesMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all metrics and current metrics
  const fetchMetrics = useCallback(async () => {
    if (!user?.id || !entityId) return;

    try {
      setLoading(true);
      setError(null);

      const [allMetrics, current] = await Promise.all([
        metricsService.getMetricsByEntity(entityId),
        metricsService.getCurrentMetrics(entityId),
      ]);

      setMetrics(allMetrics);
      setCurrentMetrics(current);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId]);

  // Create metrics
  const createMetrics = useCallback(
    async (payload: CreateMetricsPayload): Promise<VenturesMetrics> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newMetrics = await metricsService.createMetrics(payload);
        setMetrics((prev) => [newMetrics, ...prev]);

        if (newMetrics.is_current) {
          setCurrentMetrics(newMetrics);
        }

        return newMetrics;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Update metrics
  const updateMetrics = useCallback(
    async (id: string, payload: UpdateMetricsPayload): Promise<VenturesMetrics> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updated = await metricsService.updateMetrics(id, payload);
        setMetrics((prev) => prev.map((m) => (m.id === id ? updated : m)));

        if (updated.is_current) {
          setCurrentMetrics(updated);
        }

        return updated;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Delete metrics
  const deleteMetrics = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await metricsService.deleteMetrics(id);
        setMetrics((prev) => prev.filter((m) => m.id !== id));

        if (currentMetrics?.id === id) {
          setCurrentMetrics(null);
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, currentMetrics]
  );

  // Refresh
  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchMetrics();
    }
  }, [user?.id, entityId, fetchMetrics]);

  return {
    metrics,
    currentMetrics,
    loading,
    error,
    createMetrics,
    updateMetrics,
    deleteMetrics,
    refresh,
  };
}

interface UseMetricsHistoryReturn {
  history: VenturesMetrics[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching metrics history for charting
 *
 * @example
 * ```tsx
 * const { history, loading } = useMetricsHistory(entityId, 'monthly', 12);
 * ```
 */
export function useMetricsHistory(
  entityId: string | undefined,
  periodType: PeriodType = 'monthly',
  limit: number = 12
): UseMetricsHistoryReturn {
  const { user } = useAuth();
  const [history, setHistory] = useState<VenturesMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!user?.id || !entityId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await metricsService.getMetricsHistory(entityId, periodType, limit);
      setHistory(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching metrics history:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId, periodType, limit]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchHistory();
    }
  }, [user?.id, entityId, periodType, limit, fetchHistory]);

  return {
    history,
    loading,
    error,
    refresh,
  };
}
