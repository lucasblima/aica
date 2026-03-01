/**
 * useLifeScore Hook
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Hook for managing the composite Life Score:
 * - Fetch latest Life Score
 * - Fetch score history
 * - Compute fresh Life Score via scoring engine
 * - Manage domain weights
 *
 * @example
 * const {
 *   lifeScore,
 *   history,
 *   isLoading,
 *   refresh,
 *   updateWeights,
 * } = useLifeScore()
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  getLatestLifeScore,
  getLifeScoreHistory,
  getUserDomainWeights,
  saveUserDomainWeights,
} from '@/services/scoring/lifeScoreService';
import { computeAndStoreLifeScore } from '@/services/scoring/scoringEngine';
import type { LifeScore, AicaDomain, AHPComparison } from '@/services/scoring/types';
import { DEFAULT_DOMAIN_WEIGHTS } from '@/services/scoring/types';

const log = createNamespacedLogger('useLifeScore');

interface UseLifeScoreReturn {
  /** Current Life Score (null if not yet computed) */
  lifeScore: LifeScore | null;
  /** Life Score history (most recent first) */
  history: { composite: number; domainScores: Record<string, number>; trend: string; computedAt: string }[];
  /** Current domain weights */
  weights: Record<AicaDomain, number>;
  /** Weighting method */
  weightMethod: string;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether computation is in progress */
  isComputing: boolean;
  /** Error message */
  error: string | null;
  /** Whether a spiral alert is active */
  spiralAlert: boolean;
  /** Refresh Life Score from database */
  refresh: () => Promise<void>;
  /** Compute a fresh Life Score */
  compute: () => Promise<LifeScore | null>;
  /** Update domain weights */
  updateWeights: (
    weights: Record<AicaDomain, number>,
    method?: 'equal' | 'slider' | 'ahp',
    ahpComparisons?: AHPComparison[]
  ) => Promise<void>;
  /** Fetch score history */
  fetchHistory: (limit?: number) => Promise<void>;
}

export function useLifeScore(options: {
  autoFetch?: boolean;
  historyLimit?: number;
} = {}): UseLifeScoreReturn {
  const { autoFetch = true, historyLimit = 30 } = options;

  const [lifeScore, setLifeScore] = useState<LifeScore | null>(null);
  const [history, setHistory] = useState<{ composite: number; domainScores: Record<string, number>; trend: string; computedAt: string }[]>([]);
  const [weights, setWeights] = useState<Record<AicaDomain, number>>({ ...DEFAULT_DOMAIN_WEIGHTS });
  const [weightMethod, setWeightMethod] = useState('equal');
  const [isLoading, setIsLoading] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [score, weightData] = await Promise.all([
        getLatestLifeScore(),
        getUserDomainWeights(),
      ]);

      setLifeScore(score);
      setWeights(weightData.weights);
      setWeightMethod(weightData.method);

      log.info('Life Score fetched:', {
        composite: score?.composite?.toFixed(3),
        trend: score?.trend,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch Life Score';
      setError(msg);
      log.error('Fetch error:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (limit: number = historyLimit) => {
    try {
      setIsLoading(true);
      const data = await getLifeScoreHistory(limit);
      setHistory(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(msg);
      log.error('History fetch error:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [historyLimit]);

  const compute = useCallback(async (): Promise<LifeScore | null> => {
    try {
      setIsComputing(true);
      setError(null);

      const result = await computeAndStoreLifeScore();

      if (result) {
        setLifeScore(result);
        log.info('Life Score computed:', {
          composite: result.composite.toFixed(3),
          trend: result.trend,
        });
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Computation failed';
      setError(msg);
      log.error('Computation error:', msg);
      return null;
    } finally {
      setIsComputing(false);
    }
  }, []);

  const updateWeights = useCallback(async (
    newWeights: Record<AicaDomain, number>,
    method: 'equal' | 'slider' | 'ahp' = 'slider',
    ahpComparisons?: AHPComparison[]
  ) => {
    try {
      await saveUserDomainWeights(newWeights, method, ahpComparisons);
      setWeights(newWeights);
      setWeightMethod(method);
      log.info('Domain weights updated:', { method });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save weights';
      setError(msg);
      log.error('Weight update error:', msg);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchLatest();
  }, [fetchLatest]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchLatest();
    }
  }, [autoFetch, fetchLatest]);

  const returnValue = useMemo(() => ({
    lifeScore,
    history,
    weights,
    weightMethod,
    isLoading,
    isComputing,
    error,
    spiralAlert: lifeScore?.spiralAlert ?? false,
    refresh,
    compute,
    updateWeights,
    fetchHistory,
  }), [lifeScore, history, weights, weightMethod, isLoading, isComputing, error, refresh, compute, updateWeights, fetchHistory]);

  return returnValue;
}

export default useLifeScore;
