/**
 * useGrantMatching — Hook for grant opportunity matching
 * Sprint 6 — Grants Scientometric Matching (Issue #575)
 *
 * Manages grant match scores: compute new matches and retrieve stored ones.
 */

import { useState, useCallback, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import type { GrantMatchResult } from '../services/researcherScoring';
import {
  computeGrantMatch,
  storeGrantMatch,
  getGrantMatches,
} from '../services/researcherScoring';

const log = createNamespacedLogger('useGrantMatching');

export interface StoredMatch {
  opportunityId: string;
  similarity: number;
  fit: number;
  probability: number;
  computedAt: string;
}

interface UseGrantMatchingReturn {
  /** Stored matches sorted by probability (descending) */
  matches: StoredMatch[];
  /** Latest computed match result (not yet stored) */
  lastComputedMatch: GrantMatchResult | null;
  /** True while loading matches from database */
  isLoading: boolean;
  /** True while computing a match */
  isComputing: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Compute a match for an opportunity and store the result */
  computeMatch: (
    opportunityId: string,
    semanticSimilarity: number,
    researcherRSS: number,
    budgetFit: number,
    deadlineDaysRemaining: number,
    teamSize: number,
  ) => Promise<GrantMatchResult | null>;
  /** Refresh stored matches from database */
  refresh: () => Promise<void>;
}

export function useGrantMatching(): UseGrantMatchingReturn {
  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [lastComputedMatch, setLastComputedMatch] = useState<GrantMatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getGrantMatches(20);
      setMatches(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar matches';
      log.error('Failed to load grant matches:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const computeMatch = useCallback(async (
    opportunityId: string,
    semanticSimilarity: number,
    researcherRSS: number,
    budgetFit: number,
    deadlineDaysRemaining: number,
    teamSize: number,
  ): Promise<GrantMatchResult | null> => {
    setIsComputing(true);
    setError(null);
    try {
      const result = computeGrantMatch(
        semanticSimilarity,
        researcherRSS,
        budgetFit,
        deadlineDaysRemaining,
        teamSize,
      );
      setLastComputedMatch(result);

      await storeGrantMatch(opportunityId, result);
      log.info('Grant match computed and stored', {
        opportunityId,
        probability: result.successProbability.toFixed(2),
      });

      // Refresh the list to include the new match
      await refresh();

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular match';
      log.error('Failed to compute grant match:', err);
      setError(message);
      return null;
    } finally {
      setIsComputing(false);
    }
  }, [refresh]);

  // Auto-fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    matches,
    lastComputedMatch,
    isLoading,
    isComputing,
    error,
    computeMatch,
    refresh,
  };
}
