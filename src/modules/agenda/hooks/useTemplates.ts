/**
 * useTemplates Hook
 * Manages routine template listing and application.
 * Wraps templateService for React consumption with loading/error state.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  getSystemTemplates,
  applyTemplate as applyTemplateService,
  type RoutineTemplate,
} from '../services/templateService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useTemplates');

export interface UseTemplatesReturn {
  /** All available templates (system + future user templates). */
  templates: RoutineTemplate[];
  /** True while a template is being applied. */
  isApplying: boolean;
  /** Error message from the last failed apply, or null. */
  error: string | null;
  /** Apply a template, creating work_items. Returns the count of items created. */
  applyTemplate: (template: RoutineTemplate) => Promise<number>;
  /** Clear the current error. */
  clearError: () => void;
}

/**
 * Hook for managing routine templates.
 *
 * @param userId - The authenticated user's ID.
 */
export function useTemplates(userId: string): UseTemplatesReturn {
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = useMemo(() => getSystemTemplates(), []);

  const applyTemplate = useCallback(async (template: RoutineTemplate): Promise<number> => {
    if (!userId) {
      setError('Usuario não autenticado');
      return 0;
    }

    setIsApplying(true);
    setError(null);

    try {
      const count = await applyTemplateService(userId, template);
      log.debug('Template applied via hook:', { templateId: template.id, count });
      return count;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao aplicar template';
      log.error('Template apply failed:', { err, templateId: template.id });
      setError(message);
      return 0;
    } finally {
      setIsApplying(false);
    }
  }, [userId]);

  const clearError = useCallback(() => setError(null), []);

  return {
    templates,
    isApplying,
    error,
    applyTemplate,
    clearError,
  };
}
