/**
 * useNarrativeAnalysis Hook
 * Sprint 6 — Studio Neuroscience-Informed Production
 *
 * Manages narrative tension analysis state for podcast episodes.
 * Computes Peak-End Rule scores, hook strength, and duration optimality.
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import type { NarrativeMoment, NarrativeAnalysis } from '../services/guestScoring';
import {
  analyzeNarrativeArc,
  storeNarrativeAnalysis,
} from '../services/guestScoring';

const log = createNamespacedLogger('useNarrativeAnalysis');

export interface UseNarrativeAnalysisResult {
  /** Current narrative analysis */
  analysis: NarrativeAnalysis | null;
  /** Whether analysis is in progress */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Analyze an episode's narrative arc and store results */
  analyzeEpisode: (
    episodeId: string,
    moments: NarrativeMoment[],
    durationMinutes: number
  ) => Promise<NarrativeAnalysis>;
  /** Fetch stored analysis for an episode */
  fetchAnalysis: (episodeId: string) => Promise<void>;
}

export function useNarrativeAnalysis(): UseNarrativeAnalysisResult {
  const [analysis, setAnalysis] = useState<NarrativeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeEpisode = useCallback(async (
    episodeId: string,
    moments: NarrativeMoment[],
    durationMinutes: number
  ): Promise<NarrativeAnalysis> => {
    setLoading(true);
    setError(null);
    try {
      const result = analyzeNarrativeArc(moments, durationMinutes);
      await storeNarrativeAnalysis(episodeId, result);
      setAnalysis(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar narrativa';
      log.error('analyzeEpisode failed:', err);
      setError(msg);
      // Return computed result even if storage fails
      const result = analyzeNarrativeArc(moments, durationMinutes);
      setAnalysis(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async (episodeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('podcast_episodes')
        .select('narrative_tension_score, peak_end_moments')
        .eq('id', episodeId)
        .single();

      if (fetchError) throw fetchError;

      if (data?.narrative_tension_score != null && data?.peak_end_moments) {
        const stored = data.peak_end_moments as {
          arc?: NarrativeMoment[];
          peakEndScore?: number;
          hookStrength?: number;
          suggestions?: string[];
        };

        const arc = stored.arc || [];
        const peakMoment = arc.length > 0
          ? arc.reduce((best, m) => m.tension > (best?.tension || 0) ? m : best, arc[0])
          : null;
        const endMoment = arc.length > 0 ? arc[arc.length - 1] : null;

        setAnalysis({
          tensionScore: data.narrative_tension_score,
          peakMoment,
          endMoment,
          arc,
          peakEndScore: stored.peakEndScore ?? 0,
          hookStrength: stored.hookStrength ?? 0,
          durationOptimality: 0, // Not stored, needs recomputation
          suggestions: stored.suggestions ?? [],
        });
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar análise';
      log.error('fetchAnalysis failed:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analysis,
    loading,
    error,
    analyzeEpisode,
    fetchAnalysis,
  };
}
