/**
 * useAthleteReadiness Hook
 * Sprint 6 — Flux Training Science
 *
 * Computes and manages readiness assessment for a specific athlete.
 * Uses training stress history + RPE data to determine fatigue risk.
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  assessReadiness,
  getStressHistory,
  updateAthleteReadiness,
  type ReadinessAssessment,
} from '../services/fatigueModeling';

const log = createNamespacedLogger('useAthleteReadiness');

export interface UseAthleteReadinessOptions {
  athleteId: string;
}

export interface UseAthleteReadinessReturn {
  readiness: ReadinessAssessment | null;
  isLoading: boolean;
  error: Error | null;
  assess: () => Promise<ReadinessAssessment | null>;
}

export function useAthleteReadiness({ athleteId }: UseAthleteReadinessOptions): UseAthleteReadinessReturn {
  const [readiness, setReadiness] = useState<ReadinessAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const assess = useCallback(async (): Promise<ReadinessAssessment | null> => {
    if (!athleteId) return null;
    try {
      setIsLoading(true);
      setError(null);

      // Fetch stress history
      const history = await getStressHistory(athleteId, 60);

      if (history.length === 0) {
        log.info('No stress history available for athlete:', athleteId);
        setReadiness(null);
        return null;
      }

      // Extract TSS and RPE arrays
      const tssValues = history.map(h => h.tss);
      const recentRPEs = history
        .slice(-7)
        .filter(h => h.rpe !== null)
        .map(h => h.rpe as number);

      // Compute readiness
      const result = assessReadiness(tssValues, recentRPEs);
      setReadiness(result);

      // Persist to athlete record
      await updateAthleteReadiness(athleteId, result);

      log.info('Readiness assessed for athlete:', {
        athleteId,
        score: result.readinessScore,
        risk: result.fatigueRisk,
      });

      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Erro ao avaliar prontidão');
      setError(e);
      log.error('Error assessing readiness:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  return {
    readiness,
    isLoading,
    error,
    assess,
  };
}
