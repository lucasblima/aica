/**
 * useFinanceStatements Hook
 *
 * Manages finance statements data fetching and state.
 */

import { useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { statementService } from '../services/statementService';

const log = createNamespacedLogger('useFinanceStatements');
import type { FinanceStatement } from '../types';

interface UseFinanceStatementsReturn {
  statements: FinanceStatement[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteStatement: (id: string) => Promise<void>;
  getStatement: (id: string) => Promise<FinanceStatement | null>;
}

export function useFinanceStatements(userId: string): UseFinanceStatementsReturn {
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatements = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await statementService.getStatements(userId);
      setStatements(data);
    } catch (err) {
      log.error('Error fetching statements:', err);
      setError('Erro ao carregar extratos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const deleteStatement = useCallback(async (id: string) => {
    try {
      await statementService.deleteStatement(id);
      setStatements((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      log.error('Error deleting statement:', err);
      throw new Error('Erro ao deletar extrato');
    }
  }, []);

  const getStatement = useCallback(async (id: string) => {
    return statementService.getStatement(id);
  }, []);

  return {
    statements,
    loading,
    error,
    refresh: fetchStatements,
    deleteStatement,
    getStatement,
  };
}

export default useFinanceStatements;
