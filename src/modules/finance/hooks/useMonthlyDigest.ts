/**
 * useMonthlyDigest — Hook for persisted monthly AI digest summaries.
 *
 * For closed months (not the current month), loads cached digest from DB.
 * If not found, generates one via the finance-monthly-digest Edge Function
 * and persists it so it won't need regeneration.
 *
 * For the current month, returns a placeholder — analysis is only
 * available when the month closes.
 */

import { useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
    getPersistedDigest,
    savePersistedDigest,
    deletePersistedDigest,
} from '../services/financeService';
import {
    getMonthlyDigest,
    type MonthlyDigest,
    type DigestStats,
} from '../services/financeDigestService';

const log = createNamespacedLogger('useMonthlyDigest');

// =============================================================================
// Types
// =============================================================================

interface UseMonthlyDigestReturn {
    /** The parsed AI digest (null if not loaded yet or current month) */
    digest: MonthlyDigest | null;
    /** Stats from the digest generation */
    stats: DigestStats | null;
    /** The raw digest text from DB */
    digestText: string | null;
    /** True while loading cached digest from DB */
    isLoading: boolean;
    /** True while generating a new digest via AI */
    isGenerating: boolean;
    /** True if this is the current month (no digest available) */
    isCurrentMonth: boolean;
    /** Error message if something went wrong */
    error: string | null;
    /** Whether a cached digest was found in the DB */
    isCached: boolean;
    /** Force regenerate the digest (deletes cache, calls AI again) */
    regenerate: () => Promise<void>;
    /** Month display name */
    monthName: string;
}

// =============================================================================
// Helpers
// =============================================================================

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function isCurrentMonth(year: number, month: number): boolean {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month;
}

// =============================================================================
// Hook
// =============================================================================

export function useMonthlyDigest(
    userId: string,
    selectedYear: number,
    selectedMonth: number // 1-indexed (1=Jan, 12=Dec)
): UseMonthlyDigestReturn {
    const [digest, setDigest] = useState<MonthlyDigest | null>(null);
    const [stats, setStats] = useState<DigestStats | null>(null);
    const [digestText, setDigestText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCached, setIsCached] = useState(false);

    const currentMonth = isCurrentMonth(selectedYear, selectedMonth);
    const monthName = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

    // Define callbacks BEFORE useEffect to avoid temporal dead zone in bundled code

    const generateAndPersist = useCallback(async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await getMonthlyDigest(selectedMonth, selectedYear);

            if (!response.success || !response.digest) {
                setError(response.error || 'Erro ao gerar resumo');
                return;
            }

            setDigest(response.digest);
            setStats(response.stats || null);

            // Persist to DB for future loads
            const digestJson = JSON.stringify(response.digest);
            setDigestText(digestJson);

            const saved = await savePersistedDigest(
                userId,
                selectedYear,
                selectedMonth,
                digestJson,
                {
                    transactionCount: response.stats?.transactionCount || 0,
                    totalIncome: response.stats?.totalIncome || 0,
                    totalExpenses: response.stats?.totalExpenses || 0,
                }
            );

            if (saved) {
                log.info('Persisted digest for', selectedYear, selectedMonth);
                setIsCached(true);
            } else {
                log.warn('Failed to persist digest (will regenerate next time)');
            }
        } catch (err) {
            log.error('Error generating digest:', err);
            setError('Erro ao gerar resumo via IA.');
        } finally {
            setIsGenerating(false);
        }
    }, [userId, selectedYear, selectedMonth]);

    const loadDigest = useCallback(async () => {
        if (!userId || currentMonth) return;

        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Check DB for cached digest
            const cached = await getPersistedDigest(userId, selectedYear, selectedMonth);

            if (cached) {
                log.debug('Found cached digest for', selectedYear, selectedMonth);
                setDigestText(cached.digest_text);
                setIsCached(true);

                // Parse the cached digest_text as JSON (it stores the full digest)
                try {
                    const parsed = JSON.parse(cached.digest_text);
                    setDigest(parsed as MonthlyDigest);
                    setStats({
                        totalIncome: cached.total_income,
                        totalExpenses: cached.total_expenses,
                        balance: cached.total_income - cached.total_expenses,
                        transactionCount: cached.transaction_count,
                        categoryBreakdown: {},
                        percentChangeFromPrevious: null,
                    });
                } catch {
                    // If it's not JSON, treat digest_text as a plain text summary
                    // and create a simple digest structure
                    setDigest({
                        highlights: [cached.digest_text],
                        savings_opportunities: [],
                        risk_alerts: [],
                        month_grade: 'C',
                        grade_explanation: 'Resumo carregado do cache.',
                        next_month_tip: '',
                    });
                }

                setIsLoading(false);
                return;
            }

            // Step 2: No cache — generate via Edge Function
            log.info('No cached digest, generating for', selectedYear, selectedMonth);
            await generateAndPersist();
        } catch (err) {
            log.error('Error loading digest:', err);
            setError('Erro ao carregar resumo mensal.');
        } finally {
            setIsLoading(false);
        }
    }, [userId, selectedYear, selectedMonth, currentMonth, generateAndPersist]);

    // Load or generate digest when month changes
    useEffect(() => {
        if (!userId || currentMonth) {
            // Clear state for current month
            setDigest(null);
            setStats(null);
            setDigestText(null);
            setError(null);
            setIsCached(false);
            return;
        }

        loadDigest();
    }, [userId, currentMonth, loadDigest]);

    const regenerate = useCallback(async () => {
        if (currentMonth) return;

        // Delete cached version first
        setIsCached(false);
        setDigest(null);
        setStats(null);
        setDigestText(null);

        await deletePersistedDigest(userId, selectedYear, selectedMonth);
        await generateAndPersist();
    }, [userId, selectedYear, selectedMonth, currentMonth, generateAndPersist]);

    return {
        digest,
        stats,
        digestText,
        isLoading,
        isGenerating,
        isCurrentMonth: currentMonth,
        error,
        isCached,
        regenerate,
        monthName,
    };
}
