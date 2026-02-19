/**
 * Gamification Service
 *
 * Complete gamification system including:
 * - XP (Experience Points) tracking
 * - Leveling system with progression
 * - Achievement badges
 * - Streak trends (compassionate system - 47/50 days instead of rigid streaks)
 * - Leaderboard support
 * - Rewards and unlockables
 *
 * Gamification 2.0 Updates:
 * - Integrated with streakRecoveryService for compassionate streak handling
 * - Grace periods for life's unpredictability (4 per month)
 * - Recovery through effort (3 tasks), not punishment
 * - Focus on trends, celebrate comebacks
 */

import { supabase } from './supabaseClient';
import { notificationService } from './notificationService';
import { createNamespacedLogger } from '@/lib/logger';
import { streakRecoveryService } from './streakRecoveryService';
import {
  getTrendDisplayString,
  getTrendColor,
  getTrendQuality,
} from '@/types/streakTrend';
import type { CompassionateMessage } from '@/types/streakTrend';

const log = createNamespacedLogger('GamificationService');

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface UserGameProfile {
  user_id: string;
  total_xp: number;
  level: number;
  current_xp: number; // XP towards next level
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  total_badges: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_id: string;
  badge_name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  unlocked_at: string;
  progress?: number; // 0-100 for progress-based badges
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  unlock_condition: string;
  category: string; // 'productivity', 'learning', 'social', 'milestone'
}

export interface StreakInfo {
  current: number;
  longest: number;
  last_activity: string;
  active: boolean; // Is current streak still alive?
}

/**
 * Enhanced streak information with compassionate trend system
 * Gamification 2.0: Shows "47/50 dias" instead of rigid streak numbers
 */
export interface StreakTrendInfo extends StreakInfo {
  // Trend data (Gamification 2.0)
  trendDisplay: string; // "47/50 dias"
  trendPercentage: number; // 0-100
  trendQuality: 'excellent' | 'good' | 'moderate' | 'needs_attention';
  trendColor: string; // Hex color based on quality

  // Grace period status
  isInGracePeriod: boolean;
  gracePeriodRemaining: number; // Days remaining this month

  // Recovery status
  canRecover: boolean;
  isRecovering: boolean;
  recoveryProgress: number; // 0-3 tasks completed
  recoveryTasksNeeded: number;

  // Compassionate message for UI
  message: CompassionateMessage | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_name: string;
  level: number;
  total_xp: number;
  badges_count: number;
  current_streak: number;
}

// XP Requirements per level (exponential growth)
const XP_PER_LEVEL = 1000;
const XP_GROWTH_FACTOR = 1.15; // Each level requires 15% more XP

// Badge definitions
export const BADGES_CATALOG: Record<string, Badge> = {
  'first_task': {
    id: 'first_task',
    name: 'Getting Started',
    description: 'Complete your first task',
    icon: '🚀',
    rarity: 'common',
    xp_reward: 50,
    unlock_condition: 'complete_first_task',
    category: 'milestone',
  },
  'task_master': {
    id: 'task_master',
    name: 'Task Master',
    description: 'Complete 50 tasks',
    icon: '⭐',
    rarity: 'rare',
    xp_reward: 300,
    unlock_condition: 'complete_50_tasks',
    category: 'productivity',
  },
  'week_warrior': {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    rarity: 'rare',
    xp_reward: 250,
    unlock_condition: 'streak_7_days',
    category: 'productivity',
  },
  'month_marathon': {
    id: 'month_marathon',
    name: 'Month Marathon',
    description: 'Maintain a 30-day streak',
    icon: '🏃‍♂️',
    rarity: 'epic',
    xp_reward: 1000,
    unlock_condition: 'streak_30_days',
    category: 'productivity',
  },
  'social_butterfly': {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Interact with 20 different contacts',
    icon: '🦋',
    rarity: 'rare',
    xp_reward: 400,
    unlock_condition: 'interact_20_contacts',
    category: 'social',
  },
  'memory_keeper': {
    id: 'memory_keeper',
    name: 'Memory Keeper',
    description: 'Create 100 memories',
    icon: '🧠',
    rarity: 'rare',
    xp_reward: 500,
    unlock_condition: 'create_100_memories',
    category: 'learning',
  },
  'perfect_day': {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: 'Achieve 100% productivity score in a day',
    icon: '💯',
    rarity: 'epic',
    xp_reward: 600,
    unlock_condition: 'perfect_productivity_day',
    category: 'productivity',
  },
  'level_10': {
    id: 'level_10',
    name: 'Ascended',
    description: 'Reach level 10',
    icon: '👑',
    rarity: 'legendary',
    xp_reward: 2000,
    unlock_condition: 'reach_level_10',
    category: 'milestone',
  },
  // ============================================================================
  // FINANCE MODULE BADGES
  // ============================================================================
  'first_finance_upload': {
    id: 'first_finance_upload',
    name: 'Primeiro Extrato',
    description: 'Envie seu primeiro extrato bancario',
    icon: '📄',
    rarity: 'common',
    xp_reward: 25,
    unlock_condition: 'upload_first_statement',
    category: 'finance',
  },
  'budget_master': {
    id: 'budget_master',
    name: 'Mestre do Orcamento',
    description: 'Crie um orcamento mensal completo',
    icon: '💰',
    rarity: 'rare',
    xp_reward: 50,
    unlock_condition: 'create_full_budget',
    category: 'finance',
  },
  'saver_streak': {
    id: 'saver_streak',
    name: 'Sequencia de Economia',
    description: 'Fique abaixo do orcamento por 3 meses seguidos',
    icon: '🏆',
    rarity: 'epic',
    xp_reward: 100,
    unlock_condition: 'budget_streak_3_months',
    category: 'finance',
  },
  'financial_analyst': {
    id: 'financial_analyst',
    name: 'Analista Financeiro',
    description: 'Analise 10 extratos com o agente de IA',
    icon: '📊',
    rarity: 'rare',
    xp_reward: 75,
    unlock_condition: 'analyze_10_statements',
    category: 'finance',
  },
  // ============================================================================
  // WHATSAPP MODULE BADGES
  // ============================================================================
  'first_whatsapp_connect': {
    id: 'first_whatsapp_connect',
    name: 'Conectado',
    description: 'Conectou o WhatsApp pela primeira vez',
    icon: '📱',
    rarity: 'common',
    xp_reward: 50,
    unlock_condition: 'whatsapp_connected',
    category: 'social',
  },
  'consent_champion': {
    id: 'consent_champion',
    name: 'Guardião da Privacidade',
    description: 'Concedeu todos os consentimentos LGPD',
    icon: '🛡️',
    rarity: 'rare',
    xp_reward: 100,
    unlock_condition: 'all_consents_granted',
    category: 'social',
  },
  'emotional_awareness_beginner': {
    id: 'emotional_awareness_beginner',
    name: 'Consciência Emocional',
    description: 'Visualizou analytics do WhatsApp 5 vezes',
    icon: '🧠',
    rarity: 'rare',
    xp_reward: 150,
    unlock_condition: 'viewed_analytics_5x',
    category: 'social',
  },
  'emotional_awareness_master': {
    id: 'emotional_awareness_master',
    name: 'Mestre da Consciência',
    description: 'Visualizou analytics do WhatsApp 20 vezes',
    icon: '🧘',
    rarity: 'epic',
    xp_reward: 300,
    unlock_condition: 'viewed_analytics_20x',
    category: 'social',
  },
  'positive_vibes_30': {
    id: 'positive_vibes_30',
    name: 'Vibes Positivas',
    description: 'Manteve sentimento positivo por 30 dias',
    icon: '✨',
    rarity: 'epic',
    xp_reward: 500,
    unlock_condition: 'positive_sentiment_30_days',
    category: 'social',
  },
  'sentiment_explorer': {
    id: 'sentiment_explorer',
    name: 'Explorador Emocional',
    description: 'Analisou sentimento de 10 contatos diferentes',
    icon: '🔍',
    rarity: 'rare',
    xp_reward: 200,
    unlock_condition: 'analyzed_10_contacts',
    category: 'social',
  },
  // ============================================================================
  // AICA PROCESSING BADGES
  // ============================================================================
  'first_aica_analysis': {
    id: 'first_aica_analysis',
    name: 'Primeira Análise',
    description: 'Processou seu primeiro contato com a Aica',
    icon: '✨',
    rarity: 'common',
    xp_reward: 50,
    unlock_condition: 'first_contact_analysis',
    category: 'aica',
  },
  'aica_analyst_10': {
    id: 'aica_analyst_10',
    name: 'Analista Aica',
    description: 'Analisou 10 contatos com a Aica',
    icon: '📊',
    rarity: 'rare',
    xp_reward: 100,
    unlock_condition: 'analyzed_10_contacts_aica',
    category: 'aica',
  },
  'aica_analyst_25': {
    id: 'aica_analyst_25',
    name: 'Expert Aica',
    description: 'Analisou 25 contatos com a Aica',
    icon: '🏆',
    rarity: 'epic',
    xp_reward: 250,
    unlock_condition: 'analyzed_25_contacts_aica',
    category: 'aica',
  },
  'healthy_network': {
    id: 'healthy_network',
    name: 'Rede Saudável',
    description: 'Alcançou health score 80+ em 5 contatos',
    icon: '💚',
    rarity: 'rare',
    xp_reward: 150,
    unlock_condition: 'five_high_health_scores',
    category: 'aica',
  },
  'daily_claimer': {
    id: 'daily_claimer',
    name: 'Coletor Diário',
    description: 'Resgatou créditos diários 7 dias seguidos',
    icon: '🎁',
    rarity: 'rare',
    xp_reward: 100,
    unlock_condition: 'daily_claim_streak_7',
    category: 'aica',
  },
  // ============================================================================
  // FLUX MODULE BADGES
  // ============================================================================
  'first_athlete': {
    id: 'first_athlete',
    name: 'Primeiro Atleta',
    description: 'Cadastrou seu primeiro atleta no Flux',
    icon: '🏋️',
    rarity: 'common',
    xp_reward: 150,
    unlock_condition: 'create_first_athlete',
    category: 'flux',
  },
  'microcycle_complete': {
    id: 'microcycle_complete',
    name: 'Microciclo Completo',
    description: 'Completou um microciclo inteiro de treinamento',
    icon: '🔄',
    rarity: 'rare',
    xp_reward: 100,
    unlock_condition: 'complete_first_microcycle',
    category: 'flux',
  },
  'coach_dedicado': {
    id: 'coach_dedicado',
    name: 'Coach Dedicado',
    description: 'Supervisionou 100 treinos no total',
    icon: '🏅',
    rarity: 'epic',
    xp_reward: 500,
    unlock_condition: 'supervise_100_workouts',
    category: 'flux',
  },
  'alerta_resolvido': {
    id: 'alerta_resolvido',
    name: 'Alerta Resolvido',
    description: 'Resolveu 10 alertas de atletas',
    icon: '🔔',
    rarity: 'rare',
    xp_reward: 200,
    unlock_condition: 'resolve_10_alerts',
    category: 'flux',
  },
  'treinador_multimodal': {
    id: 'treinador_multimodal',
    name: 'Treinador Multimodal',
    description: 'Programou treinos com 3 ou mais modalidades diferentes',
    icon: '🎯',
    rarity: 'epic',
    xp_reward: 300,
    unlock_condition: 'use_3_modalities',
    category: 'flux',
  },
};

// ============================================================================
// FINANCE XP REWARDS
// ============================================================================
export const FINANCE_XP_REWARDS = {
  upload_statement: 25,
  categorize_transaction: 5,
  chat_with_agent: 10,
  create_budget: 20,
  achieve_budget_goal: 100,
};

// ============================================================================
// WHATSAPP XP REWARDS
// ============================================================================
export const WHATSAPP_XP_REWARDS = {
  connection: 50,
  consent_grant: 20,
  analytics_view: 10,
  contact_analysis: 15,
  anomaly_check: 5,
};

// ============================================================================
// FLUX MODULE XP REWARDS
// ============================================================================
export const FLUX_XP_REWARDS = {
  athlete_created: 50,
  microcycle_completed: 100,
  workout_supervised: 25,
  alert_resolved: 30,
  first_athlete: 150,
  feedback_reviewed: 15,
};

// ============================================================================
// AICA PROCESSING XP REWARDS
// ============================================================================
export const AICA_XP_REWARDS = {
  daily_login: 10,
  process_contact: 25,
  first_process: 50,
  high_health_score: 20, // When health score >= 80
  claim_daily_credits: 10,
  analyze_10_contacts: 100,
  analyze_25_contacts: 250,
};

// ============================================================================
// LEVEL & XP MANAGEMENT
// ============================================================================

/**
 * Calculate required XP for a specific level
 */
export function getXPRequiredForLevel(level: number): number {
  if (level <= 1) return 0;

  let totalXP = 0;
  for (let i = 1; i < level; i++) {
    totalXP += Math.floor(XP_PER_LEVEL * Math.pow(XP_GROWTH_FACTOR, i - 1));
  }

  return totalXP;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): { level: number; currentXP: number } {
  let level = 1;
  let currentXP = totalXP;

  while (true) {
    const requiredForNextLevel = getXPRequiredForLevel(level + 1) - getXPRequiredForLevel(level);
    if (currentXP >= requiredForNextLevel) {
      currentXP -= requiredForNextLevel;
      level++;
    } else {
      break;
    }
  }

  return { level, currentXP };
}

/**
 * Add XP to user
 */
export async function addXP(userId: string, xpAmount: number): Promise<UserGameProfile> {
  try {
    // Get current user stats
    let { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!userStats) {
      // Create if doesn't exist
      userStats = {
        user_id: userId,
        total_xp: 0,
        level: 1,
        current_xp: 0,
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: new Date().toISOString().split('T')[0],
        total_badges: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Add XP
    const newTotalXP = userStats.total_xp + xpAmount;
    const { level, currentXP } = getLevelFromXP(newTotalXP);

    // Check if leveled up
    const leveledUp = level > userStats.level;

    // Update stats
    const { data: updated } = await supabase
      .from('user_stats')
      .upsert([
        {
          ...userStats,
          total_xp: newTotalXP,
          level,
          current_xp: currentXP,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    // Notify if leveled up
    if (leveledUp) {
      notificationService.showAchievement(
        'Level Up!',
        `Congratulations! You reached level ${level}`,
        '⬆️'
      );
    }

    return updated;
  } catch (error) {
    log.error('Error adding XP', { error });
    throw error;
  }
}

/**
 * Get user's game profile
 */
export async function getUserGameProfile(userId: string): Promise<UserGameProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;

    return data;
  } catch (error) {
    log.error('Error fetching user game profile', { error });
    throw error;
  }
}

// ============================================================================
// STREAK MANAGEMENT
// ============================================================================

/**
 * Check and update daily streak
 * Called when user completes a task or activity
 */
export async function updateStreakStatus(userId: string): Promise<StreakInfo> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userStats = await getUserGameProfile(userId);

    if (!userStats) {
      throw new Error('User stats not found');
    }

    const lastActivityDate = userStats.last_activity_date;
    const daysSinceLastActivity = calculateDaysDiff(lastActivityDate, today);

    let currentStreak = userStats.current_streak;
    let longestStreak = userStats.longest_streak;
    let streakActive = true;

    // If activity was today, streak continues
    if (daysSinceLastActivity === 0) {
      // Already counted today, no change
    }
    // If activity was yesterday, increment streak
    else if (daysSinceLastActivity === 1) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }
    // If gap > 1 day, streak broken
    else {
      currentStreak = 1;
      streakActive = false;
    }

    // Update database
    await supabase
      .from('user_stats')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Notify on streak milestones
    if (currentStreak % 7 === 0) {
      notificationService.show({
        type: 'achievement',
        title: `${currentStreak}-Day Streak!`,
        message: `Keep it up! You're on fire 🔥`,
        icon: '🔥',
        duration: 5000,
      });
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      last_activity: today,
      active: streakActive,
    };
  } catch (error) {
    log.error('Error updating streak', { error });
    throw error;
  }
}

/**
 * Get user's streak information (legacy format)
 * @deprecated Use getUserStreakTrend for Gamification 2.0 compassionate streak system
 */
export async function getUserStreak(userId: string): Promise<StreakInfo> {
  try {
    const userStats = await getUserGameProfile(userId);

    if (!userStats) {
      return { current: 0, longest: 0, last_activity: '', active: false };
    }

    const today = new Date().toISOString().split('T')[0];
    const daysSinceLastActivity = calculateDaysDiff(userStats.last_activity_date, today);

    return {
      current: userStats.current_streak,
      longest: userStats.longest_streak,
      last_activity: userStats.last_activity_date,
      active: daysSinceLastActivity <= 1,
    };
  } catch (error) {
    log.error('Error fetching user streak', { error });
    return { current: 0, longest: 0, last_activity: '', active: false };
  }
}

// ============================================================================
// COMPASSIONATE STREAK SYSTEM (GAMIFICATION 2.0)
// ============================================================================

/**
 * Get user's streak with compassionate trend system
 * Gamification 2.0: Returns "47/50 dias" format with grace periods and recovery
 */
export async function getUserStreakTrend(userId: string): Promise<StreakTrendInfo> {
  try {
    const [status, legacyStreak] = await Promise.all([
      streakRecoveryService.getStreakStatus(userId),
      getUserStreak(userId),
    ]);

    return {
      // Legacy fields for backward compatibility
      current: status.currentTrend,
      longest: status.longestStreak,
      last_activity: legacyStreak.last_activity,
      active: status.isActive,

      // Trend data (Gamification 2.0)
      trendDisplay: getTrendDisplayString(status.currentTrend, status.trendWindow),
      trendPercentage: status.trendPercentage,
      trendQuality: getTrendQuality(status.trendPercentage),
      trendColor: getTrendColor(status.trendPercentage),

      // Grace period status
      isInGracePeriod: status.isInGracePeriod,
      gracePeriodRemaining: status.gracePeriodRemaining,

      // Recovery status
      canRecover: status.canRecover,
      isRecovering: status.isRecovering,
      recoveryProgress: status.recoveryProgress,
      recoveryTasksNeeded: status.recoveryTasksNeeded,

      // Compassionate message
      message: status.message,
    };
  } catch (error) {
    log.error('Error fetching streak trend', { error });
    return {
      current: 0,
      longest: 0,
      last_activity: '',
      active: false,
      trendDisplay: '0/50 dias',
      trendPercentage: 0,
      trendQuality: 'needs_attention',
      trendColor: '#F97316',
      isInGracePeriod: false,
      gracePeriodRemaining: 4,
      canRecover: true,
      isRecovering: false,
      recoveryProgress: 0,
      recoveryTasksNeeded: 3,
      message: null,
    };
  }
}

/**
 * Record daily activity with compassionate streak system
 * Called when user completes a task - updates trend instead of rigid streak
 */
export async function recordDailyActivity(userId: string): Promise<StreakTrendInfo> {
  try {
    // Record activity in the new compassionate system
    await streakRecoveryService.recordDailyActivity(userId);

    // Also maintain legacy streak for backward compatibility
    await updateStreakStatus(userId);

    // Return updated trend info
    return getUserStreakTrend(userId);
  } catch (error) {
    log.error('Error recording daily activity', { error });
    throw error;
  }
}

/**
 * Use a grace period (user chose to take a break)
 * Compassionate approach: Life happens, no punishment
 */
export async function useGracePeriod(userId: string): Promise<{
  success: boolean;
  message: CompassionateMessage;
  streakInfo: StreakTrendInfo;
}> {
  try {
    const result = await streakRecoveryService.useGracePeriod(userId);
    const streakInfo = await getUserStreakTrend(userId);

    if (result.success) {
      notificationService.show({
        type: 'info',
        title: result.message.title,
        message: result.message.message,
        icon: result.message.emoji,
        duration: 5000,
      });
    }

    return { ...result, streakInfo };
  } catch (error) {
    log.error('Error using grace period', { error });
    throw error;
  }
}

/**
 * Start recovery mode (user wants to recover after absence)
 * Compassionate approach: Recovery through effort (3 tasks), not payment
 */
export async function startStreakRecovery(userId: string): Promise<{
  success: boolean;
  message: CompassionateMessage;
  streakInfo: StreakTrendInfo;
}> {
  try {
    const result = await streakRecoveryService.startRecovery(userId);
    const streakInfo = await getUserStreakTrend(userId);

    if (result.success) {
      notificationService.show({
        type: 'info',
        title: result.message.title,
        message: result.message.message,
        icon: result.message.emoji,
        duration: 5000,
      });
    }

    return { ...result, streakInfo };
  } catch (error) {
    log.error('Error starting recovery', { error });
    throw error;
  }
}

/**
 * Check if user's streak needs attention (grace period or recovery)
 * Used for proactive UI prompts
 */
export async function checkStreakHealth(userId: string): Promise<{
  needsAttention: boolean;
  suggestedAction: 'none' | 'grace_period' | 'recovery';
  message: CompassionateMessage;
}> {
  try {
    return await streakRecoveryService.checkStreakHealth(userId);
  } catch (error) {
    log.error('Error checking streak health', { error });
    return {
      needsAttention: false,
      suggestedAction: 'none',
      message: {
        type: 'gentle_reminder',
        title: 'Um Passo de Cada Vez',
        message: 'Pequenos progressos levam a grandes mudancas.',
        emoji: '🌿',
      },
    };
  }
}

// ============================================================================
// ACHIEVEMENT & BADGE SYSTEM
// ============================================================================

/**
 * Award an achievement to user
 */
export async function awardAchievement(
  userId: string,
  badgeId: string
): Promise<Achievement | null> {
  try {
    const badge = BADGES_CATALOG[badgeId];
    if (!badge) {
      log.error(`Badge ${badgeId} not found`);
      return null;
    }

    // Check if already unlocked
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single();

    if (existing) {
      log.debug(`User already has badge ${badgeId}`);
      return null;
    }

    // Create achievement
    const { data: achievement } = await supabase
      .from('user_achievements')
      .insert([
        {
          user_id: userId,
          badge_id: badge.id,
          badge_name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity,
          xp_reward: badge.xp_reward,
          unlocked_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    // Award XP
    await addXP(userId, badge.xp_reward);

    // Increment badge count
    const userStats = await getUserGameProfile(userId);
    if (userStats) {
      await supabase
        .from('user_stats')
        .update({ total_badges: (userStats.total_badges || 0) + 1 })
        .eq('user_id', userId);
    }

    // Notify user
    notificationService.showAchievement(
      `${badge.name} Unlocked!`,
      `${badge.description} (+${badge.xp_reward} XP)`,
      badge.icon
    );

    return achievement;
  } catch (error) {
    log.error('Error awarding achievement', { error });
    throw error;
  }
}

/**
 * Get all achievements for a user
 */
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching achievements', { error });
    return [];
  }
}

/**
 * Check and award achievements based on conditions
 */
export async function checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
  try {
    const userStats = await getUserGameProfile(userId);
    const achievements: Achievement[] = [];

    if (!userStats) return achievements;

    // Get user stats for achievement checking
    const { data: taskMetrics } = await supabase
      .from('work_items')
      .select('id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    const completedTasksCount = taskMetrics?.length || 0;

    // First task badge
    if (completedTasksCount >= 1) {
      const achievement = await awardAchievement(userId, 'first_task');
      if (achievement) achievements.push(achievement);
    }

    // Task master badge (50 tasks)
    if (completedTasksCount >= 50) {
      const achievement = await awardAchievement(userId, 'task_master');
      if (achievement) achievements.push(achievement);
    }

    // Week warrior badge
    const streak = await getUserStreak(userId);
    if (streak.current >= 7) {
      const achievement = await awardAchievement(userId, 'week_warrior');
      if (achievement) achievements.push(achievement);
    }

    // Month marathon badge
    if (streak.current >= 30) {
      const achievement = await awardAchievement(userId, 'month_marathon');
      if (achievement) achievements.push(achievement);
    }

    // Level 10 badge
    if (userStats.level >= 10) {
      const achievement = await awardAchievement(userId, 'level_10');
      if (achievement) achievements.push(achievement);
    }

    return achievements;
  } catch (error) {
    log.error('Error checking achievements', { error });
    return [];
  }
}

// ============================================================================
// LEADERBOARD
// ============================================================================

/**
 * Get global leaderboard
 */
export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select(`
        *,
        user:users(name)
      `)
      .eq('is_active', true)
      .order('level', { ascending: false })
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((stat, index) => ({
      rank: index + 1,
      user_name: stat.user.name,
      level: stat.level,
      total_xp: stat.total_xp,
      badges_count: stat.total_badges,
      current_streak: stat.current_streak,
    }));
  } catch (error) {
    log.error('Error fetching leaderboard', { error });
    return [];
  }
}

/**
 * Get user's leaderboard position
 */
export async function getUserLeaderboardPosition(userId: string): Promise<number> {
  try {
    const userStats = await getUserGameProfile(userId);
    if (!userStats) return -1;

    // Count users with higher XP OR (same XP but higher level)
    // Since Supabase .or() with nested AND is complex, we'll fetch all and filter in memory
    const { data, error } = await supabase
      .from('user_stats')
      .select('id, total_xp, level')
      .eq('is_active', true);

    if (error) throw error;

    // Filter users who rank higher: more XP OR (same XP AND higher level)
    const higherRankedUsers = (data || []).filter(user =>
      user.total_xp > userStats.total_xp ||
      (user.total_xp === userStats.total_xp && user.level > userStats.level)
    );

    return higherRankedUsers.length + 1;
  } catch (error) {
    log.error('Error fetching leaderboard position', { error });
    return -1;
  }
}

// ============================================================================
// REWARDS & UNLOCKABLES
// ============================================================================

/**
 * Get available rewards based on level
 */
export function getRewardsForLevel(level: number): string[] {
  const rewards: Record<number, string[]> = {
    1: ['Custom avatar frame'],
    5: ['Profile badge color customization'],
    10: ['Custom profile title'],
    15: ['Exclusive theme'],
    20: ['Priority support'],
    25: ['Feature voting rights'],
    30: ['Community badge'],
  };

  return rewards[level] || [];
}

/**
 * Get all badges catalog
 */
export function getBadgesCatalog(): Badge[] {
  return Object.values(BADGES_CATALOG);
}

/**
 * Get badge by ID
 */
export function getBadge(badgeId: string): Badge | null {
  return BADGES_CATALOG[badgeId] || null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate days difference between two dates
 */
function calculateDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get progress percentage for a level
 */
export function getLevelProgress(totalXP: number): number {
  const { level, currentXP } = getLevelFromXP(totalXP);
  const xpForCurrentLevel = getXPRequiredForLevel(level);
  const xpForNextLevel = getXPRequiredForLevel(level + 1);
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

  return Math.floor((currentXP / xpNeededForLevel) * 100);
}

/**
 * Get remaining XP to next level
 */
export function getXPToNextLevel(totalXP: number): number {
  const { level, currentXP } = getLevelFromXP(totalXP);
  const xpForCurrentLevel = getXPRequiredForLevel(level);
  const xpForNextLevel = getXPRequiredForLevel(level + 1);
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

  return xpNeededForLevel - currentXP;
}

/**
 * Format XP for display
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  } else if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * Get rarity color
 */
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#95a5a6',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f39c12',
  };
  return colors[rarity] || '#95a5a6';
}
