/**
 * useScientificScore Hook
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Generic hook for fetching and displaying any scientific score.
 * Works with the score explainer to provide methodology transparency.
 *
 * @example
 * const {
 *   score,
 *   explanation,
 *   isLoading,
 *   refresh,
 * } = useScientificScore('flow_state', fetchFlowScore)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { getScoreExplanation } from '@/services/scoring/scoreExplainerService';
import type { ScientificScore, ScoreExplanation } from '@/services/scoring/types';

const log = createNamespacedLogger('useScientificScore');

/** Function that fetches a specific score */
export type ScoreFetcher = () => Promise<ScientificScore | null>;

interface UseScientificScoreReturn {
  /** The scientific score (null if not yet fetched or unavailable) */
  score: ScientificScore | null;
  /** Score explanation / methodology info */
  explanation: ScoreExplanation | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh the score */
  refresh: () => Promise<void>;
}

/**
 * Generic hook for any scientific score.
 *
 * @param modelId - The scientific model registry ID (e.g., 'flow_state')
 * @param fetcher - Async function that computes/fetches the score
 * @param options - Configuration
 */
export function useScientificScore(
  modelId: string,
  fetcher: ScoreFetcher,
  options: {
    autoFetch?: boolean;
  } = {}
): UseScientificScoreReturn {
  const { autoFetch = true } = options;

  const [score, setScore] = useState<ScientificScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Explanation is static — doesn't change between renders
  const explanation = useMemo(() => getScoreExplanation(modelId), [modelId]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await fetcher();
      setScore(result);

      if (result) {
        log.info(`Score ${modelId} fetched:`, {
          value: result.value.toFixed(3),
          trend: result.trend,
          confidence: result.confidence.toFixed(2),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to fetch ${modelId} score`;
      setError(msg);
      log.error(`Score ${modelId} fetch error:`, msg);
    } finally {
      setIsLoading(false);
    }
  }, [modelId, fetcher]);

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  const returnValue = useMemo(() => ({
    score,
    explanation,
    isLoading,
    error,
    refresh,
  }), [score, explanation, isLoading, error, refresh]);

  return returnValue;
}

export default useScientificScore;
