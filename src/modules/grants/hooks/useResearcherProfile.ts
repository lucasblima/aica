/**
 * useResearcherProfile — Hook for managing researcher bibliometric profile
 * Sprint 6 — Grants Scientometric Matching (Issue #575)
 *
 * Fetches, computes, and stores the Researcher Strength Score (RSS).
 */

import { useState, useCallback, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import type { ResearcherProfile, ResearcherStrengthResult } from '../services/researcherScoring';
import {
  computeResearcherStrength,
  storeResearcherProfile,
  getResearcherProfile,
} from '../services/researcherScoring';

const log = createNamespacedLogger('useResearcherProfile');

interface UseResearcherProfileReturn {
  /** Current researcher profile data */
  profile: (ResearcherProfile & { rss: number }) | null;
  /** Computed strength result with component scores and tier */
  strength: ResearcherStrengthResult | null;
  /** True while loading profile from database */
  isLoading: boolean;
  /** True while computing and storing profile */
  isSaving: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Fetch profile from database */
  fetchProfile: () => Promise<void>;
  /** Compute RSS from profile data and store to database */
  computeAndStore: (profile: ResearcherProfile) => Promise<void>;
}

export function useResearcherProfile(): UseResearcherProfileReturn {
  const [profile, setProfile] = useState<(ResearcherProfile & { rss: number }) | null>(null);
  const [strength, setStrength] = useState<ResearcherStrengthResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getResearcherProfile();
      if (data) {
        setProfile(data);
        const result = computeResearcherStrength(data);
        setStrength(result);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar perfil';
      log.error('Failed to fetch researcher profile:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const computeAndStore = useCallback(async (inputProfile: ResearcherProfile) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = computeResearcherStrength(inputProfile);
      setStrength(result);

      const profileWithScore = { ...inputProfile, rss: result.rss };
      await storeResearcherProfile(profileWithScore);
      setProfile(profileWithScore);

      log.info('Researcher profile computed and stored', { rss: result.rss, tier: result.tier });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar perfil';
      log.error('Failed to compute and store researcher profile:', err);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    strength,
    isLoading,
    isSaving,
    error,
    fetchProfile,
    computeAndStore,
  };
}
