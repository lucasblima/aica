/**
 * Hook for email categorization state and actions.
 *
 * Manages AI-powered email categorization, category filtering, and counts.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { hasGmailScope } from '@/services/googleCalendarTokenService';
import {
  categorizeInbox,
  getCategorizedEmails,
} from '../services/emailIntelligenceService';
import type { EmailCategory, CategorizedEmail } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useEmailCategories');

interface UseEmailCategoriesReturn {
  categories: Map<string, CategorizedEmail>;
  loading: boolean;
  categorizing: boolean;
  error: string | null;
  selectedCategory: EmailCategory | null;
  categorize: () => Promise<void>;
  fetchCategorized: (category?: EmailCategory) => Promise<void>;
  setSelectedCategory: (category: EmailCategory | null) => void;
  getCounts: () => Record<EmailCategory, number>;
  hasCategorized: boolean;
  lastCategorizedCount: number | null;
}

const ALL_CATEGORIES: EmailCategory[] = [
  'actionable', 'informational', 'newsletter', 'receipt', 'personal', 'notification',
];

export function useEmailCategories(): UseEmailCategoriesReturn {
  const [categories, setCategories] = useState<Map<string, CategorizedEmail>>(new Map());
  const [loading, setLoading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | null>(null);
  const [lastCategorizedCount, setLastCategorizedCount] = useState<number | null>(null);

  const fetchCategorized = useCallback(async (category?: EmailCategory) => {
    const hasScope = await hasGmailScope();
    if (!hasScope) return;

    setLoading(true);
    setError(null);
    try {
      const results = await getCategorizedEmails(category, 50);
      const map = new Map<string, CategorizedEmail>();
      for (const item of results) {
        map.set(item.message_id, item);
      }
      setCategories(map);
    } catch (err) {
      log.error('[fetchCategorized]', { error: err });
      setError('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load existing categorizations on mount
  useEffect(() => {
    fetchCategorized();
  }, [fetchCategorized]);

  const categorize = useCallback(async () => {
    console.log('[useEmailCategories] categorize CALLED');
    setCategorizing(true);
    setError(null);
    setLastCategorizedCount(null);
    try {
      const result = await categorizeInbox(20);
      if (result.error) {
        setError(result.error);
      } else {
        setLastCategorizedCount(result.categorized);
        // Refresh from DB after categorization
        await fetchCategorized(selectedCategory ?? undefined);
      }
    } catch (err) {
      log.error('[categorize]', { error: err });
      setError('Erro ao categorizar emails');
    } finally {
      setCategorizing(false);
    }
  }, [fetchCategorized, selectedCategory]);

  const getCounts = useCallback((): Record<EmailCategory, number> => {
    const counts = {} as Record<EmailCategory, number>;
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = 0;
    }
    for (const item of categories.values()) {
      if (item.category in counts) {
        counts[item.category]++;
      }
    }
    return counts;
  }, [categories]);

  const hasCategorized = useMemo(() => categories.size > 0, [categories]);

  return {
    categories,
    loading,
    categorizing,
    error,
    selectedCategory,
    categorize,
    fetchCategorized,
    setSelectedCategory,
    getCounts,
    hasCategorized,
    lastCategorizedCount,
  };
}
