/**
 * AI Cost Analytics Service
 *
 * Service for fetching and analyzing AI usage costs from the database.
 * Uses existing database functions and performs client-side aggregations.
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
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AICostAnalyticsService');


// =====================================================
// Database RPC Functions
// =====================================================

/**
 * Get aggregated costs by operation and model for date range
 */
export async function getUserAICosts(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CostByOperation[]> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  const { data, error } = await supabase.rpc('get_user_ai_costs', {
    p_user_id: userId,
    p_start_date: start,
    p_end_date: end
  });

  if (error) {
    log.error('[aiCostAnalytics] Error calling get_user_ai_costs:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Get daily cost breakdown for last N days
 */
export async function getDailyAICosts(
  userId: string,
  days: number = 30
): Promise<DailyCostSummary[]> {
  const { data, error } = await supabase.rpc('get_daily_ai_costs', {
    p_user_id: userId,
    p_days: days
  });

  if (error) {
    log.error('[aiCostAnalytics] Error calling get_daily_ai_costs:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Get current month total cost
 */
export async function getCurrentMonthCost(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_current_month_cost', {
    p_user_id: userId
  });

  if (error) {
    log.error('[aiCostAnalytics] Error calling get_current_month_cost:', { error: error });
    throw error;
  }

  return typeof data === 'number' ? data : 0;
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
    .from('ai_usage_analytics')
    .select('ai_model, total_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching model costs:', { error: error });
    throw error;
  }

  // Aggregate by model
  const modelMap = new Map<string, { total_cost: number; count: number }>();
  let totalCost = 0;

  (data || []).forEach((record) => {
    const cost = Number(record.total_cost_usd);
    totalCost += cost;

    const existing = modelMap.get(record.ai_model) || { total_cost: 0, count: 0 };
    modelMap.set(record.ai_model, {
      total_cost: existing.total_cost + cost,
      count: existing.count + 1
    });
  });

  // Convert to array and calculate percentages
  return Array.from(modelMap.entries())
    .map(([model, stats]) => ({
      ai_model: model,
      total_requests: stats.count,
      total_cost_usd: stats.total_cost,
      percentage: totalCost > 0 ? (stats.total_cost / totalCost) * 100 : 0
    }))
    .sort((a, b) => b.total_cost_usd - a.total_cost_usd);
}

/**
 * Get cost breakdown by operation type
 */
export async function getOperationCostBreakdown(
  userId: string,
  days: number = 30
): Promise<OperationCostBreakdown[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('ai_usage_analytics')
    .select('operation_type, total_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching operation costs:', { error: error });
    throw error;
  }

  // Aggregate by operation
  const operationMap = new Map<string, { total_cost: number; count: number }>();
  let totalCost = 0;

  (data || []).forEach((record) => {
    const cost = Number(record.total_cost_usd);
    totalCost += cost;

    const existing = operationMap.get(record.operation_type) || { total_cost: 0, count: 0 };
    operationMap.set(record.operation_type, {
      total_cost: existing.total_cost + cost,
      count: existing.count + 1
    });
  });

  // Convert to array and calculate percentages
  return Array.from(operationMap.entries())
    .map(([operation, stats]) => ({
      operation_type: operation as any,
      total_cost_usd: stats.total_cost,
      count: stats.count,
      percentage: totalCost > 0 ? (stats.total_cost / totalCost) * 100 : 0
    }))
    .sort((a, b) => b.total_cost_usd - a.total_cost_usd);
}

/**
 * Get top N most expensive operations
 */
export async function getTopExpensiveOperations(
  userId: string,
  limit: number = 5
): Promise<TopExpensiveOperation[]> {
  const { data, error } = await supabase
    .from('ai_usage_analytics')
    .select('id, operation_type, ai_model, total_cost_usd, created_at, module_type, request_metadata')
    .eq('user_id', userId)
    .order('total_cost_usd', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching top operations:', { error: error });
    throw error;
  }

  return (data || []) as TopExpensiveOperation[];
}

/**
 * Get monthly cost summary with budget tracking
 */
export async function getMonthlyCostSummary(
  userId: string,
  budget: number
): Promise<MonthlyCostSummary> {
  const currentCost = await getCurrentMonthCost(userId);

  // Calculate days in month and days remaining
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = daysInMonth - daysElapsed;

  // Project month-end cost based on current burn rate
  const dailyBurnRate = daysElapsed > 0 ? currentCost / daysElapsed : 0;
  const projectedMonthEndCost = currentCost + dailyBurnRate * daysRemaining;

  return {
    current_month_cost: currentCost,
    budget,
    percentage_used: budget > 0 ? (currentCost / budget) * 100 : 0,
    days_remaining: daysRemaining,
    projected_month_end_cost: projectedMonthEndCost,
    is_over_budget: currentCost > budget
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
    .from('ai_usage_analytics')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching usage records:', { error: error });
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
): Promise<Array<{ module_type: string; total_cost_usd: number; count: number }>> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('ai_usage_analytics')
    .select('module_type, total_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .not('module_type', 'is', null);

  if (error) {
    log.error('[aiCostAnalytics] Error fetching module costs:', { error: error });
    throw error;
  }

  // Aggregate by module
  const moduleMap = new Map<string, { total_cost: number; count: number }>();

  (data || []).forEach((record) => {
    if (!record.module_type) return;

    const cost = Number(record.total_cost_usd);
    const existing = moduleMap.get(record.module_type) || { total_cost: 0, count: 0 };
    moduleMap.set(record.module_type, {
      total_cost: existing.total_cost + cost,
      count: existing.count + 1
    });
  });

  return Array.from(moduleMap.entries())
    .map(([module, stats]) => ({
      module_type: module,
      total_cost_usd: stats.total_cost,
      count: stats.count
    }))
    .sort((a, b) => b.total_cost_usd - a.total_cost_usd);
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
    .from('ai_usage_analytics')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error) {
    log.error('[aiCostAnalytics] Error counting requests:', { error: error });
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
    .from('ai_usage_analytics')
    .select('total_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const totalCost = data.reduce((sum, record) => sum + Number(record.total_cost_usd), 0);
  return totalCost / data.length;
}
