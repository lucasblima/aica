import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { milestoneService } from '../services';
import type {
  VenturesMilestone,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  MilestoneStatus,
  MilestoneCategory,
} from '../types';

interface UseMilestonesReturn {
  milestones: VenturesMilestone[];
  activeMilestones: VenturesMilestone[];
  loading: boolean;
  error: Error | null;
  createMilestone: (payload: CreateMilestonePayload) => Promise<VenturesMilestone>;
  updateMilestone: (id: string, payload: UpdateMilestonePayload) => Promise<VenturesMilestone>;
  updateProgress: (id: string, currentValue: number, progressPct: number) => Promise<VenturesMilestone>;
  deleteMilestone: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing milestones for an entity
 *
 * @example
 * ```tsx
 * const { milestones, activeMilestones, createMilestone } = useMilestones(entityId);
 * ```
 */
export function useMilestones(entityId: string | undefined): UseMilestonesReturn {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<VenturesMilestone[]>([]);
  const [activeMilestones, setActiveMilestones] = useState<VenturesMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch milestones
  const fetchMilestones = useCallback(async () => {
    if (!user?.id || !entityId) {
      setMilestones([]);
      setActiveMilestones([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [all, active] = await Promise.all([
        milestoneService.getMilestonesByEntity(entityId),
        milestoneService.getActiveMilestones(entityId),
      ]);

      // Ensure we always set arrays, even if API returns null/undefined
      setMilestones(Array.isArray(all) ? all : []);
      setActiveMilestones(Array.isArray(active) ? active : []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching milestones:', err);
      // On error, ensure arrays are still valid
      setMilestones([]);
      setActiveMilestones([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId]);

  // Create milestone
  const createMilestone = useCallback(
    async (payload: CreateMilestonePayload): Promise<VenturesMilestone> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newMilestone = await milestoneService.createMilestone(payload);
        setMilestones((prev) => [...prev, newMilestone]);

        if (newMilestone.status === 'pending' || newMilestone.status === 'in_progress') {
          setActiveMilestones((prev) => [...prev, newMilestone]);
        }

        return newMilestone;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Update milestone
  const updateMilestone = useCallback(
    async (id: string, payload: UpdateMilestonePayload): Promise<VenturesMilestone> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updated = await milestoneService.updateMilestone(id, payload);
        setMilestones((prev) => prev.map((m) => (m.id === id ? updated : m)));

        // Update active milestones
        if (updated.status === 'pending' || updated.status === 'in_progress') {
          setActiveMilestones((prev) => {
            const existing = prev.find((m) => m.id === id);
            if (existing) {
              return prev.map((m) => (m.id === id ? updated : m));
            }
            return [...prev, updated];
          });
        } else {
          setActiveMilestones((prev) => prev.filter((m) => m.id !== id));
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

  // Update progress
  const updateProgress = useCallback(
    async (id: string, currentValue: number, progressPct: number): Promise<VenturesMilestone> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updated = await milestoneService.updateProgress(id, currentValue, progressPct);
        setMilestones((prev) => prev.map((m) => (m.id === id ? updated : m)));

        // Update active milestones based on new status
        if (updated.status === 'pending' || updated.status === 'in_progress') {
          setActiveMilestones((prev) => {
            const existing = prev.find((m) => m.id === id);
            if (existing) {
              return prev.map((m) => (m.id === id ? updated : m));
            }
            return [...prev, updated];
          });
        } else {
          setActiveMilestones((prev) => prev.filter((m) => m.id !== id));
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

  // Delete milestone
  const deleteMilestone = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await milestoneService.deleteMilestone(id);
        setMilestones((prev) => prev.filter((m) => m.id !== id));
        setActiveMilestones((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh
  const refresh = useCallback(async () => {
    await fetchMilestones();
  }, [fetchMilestones]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchMilestones();
    }
  }, [user?.id, entityId, fetchMilestones]);

  return {
    milestones,
    activeMilestones,
    loading,
    error,
    createMilestone,
    updateMilestone,
    updateProgress,
    deleteMilestone,
    refresh,
  };
}

interface UseMilestonesByStatusReturn {
  milestones: VenturesMilestone[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching milestones by status
 *
 * @example
 * ```tsx
 * const { milestones, loading } = useMilestonesByStatus(entityId, 'achieved');
 * ```
 */
export function useMilestonesByStatus(
  entityId: string | undefined,
  status: MilestoneStatus
): UseMilestonesByStatusReturn {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<VenturesMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch milestones
  const fetchMilestones = useCallback(async () => {
    if (!user?.id || !entityId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await milestoneService.getMilestonesByStatus(entityId, status);
      setMilestones(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching milestones by status:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId, status]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchMilestones();
  }, [fetchMilestones]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchMilestones();
    }
  }, [user?.id, entityId, status, fetchMilestones]);

  return {
    milestones,
    loading,
    error,
    refresh,
  };
}

interface UseMilestonesByCategoryReturn {
  milestones: VenturesMilestone[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching milestones by category
 *
 * @example
 * ```tsx
 * const { milestones, loading } = useMilestonesByCategory(entityId, 'financeiro');
 * ```
 */
export function useMilestonesByCategory(
  entityId: string | undefined,
  category: MilestoneCategory
): UseMilestonesByCategoryReturn {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<VenturesMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch milestones
  const fetchMilestones = useCallback(async () => {
    if (!user?.id || !entityId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await milestoneService.getMilestonesByCategory(entityId, category);
      setMilestones(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching milestones by category:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId, category]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchMilestones();
  }, [fetchMilestones]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchMilestones();
    }
  }, [user?.id, entityId, category, fetchMilestones]);

  return {
    milestones,
    loading,
    error,
    refresh,
  };
}
