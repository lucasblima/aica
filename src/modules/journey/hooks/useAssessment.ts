/**
 * useAssessment Hook
 * Administer, score, and save psychometric assessments.
 * Sprint 3: Journey Validated Psychometric Well-Being
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabaseClient';
import {
  scoreAssessment,
  getInstrumentDefinition,
  getAllInstruments,
} from '../services/assessmentInstruments';
import type { AssessmentInstrument } from '@/services/scoring/types';

const log = createNamespacedLogger('useAssessment');

interface AssessmentResult {
  id: string;
  instrumentId: string;
  subscaleScores: Record<string, number>;
  compositeScore: number;
  administeredAt: string;
}

interface HistoryEntry {
  id: string;
  instrument: string;
  version: string;
  subscale_scores: Record<string, number> | null;
  composite_score: number | null;
  context: string;
  administered_at: string;
}

export function useAssessment() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);

  /**
   * Submit a completed assessment: score locally, then persist via RPC.
   */
  const submitAssessment = useCallback(
    async (
      instrumentId: string,
      responses: Record<string, number>,
      context: 'on_demand' | 'weekly_review' | 'onboarding' = 'on_demand'
    ): Promise<AssessmentResult> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setIsSubmitting(true);
        setError(null);

        // Score locally
        const { subscaleScores, compositeScore } = scoreAssessment(instrumentId, responses);

        // Persist via RPC
        const { data, error: rpcError } = await supabase.rpc('submit_assessment_response', {
          p_instrument: instrumentId,
          p_version: '1.0',
          p_responses: responses,
          p_subscale_scores: subscaleScores,
          p_composite_score: compositeScore,
          p_context: context,
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        const result: AssessmentResult = {
          id: data as string,
          instrumentId,
          subscaleScores,
          compositeScore,
          administeredAt: new Date().toISOString(),
        };

        setLastResult(result);
        log.info('Assessment submitted:', { instrumentId, compositeScore });

        return result;
      } catch (err) {
        const e = err as Error;
        setError(e);
        log.error('Assessment submission failed:', e);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user?.id]
  );

  /**
   * Get the latest assessment results for all instruments.
   */
  const getLatestAssessments = useCallback(async (): Promise<HistoryEntry[]> => {
    if (!user?.id) return [];

    try {
      const { data, error: rpcError } = await supabase.rpc('get_latest_assessments');
      if (rpcError) {
        log.error('Failed to fetch latest assessments:', rpcError.message);
        return [];
      }
      return (data ?? []) as HistoryEntry[];
    } catch (err) {
      log.error('getLatestAssessments failed:', err);
      return [];
    }
  }, [user?.id]);

  /**
   * Get assessment history for a specific instrument.
   */
  const getHistory = useCallback(
    async (instrumentId: string, limit = 10): Promise<HistoryEntry[]> => {
      if (!user?.id) return [];

      try {
        const { data, error: rpcError } = await supabase.rpc('get_assessment_history', {
          p_instrument: instrumentId,
          p_limit: limit,
        });
        if (rpcError) {
          log.error('Failed to fetch assessment history:', rpcError.message);
          return [];
        }
        return (data ?? []) as HistoryEntry[];
      } catch (err) {
        log.error('getHistory failed:', err);
        return [];
      }
    },
    [user?.id]
  );

  return {
    submitAssessment,
    getLatestAssessments,
    getHistory,
    isSubmitting,
    error,
    lastResult,
    // Re-export helpers
    getInstrumentDefinition,
    getAllInstruments,
  };
}
