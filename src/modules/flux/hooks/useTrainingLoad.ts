/**
 * useTrainingLoad Hook
 * Sprint 6 — Flux Training Science
 *
 * Manages training stress history and CTL/ATL/TSB metrics for an athlete.
 * Provides methods to load history and record new training sessions.
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  computeTrainingLoad,
  storeStressEntry,
  getStressHistory,
  type DailyStressEntry,
  type TrainingLoadMetrics,
  type StressHistoryRow,
} from '../services/fatigueModeling';

const log = createNamespacedLogger('useTrainingLoad');

export interface UseTrainingLoadOptions {
  athleteId: string;
}

export interface UseTrainingLoadReturn {
  stressHistory: StressHistoryRow[];
  metrics: TrainingLoadMetrics | null;
  isLoading: boolean;
  error: Error | null;
  loadHistory: () => Promise<void>;
  recordSession: (entry: DailyStressEntry) => Promise<void>;
}

export function useTrainingLoad({ athleteId }: UseTrainingLoadOptions): UseTrainingLoadReturn {
  const [stressHistory, setStressHistory] = useState<StressHistoryRow[]>([]);
  const [metrics, setMetrics] = useState<TrainingLoadMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadHistory = useCallback(async () => {
    if (!athleteId) return;
    try {
      setIsLoading(true);
      setError(null);

      const history = await getStressHistory(athleteId, 60);
      setStressHistory(history);

      if (history.length > 0) {
        const tssValues = history.map(h => h.tss);
        const computed = computeTrainingLoad(tssValues);
        setMetrics(computed);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Erro ao carregar histórico de treino');
      setError(e);
      log.error('Error loading training history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  const recordSession = useCallback(async (entry: DailyStressEntry) => {
    if (!athleteId) return;
    try {
      setError(null);

      // Compute updated metrics including the new entry
      const currentTss = stressHistory.map(h => h.tss);
      currentTss.push(entry.tss);
      const updatedMetrics = computeTrainingLoad(currentTss);

      // Store in DB
      await storeStressEntry(athleteId, entry, updatedMetrics);

      // Refresh local state
      await loadHistory();

      log.info('Session recorded for athlete:', athleteId);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Erro ao registrar sessão');
      setError(e);
      log.error('Error recording session:', err);
      throw e;
    }
  }, [athleteId, stressHistory, loadHistory]);

  return {
    stressHistory,
    metrics,
    isLoading,
    error,
    loadHistory,
    recordSession,
  };
}
