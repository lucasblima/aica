/**
 * useLifeScore Hook
 * Issue #717: Recreate hook deleted in PR #713
 *
 * Manages Life Score state: fetch, compute, history, domain weights, and active domains.
 * Connects to lifeScoreService + scoringEngine backing services.
 */

import { useState, useCallback, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import type { LifeScore, AicaDomain } from '@/services/scoring/types';
import { DEFAULT_DOMAIN_WEIGHTS, DEFAULT_ACTIVE_DOMAINS } from '@/services/scoring/types';
import {
  getLatestLifeScore,
  getLifeScoreHistory,
  getUserDomainWeights,
  saveUserDomainWeights,
} from '@/services/scoring/lifeScoreService';
import { computeAndStoreLifeScore } from '@/services/scoring/scoringEngine';

const log = createNamespacedLogger('useLifeScore');

export interface LifeScoreHistoryEntry {
  composite: number;
  domainScores: Record<string, number>;
  trend: string;
  spiralDetected: boolean;
  computedAt: string;
}

export interface UseLifeScoreReturn {
  lifeScore: LifeScore | null;
  history: LifeScoreHistoryEntry[];
  weights: Record<AicaDomain, number>;
  activeDomains: AicaDomain[];
  spiralAlert: boolean;
  isLoading: boolean;
  isComputing: boolean;
  error: string | null;
  compute: () => Promise<LifeScore | null>;
  refresh: () => Promise<void>;
  fetchHistory: (limit?: number) => Promise<void>;
  updateWeights: (
    weights: Record<AicaDomain, number>,
    method: 'equal' | 'slider' | 'ahp'
  ) => Promise<void>;
  updateActiveDomains: (domains: AicaDomain[]) => Promise<void>;
}

export function useLifeScore(): UseLifeScoreReturn {
  const [lifeScore, setLifeScore] = useState<LifeScore | null>(null);
  const [history, setHistory] = useState<LifeScoreHistoryEntry[]>([]);
  const [weights, setWeights] = useState<Record<AicaDomain, number>>({ ...DEFAULT_DOMAIN_WEIGHTS });
  const [activeDomains, setActiveDomains] = useState<AicaDomain[]>([...DEFAULT_ACTIVE_DOMAINS]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spiralAlert = lifeScore?.spiralAlert ?? false;

  const refresh = useCallback(async () => {
    try {
      const latest = await getLatestLifeScore();
      setLifeScore(latest);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar Life Score';
      log.error('refresh failed:', err);
      setError(msg);
    }
  }, []);

  const fetchHistory = useCallback(async (limit = 30) => {
    try {
      const data = await getLifeScoreHistory(limit);
      setHistory(data);
    } catch (err) {
      log.error('fetchHistory failed:', err);
    }
  }, []);

  const compute = useCallback(async (): Promise<LifeScore | null> => {
    setIsComputing(true);
    setError(null);
    try {
      const result = await computeAndStoreLifeScore();
      if (result) {
        setLifeScore(result);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao computar Life Score';
      log.error('compute failed:', err);
      setError(msg);
      return null;
    } finally {
      setIsComputing(false);
    }
  }, []);

  const updateWeights = useCallback(async (
    newWeights: Record<AicaDomain, number>,
    method: 'equal' | 'slider' | 'ahp'
  ) => {
    setError(null);
    try {
      await saveUserDomainWeights(newWeights, method, undefined, activeDomains);
      setWeights(newWeights);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar pesos';
      log.error('updateWeights failed:', err);
      setError(msg);
    }
  }, [refresh, activeDomains]);

  const updateActiveDomains = useCallback(async (domains: AicaDomain[]) => {
    setError(null);
    try {
      await saveUserDomainWeights(weights, 'slider', undefined, domains);
      setActiveDomains(domains);
      // Recompute with new active domains
      const result = await computeAndStoreLifeScore();
      if (result) {
        setLifeScore(result);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar domínios ativos';
      log.error('updateActiveDomains failed:', err);
      setError(msg);
    }
  }, [weights]);

  // Initial fetch on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        const [latest, weightData] = await Promise.all([
          getLatestLifeScore(),
          getUserDomainWeights(),
        ]);

        if (cancelled) return;
        setLifeScore(latest);
        setWeights(weightData.weights);
        setActiveDomains(weightData.activeDomains);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Erro ao carregar Life Score';
        log.error('init failed:', err);
        setError(msg);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return {
    lifeScore,
    history,
    weights,
    activeDomains,
    spiralAlert,
    isLoading,
    isComputing,
    error,
    compute,
    refresh,
    fetchHistory,
    updateWeights,
    updateActiveDomains,
  };
}

export default useLifeScore;
