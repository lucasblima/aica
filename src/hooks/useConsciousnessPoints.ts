/**
 * useConsciousnessPoints Hook
 * Issue #XXX: Gamification 2.0 - Meaningful Reward System
 *
 * React hook for managing Consciousness Points (CP).
 * Provides CP balance, transactions, and awarding functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  CPBalance,
  CPTransaction,
  CPCategory,
  DEFAULT_CP_BALANCE,
  formatCP,
  getCPCategoryDisplayName,
  getCPCategoryIcon,
  getCPCategoryColor,
} from '@/types/consciousnessPoints';
import {
  consciousnessPointsService,
} from '@/services/consciousnessPointsService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseConsciousnessPointsOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Refresh interval in ms (0 = disabled) */
  refreshInterval?: number;
  /** Include transaction history */
  includeHistory?: boolean;
  /** Transaction history limit */
  historyLimit?: number;
}

export interface UseConsciousnessPointsReturn {
  // Data
  balance: CPBalance;
  history: CPTransaction[];
  isLoading: boolean;
  error: string | null;

  // Formatted values
  totalCPFormatted: string;
  todayCPFormatted: string;
  weekCPFormatted: string;

  // Category breakdown
  categoryBreakdown: {
    category: CPCategory;
    amount: number;
    displayName: string;
    icon: string;
    color: string;
    percentage: number;
  }[];

  // Actions
  refresh: () => Promise<void>;
  awardCP: (
    rewardId: string,
    options?: { silent?: boolean }
  ) => Promise<{ success: boolean; awarded: number }>;
  awardRelationshipCareCP: (
    contactId: string,
    contactName: string
  ) => Promise<{ success: boolean; awarded: number }>;

  // Loading states
  isAwarding: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useConsciousnessPoints(
  options: UseConsciousnessPointsOptions = {}
): UseConsciousnessPointsReturn {
  const {
    autoFetch = true,
    refreshInterval = 0,
    includeHistory = false,
    historyLimit = 10,
  } = options;

  const { user } = useAuth();

  // State
  const [balance, setBalance] = useState<CPBalance>(DEFAULT_CP_BALANCE);
  const [history, setHistory] = useState<CPTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);

  // Fetch balance and optionally history
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const balanceData = await consciousnessPointsService.getCPBalance(user.id);
      setBalance(balanceData);

      if (includeHistory) {
        const historyData = await consciousnessPointsService.getCPHistory(
          user.id,
          { limit: historyLimit }
        );
        setHistory(historyData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar CP';
      setError(message);
      console.error('[useConsciousnessPoints] Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }

    // Check weekly bonus (silent, non-blocking)
    try {
      await consciousnessPointsService.checkWeeklyBonus(user.id);
    } catch {
      // Weekly bonus check is non-critical
    }
  }, [user?.id, includeHistory, historyLimit]);

  // Award CP
  const awardCP = useCallback(
    async (
      rewardId: string,
      awardOptions: { silent?: boolean } = {}
    ): Promise<{ success: boolean; awarded: number }> => {
      if (!user?.id) {
        return { success: false, awarded: 0 };
      }

      setIsAwarding(true);

      try {
        const result = await consciousnessPointsService.awardCP(
          user.id,
          rewardId,
          { silent: awardOptions.silent }
        );

        if (result.success) {
          setBalance(result.balance);
        }

        return {
          success: result.success,
          awarded: result.awarded,
        };
      } catch (err) {
        console.error('[useConsciousnessPoints] Error awarding CP:', err);
        return { success: false, awarded: 0 };
      } finally {
        setIsAwarding(false);
      }
    },
    [user?.id]
  );

  // Award relationship care CP
  const awardRelationshipCareCP = useCallback(
    async (
      contactId: string,
      contactName: string
    ): Promise<{ success: boolean; awarded: number }> => {
      if (!user?.id) {
        return { success: false, awarded: 0 };
      }

      setIsAwarding(true);

      try {
        const result = await consciousnessPointsService.awardRelationshipCareCP(
          user.id,
          contactId,
          contactName
        );

        if (result.success) {
          // Refresh balance after awarding
          await fetchData();
        }

        return result;
      } catch (err) {
        console.error('[useConsciousnessPoints] Error awarding relationship CP:', err);
        return { success: false, awarded: 0 };
      } finally {
        setIsAwarding(false);
      }
    },
    [user?.id, fetchData]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchData();
    }
  }, [autoFetch, user?.id, fetchData]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && user?.id) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, user?.id, fetchData]);

  // Computed values
  const totalCPFormatted = formatCP(balance.total_cp);
  const todayCPFormatted = formatCP(balance.cp_earned_today);
  const weekCPFormatted = formatCP(balance.cp_earned_this_week);

  // Category breakdown
  const categories: CPCategory[] = ['presence', 'reflection', 'connection', 'intention', 'growth'];
  const totalCategoryCP = categories.reduce(
    (sum, cat) => sum + (balance.cp_by_category[cat] || 0),
    0
  );

  const categoryBreakdown = categories.map((category) => {
    const amount = balance.cp_by_category[category] || 0;
    const percentage = totalCategoryCP > 0
      ? Math.round((amount / totalCategoryCP) * 100)
      : 0;

    return {
      category,
      amount,
      displayName: getCPCategoryDisplayName(category),
      icon: getCPCategoryIcon(category),
      color: getCPCategoryColor(category),
      percentage,
    };
  });

  return {
    // Data
    balance,
    history,
    isLoading,
    error,

    // Formatted values
    totalCPFormatted,
    todayCPFormatted,
    weekCPFormatted,

    // Category breakdown
    categoryBreakdown,

    // Actions
    refresh: fetchData,
    awardCP,
    awardRelationshipCareCP,

    // Loading states
    isAwarding,
  };
}

export default useConsciousnessPoints;
