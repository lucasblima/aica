/**
 * useAssessoriaEsportiva
 *
 * Hook to manage the coach's Assessoria Esportiva (Sports Advisory).
 * Fetches existing assessoria on mount and provides create/navigate helpers.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessoriaService, CreateAssessoriaInput } from '../services/assessoriaService';
import type { ConnectionSpace } from '@/modules/connections/types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useAssessoriaEsportiva');

interface UseAssessoriaEsportivaReturn {
  /** The existing assessoria space, or null if not created yet */
  assessoria: ConnectionSpace | null;
  /** Whether the hook is loading the assessoria */
  isLoading: boolean;
  /** Error from fetching or creating */
  error: Error | null;
  /** Whether the assessoria exists */
  hasAssessoria: boolean;
  /** Create a new assessoria */
  create: (input: CreateAssessoriaInput) => Promise<ConnectionSpace>;
  /** Navigate to the assessoria's Connections detail page */
  navigateToAssessoria: () => void;
  /** Refresh the assessoria data */
  refresh: () => Promise<void>;
}

export function useAssessoriaEsportiva(): UseAssessoriaEsportivaReturn {
  const navigate = useNavigate();
  const [assessoria, setAssessoria] = useState<ConnectionSpace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAssessoria = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await assessoriaService.getAssessoria();
      setAssessoria(result);
    } catch (err) {
      log.error('Error fetching assessoria:', err);
      setError(err instanceof Error ? err : new Error('Erro ao buscar assessoria'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessoria();
  }, [fetchAssessoria]);

  const create = useCallback(async (input: CreateAssessoriaInput): Promise<ConnectionSpace> => {
    try {
      setError(null);
      const space = await assessoriaService.createAssessoria(input);
      // Optimistic update: set local state immediately so UI reflects creation
      // without needing a re-fetch (avoids race condition where re-fetch
      // happens before data is fully committed)
      setAssessoria(space);
      log.debug('Assessoria created and state updated:', space.id);
      return space;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar assessoria');
      setError(error);
      throw error;
    }
  }, []);

  const navigateToAssessoria = useCallback(() => {
    if (assessoria) {
      navigate(`/connections/${assessoria.id}`);
    }
  }, [assessoria, navigate]);

  return {
    assessoria,
    isLoading,
    error,
    hasAssessoria: assessoria !== null,
    create,
    navigateToAssessoria,
    refresh: fetchAssessoria,
  };
}
