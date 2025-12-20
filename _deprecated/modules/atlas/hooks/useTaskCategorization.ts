import { useState, useCallback } from 'react';
import { GeminiClient } from '@/lib/gemini';
import { useDebounce } from '@/hooks/useDebounce';
import { TaskCategory } from '../types/plane';

interface UseTaskCategorizationReturn {
  suggestedCategory: TaskCategory | null;
  isLoading: boolean;
  error: string | null;
  categorizeTask: (taskDescription: string) => Promise<void>;
  debouncedCategorize: (taskDescription: string) => void;
  clearSuggestion: () => void;
}

/**
 * Hook for intelligent task categorization using Gemini AI
 *
 * Automatically categorizes tasks into one of:
 * - Trabalho: Work-related tasks
 * - Pessoal: Personal tasks
 * - Saúde: Health-related tasks
 * - Educação: Education/learning tasks
 * - Finanças: Financial tasks
 * - Outros: Everything else
 *
 * @example
 * ```tsx
 * const {
 *   suggestedCategory,
 *   isLoading,
 *   debouncedCategorize
 * } = useTaskCategorization();
 *
 * // Call on input change
 * <input onChange={(e) => debouncedCategorize(e.target.value)} />
 * ```
 */
export function useTaskCategorization(): UseTaskCategorizationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<TaskCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categorizeTask = useCallback(async (taskDescription: string) => {
    // Don't categorize empty or very short descriptions
    if (!taskDescription || taskDescription.trim().length < 3) {
      setSuggestedCategory(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const geminiClient = GeminiClient.getInstance();

      const response = await geminiClient.call({
        action: 'categorize_task',
        payload: { taskDescription },
        model: 'fast' // Use fast model for quick categorization
      });

      // Validate the response is a valid category
      const category = response.result as string;
      const validCategories: TaskCategory[] = [
        'Trabalho',
        'Pessoal',
        'Saúde',
        'Educação',
        'Finanças',
        'Outros'
      ];

      if (validCategories.includes(category as TaskCategory)) {
        setSuggestedCategory(category as TaskCategory);
      } else {
        // Default to "Outros" if AI returns invalid category
        console.warn(`Invalid category "${category}" received, defaulting to "Outros"`);
        setSuggestedCategory('Outros');
      }
    } catch (err) {
      console.error('Error categorizing task:', err);
      setError('Não foi possível categorizar automaticamente');
      setSuggestedCategory(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced version to avoid excessive API calls while typing
  const debouncedCategorize = useDebounce(categorizeTask, 1000);

  const clearSuggestion = useCallback(() => {
    setSuggestedCategory(null);
    setError(null);
  }, []);

  return {
    suggestedCategory,
    isLoading,
    error,
    categorizeTask,
    debouncedCategorize,
    clearSuggestion
  };
}
