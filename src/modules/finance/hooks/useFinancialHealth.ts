/**
 * useFinancialHealth Hook
 * Sprint 5 — Behavioral Economics Engine
 *
 * Computes and fetches FinHealth scores for the current user.
 * Orchestrates the 4-component score computation from transaction data.
 */

import { useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import {
  scoreSpend,
  scoreSave,
  scoreBorrow,
  scorePlan,
  computeFinHealthScore,
  assessBrazilianRatios,
  storeFinancialHealth,
  getLatestFinancialHealth,
  getFinancialHealthHistory,
} from '../services/financialHealthScoring';
import type { FinancialHealthResult } from '../services/financialHealthScoring';

const log = createNamespacedLogger('useFinancialHealth');

interface FinancialHealthInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  billsOnTimeRate: number;
  emergencyFundMonths: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  creditUtilization: number;
  hasInsurance: boolean;
  retirementSaving: boolean;
  hasEmergencyFund: boolean;
}

interface UseFinancialHealthReturn {
  result: FinancialHealthResult | null;
  history: { composite: number; computedAt: string }[];
  loading: boolean;
  error: string | null;
  compute: (input: FinancialHealthInput) => Promise<FinancialHealthResult | null>;
  refresh: () => Promise<void>;
}

export function useFinancialHealth(): UseFinancialHealthReturn {
  const [result, setResult] = useState<FinancialHealthResult | null>(null);
  const [history, setHistory] = useState<{ composite: number; computedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [latest, hist] = await Promise.all([
        getLatestFinancialHealth(),
        getFinancialHealthHistory(10),
      ]);

      setResult(latest);
      setHistory(hist);
    } catch (err) {
      log.error('Error fetching financial health:', err);
      setError('Erro ao carregar saude financeira');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const compute = useCallback(async (input: FinancialHealthInput): Promise<FinancialHealthResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const spend = scoreSpend(input.monthlyIncome, input.monthlyExpenses, input.billsOnTimeRate);
      const save = scoreSave(input.emergencyFundMonths, input.savingsRate);
      const borrow = scoreBorrow(input.debtToIncomeRatio, input.creditUtilization);
      const plan = scorePlan(input.hasInsurance, input.retirementSaving, input.hasEmergencyFund);

      const finHealth = computeFinHealthScore(spend, save, borrow, plan);
      const brazilianRatios = assessBrazilianRatios(
        input.debtToIncomeRatio,
        input.emergencyFundMonths,
        input.savingsRate
      );

      const healthResult: FinancialHealthResult = {
        finHealth,
        debtToIncomeRatio: input.debtToIncomeRatio,
        emergencyFundMonths: input.emergencyFundMonths,
        savingsRate: input.savingsRate,
        brazilianRatios,
        componentDetails: {
          monthlyIncome: input.monthlyIncome,
          monthlyExpenses: input.monthlyExpenses,
          billsOnTimeRate: input.billsOnTimeRate,
          creditUtilization: input.creditUtilization,
          hasInsurance: input.hasInsurance,
          retirementSaving: input.retirementSaving,
          hasEmergencyFund: input.hasEmergencyFund,
        },
        computedAt: new Date().toISOString(),
      };

      await storeFinancialHealth(healthResult);
      setResult(healthResult);

      // Refresh history
      const hist = await getFinancialHealthHistory(10);
      setHistory(hist);

      return healthResult;
    } catch (err) {
      log.error('Error computing financial health:', err);
      setError('Erro ao calcular saude financeira');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    result,
    history,
    loading,
    error,
    compute,
    refresh: fetchLatest,
  };
}

export default useFinancialHealth;
