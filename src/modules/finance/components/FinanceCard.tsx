import React, { useEffect, useState } from 'react';
import { getCurrentMonthSummary, getBurnRate } from '../services/financeService';
import type { FinanceSummary, BurnRateData } from '../types';

// =====================================================
// Finance Card Component - Ceramic Design
// =====================================================

interface FinanceCardProps {
    userId: string;
}

export const FinanceCard: React.FC<FinanceCardProps> = ({ userId }) => {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFinanceData();
    }, [userId]);

    const loadFinanceData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [summaryData, burnRateData] = await Promise.all([
                getCurrentMonthSummary(userId),
                getBurnRate(userId)
            ]);

            setSummary(summaryData);
            setBurnRate(burnRateData);
        } catch (err) {
            console.error('Error loading finance data:', err);
            setError('Falha ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const getBalanceColor = (balance: number): string => {
        if (balance > 0) return 'text-green-700';
        if (balance < 0) return 'text-red-700';
        return 'text-gray-700';
    };

    const getBalanceGradient = (balance: number): string => {
        if (balance > 0) return 'from-green-50 to-yellow-50';
        if (balance < 0) return 'from-red-50 to-orange-50';
        return 'from-gray-50 to-gray-100';
    };

    if (loading) {
        return (
            <div className="ceramic-card p-8 animate-pulse">
                <div className="h-8 bg-gray-200 rounded-full w-32 mb-6"></div>
                <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    if (error || !summary || !burnRate) {
        return (
            <div className="ceramic-card p-8">
                <p className="text-red-600 text-center">
                    {error || 'Dados não disponíveis'}
                </p>
            </div>
        );
    }

    const budgetUsagePercentage = burnRate.averageMonthlyExpense > 0
        ? (summary.totalExpenses / burnRate.averageMonthlyExpense) * 100
        : 0;

    return (
        <div className="ceramic-card p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-etched">💰 Finanças</h2>
                <button
                    className="ceramic-concave w-10 h-10 flex items-center justify-center text-sm hover:scale-95 transition-transform"
                    title="Upload de Extratos"
                >
                    📤
                </button>
            </div>

            {/* Balance Display - Large and Prominent */}
            <div className={`bg-gradient-to-br ${getBalanceGradient(summary.currentBalance)} rounded-3xl p-6 text-center`}>
                <p className="text-sm text-gray-600 mb-2">Saldo do Mês</p>
                <p className={`text-4xl font-bold ${getBalanceColor(summary.currentBalance)}`}>
                    {formatCurrency(summary.currentBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                    {summary.transactionCount} transações
                </p>
            </div>

            {/* Income vs Expenses - Inset Pills */}
            <div className="ceramic-groove rounded-2xl p-4 space-y-3">
                {/* Income */}
                <div className="ceramic-inset px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📈</span>
                        <div>
                            <p className="text-xs text-gray-600">Entradas</p>
                            <p className="text-lg font-semibold text-green-700">
                                {formatCurrency(summary.totalIncome)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Expenses */}
                <div className="ceramic-inset px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📉</span>
                        <div>
                            <p className="text-xs text-gray-600">Saídas</p>
                            <p className="text-lg font-semibold text-red-700">
                                {formatCurrency(summary.totalExpenses)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Burn Rate Forecast */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Burn Rate Médio</p>
                    <p className="text-lg font-semibold text-etched">
                        {formatCurrency(burnRate.averageMonthlyExpense)}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="ceramic-trough p-2">
                    <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
                        style={{ width: `${Math.min(budgetUsagePercentage, 100)}%` }}
                    ></div>
                </div>

                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                        {budgetUsagePercentage.toFixed(0)}% do orçamento médio
                    </span>
                    {burnRate.trend !== 'stable' && (
                        <span className={`font-medium ${burnRate.trend === 'increasing' ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {burnRate.trend === 'increasing' ? '↗' : '↘'} {Math.abs(burnRate.percentageChange).toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinanceCard;
