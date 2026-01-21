/**
 * useHealthScore Hook
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Hook for managing contact health scores:
 * - Calculate health score for a contact
 * - Get health score history
 * - Track calculation status and progress
 *
 * @example
 * const {
 *   healthScore,
 *   history,
 *   isCalculating,
 *   calculateScore,
 *   fetchHistory,
 * } = useHealthScore(contactId)
 */

import { useState, useCallback, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  calculateHealthScore,
  getHealthScoreHistory,
  getContactHealthScore,
} from '@/services/healthScoreService';
import type {
  ContactWithHealthScore,
  HealthScoreHistory,
  SingleCalculateResponse,
  HealthScoreTrend,
  HealthScoreComponents,
} from '@/types/healthScore';

const log = createNamespacedLogger('useHealthScore');

export interface CalculationStatus {
  status: 'idle' | 'calculating' | 'completed' | 'error';
  progress: number;
  message: string;
}

interface UseHealthScoreReturn {
  /** Current contact with health score data */
  contact: ContactWithHealthScore | null;
  /** Current health score (0-100) */
  healthScore: number | null;
  /** Health score components breakdown */
  components: HealthScoreComponents | null;
  /** Score trend direction */
  trend: HealthScoreTrend | null;
  /** Health score history entries */
  history: HealthScoreHistory[];
  /** Current calculation status */
  calculationStatus: CalculationStatus;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether calculation is in progress */
  isCalculating: boolean;
  /** Error message */
  error: string | null;
  /** Calculate health score for the contact */
  calculateScore: () => Promise<SingleCalculateResponse | null>;
  /** Fetch health score history */
  fetchHistory: (limit?: number) => Promise<void>;
  /** Refresh contact health score data */
  refresh: () => Promise<void>;
  /** Last calculation result */
  lastResult: SingleCalculateResponse | null;
}

/**
 * Hook for managing health score of a specific contact
 *
 * @param contactId - UUID of the contact
 * @param options - Configuration options
 * @returns Health score state and methods
 */
export function useHealthScore(
  contactId: string | null | undefined,
  options: {
    /** Auto-fetch health score on mount */
    autoFetch?: boolean;
    /** Auto-fetch history on mount */
    autoFetchHistory?: boolean;
    /** History limit */
    historyLimit?: number;
  } = {}
): UseHealthScoreReturn {
  const {
    autoFetch = true,
    autoFetchHistory = false,
    historyLimit = 30,
  } = options;

  const [contact, setContact] = useState<ContactWithHealthScore | null>(null);
  const [history, setHistory] = useState<HealthScoreHistory[]>([]);
  const [calculationStatus, setCalculationStatus] = useState<CalculationStatus>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SingleCalculateResponse | null>(null);

  /**
   * Fetch current contact health score data
   */
  const fetchContactData = useCallback(async () => {
    if (!contactId) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await getContactHealthScore(contactId);
      setContact(data);

      log.info('Contact health score fetched:', {
        contactId,
        score: data?.health_score,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch health score';
      setError(errorMessage);
      log.error('Fetch error:', { error: errorMessage, contactId });
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  /**
   * Fetch health score history
   */
  const fetchHistory = useCallback(async (limit: number = historyLimit) => {
    if (!contactId) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await getHealthScoreHistory(contactId, limit);
      setHistory(data);

      log.info('Health score history fetched:', {
        contactId,
        entries: data.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(errorMessage);
      log.error('Fetch history error:', { error: errorMessage, contactId });
    } finally {
      setIsLoading(false);
    }
  }, [contactId, historyLimit]);

  /**
   * Calculate health score for the contact
   */
  const calculateScore = useCallback(async (): Promise<SingleCalculateResponse | null> => {
    if (!contactId) {
      setError('No contact ID provided');
      return null;
    }

    try {
      setCalculationStatus({
        status: 'calculating',
        progress: 20,
        message: 'Analisando mensagens...',
      });
      setError(null);

      setCalculationStatus({
        status: 'calculating',
        progress: 50,
        message: 'Calculando score de saúde...',
      });

      const result = await calculateHealthScore(contactId);

      setCalculationStatus({
        status: 'calculating',
        progress: 80,
        message: 'Atualizando dados...',
      });

      // Update local state with new data
      if (result.success) {
        setContact(prev => prev ? {
          ...prev,
          health_score: result.healthScore,
          health_score_components: result.components,
          health_score_trend: result.trend,
          health_score_updated_at: new Date().toISOString(),
        } : null);

        setLastResult(result);

        setCalculationStatus({
          status: 'completed',
          progress: 100,
          message: `Score calculado: ${result.healthScore}`,
        });

        log.info('Health score calculated:', {
          contactId,
          score: result.healthScore,
          delta: result.scoreDelta,
          trend: result.trend,
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Calculation failed';
      setError(errorMessage);
      setCalculationStatus({
        status: 'error',
        progress: 0,
        message: errorMessage,
      });
      log.error('Calculation error:', { error: errorMessage, contactId });
      return null;
    }
  }, [contactId]);

  /**
   * Refresh all health score data
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchContactData(),
      autoFetchHistory ? fetchHistory() : Promise.resolve(),
    ]);
  }, [fetchContactData, fetchHistory, autoFetchHistory]);

  // Auto-fetch on mount or contactId change
  useEffect(() => {
    if (contactId && autoFetch) {
      fetchContactData();
    }
  }, [contactId, autoFetch, fetchContactData]);

  // Auto-fetch history if enabled
  useEffect(() => {
    if (contactId && autoFetchHistory) {
      fetchHistory();
    }
  }, [contactId, autoFetchHistory, fetchHistory]);

  // Reset state when contactId changes
  useEffect(() => {
    if (!contactId) {
      setContact(null);
      setHistory([]);
      setCalculationStatus({ status: 'idle', progress: 0, message: '' });
      setError(null);
      setLastResult(null);
    }
  }, [contactId]);

  return {
    contact,
    healthScore: contact?.health_score ?? null,
    components: contact?.health_score_components ?? null,
    trend: contact?.health_score_trend ?? null,
    history,
    calculationStatus,
    isLoading,
    isCalculating: calculationStatus.status === 'calculating',
    error,
    calculateScore,
    fetchHistory,
    refresh,
    lastResult,
  };
}

export default useHealthScore;
