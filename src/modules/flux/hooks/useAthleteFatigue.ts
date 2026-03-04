/**
 * useAthleteFatigue Hook
 *
 * Calls the `assess-athlete-fatigue` Edge Function to get a comprehensive
 * fatigue/readiness assessment for an athlete. Auto-fetches on mount when
 * athleteId is provided.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useAthleteFatigue');

export interface FatigueAssessment {
  readinessScore: number; // 0-100
  fatigueRisk: 'low' | 'moderate' | 'high' | 'overtraining';
  ctl: number;
  atl: number;
  tsb: number;
  acwr: number;
  recommendation: string;
  suggestedIntensity: 'hard' | 'moderate' | 'easy' | 'recovery' | 'rest';
}

export interface UseAthleteFatigueOptions {
  athleteId: string;
}

export interface UseAthleteFatigueReturn {
  assessment: FatigueAssessment | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAthleteFatigue({ athleteId }: UseAthleteFatigueOptions): UseAthleteFatigueReturn {
  const [assessment, setAssessment] = useState<FatigueAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) return;
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('assess-athlete-fatigue', {
        body: { athleteId },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        const result: FatigueAssessment = {
          readinessScore: data.readinessScore,
          fatigueRisk: data.fatigueRisk,
          ctl: data.ctl,
          atl: data.atl,
          tsb: data.tsb,
          acwr: data.acwr,
          recommendation: data.recommendation,
          suggestedIntensity: data.suggestedIntensity,
        };
        setAssessment(result);
        log.info('Fatigue assessment fetched:', {
          athleteId,
          readinessScore: result.readinessScore,
          fatigueRisk: result.fatigueRisk,
        });
      } else {
        setAssessment(null);
        log.warn('Unexpected response from assess-athlete-fatigue:', data);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Erro ao avaliar fadiga do atleta');
      setError(e);
      log.error('Error assessing athlete fatigue:', err);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  // Auto-fetch on mount when athleteId is available
  useEffect(() => {
    if (athleteId) {
      refresh();
    }
  }, [athleteId, refresh]);

  return {
    assessment,
    isLoading,
    error,
    refresh,
  };
}
