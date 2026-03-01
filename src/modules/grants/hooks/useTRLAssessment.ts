/**
 * useTRLAssessment — Hook for Technology Readiness Level assessment
 * Sprint 6 — Grants Scientometric Matching (Issue #575)
 *
 * Manages TRL assessment state, computes levels, and persists to grant_projects.
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import type { TRLEvidence, TRLAssessment } from '../services/researcherScoring';
import { assessTRL, storeTRLAssessment } from '../services/researcherScoring';

const log = createNamespacedLogger('useTRLAssessment');

interface UseTRLAssessmentReturn {
  /** Current TRL assessment result */
  assessment: TRLAssessment | null;
  /** Current TRL level (0 if not assessed) */
  currentLevel: number;
  /** True while loading from database */
  isLoading: boolean;
  /** True while saving assessment */
  isSaving: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Assess a project's TRL and store the result */
  assessProject: (projectId: string, evidence: TRLEvidence[]) => Promise<void>;
  /** Load existing TRL data from a grant_projects record */
  loadProjectTRL: (projectId: string) => Promise<void>;
}

export function useTRLAssessment(): UseTRLAssessmentReturn {
  const [assessment, setAssessment] = useState<TRLAssessment | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assessProject = useCallback(async (projectId: string, evidence: TRLEvidence[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = assessTRL(evidence);
      setAssessment(result);
      setCurrentLevel(result.currentLevel);

      await storeTRLAssessment(projectId, result);
      log.info('TRL assessment stored', { projectId, level: result.currentLevel });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao avaliar TRL';
      log.error('Failed to assess TRL:', err);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const loadProjectTRL = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('grant_projects')
        .select('trl_level, trl_evidence')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      if (data?.trl_level != null && data?.trl_evidence) {
        const evidence = data.trl_evidence as TRLEvidence[];
        const result = assessTRL(evidence);
        setAssessment(result);
        setCurrentLevel(result.currentLevel);
      } else {
        setAssessment(null);
        setCurrentLevel(0);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar TRL';
      log.error('Failed to load project TRL:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    assessment,
    currentLevel,
    isLoading,
    isSaving,
    error,
    assessProject,
    loadProjectTRL,
  };
}
