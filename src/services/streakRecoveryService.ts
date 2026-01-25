/**
 * Streak Recovery Service
 * Issue #XXX: Gamification 2.0 - Compassionate Streak System
 *
 * Manages streak trends with a compassionate approach:
 * - Grace periods for life's unpredictability
 * - Recovery through effort (3 tasks), not payment
 * - Focus on trends (47/50 days), not rigid streaks
 * - Celebrate comebacks, never shame breaks
 */

import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import {
  StreakTrend,
  StreakStatus,
  StreakRecoveryConfig,
  DEFAULT_STREAK_TREND,
  DEFAULT_RECOVERY_CONFIG,
  CompassionateMessage,
  calculateTrendPercentage,
  getCompassionateMessage,
  isNewMonth,
  daysBetween,
  getTodayISO,
  isToday,
  isYesterday,
} from '@/types/streakTrend';

const log = createNamespacedLogger('StreakRecoveryService');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config: StreakRecoveryConfig = DEFAULT_RECOVERY_CONFIG;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get current streak trend for a user
 */
export async function getStreakTrend(userId: string): Promise<StreakTrend> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('streak_trend, current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found, return default
        return DEFAULT_STREAK_TREND;
      }
      throw error;
    }

    // If streak_trend exists, use it; otherwise migrate from legacy fields
    if (data.streak_trend) {
      return data.streak_trend as StreakTrend;
    }

    // Migrate from legacy streak system
    return migrateLegacyStreak(data);
  } catch (error) {
    log.error('Error getting streak trend', { userId, error });
    return DEFAULT_STREAK_TREND;
  }
}

/**
 * Get full streak status for UI display
 */
export async function getStreakStatus(userId: string): Promise<StreakStatus> {
  try {
    const trend = await getStreakTrend(userId);
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    const today = getTodayISO();
    const lastActivityDate = statsData?.last_activity_date || null;
    const daysSinceLastActivity = lastActivityDate
      ? daysBetween(lastActivityDate, today)
      : 999;

    // Reset grace period count if new month
    let gracePeriodUsedThisMonth = trend.gracePeriodUsedThisMonth;
    if (isNewMonth(trend.lastGracePeriodDate)) {
      gracePeriodUsedThisMonth = 0;
    }

    const isActive = daysSinceLastActivity <= 1;
    const isInGracePeriod = trend.gracePeriodActive && daysSinceLastActivity <= config.gracePeriodDays;
    const gracePeriodRemaining = config.gracePeriodPerMonth - gracePeriodUsedThisMonth;
    const canRecover = !isActive && !isInGracePeriod && daysSinceLastActivity <= config.recoveryWindowDays;
    const recoveryTasksNeeded = config.recoveryTasksRequired - trend.recoveryProgress;

    const trendPercentage = calculateTrendPercentage(trend.currentTrend, trend.trendWindow);

    const statusBase = {
      currentTrend: trend.currentTrend,
      trendWindow: trend.trendWindow,
      trendPercentage,
      longestStreak: statsData?.longest_streak || 0,
      isActive,
      isInGracePeriod,
      gracePeriodRemaining,
      canRecover,
      isRecovering: trend.isRecovering,
      recoveryProgress: trend.recoveryProgress,
      recoveryTasksNeeded,
      daysSinceLastActivity,
    };

    const message = getCompassionateMessage(statusBase);

    return {
      ...statusBase,
      message,
    };
  } catch (error) {
    log.error('Error getting streak status', { userId, error });

    // Return safe default
    return {
      currentTrend: 0,
      trendWindow: config.trendWindowDays,
      trendPercentage: 0,
      longestStreak: 0,
      isActive: false,
      isInGracePeriod: false,
      gracePeriodRemaining: config.gracePeriodPerMonth,
      canRecover: true,
      isRecovering: false,
      recoveryProgress: 0,
      recoveryTasksNeeded: config.recoveryTasksRequired,
      daysSinceLastActivity: 999,
      message: {
        type: 'gentle_reminder',
        title: 'Um Passo de Cada Vez',
        message: 'Pequenos progressos levam a grandes mudancas.',
        emoji: '🌿',
      },
    };
  }
}

/**
 * Record activity for today (called when user completes a task)
 */
export async function recordDailyActivity(userId: string): Promise<StreakTrend> {
  try {
    const today = getTodayISO();
    const trend = await getStreakTrend(userId);

    // If already recorded today, skip
    if (trend.activeDays.includes(today)) {
      log.debug('Activity already recorded for today', { userId });
      return trend;
    }

    // Add today to active days
    const newActiveDays = [...trend.activeDays, today]
      .sort()
      .slice(-config.trendWindowDays); // Keep only last N days

    // Calculate new trend
    const newTrend = newActiveDays.length;

    // If was recovering, check progress
    let isRecovering = trend.isRecovering;
    let recoveryProgress = trend.recoveryProgress;

    if (isRecovering) {
      recoveryProgress++;
      if (recoveryProgress >= config.recoveryTasksRequired) {
        isRecovering = false;
        recoveryProgress = 0;
        log.info('Streak recovery completed!', { userId });
      }
    }

    // Update trend
    const updatedTrend: StreakTrend = {
      ...trend,
      activeDays: newActiveDays,
      currentTrend: newTrend,
      gracePeriodActive: false, // Reset grace period when active
      isRecovering,
      recoveryProgress,
    };

    // Save to database
    await saveStreakTrend(userId, updatedTrend);

    // Also update legacy fields for compatibility
    await updateLegacyStreakFields(userId, newActiveDays);

    log.info('Daily activity recorded', { userId, newTrend });
    return updatedTrend;
  } catch (error) {
    log.error('Error recording daily activity', { userId, error });
    throw error;
  }
}

/**
 * Use a grace period (user chose to take a break)
 */
export async function useGracePeriod(userId: string): Promise<{ success: boolean; message: CompassionateMessage }> {
  try {
    const trend = await getStreakTrend(userId);
    const today = getTodayISO();

    // Reset grace period count if new month
    let gracePeriodUsedThisMonth = trend.gracePeriodUsedThisMonth;
    if (isNewMonth(trend.lastGracePeriodDate)) {
      gracePeriodUsedThisMonth = 0;
    }

    // Check if grace periods available
    if (gracePeriodUsedThisMonth >= config.gracePeriodPerMonth) {
      return {
        success: false,
        message: {
          type: 'recovery_available',
          title: 'Sem Periodos de Descanso',
          message: `Voce ja usou seus ${config.gracePeriodPerMonth} periodos de descanso este mes. Complete 3 tarefas para recuperar.`,
          emoji: '💪',
          actionLabel: 'Iniciar Recuperacao',
          actionType: 'start_recovery',
        },
      };
    }

    // Activate grace period
    const updatedTrend: StreakTrend = {
      ...trend,
      gracePeriodActive: true,
      lastGracePeriodDate: today,
      gracePeriodUsedThisMonth: gracePeriodUsedThisMonth + 1,
    };

    await saveStreakTrend(userId, updatedTrend);

    const remaining = config.gracePeriodPerMonth - updatedTrend.gracePeriodUsedThisMonth;

    log.info('Grace period activated', { userId, remaining });

    return {
      success: true,
      message: {
        type: 'grace_period_active',
        title: 'Periodo de Descanso Ativado',
        message: `Cuide-se! Voce ainda tem ${remaining} periodo${remaining !== 1 ? 's' : ''} de descanso este mes.`,
        emoji: '💚',
      },
    };
  } catch (error) {
    log.error('Error using grace period', { userId, error });
    return {
      success: false,
      message: {
        type: 'gentle_reminder',
        title: 'Erro',
        message: 'Nao foi possivel ativar o periodo de descanso. Tente novamente.',
        emoji: '❌',
      },
    };
  }
}

/**
 * Start recovery mode (user wants to recover after absence)
 */
export async function startRecovery(userId: string): Promise<{ success: boolean; message: CompassionateMessage }> {
  try {
    const trend = await getStreakTrend(userId);
    const today = getTodayISO();

    // Check if already recovering
    if (trend.isRecovering) {
      return {
        success: true,
        message: {
          type: 'recovery_in_progress',
          title: 'Recuperacao em Andamento',
          message: `Complete mais ${config.recoveryTasksRequired - trend.recoveryProgress} tarefa(s) para finalizar.`,
          emoji: '💪',
        },
      };
    }

    // Start recovery
    const updatedTrend: StreakTrend = {
      ...trend,
      isRecovering: true,
      recoveryProgress: 0,
      recoveryStartDate: today,
    };

    await saveStreakTrend(userId, updatedTrend);

    log.info('Recovery mode started', { userId });

    return {
      success: true,
      message: {
        type: 'recovery_in_progress',
        title: 'Recuperacao Iniciada!',
        message: `Complete ${config.recoveryTasksRequired} tarefas para retomar sua jornada. Voce consegue!`,
        emoji: '🌅',
      },
    };
  } catch (error) {
    log.error('Error starting recovery', { userId, error });
    return {
      success: false,
      message: {
        type: 'gentle_reminder',
        title: 'Erro',
        message: 'Nao foi possivel iniciar a recuperacao. Tente novamente.',
        emoji: '❌',
      },
    };
  }
}

/**
 * Increment recovery progress (called when completing a task during recovery)
 */
export async function incrementRecoveryProgress(userId: string): Promise<{ completed: boolean; progress: number }> {
  try {
    const trend = await getStreakTrend(userId);

    if (!trend.isRecovering) {
      return { completed: false, progress: 0 };
    }

    const newProgress = trend.recoveryProgress + 1;
    const completed = newProgress >= config.recoveryTasksRequired;

    const updatedTrend: StreakTrend = {
      ...trend,
      recoveryProgress: completed ? 0 : newProgress,
      isRecovering: !completed,
      recoveryStartDate: completed ? null : trend.recoveryStartDate,
    };

    // If completed, also record today's activity
    if (completed) {
      const today = getTodayISO();
      if (!updatedTrend.activeDays.includes(today)) {
        updatedTrend.activeDays = [...updatedTrend.activeDays, today]
          .sort()
          .slice(-config.trendWindowDays);
        updatedTrend.currentTrend = updatedTrend.activeDays.length;
      }
    }

    await saveStreakTrend(userId, updatedTrend);

    log.info('Recovery progress updated', { userId, newProgress, completed });

    return { completed, progress: newProgress };
  } catch (error) {
    log.error('Error incrementing recovery progress', { userId, error });
    return { completed: false, progress: 0 };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Save streak trend to database
 */
async function saveStreakTrend(userId: string, trend: StreakTrend): Promise<void> {
  const { error } = await supabase
    .from('user_stats')
    .update({
      streak_trend: trend,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    log.error('Error saving streak trend', { userId, error });
    throw error;
  }
}

/**
 * Update legacy streak fields for backward compatibility
 */
async function updateLegacyStreakFields(userId: string, activeDays: string[]): Promise<void> {
  try {
    const today = getTodayISO();

    // Calculate consecutive streak from most recent days
    let consecutiveStreak = 0;
    const sortedDays = [...activeDays].sort().reverse();

    for (let i = 0; i < sortedDays.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedStr = expectedDate.toISOString().split('T')[0];

      if (sortedDays[i] === expectedStr) {
        consecutiveStreak++;
      } else {
        break;
      }
    }

    // Get current longest streak
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('longest_streak')
      .eq('user_id', userId)
      .single();

    const longestStreak = Math.max(currentStats?.longest_streak || 0, consecutiveStreak);

    // Update legacy fields
    await supabase
      .from('user_stats')
      .update({
        current_streak: consecutiveStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
      })
      .eq('user_id', userId);
  } catch (error) {
    log.warn('Error updating legacy streak fields', { userId, error });
    // Non-critical, don't throw
  }
}

/**
 * Migrate from legacy streak to trend system
 */
function migrateLegacyStreak(data: {
  current_streak?: number;
  longest_streak?: number;
  last_activity_date?: string;
}): StreakTrend {
  const currentStreak = data.current_streak || 0;
  const lastActivityDate = data.last_activity_date;

  // Generate active days based on current streak
  const activeDays: string[] = [];

  if (lastActivityDate && currentStreak > 0) {
    for (let i = 0; i < currentStreak; i++) {
      const date = new Date(lastActivityDate);
      date.setDate(date.getDate() - i);
      activeDays.unshift(date.toISOString().split('T')[0]);
    }
  }

  return {
    ...DEFAULT_STREAK_TREND,
    activeDays: activeDays.slice(-config.trendWindowDays),
    currentTrend: Math.min(activeDays.length, config.trendWindowDays),
  };
}

/**
 * Check if user should be prompted for grace period or recovery
 */
export async function checkStreakHealth(userId: string): Promise<{
  needsAttention: boolean;
  suggestedAction: 'none' | 'grace_period' | 'recovery';
  message: CompassionateMessage;
}> {
  const status = await getStreakStatus(userId);

  // Already active or in grace period - all good
  if (status.isActive || status.isInGracePeriod) {
    return {
      needsAttention: false,
      suggestedAction: 'none',
      message: status.message,
    };
  }

  // Missed yesterday, grace period available
  if (status.daysSinceLastActivity === 1 && status.gracePeriodRemaining > 0) {
    return {
      needsAttention: true,
      suggestedAction: 'grace_period',
      message: status.message,
    };
  }

  // Can recover
  if (status.canRecover) {
    return {
      needsAttention: true,
      suggestedAction: 'recovery',
      message: status.message,
    };
  }

  // Too long absence - just start fresh
  return {
    needsAttention: false,
    suggestedAction: 'none',
    message: {
      type: 'comeback_celebration',
      title: 'Novo Comeco!',
      message: 'Cada dia e uma nova oportunidade. Comece hoje!',
      emoji: '🌟',
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const streakRecoveryService = {
  getStreakTrend,
  getStreakStatus,
  recordDailyActivity,
  useGracePeriod,
  startRecovery,
  incrementRecoveryProgress,
  checkStreakHealth,
};

export default streakRecoveryService;
