/**
 * useStreakTrend Hook
 * Issue #XXX: Gamification 2.0 - Compassionate Streak System
 *
 * React hook for managing streak trends with compassionate UX.
 * Provides streak status, grace periods, and recovery actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  StreakStatus,
  StreakTrend,
  CompassionateMessage,
  getTrendDisplayString,
  getTrendColor,
  getTrendQuality,
} from '@/types/streakTrend';
import {
  streakRecoveryService,
} from '@/services/streakRecoveryService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseStreakTrendOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Refresh interval in ms (0 = disabled) */
  refreshInterval?: number;
}

export interface UseStreakTrendReturn {
  // Data
  status: StreakStatus | null;
  trend: StreakTrend | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  trendDisplay: string;
  trendColor: string;
  trendQuality: 'excellent' | 'good' | 'moderate' | 'needs_attention';
  message: CompassionateMessage | null;

  // Actions
  refresh: () => Promise<void>;
  recordActivity: () => Promise<void>;
  useGracePeriod: () => Promise<{ success: boolean; message: CompassionateMessage }>;
  startRecovery: () => Promise<{ success: boolean; message: CompassionateMessage }>;

  // State
  isUsingGracePeriod: boolean;
  isStartingRecovery: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useStreakTrend(options: UseStreakTrendOptions = {}): UseStreakTrendReturn {
  const { autoFetch = true, refreshInterval = 0 } = options;
  const { user } = useAuth();

  // State
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [trend, setTrend] = useState<StreakTrend | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingGracePeriod, setIsUsingGracePeriod] = useState(false);
  const [isStartingRecovery, setIsStartingRecovery] = useState(false);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [statusData, trendData] = await Promise.all([
        streakRecoveryService.getStreakStatus(user.id),
        streakRecoveryService.getStreakTrend(user.id),
      ]);

      setStatus(statusData);
      setTrend(trendData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar streak';
      setError(message);
      console.error('[useStreakTrend] Error fetching status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Record daily activity
  const recordActivity = useCallback(async () => {
    if (!user?.id) return;

    try {
      const updatedTrend = await streakRecoveryService.recordDailyActivity(user.id);
      setTrend(updatedTrend);

      // Refresh full status
      await fetchStatus();
    } catch (err) {
      console.error('[useStreakTrend] Error recording activity:', err);
      throw err;
    }
  }, [user?.id, fetchStatus]);

  // Use grace period
  const useGracePeriodAction = useCallback(async (): Promise<{ success: boolean; message: CompassionateMessage }> => {
    if (!user?.id) {
      return {
        success: false,
        message: {
          type: 'gentle_reminder',
          title: 'Erro',
          message: 'Usuario não autenticado',
          emoji: '❌',
        },
      };
    }

    setIsUsingGracePeriod(true);

    try {
      const result = await streakRecoveryService.useGracePeriod(user.id);

      if (result.success) {
        await fetchStatus();
      }

      return result;
    } catch (err) {
      console.error('[useStreakTrend] Error using grace period:', err);
      return {
        success: false,
        message: {
          type: 'gentle_reminder',
          title: 'Erro',
          message: 'Não foi possível ativar o período de descanso',
          emoji: '❌',
        },
      };
    } finally {
      setIsUsingGracePeriod(false);
    }
  }, [user?.id, fetchStatus]);

  // Start recovery
  const startRecoveryAction = useCallback(async (): Promise<{ success: boolean; message: CompassionateMessage }> => {
    if (!user?.id) {
      return {
        success: false,
        message: {
          type: 'gentle_reminder',
          title: 'Erro',
          message: 'Usuario não autenticado',
          emoji: '❌',
        },
      };
    }

    setIsStartingRecovery(true);

    try {
      const result = await streakRecoveryService.startRecovery(user.id);

      if (result.success) {
        await fetchStatus();
      }

      return result;
    } catch (err) {
      console.error('[useStreakTrend] Error starting recovery:', err);
      return {
        success: false,
        message: {
          type: 'gentle_reminder',
          title: 'Erro',
          message: 'Não foi possível iniciar a recuperacao',
          emoji: '❌',
        },
      };
    } finally {
      setIsStartingRecovery(false);
    }
  }, [user?.id, fetchStatus]);

  // Auto-fetch on mount + auto-record daily activity on login
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchStatus();

      // Auto-record daily activity on login (any authenticated session = active day)
      // recordDailyActivity() already deduplicates — safe to call on every mount
      streakRecoveryService.recordDailyActivity(user.id).catch(() => {
        // Non-critical: streak recording failure shouldn't block UI
      });
    }
  }, [autoFetch, user?.id, fetchStatus]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && user?.id) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, user?.id, fetchStatus]);

  // Computed values
  const trendDisplay = status
    ? getTrendDisplayString(status.currentTrend, status.trendWindow)
    : '0/50 dias';

  const trendColor = status
    ? getTrendColor(status.trendPercentage)
    : '#9CA3AF';

  const trendQuality = status
    ? getTrendQuality(status.trendPercentage)
    : 'needs_attention';

  const message = status?.message || null;

  return {
    // Data
    status,
    trend,
    isLoading,
    error,

    // Computed
    trendDisplay,
    trendColor,
    trendQuality,
    message,

    // Actions
    refresh: fetchStatus,
    recordActivity,
    useGracePeriod: useGracePeriodAction,
    startRecovery: startRecoveryAction,

    // State
    isUsingGracePeriod,
    isStartingRecovery,
  };
}

export default useStreakTrend;
