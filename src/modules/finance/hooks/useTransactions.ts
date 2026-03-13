/**
 * useTransactions Hook
 *
 * Manages finance transactions with filtering and pagination.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '../../../services/supabaseClient';

const log = createNamespacedLogger('useTransactions');
import type { FinanceTransaction, TransactionFilters } from '../types';

const PAGE_SIZE = 50;

interface UseTransactionsReturn {
  transactions: FinanceTransaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateTransaction: (id: string, data: Partial<FinanceTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export function useTransactions(
  userId: string,
  externalFilters?: TransactionFilters
): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [internalFilters, setInternalFilters] = useState<TransactionFilters>(externalFilters || {});

  // Use external filters when provided, otherwise use internal state
  const filters = externalFilters ?? internalFilters;

  // Stable serialized key so fetchTransactions reacts to filter changes
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchTransactions = useCallback(
    async (pageNum: number, reset: boolean = false) => {
      if (!userId) return;

      // Parse the stable filters from the serialized key
      const currentFilters: TransactionFilters = JSON.parse(filtersKey);

      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('finance_transactions')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('transaction_date', { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        // Apply filters
        if (currentFilters.startDate) {
          query = query.gte('transaction_date', currentFilters.startDate);
        }
        if (currentFilters.endDate) {
          query = query.lte('transaction_date', currentFilters.endDate);
        }
        if (currentFilters.category) {
          query = query.eq('category', currentFilters.category);
        }
        if (currentFilters.type) {
          query = query.eq('type', currentFilters.type);
        }
        if (currentFilters.minAmount !== undefined) {
          query = query.gte('amount', currentFilters.minAmount);
        }
        if (currentFilters.maxAmount !== undefined) {
          query = query.lte('amount', currentFilters.maxAmount);
        }
        if (currentFilters.statementId) {
          query = query.eq('statement_id', currentFilters.statementId);
        }
        if (currentFilters.accountId) {
          query = query.eq('account_id', currentFilters.accountId);
        }
        if (currentFilters.searchTerm) {
          query = query.ilike('description', `%${currentFilters.searchTerm}%`);
        }

        const { data, error: queryError, count } = await query;

        if (queryError) throw queryError;

        const newTransactions = (data || []) as FinanceTransaction[];

        if (reset) {
          setTransactions(newTransactions);
        } else {
          setTransactions((prev) => [...prev, ...newTransactions]);
        }

        setTotalCount(count || 0);
        setHasMore(newTransactions.length === PAGE_SIZE);
        setPage(pageNum);
      } catch (err) {
        log.error('Error fetching transactions:', err);
        setError('Erro ao carregar transacoes');
      } finally {
        setLoading(false);
      }
    },
    [userId, filtersKey]
  );

  // Initial fetch and refetch on filter change
  useEffect(() => {
    setPage(0);
    fetchTransactions(0, true);
  }, [fetchTransactions]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchTransactions(page + 1, false);
  }, [fetchTransactions, page, hasMore, loading]);

  const refresh = useCallback(async () => {
    setPage(0);
    await fetchTransactions(0, true);
  }, [fetchTransactions]);

  const updateTransaction = useCallback(
    async (id: string, data: Partial<FinanceTransaction>) => {
      try {
        const { error: updateError } = await supabase
          .from('finance_transactions')
          .update(data)
          .eq('id', id);

        if (updateError) throw updateError;

        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...data } : t))
        );
      } catch (err) {
        log.error('Error updating transaction:', err);
        throw new Error('Erro ao atualizar transacao');
      }
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      log.error('Error deleting transaction:', err);
      throw new Error('Erro ao deletar transacao');
    }
  }, []);

  // Update filters handler (for callers that use setFilters directly)
  const handleSetFilters = useCallback((newFilters: TransactionFilters) => {
    setInternalFilters(newFilters);
  }, []);

  return {
    transactions,
    loading,
    error,
    hasMore,
    totalCount,
    filters,
    setFilters: handleSetFilters,
    loadMore,
    refresh,
    updateTransaction,
    deleteTransaction,
  };
}

export default useTransactions;
