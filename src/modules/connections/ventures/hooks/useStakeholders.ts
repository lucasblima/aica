import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { stakeholderService } from '../services';
import type {
  VenturesStakeholder,
  CreateStakeholderPayload,
  UpdateStakeholderPayload,
  StakeholderType,
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useStakeholders');

interface UseStakeholdersReturn {
  stakeholders: VenturesStakeholder[];
  founders: VenturesStakeholder[];
  investors: VenturesStakeholder[];
  teamMembers: VenturesStakeholder[];
  loading: boolean;
  error: Error | null;
  createStakeholder: (payload: CreateStakeholderPayload) => Promise<VenturesStakeholder>;
  updateStakeholder: (id: string, payload: UpdateStakeholderPayload) => Promise<VenturesStakeholder>;
  deleteStakeholder: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing stakeholders for an entity
 *
 * @example
 * ```tsx
 * const { stakeholders, founders, investors, createStakeholder } = useStakeholders(entityId);
 * ```
 */
export function useStakeholders(entityId: string | undefined): UseStakeholdersReturn {
  const { user } = useAuth();
  const [stakeholders, setStakeholders] = useState<VenturesStakeholder[]>([]);
  const [founders, setFounders] = useState<VenturesStakeholder[]>([]);
  const [investors, setInvestors] = useState<VenturesStakeholder[]>([]);
  const [teamMembers, setTeamMembers] = useState<VenturesStakeholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch stakeholders
  const fetchStakeholders = useCallback(async () => {
    if (!user?.id || !entityId) {
      setStakeholders([]);
      setFounders([]);
      setInvestors([]);
      setTeamMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [all, foundersData, investorsData, teamData] = await Promise.all([
        stakeholderService.getStakeholdersByEntity(entityId),
        stakeholderService.getFounders(entityId),
        stakeholderService.getInvestors(entityId),
        stakeholderService.getTeamMembers(entityId),
      ]);

      // Ensure we always set arrays, even if API returns null/undefined
      setStakeholders(Array.isArray(all) ? all : []);
      setFounders(Array.isArray(foundersData) ? foundersData : []);
      setInvestors(Array.isArray(investorsData) ? investorsData : []);
      setTeamMembers(Array.isArray(teamData) ? teamData : []);
    } catch (err) {
      setError(err as Error);
      log.error('Error fetching stakeholders:', err);
      // On error, ensure arrays are still valid
      setStakeholders([]);
      setFounders([]);
      setInvestors([]);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId]);

  // Create stakeholder
  const createStakeholder = useCallback(
    async (payload: CreateStakeholderPayload): Promise<VenturesStakeholder> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newStakeholder = await stakeholderService.createStakeholder(payload);
        setStakeholders((prev) => [newStakeholder, ...prev]);

        // Add to appropriate category list
        if (payload.stakeholder_type === 'founder' || payload.stakeholder_type === 'co-founder') {
          setFounders((prev) => [newStakeholder, ...prev]);
        } else if (payload.stakeholder_type === 'investor') {
          setInvestors((prev) => [newStakeholder, ...prev]);
        } else if (payload.stakeholder_type === 'employee' || payload.stakeholder_type === 'contractor') {
          setTeamMembers((prev) => [newStakeholder, ...prev]);
        }

        return newStakeholder;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Update stakeholder
  const updateStakeholder = useCallback(
    async (id: string, payload: UpdateStakeholderPayload): Promise<VenturesStakeholder> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updated = await stakeholderService.updateStakeholder(id, payload);
        setStakeholders((prev) => prev.map((s) => (s.id === id ? updated : s)));

        // Update category lists
        setFounders((prev) => prev.map((s) => (s.id === id ? updated : s)));
        setInvestors((prev) => prev.map((s) => (s.id === id ? updated : s)));
        setTeamMembers((prev) => prev.map((s) => (s.id === id ? updated : s)));

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

  // Delete stakeholder
  const deleteStakeholder = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await stakeholderService.deleteStakeholder(id);
        setStakeholders((prev) => prev.filter((s) => s.id !== id));
        setFounders((prev) => prev.filter((s) => s.id !== id));
        setInvestors((prev) => prev.filter((s) => s.id !== id));
        setTeamMembers((prev) => prev.filter((s) => s.id !== id));
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
    await fetchStakeholders();
  }, [fetchStakeholders]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchStakeholders();
    }
  }, [user?.id, entityId, fetchStakeholders]);

  return {
    stakeholders,
    founders,
    investors,
    teamMembers,
    loading,
    error,
    createStakeholder,
    updateStakeholder,
    deleteStakeholder,
    refresh,
  };
}

interface UseEquityDistributionReturn {
  totalAllocated: number;
  remaining: number;
  stakeholders: Array<{
    id: string;
    name: string;
    type: StakeholderType;
    equity: number;
  }>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for getting equity distribution
 *
 * @example
 * ```tsx
 * const { totalAllocated, remaining, stakeholders } = useEquityDistribution(entityId);
 * ```
 */
export function useEquityDistribution(
  entityId: string | undefined
): UseEquityDistributionReturn {
  const { user } = useAuth();
  const [data, setData] = useState<{
    totalAllocated: number;
    remaining: number;
    stakeholders: Array<{
      id: string;
      name: string;
      type: StakeholderType;
      equity: number;
    }>;
  }>({
    totalAllocated: 0,
    remaining: 100,
    stakeholders: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch equity distribution
  const fetchEquity = useCallback(async () => {
    if (!user?.id || !entityId) return;

    try {
      setLoading(true);
      setError(null);

      const equityData = await stakeholderService.getEquityDistribution(entityId);
      setData(equityData);
    } catch (err) {
      setError(err as Error);
      log.error('Error fetching equity distribution:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchEquity();
  }, [fetchEquity]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchEquity();
    }
  }, [user?.id, entityId, fetchEquity]);

  return {
    ...data,
    loading,
    error,
    refresh,
  };
}

interface UseCapitalRaisedReturn {
  total: number;
  byRound: Record<string, number>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for getting total capital raised
 *
 * @example
 * ```tsx
 * const { total, byRound } = useCapitalRaised(entityId);
 * ```
 */
export function useCapitalRaised(entityId: string | undefined): UseCapitalRaisedReturn {
  const { user } = useAuth();
  const [data, setData] = useState<{
    total: number;
    byRound: Record<string, number>;
  }>({
    total: 0,
    byRound: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch capital raised
  const fetchCapital = useCallback(async () => {
    if (!user?.id || !entityId) return;

    try {
      setLoading(true);
      setError(null);

      const capitalData = await stakeholderService.getTotalCapitalRaised(entityId);
      setData(capitalData);
    } catch (err) {
      setError(err as Error);
      log.error('Error fetching capital raised:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchCapital();
  }, [fetchCapital]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchCapital();
    }
  }, [user?.id, entityId, fetchCapital]);

  return {
    ...data,
    loading,
    error,
    refresh,
  };
}
