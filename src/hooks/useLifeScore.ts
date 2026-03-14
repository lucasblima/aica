/**
 * useLifeScore Hook
 * Issue #717: Recreate hook deleted in PR #713
 *
 * Manages Life Score state: fetch, compute, history, and domain weights.
 * Connects to lifeScoreService + scoringEngine backing services.
 */

import { useState, useCallback, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import type { LifeScore, AicaDomain } from '@/services/scoring/types';
import { initDomainProviders } from '@/services/scoring/initDomainProviders';
import { DEFAULT_DOMAIN_WEIGHTS } from '@/services/scoring/types';
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
}

export function useLifeScore(): UseLifeScoreReturn {
  // Ensure all domain scoring providers are registered (idempotent)
  initDomainProviders();

  const [lifeScore, setLifeScore] = useState<LifeScore | null>(null);
  const [history, setHistory] = useState<LifeScoreHistoryEntry[]>([]);
  const [weights, setWeights] = useState<Record<AicaDomain, number>>({ ...DEFAULT_DOMAIN_WEIGHTS });
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
      await saveUserDomainWeights(newWeights, method);
      setWeights(newWeights);
      // Recompute with new weights
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar pesos';
      log.error('updateWeights failed:', err);
      setError(msg);
    }
  }, [refresh]);

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
    spiralAlert,
    isLoading,
    isComputing,
    error,
    compute,
    refresh,
    fetchHistory,
    updateWeights,
  };
}

export default useLifeScore;
