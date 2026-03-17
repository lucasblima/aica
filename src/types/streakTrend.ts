/**
 * Streak Trend Types
 * Issue #XXX: Gamification 2.0 - Compassionate Streak System
 *
 * Replaces rigid streak counting with trend-based tracking.
 * Focus: 47/50 days instead of "streak: 47"
 *
 * Key principles:
 * - Compassion > Punishment
 * - Grace periods for life's unpredictability
 * - Recovery through effort, not money
 * - Celebrate comebacks, not shame breaks
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Streak trend data stored in user_stats
 */
export interface StreakTrend {
  /** ISO date strings of active days in the trend window */
  activeDays: string[];
  /** Current trend count (e.g., 47 out of 50) */
  currentTrend: number;
  /** Trend window size (default: 50 days) */
  trendWindow: number;
  /** Whether grace period was used today */
  gracePeriodActive: boolean;
  /** Last date a grace period was activated */
  lastGracePeriodDate: string | null;
  /** Number of grace periods used this month */
  gracePeriodUsedThisMonth: number;
  /** Recovery progress (0-3 tasks to recover) */
  recoveryProgress: number;
  /** Whether user is in recovery mode */
  isRecovering: boolean;
  /** Date when recovery mode started */
  recoveryStartDate: string | null;
}

/**
 * Default streak trend configuration
 */
export const DEFAULT_STREAK_TREND: StreakTrend = {
  activeDays: [],
  currentTrend: 0,
  trendWindow: 50,
  gracePeriodActive: false,
  lastGracePeriodDate: null,
  gracePeriodUsedThisMonth: 0,
  recoveryProgress: 0,
  isRecovering: false,
  recoveryStartDate: null,
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Streak recovery system configuration
 */
export interface StreakRecoveryConfig {
  /** Number of automatic grace period days */
  gracePeriodDays: number;
  /** Maximum grace periods per month */
  gracePeriodPerMonth: number;
  /** Days to complete recovery */
  recoveryWindowDays: number;
  /** Tasks required to complete recovery */
  recoveryTasksRequired: number;
  /** XP cost for recovery (0 = free) */
  recoveryXPCost: number;
  /** Show trend (47/50) instead of streak number */
  showTrendInsteadOfStreak: boolean;
  /** Celebrate comebacks with special messages */
  celebrateComebacks: boolean;
  /** Trend window size in days */
  trendWindowDays: number;
}

/**
 * Default recovery configuration - Compassionate by default
 */
export const DEFAULT_RECOVERY_CONFIG: StreakRecoveryConfig = {
  gracePeriodDays: 2,
  gracePeriodPerMonth: 4,
  recoveryWindowDays: 7,
  recoveryTasksRequired: 3,
  recoveryXPCost: 0, // Free recovery - no punishment
  showTrendInsteadOfStreak: true,
  celebrateComebacks: true,
  trendWindowDays: 50,
};

// ============================================================================
// STATUS & MESSAGES
// ============================================================================

/**
 * Types of compassionate messages
 */
export type CompassionateMessageType =
  | 'grace_period_active'    // Currently in grace period
  | 'grace_period_available' // Can activate grace period
  | 'recovery_available'     // Can recover streak
  | 'recovery_in_progress'   // Currently recovering
  | 'recovery_complete'      // Just completed recovery
  | 'trend_celebration'      // Celebrating good trend
  | 'comeback_celebration'   // Welcome back after absence
  | 'milestone_reached'      // Hit a streak milestone
  | 'gentle_reminder';       // Soft nudge, not pressure

/**
 * Compassionate message for UI display
 */
export interface CompassionateMessage {
  type: CompassionateMessageType;
  title: string;
  message: string;
  emoji: string;
  actionLabel?: string;
  actionType?: 'use_grace_period' | 'start_recovery' | 'dismiss';
}

/**
 * Streak status for UI display
 */
export interface StreakStatus {
  /** Current trend count */
  currentTrend: number;
  /** Trend window (denominator) */
  trendWindow: number;
  /** Percentage of active days */
  trendPercentage: number;
  /** Longest ever streak */
  longestStreak: number;
  /** Is streak currently active (activity today or yesterday) */
  isActive: boolean;
  /** Is in grace period */
  isInGracePeriod: boolean;
  /** Grace periods remaining this month */
  gracePeriodRemaining: number;
  /** Can start recovery */
  canRecover: boolean;
  /** Is currently recovering */
  isRecovering: boolean;
  /** Recovery progress (0-3) */
  recoveryProgress: number;
  /** Tasks needed to complete recovery */
  recoveryTasksNeeded: number;
  /** Days since last activity */
  daysSinceLastActivity: number;
  /** Compassionate message to display */
  message: CompassionateMessage;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate trend percentage
 */
export function calculateTrendPercentage(activeDays: number, window: number): number {
  if (window === 0) return 0;
  return Math.round((activeDays / window) * 100);
}

/**
 * Get trend display string (e.g., "47/50 dias")
 */
export function getTrendDisplayString(trend: number, window: number): string {
  return `${trend}/${window} dias`;
}

/**
 * Get trend quality level based on percentage
 */
export function getTrendQuality(percentage: number): 'excellent' | 'good' | 'moderate' | 'needs_attention' {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'moderate';
  return 'needs_attention';
}

/**
 * Get trend color based on quality
 */
export function getTrendColor(percentage: number): string {
  const quality = getTrendQuality(percentage);
  switch (quality) {
    case 'excellent': return '#22C55E'; // green-500
    case 'good': return '#3B82F6';      // blue-500
    case 'moderate': return '#EAB308';  // yellow-500
    case 'needs_attention': return '#F97316'; // orange-500
  }
}

/**
 * Generate compassionate message based on status
 */
export function getCompassionateMessage(status: Omit<StreakStatus, 'message'>): CompassionateMessage {
  // Recovery complete - celebrate!
  if (status.isRecovering && status.recoveryProgress >= 3) {
    return {
      type: 'recovery_complete',
      title: 'Recuperado!',
      message: 'Sua jornada continua. Cada dia e uma nova oportunidade.',
      emoji: '🎉',
    };
  }

  // Currently recovering
  if (status.isRecovering) {
    const remaining = status.recoveryTasksNeeded - status.recoveryProgress;
    return {
      type: 'recovery_in_progress',
      title: 'Em Recuperacao',
      message: `Complete mais ${remaining} tarefa${remaining > 1 ? 's' : ''} para retomar sua jornada.`,
      emoji: '💪',
    };
  }

  // In grace period
  if (status.isInGracePeriod) {
    return {
      type: 'grace_period_active',
      title: 'Período de Descanso',
      message: `Cuide-se! Você tem ${status.gracePeriodRemaining} dias de descanso restantes este mes.`,
      emoji: '💚',
    };
  }

  // Can use grace period (missed yesterday but can recover)
  if (status.daysSinceLastActivity === 1 && status.gracePeriodRemaining > 0) {
    return {
      type: 'grace_period_available',
      title: 'Tudo Bem!',
      message: 'A vida acontece. Use um período de descanso ou complete algumas tarefas para continuar.',
      emoji: '🌱',
      actionLabel: 'Usar Período de Descanso',
      actionType: 'use_grace_period',
    };
  }

  // Can recover (missed more than 1 day)
  if (status.canRecover && status.daysSinceLastActivity > 1) {
    return {
      type: 'recovery_available',
      title: 'Bem-vindo de Volta!',
      message: `Complete 3 tarefas para retomar sua jornada. O importante e recomectar.`,
      emoji: '🌅',
      actionLabel: 'Iniciar Recuperacao',
      actionType: 'start_recovery',
    };
  }

  // Comeback after long absence (7+ days)
  if (status.daysSinceLastActivity >= 7) {
    return {
      type: 'comeback_celebration',
      title: 'Que Bom Te Ver!',
      message: 'Não importa quanto tempo passou. O que importa e que você voltou.',
      emoji: '🌟',
      actionLabel: 'Recomeccar',
      actionType: 'start_recovery',
    };
  }

  // Excellent trend (90%+)
  if (status.trendPercentage >= 90) {
    return {
      type: 'trend_celebration',
      title: 'Incrivel!',
      message: `${status.currentTrend}/${status.trendWindow} dias ativos. Consistencia real!`,
      emoji: '🔥',
    };
  }

  // Good trend (70%+)
  if (status.trendPercentage >= 70) {
    return {
      type: 'trend_celebration',
      title: 'Otimo Progresso!',
      message: `${status.currentTrend}/${status.trendWindow} dias ativos. Continue assim!`,
      emoji: '✨',
    };
  }

  // Moderate trend (50%+)
  if (status.trendPercentage >= 50) {
    return {
      type: 'gentle_reminder',
      title: 'Cada Dia Conta',
      message: `${status.currentTrend}/${status.trendWindow} dias. Você esta construindo algo.`,
      emoji: '🌱',
    };
  }

  // Default - gentle encouragement
  return {
    type: 'gentle_reminder',
    title: 'Um Passo de Cada Vez',
    message: 'Pequenos progressos levam a grandes mudancas.',
    emoji: '🌿',
  };
}

/**
 * Check if today is a new month (for resetting grace periods)
 */
export function isNewMonth(lastGracePeriodDate: string | null): boolean {
  if (!lastGracePeriodDate) return true;

  const last = new Date(lastGracePeriodDate);
  const now = new Date();

  return last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear();
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayISO();
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split('T')[0];
}
