/**
 * AI Cost Analytics Service
 *
 * Service for fetching and analyzing AI usage costs from the `usage_logs` table.
 * All queries use direct Supabase client queries (RLS enforces user-scoped data).
 */

import { supabase } from './supabaseClient';
import type {
  CostByOperation,
  DailyCostSummary,
  ModelCostBreakdown,
  OperationCostBreakdown,
  TopExpensiveOperation,
  MonthlyCostSummary,
  AIUsageRecord
} from '../types/aiCost';
import { getActionCreditCost } from '../types/aiCost';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AICostAnalyticsService');

// =====================================================
// Usage Logs Queries
// =====================================================

/**
 * Get aggregated costs by action and model for date range
 */
export async function getUserAICosts(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CostByOperation[]> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('action, model_used, tokens_input, tokens_output, cost_brl, credits_used')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching usage_logs:', { error });
    throw error;
  }

  // Aggregate by action + model
  const groupMap = new Map<string, { requests: number; tokens: number; cost: number; credits: number }>();

  (data || []).forEach((record) => {
    const key = `${record.action}::${record.model_used}`;
    const existing = groupMap.get(key) || { requests: 0, tokens: 0, cost: 0, credits: 0 };
    groupMap.set(key, {
      requests: existing.requests + 1,
      tokens: existing.tokens + (record.tokens_input || 0) + (record.tokens_output || 0),
      cost: existing.cost + Number(record.cost_brl || 0),
      credits: existing.credits + Number(record.credits_used || getActionCreditCost(record.action))
    });
  });

  return Array.from(groupMap.entries()).map(([key, stats]) => {
    const [action, model_used] = key.split('::');
    return {
      action,
      model: model_used,
      total_requests: stats.requests,
      total_tokens: stats.tokens,
      total_cost_brl: stats.cost,
      total_credits: stats.credits
    };
  });
}

/**
 * Get daily cost breakdown for last N days
 */
export async function getDailyAICosts(
  userId: string,
  days: number = 30
): Promise<DailyCostSummary[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('created_at, cost_brl, credits_used, action')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching daily costs:', { error });
    throw error;
  }

  // Aggregate by date
  const dayMap = new Map<string, { cost: number; credits: number; requests: number }>();

  (data || []).forEach((record) => {
    const date = record.created_at.substring(0, 10); // YYYY-MM-DD
    const existing = dayMap.get(date) || { cost: 0, credits: 0, requests: 0 };
    dayMap.set(date, {
      cost: existing.cost + Number(record.cost_brl || 0),
      credits: existing.credits + Number(record.credits_used || getActionCreditCost(record.action)),
      requests: existing.requests + 1
    });
  });

  return Array.from(dayMap.entries())
    .map(([date, stats]) => ({
      date,
      total_cost_brl: stats.cost,
      total_credits: stats.credits,
      total_requests: stats.requests
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get current month total cost
 */
export async function getCurrentMonthCost(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('cost_brl')
    .eq('user_id', userId)
    .gte('created_at', monthStart);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching current month cost:', { error });
    throw error;
  }

  return (data || []).reduce((sum, record) => sum + Number(record.cost_brl || 0), 0);
}

/**
 * Get total credits used in the current month
 */
export async function getMonthlyCreditsUsed(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('credits_used, action')
    .eq('user_id', userId)
    .gte('created_at', monthStart);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching monthly credits:', { error });
    throw error;
  }

  return (data || []).reduce(
    (sum, record) => sum + Number(record.credits_used || getActionCreditCost(record.action)),
    0
  );
}

// =====================================================
// Client-Side Aggregations
// =====================================================

/**
 * Get cost breakdown by AI model
 */
export async function getModelCostBreakdown(
  userId: string,
  days: number = 30
): Promise<ModelCostBreakdown[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('model_used, cost_brl, credits_used, action')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching model costs:', { error });
    throw error;
  }

  // Aggregate by model
  const modelMap = new Map<string, { total_cost: number; total_credits: number; count: number }>();
  let totalCredits = 0;

  (data || []).forEach((record) => {
    const cost = Number(record.cost_brl || 0);
    const credits = Number(record.credits_used || getActionCreditCost(record.action));
    totalCredits += credits;

    const existing = modelMap.get(record.model_used) || { total_cost: 0, total_credits: 0, count: 0 };
    modelMap.set(record.model_used, {
      total_cost: existing.total_cost + cost,
      total_credits: existing.total_credits + credits,
      count: existing.count + 1
    });
  });

  return Array.from(modelMap.entries())
    .map(([model, stats]) => ({
      ai_model: model,
      total_requests: stats.count,
      total_cost_brl: stats.total_cost,
      total_credits: stats.total_credits,
      percentage: totalCredits > 0 ? (stats.total_credits / totalCredits) * 100 : 0
    }))
    .sort((a, b) => b.total_credits - a.total_credits);
}

/**
 * Get cost breakdown by action type
 */
export async function getOperationCostBreakdown(
  userId: string,
  days: number = 30
): Promise<OperationCostBreakdown[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('action, cost_brl, credits_used')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching operation costs:', { error });
    throw error;
  }

  // Aggregate by action
  const operationMap = new Map<string, { total_cost: number; total_credits: number; count: number }>();
  let totalCredits = 0;

  (data || []).forEach((record) => {
    const cost = Number(record.cost_brl || 0);
    const credits = Number(record.credits_used || getActionCreditCost(record.action));
    totalCredits += credits;

    const existing = operationMap.get(record.action) || { total_cost: 0, total_credits: 0, count: 0 };
    operationMap.set(record.action, {
      total_cost: existing.total_cost + cost,
      total_credits: existing.total_credits + credits,
      count: existing.count + 1
    });
  });

  return Array.from(operationMap.entries())
    .map(([operation, stats]) => ({
      operation_type: operation,
      total_cost_brl: stats.total_cost,
      total_credits: stats.total_credits,
      count: stats.count,
      percentage: totalCredits > 0 ? (stats.total_credits / totalCredits) * 100 : 0
    }))
    .sort((a, b) => b.total_credits - a.total_credits);
}

/**
 * Get top N most expensive operations
 */
export async function getTopExpensiveOperations(
  userId: string,
  limit: number = 5
): Promise<TopExpensiveOperation[]> {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('id, action, model_used, cost_brl, credits_used, created_at, module')
    .eq('user_id', userId)
    .order('credits_used', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching top operations:', { error });
    throw error;
  }

  return (data || []) as TopExpensiveOperation[];
}

/**
 * Get monthly cost summary with budget and credit tracking
 */
export async function getMonthlyCostSummary(
  userId: string,
  budget: number,
  monthlyCredits: number = 500,
  planName: string = 'Free'
): Promise<MonthlyCostSummary> {
  const [currentCost, creditsUsed] = await Promise.all([
    getCurrentMonthCost(userId),
    getMonthlyCreditsUsed(userId)
  ]);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = daysInMonth - daysElapsed;

  const dailyBurnRate = daysElapsed > 0 ? currentCost / daysElapsed : 0;
  const projectedMonthEndCost = currentCost + dailyBurnRate * daysRemaining;

  return {
    current_month_cost: currentCost,
    budget,
    percentage_used: budget > 0 ? (currentCost / budget) * 100 : 0,
    days_remaining: daysRemaining,
    projected_month_end_cost: projectedMonthEndCost,
    is_over_budget: currentCost > budget,
    credits_used: creditsUsed,
    credits_total: monthlyCredits,
    credits_percentage: monthlyCredits > 0 ? (creditsUsed / monthlyCredits) * 100 : 0,
    plan_name: planName
  };
}

/**
 * Get all AI usage records for a user (for detailed analysis)
 */
export async function getAllAIUsageRecords(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<AIUsageRecord[]> {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching usage records:', { error });
    throw error;
  }

  return (data || []) as AIUsageRecord[];
}

/**
 * Get cost breakdown by module
 */
export async function getModuleCostBreakdown(
  userId: string,
  days: number = 30
): Promise<Array<{ module: string; total_cost_brl: number; count: number }>> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('module, cost_brl')
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .not('module', 'is', null);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching module costs:', { error });
    throw error;
  }

  // Aggregate by module
  const moduleMap = new Map<string, { total_cost: number; count: number }>();

  (data || []).forEach((record) => {
    if (!record.module) return;

    const cost = Number(record.cost_brl || 0);
    const existing = moduleMap.get(record.module) || { total_cost: 0, count: 0 };
    moduleMap.set(record.module, {
      total_cost: existing.total_cost + cost,
      count: existing.count + 1
    });
  });

  return Array.from(moduleMap.entries())
    .map(([mod, stats]) => ({
      module: mod,
      total_cost_brl: stats.total_cost,
      count: stats.count
    }))
    .sort((a, b) => b.total_cost_brl - a.total_cost_brl);
}

/**
 * Get total requests count for period
 */
export async function getTotalRequestsCount(
  userId: string,
  days: number = 30
): Promise<number> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    log.error('[aiCostAnalytics] Error counting requests:', { error });
    return 0;
  }

  return count || 0;
}

/**
 * Get average cost per request
 */
export async function getAverageCostPerRequest(
  userId: string,
  days: number = 30
): Promise<number> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('usage_logs')
    .select('cost_brl')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const totalCost = data.reduce((sum, record) => sum + Number(record.cost_brl || 0), 0);
  return totalCost / data.length;
}
