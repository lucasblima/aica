import { supabase } from '../../../services/supabaseClient';
import type {
    FinanceTransaction,
    FinanceSummary,
    BurnRateData,
    CategoryBreakdown
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('FinanceService');

// =====================================================
// Finance Service - Privacy-First Financial Analytics
// =====================================================

/**
 * Get all-time financial summary (todas as transações disponíveis)
 */
export async function getAllTimeSummary(userId: string): Promise<FinanceSummary> {
    try {
        // Fetch ALL transactions for user
        const { data: transactions, error: txError } = await supabase
            .from('finance_transactions')
            .select('type, amount')
            .eq('user_id', userId);

        if (txError) throw txError;

        // Fetch the most recent statement to get the correct closing balance
        const { data: statements, error: stmtError } = await supabase
            .from('finance_statements')
            .select('closing_balance, statement_period_end')
            .eq('user_id', userId)
            .eq('processing_status', 'completed')
            .order('statement_period_end', { ascending: false })
            .limit(1);

        if (stmtError) throw stmtError;

        const txList = transactions || [];

        // Calculate summary
        const totalIncome = txList
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpenses = txList
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Use closing_balance from the most recent statement as the current balance
        // This is the correct balance that accounts for opening_balance + income - expenses
        const currentBalance = statements && statements.length > 0
            ? Number(statements[0].closing_balance)
            : totalIncome - totalExpenses; // Fallback if no statements exist

        return {
            currentBalance,
            totalIncome,
            totalExpenses,
            transactionCount: txList.length
        };
    } catch (error) {
        log.error('Error fetching all-time summary:', error);
        throw error;
    }
}

/**
 * Get current month's financial summary
 */
export async function getCurrentMonthSummary(userId: string): Promise<FinanceSummary> {
    try {
        // Get current month date range
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const firstDayStr = firstDay.toISOString().split('T')[0];
        const lastDayStr = lastDay.toISOString().split('T')[0];

        // Fetch transactions for current month
        const { data, error } = await supabase
            .from('finance_transactions')
            .select('*')
            .eq('user_id', userId)
            .gte('transaction_date', firstDayStr)
            .lte('transaction_date', lastDayStr);

        if (error) throw error;

        // Fetch statement for this month to get closing_balance
        const { data: stmts } = await supabase
            .from('finance_statements')
            .select('closing_balance')
            .eq('user_id', userId)
            .eq('processing_status', 'completed')
            .lte('statement_period_start', lastDayStr)
            .gte('statement_period_end', firstDayStr)
            .order('statement_period_end', { ascending: false })
            .limit(1);

        const transactions = data || [];

        // Calculate summary
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Use closing_balance from statement when available
        const currentBalance = stmts && stmts.length > 0
            ? Number(stmts[0].closing_balance)
            : totalIncome - totalExpenses;

        return {
            currentBalance,
            totalIncome,
            totalExpenses,
            transactionCount: transactions.length
        };
    } catch (error) {
        log.error('Error fetching current month summary:', error);
        throw error;
    }
}

/**
 * Calculate burn rate (average monthly expenses over last 3 months)
 */
export async function getBurnRate(userId: string): Promise<BurnRateData> {
    try {
        // Get last 3 months date range
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

        // Fetch expenses for last 3 months
        const { data, error } = await supabase
            .from('finance_transactions')
            .select('amount, transaction_date')
            .eq('user_id', userId)
            .eq('type', 'expense')
            .gte('transaction_date', threeMonthsAgoStr);

        if (error) throw error;

        const transactions = data || [];

        if (transactions.length === 0) {
            return {
                averageMonthlyExpense: 0,
                trend: 'stable',
                percentageChange: 0
            };
        }

        // Group by month
        const monthlyExpenses: { [key: string]: number } = {};

        transactions.forEach(t => {
            // Parse date string directly to avoid timezone shift
            const [y, m] = t.transaction_date.split('-');
            const monthKey = `${y}-${m}`;

            if (!monthlyExpenses[monthKey]) {
                monthlyExpenses[monthKey] = 0;
            }
            monthlyExpenses[monthKey] += Number(t.amount);
        });

        const months = Object.keys(monthlyExpenses).sort();
        const expenses = months.map(m => monthlyExpenses[m]);

        // Calculate average
        const averageMonthlyExpense = expenses.reduce((sum, exp) => sum + exp, 0) / expenses.length;

        // Calculate trend
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        let percentageChange = 0;

        if (expenses.length >= 2) {
            const lastMonth = expenses[expenses.length - 1];
            const previousMonth = expenses[expenses.length - 2];

            if (previousMonth === 0) {
                percentageChange = lastMonth > 0 ? 100 : 0;
            } else {
                percentageChange = ((lastMonth - previousMonth) / previousMonth) * 100;
            }

            if (percentageChange > 5) {
                trend = 'increasing';
            } else if (percentageChange < -5) {
                trend = 'decreasing';
            }
        }

        return {
            averageMonthlyExpense,
            trend,
            percentageChange
        };
    } catch (error) {
        log.error('Error calculating burn rate:', error);
        throw error;
    }
}

/**
 * Get category breakdown for all time
 */
export async function getAllTimeCategoryBreakdown(userId: string): Promise<CategoryBreakdown[]> {
    try {
        // Fetch ALL expense transactions
        const { data, error } = await supabase
            .from('finance_transactions')
            .select('category, amount, type')
            .eq('user_id', userId)
            .eq('type', 'expense'); // Only expenses for breakdown

        if (error) throw error;

        const transactions = data || [];

        // Group by category
        const categoryMap: { [key: string]: { amount: number; count: number } } = {};
        let totalAmount = 0;

        transactions.forEach(t => {
            const amount = Number(t.amount);
            if (!categoryMap[t.category]) {
                categoryMap[t.category] = { amount: 0, count: 0 };
            }
            categoryMap[t.category].amount += amount;
            categoryMap[t.category].count += 1;
            totalAmount += amount;
        });

        // Convert to array and calculate percentages
        const breakdown: CategoryBreakdown[] = Object.entries(categoryMap).map(([category, data]) => ({
            category,
            amount: data.amount,
            percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
            transactionCount: data.count
        }));

        // Sort by amount descending
        breakdown.sort((a, b) => b.amount - a.amount);

        return breakdown;
    } catch (error) {
        log.error('Error fetching all-time category breakdown:', error);
        throw error;
    }
}

/**
 * Get category breakdown for current month
 */
export async function getCategoryBreakdown(userId: string): Promise<CategoryBreakdown[]> {
    try {
        // Get current month date range
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const firstDayStr = firstDay.toISOString().split('T')[0];
        const lastDayStr = lastDay.toISOString().split('T')[0];

        // Fetch transactions for current month
        const { data, error } = await supabase
            .from('finance_transactions')
            .select('category, amount, type')
            .eq('user_id', userId)
            .gte('transaction_date', firstDayStr)
            .lte('transaction_date', lastDayStr);

        if (error) throw error;

        const transactions = data || [];

        // Group by category
        const categoryMap: { [key: string]: { amount: number; count: number } } = {};
        let totalAmount = 0;

        transactions.forEach(t => {
            const amount = Number(t.amount);
            if (!categoryMap[t.category]) {
                categoryMap[t.category] = { amount: 0, count: 0 };
            }
            categoryMap[t.category].amount += amount;
            categoryMap[t.category].count += 1;
            totalAmount += amount;
        });

        // Convert to array and calculate percentages
        const breakdown: CategoryBreakdown[] = Object.entries(categoryMap).map(([category, data]) => ({
            category,
            amount: data.amount,
            percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
            transactionCount: data.count
        }));

        // Sort by amount descending
        breakdown.sort((a, b) => b.amount - a.amount);

        return breakdown;
    } catch (error) {
        log.error('Error fetching category breakdown:', error);
        throw error;
    }
}

/**
 * Get all transactions for a user
 */
export async function getTransactions(
    userId: string,
    limit: number = 100
): Promise<FinanceTransaction[]> {
    try {
        const { data, error } = await supabase
            .from('finance_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];
    } catch (error) {
        log.error('Error fetching transactions:', error);
        throw error;
    }
}

/**
 * Get transactions by date range
 */
export async function getTransactionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
): Promise<FinanceTransaction[]> {
    try {
        const { data, error } = await supabase
            .from('finance_transactions')
            .select('*')
            .eq('user_id', userId)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        log.error('Error fetching transactions by date range:', error);
        throw error;
    }
}

/**
 * Get yearly aggregates — monthly breakdown for a full year
 */
export async function getYearlyAggregates(
    userId: string,
    year: number
): Promise<import('../types').YearSummary> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const transactions = await getTransactionsByDateRange(userId, startDate, endDate);

    // Initialize 12 months
    const months: import('../types').MonthlyAggregate[] = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        income: 0,
        expenses: 0,
        balance: 0,
        savingsRate: 0,
        byCategory: {},
        transactionCount: 0,
    }));

    const yearByCategory: Record<string, { income: number; expenses: number }> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
        // Parse month directly from date string to avoid timezone shift
        const monthIdx = parseInt(tx.transaction_date.split('-')[1], 10) - 1;
        const amount = Math.abs(Number(tx.amount));
        const m = months[monthIdx];

        if (tx.type === 'income') {
            m.income += amount;
            totalIncome += amount;
        } else {
            m.expenses += amount;
            totalExpenses += amount;
        }
        m.transactionCount++;

        // Category breakdown per month
        if (!m.byCategory[tx.category]) {
            m.byCategory[tx.category] = { income: 0, expenses: 0 };
        }
        m.byCategory[tx.category][tx.type === 'income' ? 'income' : 'expenses'] += amount;

        // Year-level category breakdown
        if (!yearByCategory[tx.category]) {
            yearByCategory[tx.category] = { income: 0, expenses: 0 };
        }
        yearByCategory[tx.category][tx.type === 'income' ? 'income' : 'expenses'] += amount;
    }

    // Calculate balances and savings rates
    for (const m of months) {
        m.balance = m.income - m.expenses;
        m.savingsRate = m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0;
    }

    const totalBalance = totalIncome - totalExpenses;
    const avgSavingsRate = totalIncome > 0 ? (totalBalance / totalIncome) * 100 : 0;

    return {
        year,
        totalIncome,
        totalExpenses,
        totalBalance,
        avgSavingsRate,
        months,
        byCategory: yearByCategory,
    };
}

/**
 * Suggestion returned by AI for a single transaction re-categorization.
 */
export interface CategorySuggestion {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    currentCategory: string;
    suggestedCategory: string;
    accepted?: boolean;
}

/**
 * Get AI category suggestions for poorly categorized transactions.
 * Does NOT update the database — returns suggestions for user review.
 */
export async function getCategorySuggestions(
    userId: string,
    month?: number,
    year?: number
): Promise<{ suggestions: CategorySuggestion[]; error?: string }> {
    try {
        const now = new Date();
        const targetMonth = month ?? (now.getMonth() + 1);
        const targetYear = year ?? now.getFullYear();
        const monthPadded = String(targetMonth).padStart(2, '0');
        const startDate = `${targetYear}-${monthPadded}-01`;
        const endDate = `${targetYear}-${monthPadded}-31`;

        const { data: transactions, error: fetchErr } = await supabase
            .from('finance_transactions')
            .select('id, description, amount, type, category')
            .eq('user_id', userId)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .or('category.eq.transfer,category.eq.other,category.is.null');

        if (fetchErr) throw fetchErr;
        if (!transactions || transactions.length === 0) {
            return { suggestions: [] };
        }

        log.info(`[Recategorize] Found ${transactions.length} poorly categorized transactions for ${targetYear}-${monthPadded}`);

        const suggestions: CategorySuggestion[] = [];
        const BATCH_SIZE = 50;

        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
            const batch = transactions.slice(i, i + BATCH_SIZE);

            const { data: catResult, error: catErr } = await supabase.functions.invoke('gemini-chat', {
                body: {
                    action: 'categorize_transactions',
                    payload: {
                        transactions: batch.map(t => ({
                            description: t.description,
                            amount: t.amount,
                            type: t.type,
                        })),
                    },
                },
            });

            if (catErr || !catResult?.categories?.length) {
                log.warn('[Recategorize] AI batch failed, skipping', catErr);
                continue;
            }

            for (let j = 0; j < batch.length; j++) {
                const newCat = catResult.categories[j];
                if (newCat && newCat !== batch[j].category) {
                    suggestions.push({
                        id: batch[j].id,
                        description: batch[j].description,
                        amount: batch[j].amount,
                        type: batch[j].type,
                        currentCategory: batch[j].category || 'sem categoria',
                        suggestedCategory: newCat,
                    });
                }
            }
        }

        return { suggestions };
    } catch (err) {
        log.error('[Recategorize] Error getting suggestions:', err);
        return { suggestions: [], error: err instanceof Error ? err.message : 'Erro ao buscar sugestoes' };
    }
}

/**
 * Apply user-approved category suggestions to the database.
 */
export async function applyCategorySuggestions(
    suggestions: CategorySuggestion[]
): Promise<{ updated: number; error?: string }> {
    try {
        const approved = suggestions.filter(s => s.accepted);
        let updated = 0;

        for (const s of approved) {
            const { error: updateErr } = await supabase
                .from('finance_transactions')
                .update({ category: s.suggestedCategory, ai_categorized: true })
                .eq('id', s.id);

            if (!updateErr) updated++;
        }

        log.info(`[Recategorize] Applied ${updated} of ${approved.length} approved suggestions`);
        return { updated };
    } catch (err) {
        log.error('[Recategorize] Error applying suggestions:', err);
        return { updated: 0, error: err instanceof Error ? err.message : 'Erro ao salvar categorias' };
    }
}

/**
 * Re-categorize transactions using AI (batch, no user review).
 * Kept for backward compatibility.
 */
export async function recategorizeTransactions(
    userId: string,
    month?: number,
    year?: number
): Promise<{ updated: number; total: number; error?: string }> {
    const { suggestions, error } = await getCategorySuggestions(userId, month, year);
    if (error) return { updated: 0, total: 0, error };

    // Auto-accept all (except 'other')
    const autoApproved = suggestions
        .filter(s => s.suggestedCategory !== 'other')
        .map(s => ({ ...s, accepted: true }));

    const { updated } = await applyCategorySuggestions(autoApproved);
    return { updated, total: suggestions.length };
}
