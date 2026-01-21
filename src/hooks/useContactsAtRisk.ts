/**
 * useContactsAtRisk Hook
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Hook for managing contacts at risk (health_score < 40):
 * - Fetch contacts that need attention
 * - Get risk count for badges/notifications
 * - Track loading and error states
 *
 * @example
 * const {
 *   contacts,
 *   count,
 *   isLoading,
 *   refresh,
 * } = useContactsAtRisk()
 */

import { useState, useCallback, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  getContactsAtRisk,
  getContactsAtRiskCount,
  getHealthScoreStats,
  getHealthScoreAlerts,
} from '@/services/healthScoreService';
import type {
  ContactAtRisk,
  HealthScoreStats,
  HealthScoreAlert,
} from '@/types/healthScore';

const log = createNamespacedLogger('useContactsAtRisk');

interface UseContactsAtRiskReturn {
  /** Contacts at risk (health_score < 40) */
  contacts: ContactAtRisk[];
  /** Total count of contacts at risk */
  count: number;
  /** Health score statistics */
  stats: HealthScoreStats | null;
  /** Recent health score alerts */
  alerts: HealthScoreAlert[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh contacts at risk */
  refresh: () => Promise<void>;
  /** Refresh stats only */
  refreshStats: () => Promise<void>;
  /** Refresh alerts only */
  refreshAlerts: (limit?: number) => Promise<void>;
}

/**
 * Hook for managing contacts at risk dashboard
 *
 * @param options - Configuration options
 * @returns Contacts at risk state and methods
 */
export function useContactsAtRisk(
  options: {
    /** Auto-fetch on mount */
    autoFetch?: boolean;
    /** Limit of contacts to fetch */
    limit?: number;
    /** Auto-fetch stats */
    autoFetchStats?: boolean;
    /** Auto-fetch alerts */
    autoFetchAlerts?: boolean;
    /** Alerts limit */
    alertsLimit?: number;
    /** Refresh interval in ms (0 = disabled) */
    refreshInterval?: number;
  } = {}
): UseContactsAtRiskReturn {
  const {
    autoFetch = true,
    limit = 50,
    autoFetchStats = true,
    autoFetchAlerts = false,
    alertsLimit = 20,
    refreshInterval = 0,
  } = options;

  const [contacts, setContacts] = useState<ContactAtRisk[]>([]);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<HealthScoreStats | null>(null);
  const [alerts, setAlerts] = useState<HealthScoreAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch contacts at risk
   */
  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [contactsData, countData] = await Promise.all([
        getContactsAtRisk(limit),
        getContactsAtRiskCount(),
      ]);

      setContacts(contactsData);
      setCount(countData);

      log.info('Contacts at risk fetched:', {
        count: countData,
        loaded: contactsData.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contacts at risk';
      setError(errorMessage);
      log.error('Fetch error:', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  /**
   * Fetch health score stats
   */
  const refreshStats = useCallback(async () => {
    try {
      const data = await getHealthScoreStats();
      setStats(data);

      log.info('Health score stats fetched:', {
        total: data.totalContacts,
        atRisk: data.atRiskContacts,
        critical: data.criticalContacts,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      log.error('Fetch stats error:', { error: errorMessage });
    }
  }, []);

  /**
   * Fetch health score alerts
   */
  const refreshAlerts = useCallback(async (alertLimit: number = alertsLimit) => {
    try {
      const data = await getHealthScoreAlerts(alertLimit);
      setAlerts(data);

      log.info('Health score alerts fetched:', {
        count: data.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alerts';
      log.error('Fetch alerts error:', { error: errorMessage });
    }
  }, [alertsLimit]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    const promises = [fetchContacts()];

    if (autoFetchStats) {
      promises.push(refreshStats());
    }

    if (autoFetchAlerts) {
      promises.push(refreshAlerts());
    }

    await Promise.all(promises);
  }, [fetchContacts, refreshStats, refreshAlerts, autoFetchStats, autoFetchAlerts]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  return {
    contacts,
    count,
    stats,
    alerts,
    isLoading,
    error,
    refresh,
    refreshStats,
    refreshAlerts,
  };
}

export default useContactsAtRisk;
