/**
 * useGuestScoring Hook
 * Sprint 6 — Studio Neuroscience-Informed Production
 *
 * Manages guest scoring state: compute, store, and fetch scores.
 */

import { useState, useCallback, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import type { GuestProfile, GuestScoreResult } from '../services/guestScoring';
import {
  scoreGuest as computeScore,
  storeGuestScore,
  getGuestScores,
} from '../services/guestScoring';

const log = createNamespacedLogger('useGuestScoring');

export interface StoredGuestScore {
  id: string;
  guestName: string;
  episodeId: string | null;
  composite: number;
  components: GuestScoreResult['components'];
  computedAt: string;
}

export interface UseGuestScoringResult {
  /** List of stored guest scores */
  scores: StoredGuestScore[];
  /** Whether data is currently loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Score a guest and optionally persist it */
  scoreGuest: (profile: GuestProfile, episodeId?: string | null) => Promise<GuestScoreResult>;
  /** Refresh scores from Supabase */
  fetchScores: (limit?: number) => Promise<void>;
}

export function useGuestScoring(): UseGuestScoringResult {
  const [scores, setScores] = useState<StoredGuestScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async (limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGuestScores(limit);
      setScores(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar scores';
      log.error('fetchScores failed:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const scoreGuest = useCallback(async (
    profile: GuestProfile,
    episodeId: string | null = null
  ): Promise<GuestScoreResult> => {
    setError(null);
    try {
      const result = computeScore(profile);
      await storeGuestScore(profile.name, episodeId, result);
      // Refresh the list after storing
      await fetchScores();
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao computar score';
      log.error('scoreGuest failed:', err);
      setError(msg);
      // Still return computed result even if storage fails
      return computeScore(profile);
    }
  }, [fetchScores]);

  // Load scores on mount
  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return {
    scores,
    loading,
    error,
    scoreGuest,
    fetchScores,
  };
}
