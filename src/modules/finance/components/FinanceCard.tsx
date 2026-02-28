import React, { useEffect, useState } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { Eye, EyeOff, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const log = createNamespacedLogger('FinanceCard');
import { motion } from 'framer-motion';
import { getAllTimeSummary, getBurnRate } from '../services/financeService';
import type { FinanceSummary, BurnRateData } from '../types';
import { cardElevationVariants } from '../../../lib/animations/ceramic-motion';

// =====================================================
// Finance Card Component - Ceramic Design (Simplified)
// =====================================================

interface FinanceCardProps {
    userId: string;
    /** Compact mode for Home dashboard — shows icon + title + balance + visibility toggle */
    compact?: boolean;
}

export const FinanceCard: React.FC<FinanceCardProps> = ({ userId, compact = false }) => {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isValuesVisible, setIsValuesVisible] = useState(false);

    useEffect(() => {
        loadFinanceData();
    }, [userId]);

    const loadFinanceData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Use getAllTimeSummary instead of getCurrentMonthSummary
            // to show data even when current month has no transactions
            const [summaryData, burnRateData] = await Promise.all([
                getAllTimeSummary(userId),
                getBurnRate(userId)
            ]);

            setSummary(summaryData);
            setBurnRate(burnRateData);
        } catch (err) {
            log.error('Error loading finance data:', err);
            setError('Falha ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number): string => {
        if (!isValuesVisible) {
            return 'R$ ••••••';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const getBalanceColor = (balance: number): string => {
        if (balance > 0) return 'text-ceramic-positive';
        if (balance < 0) return 'text-ceramic-negative';
        return 'text-ceramic-neutral';
    };

    const toggleVisibility = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsValuesVisible(!isValuesVisible);
    };

    // Calculate trend based on burn rate
    const getTrendData = () => {
        if (!burnRate || burnRate.trend === 'stable') {
            return { isPositive: true, percentage: 0, showTrend: false };
        }

        const isPositive = burnRate.trend === 'decreasing'; // decreasing expenses = positive
        const percentage = Math.abs(burnRate.percentageChange);

        return { isPositive, percentage, showTrend: true };
    };

    if (loading) {
        return (
            <div className={`ceramic-card animate-pulse ${compact ? 'p-3 min-h-[100px]' : 'p-5 min-h-[180px] h-full'}`}>
                <div className="h-4 bg-ceramic-cool rounded w-20 mb-3"></div>
                <div className={`bg-ceramic-cool rounded w-28 mb-2 ${compact ? 'h-6' : 'h-10'}`}></div>
                {!compact && <div className="h-3 bg-ceramic-cool rounded w-16"></div>}
            </div>
        );
    }

    if (error || !summary || !burnRate) {
        return (
            <div className={`ceramic-card flex items-center justify-center ${compact ? 'p-3 min-h-[100px]' : 'p-5 min-h-[180px] h-full'}`}>
                <p className="text-ceramic-text-secondary text-xs text-center">
                    {error || 'Sem dados'}
                </p>
            </div>
        );
    }

    const { isPositive, percentage, showTrend } = getTrendData();

    // ── Compact mode: icon + title + balance + visibility toggle ──
    if (compact) {
        return (
            <motion.div
                className="ceramic-card p-3 min-h-[100px] flex flex-col relative overflow-hidden cursor-pointer"
                variants={cardElevationVariants}
                initial="rest"
                whileHover="hover"
                whileTap="pressed"
            >
                {/* Decorative Background Icon — smaller */}
                <Wallet className="absolute -right-2 -bottom-2 w-20 h-20 text-ceramic-success/20 opacity-10" />

                {/* Header */}
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="ceramic-inset p-1.5">
                            <Wallet className="w-4 h-4 text-ceramic-success" />
                        </div>
                        <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                            Finanças
                        </span>
                    </div>
                    <button
                        onClick={toggleVisibility}
                        className="ceramic-inset p-1.5 flex items-center justify-center hover:scale-95 transition-transform"
                        title={isValuesVisible ? 'Ocultar' : 'Mostrar'}
                    >
                        {isValuesVisible ? (
                            <EyeOff className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                        ) : (
                            <Eye className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                        )}
                    </button>
                </div>

                {/* Balance — smaller */}
                <div className="flex-1 flex items-center justify-center relative z-10">
                    <p className={`text-lg font-black text-ceramic-text-primary ${getBalanceColor(summary.currentBalance)}`}>
                        {formatCurrency(summary.currentBalance)}
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="ceramic-card p-5 h-full min-h-[180px] flex flex-col relative overflow-hidden cursor-pointer"
            variants={cardElevationVariants}
            initial="rest"
            whileHover="hover"
            whileTap="pressed"
        >
            {/* Decorative Background Icon */}
            <Wallet className="absolute -right-6 -bottom-6 w-40 h-40 text-ceramic-success/20 opacity-10" />

            {/* Header with Module Name and Visibility Toggle */}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="ceramic-concave w-7 h-7 flex items-center justify-center">
                        <Wallet className="w-3.5 h-3.5 text-ceramic-success" />
                    </div>
                    <span className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider font-bold">
                        Finanças
                    </span>
                </div>

                <button
                    onClick={toggleVisibility}
                    className="ceramic-concave w-7 h-7 flex items-center justify-center hover:scale-95 transition-transform"
                    title={isValuesVisible ? 'Ocultar' : 'Mostrar'}
                >
                    {isValuesVisible ? (
                        <EyeOff className="w-2.5 h-2.5 text-ceramic-text-secondary" />
                    ) : (
                        <Eye className="w-2.5 h-2.5 text-ceramic-text-secondary" />
                    )}
                </button>
            </div>

            {/* Main Balance - Balanced and Centered */}
            <div className="flex-1 flex flex-col justify-center items-center relative z-10 min-h-[80px]">
                <p className="text-[9px] text-ceramic-text-secondary mb-2 uppercase tracking-wider font-medium">
                    Saldo Atual
                </p>
                <p className={`text-2xl md:text-3xl font-black text-ceramic-text-primary ${getBalanceColor(summary.currentBalance)}`}>
                    {formatCurrency(summary.currentBalance)}
                </p>
            </div>

            {/* Trend Indicator */}
            {showTrend && (
                <div className={`flex items-center justify-center gap-1.5 pt-2 relative z-10 ${
                    isPositive ? 'text-ceramic-positive' : 'text-ceramic-negative'
                }`}>
                    {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span className="text-xs font-bold">
                        {percentage.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-ceramic-text-secondary">
                        vs média
                    </span>
                </div>
            )}

            {!showTrend && (
                <div className="flex items-center justify-center gap-1.5 pt-2 relative z-10 text-ceramic-text-secondary">
                    <span className="text-[9px]">Estável</span>
                </div>
            )}
        </motion.div>
    );
};

export default FinanceCard;
