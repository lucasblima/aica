/**
 * FinanceContext — shared state for the Finance module.
 *
 * Provides period selection (year/month), statements, categories, and accounts
 * so that child components can consume them without prop-drilling.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { statementService } from '../services/statementService';
import { getCategories } from '../services/categoryService';
import type { FinanceCategoryRow } from '../services/categoryService';
import { getAccounts } from '../services/accountService';
import type { FinanceStatement, FinanceAccount } from '../types';

const log = createNamespacedLogger('FinanceContext');

// =====================================================
// Context Value Interface
// =====================================================

interface FinanceContextValue {
  // Period selection
  selectedYear: number;
  selectedMonth: number;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;

  // Statements
  statements: FinanceStatement[];
  statementsLoading: boolean;

  // Categories
  categories: FinanceCategoryRow[];
  categoriesLoading: boolean;

  // Accounts
  accounts: FinanceAccount[];
  accountsLoading: boolean;
  refreshAccounts: () => Promise<void>;

  // Refresh all data
  refreshAll: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

// =====================================================
// Provider
// =====================================================

interface FinanceProviderProps {
  userId: string;
  children: React.ReactNode;
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({ userId, children }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(true);

  const [categories, setCategories] = useState<FinanceCategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const loadStatements = useCallback(async () => {
    try {
      setStatementsLoading(true);
      const data = await statementService.getStatements(userId);
      setStatements(data);
    } catch (error) {
      log.error('Error loading statements:', error);
    } finally {
      setStatementsLoading(false);
    }
  }, [userId]);

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const data = await getCategories(userId);
      setCategories(data);
    } catch (error) {
      log.error('Error loading categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, [userId]);

  const loadAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const data = await getAccounts(userId);
      setAccounts(data);
    } catch (error) {
      log.error('Error loading accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  }, [userId]);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts();
  }, [loadAccounts]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStatements(), loadCategories(), loadAccounts()]);
  }, [loadStatements, loadCategories, loadAccounts]);

  // Initial data load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const value: FinanceContextValue = {
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    statements,
    statementsLoading,
    categories,
    categoriesLoading,
    accounts,
    accountsLoading,
    refreshAccounts,
    refreshAll,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

// =====================================================
// Hook
// =====================================================

export function useFinanceContext(): FinanceContextValue {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinanceContext must be used within a FinanceProvider');
  }
  return context;
}
