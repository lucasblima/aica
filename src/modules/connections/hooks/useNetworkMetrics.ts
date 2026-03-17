/**
 * useNetworkMetrics Hook
 * Sprint 4: Connections — Network-level metrics
 *
 * Fetches and computes network-level scores:
 * effective size, constraint, diversity index, and layer distribution.
 *
 * @example
 * const { metrics, isLoading, refresh } = useNetworkMetrics()
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { scoreAllContacts, type NetworkMetricsResult } from '../services/networkScoring';

const log = createNamespacedLogger('useNetworkMetrics');

// ============================================================================
// TYPES
// ============================================================================

export interface UseNetworkMetricsReturn {
  metrics: NetworkMetricsResult | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastComputedAt: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNetworkMetrics(): UseNetworkMetricsReturn {
  const [metrics, setMetrics] = useState<NetworkMetricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastComputedAt, setLastComputedAt] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch most recent network metrics
      const { data, error: fetchError } = await supabase
        .from('network_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine
        throw fetchError;
      }

      if (data) {
        setMetrics({
          effectiveSize: data.effective_network_size ?? 0,
          networkConstraint: data.network_constraint ?? 0,
          diversityIndex: data.diversity_index ?? 0,
          layerDistribution: data.layer_distribution ?? {},
          totalContacts: (Object.values(data.layer_distribution ?? {}) as number[]).reduce(
            (s, v) => s + (v ?? 0), 0
          ),
        });
        setLastComputedAt(data.computed_at);
      }
    } catch (err) {
      log.error('Failed to fetch network metrics:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas de rede');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const result = await scoreAllContacts();
      if (result.metrics) {
        setMetrics(result.metrics);
        setLastComputedAt(new Date().toISOString());
      }
    } catch (err) {
      log.error('Network metrics refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Erro ao recalcular métricas');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    isRefreshing,
    error,
    refresh,
    lastComputedAt,
  };
}

export default useNetworkMetrics;
