import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { FinanceBudget, BudgetSummaryRow } from '../types';

const log = createNamespacedLogger('BudgetService');

/**
 * Fetch all budgets for a given month/year.
 */
export async function getBudgets(
  userId: string,
  month: number,
  year: number
): Promise<FinanceBudget[]> {
  if (month < 1 || month > 12) throw new Error('Mes invalido (1-12)');
  if (year < 2020 || year > 2100) throw new Error('Ano invalido');

  try {
    const { data, error } = await supabase
      .from('finance_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .order('budget_amount', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching budgets:', error);
    throw error;
  }
}

/**
 * Insert or update a monthly category budget via RPC.
 */
export async function upsertBudget(
  userId: string,
  category: string,
  amount: number,
  month: number,
  year: number
): Promise<FinanceBudget> {
  if (month < 1 || month > 12) throw new Error('Mes invalido (1-12)');
  if (year < 2020 || year > 2100) throw new Error('Ano invalido');

  try {
    const { data, error } = await supabase.rpc('upsert_budget', {
      p_user_id: userId,
      p_category: category,
      p_amount: amount,
      p_month: month,
      p_year: year,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error upserting budget:', error);
    throw error;
  }
}

/**
 * Get budget vs actual spending summary for a given month/year via RPC.
 */
export async function getBudgetSummary(
  userId: string,
  month: number,
  year: number
): Promise<BudgetSummaryRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_budget_summary', {
      p_user_id: userId,
      p_month: month,
      p_year: year,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching budget summary:', error);
    throw error;
  }
}

/**
 * Delete a budget row.
 */
export async function deleteBudget(budgetId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('finance_budgets')
      .delete()
      .eq('id', budgetId);

    if (error) throw error;
  } catch (error) {
    log.error('Error deleting budget:', error);
    throw error;
  }
}
