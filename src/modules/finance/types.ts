// =====================================================
// Finance Module Types
// =====================================================

export interface FinanceTransaction {
    id: string;
    user_id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    transaction_date: string;
    is_recurring: boolean;
    hash_id: string;
    created_at: string;
}

export interface FinanceSummary {
    currentBalance: number;
    totalIncome: number;
    totalExpenses: number;
    transactionCount: number;
}

export interface BurnRateData {
    averageMonthlyExpense: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
}

export interface CategoryBreakdown {
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
}
