/**
 * useWellbeingScores Hook
 * Fetch computed wellbeing dimension scores.
 * Sprint 3: Journey Validated Psychometric Well-Being
 */

import { useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabaseClient';

const log = createNamespacedLogger('useWellbeingScores');

export interface WellbeingScore {
  id: string;
  dimension: string;
  score: number;
  raw_score: number | null;
  methodology: string;
  computed_at: string;
}

/** Portuguese labels for wellbeing dimensions */
export const DIMENSION_LABELS: Record<string, string> = {
  positive_emotion: 'Emoção Positiva',
  engagement: 'Engajamento',
  relationships: 'Relacionamentos',
  meaning: 'Significado',
  accomplishment: 'Realização',
  life_satisfaction: 'Satisfação com a Vida',
  mindfulness: 'Atenção Plena',
  financial_wellbeing: 'Bem-estar Financeiro',
  affect_balance: 'Balanço Afetivo',
  valence: 'Valência Emocional',
  arousal: 'Nível de Ativação',
};

export function useWellbeingScores(dimension?: string) {
  const { user } = useAuth();
  const [scores, setScores] = useState<WellbeingScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchScores = useCallback(async () => {
    if (!user?.id) {
      setScores([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_wellbeing_scores', {
        p_dimension: dimension ?? null,
        p_limit: 30,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setScores((data ?? []) as WellbeingScore[]);
    } catch (err) {
      const e = err as Error;
      setError(e);
      setScores([]);
      log.error('Failed to fetch wellbeing scores:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dimension]);

  useEffect(() => {
    if (user?.id) {
      fetchScores();
    }
  }, [user?.id, fetchScores]);

  /**
   * Get the latest score for each dimension.
   */
  const latestByDimension: Record<string, WellbeingScore> = {};
  for (const score of scores) {
    if (!latestByDimension[score.dimension]) {
      latestByDimension[score.dimension] = score;
    }
  }

  return {
    scores,
    latestByDimension,
    isLoading,
    error,
    refresh: fetchScores,
  };
}
