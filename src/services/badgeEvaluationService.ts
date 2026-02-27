/**
 * Badge Evaluation Service
 * Gamification 2.0: RECIPE-based badge unlocking system
 *
 * This service:
 * - Evaluates user progress against badge unlock conditions
 * - Awards badges when conditions are met
 * - Respects White Hat / Black Hat settings
 * - Tracks badge progress for UI display
 */

import { supabase } from '@/services/supabaseClient';
import { addXP } from '@/services/gamificationService';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  BadgeDefinition,
  BadgeUnlockCondition,
  UserBadge,
  BadgeWithProgress,
  BadgeCategory,
} from '@/types/badges';
import {
  BADGE_CATALOG,
  getBadgeById,
  canEarnBadge,
  getWhiteHatBadges,
} from '@/types/badges';

const log = createNamespacedLogger('BadgeEvaluationService');

// ============================================================================
// TYPES
// ============================================================================

interface UserStats {
  user_id: string;
  total_xp: number;
  current_level: number;
  tasks_completed: number;
  streak_current: number;
  streak_best: number;
  streak_trend?: any;
  consciousness_points?: any;
  gamification_intensity?: 'minimal' | 'moderate' | 'full';
}

interface EvaluationContext {
  userId: string;
  userStats: UserStats;
  earnedBadgeIds: string[];
  blackHatEnabled: boolean;
}

interface BadgeAwardResult {
  success: boolean;
  badge?: BadgeDefinition;
  xpAwarded: number;
  cpAwarded: number;
  error?: string;
}

// ============================================================================
// FETCH USER CONTEXT
// ============================================================================

/**
 * Fetch user stats for badge evaluation
 */
async function fetchUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    log.error('Error fetching user stats:', error);
    return null;
  }

  return data;
}

/**
 * Fetch earned badge IDs for user
 */
async function fetchEarnedBadgeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  if (error) {
    log.error('Error fetching earned badges:', error);
    return [];
  }

  return data?.map(a => a.achievement_id) || [];
}

/**
 * Build evaluation context
 */
async function buildEvaluationContext(userId: string): Promise<EvaluationContext | null> {
  const [userStats, earnedBadgeIds] = await Promise.all([
    fetchUserStats(userId),
    fetchEarnedBadgeIds(userId),
  ]);

  if (!userStats) {
    log.error('Could not build evaluation context - no user stats');
    return null;
  }

  // Check if black hat is enabled (default: false)
  const streakTrend = userStats.streak_trend || {};
  const blackHatEnabled = streakTrend.black_hat_enabled === true;

  return {
    userId,
    userStats,
    earnedBadgeIds,
    blackHatEnabled,
  };
}

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

/**
 * Evaluate a single unlock condition
 * Returns progress as 0-100 percentage
 */
async function evaluateCondition(
  condition: BadgeUnlockCondition,
  context: EvaluationContext
): Promise<{ met: boolean; progress: number; display: string }> {
  const { userId, userStats } = context;

  switch (condition.type) {
    case 'streak_days': {
      const current = userStats.streak_current || 0;
      const progress = Math.min(100, (current / condition.days) * 100);
      return {
        met: current >= condition.days,
        progress,
        display: `${current}/${condition.days} dias`,
      };
    }

    case 'streak_recovery': {
      const recoveries = userStats.streak_trend?.total_recoveries || 0;
      const progress = Math.min(100, (recoveries / condition.count) * 100);
      return {
        met: recoveries >= condition.count,
        progress,
        display: `${recoveries}/${condition.count} recuperações`,
      };
    }

    case 'grace_period_used': {
      const used = userStats.streak_trend?.grace_periods_used_this_month || 0;
      const progress = Math.min(100, (used / condition.count) * 100);
      return {
        met: used >= condition.count,
        progress,
        display: `${used}/${condition.count} períodos`,
      };
    }

    case 'tasks_completed': {
      const completed = userStats.tasks_completed || 0;
      const progress = Math.min(100, (completed / condition.count) * 100);
      return {
        met: completed >= condition.count,
        progress,
        display: `${completed}/${condition.count} tarefas`,
      };
    }

    case 'tasks_priority': {
      // Query work_items by priority
      const { count } = await supabase
        .from('work_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('priority', condition.priority)
        .not('completed_at', 'is', null);

      const completed = count || 0;
      const progress = Math.min(100, (completed / condition.count) * 100);
      return {
        met: completed >= condition.count,
        progress,
        display: `${completed}/${condition.count} Q${condition.priority}`,
      };
    }

    case 'cp_earned': {
      const cp = userStats.consciousness_points?.lifetime_cp || 0;
      const progress = Math.min(100, (cp / condition.amount) * 100);
      return {
        met: cp >= condition.amount,
        progress,
        display: `${cp}/${condition.amount} CP`,
      };
    }

    case 'cp_category': {
      const categoryCP = userStats.consciousness_points?.cp_by_category?.[condition.category] || 0;
      const progress = Math.min(100, (categoryCP / condition.amount) * 100);
      return {
        met: categoryCP >= condition.amount,
        progress,
        display: `${categoryCP}/${condition.amount} CP`,
      };
    }

    case 'journal_entries': {
      const { count } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('moment_type', 'journal');

      const entries = count || 0;
      const progress = Math.min(100, (entries / condition.count) * 100);
      return {
        met: entries >= condition.count,
        progress,
        display: `${entries}/${condition.count} entradas`,
      };
    }

    case 'mood_checks': {
      const { count } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('moment_type', ['check_in', 'reflection', 'emotion']);

      const checks = count || 0;
      const progress = Math.min(100, (checks / condition.count) * 100);
      return {
        met: checks >= condition.count,
        progress,
        display: `${checks}/${condition.count} check-ins`,
      };
    }

    case 'contacts_cared': {
      // Count unique contacts where user took care action
      const { count } = await supabase
        .from('cp_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', 'relationship_care');

      const cared = count || 0;
      const progress = Math.min(100, (cared / condition.count) * 100);
      return {
        met: cared >= condition.count,
        progress,
        display: `${cared}/${condition.count} contatos`,
      };
    }

    case 'health_score_improved': {
      // Count contacts with improved health score
      const { count } = await supabase
        .from('contact_health_history')
        .select('*', { count: 'exact', head: true })
        .gt('score_delta', 0);

      const improved = count || 0;
      const progress = Math.min(100, (improved / condition.count) * 100);
      return {
        met: improved >= condition.count,
        progress,
        display: `${improved}/${condition.count} melhorias`,
      };
    }

    case 'focus_sessions': {
      // Query focus sessions from moments table
      const minMinutes = condition.min_minutes || 0;
      const { count } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('moment_type', 'focus_session')
        .gte('metadata->>duration_minutes', minMinutes);

      const sessions = count || 0;
      const progress = Math.min(100, (sessions / condition.count) * 100);
      return {
        met: sessions >= condition.count,
        progress,
        display: `${sessions}/${condition.count} sessões`,
      };
    }

    case 'trend_maintained': {
      const trend = userStats.streak_trend;
      const percentage = trend?.trend_percentage || 0;
      const daysTracked = trend?.days_tracked || 0;

      const metPercentage = percentage >= condition.percentage;
      const metDays = daysTracked >= condition.days;
      const progress = metPercentage
        ? Math.min(100, (daysTracked / condition.days) * 100)
        : Math.min(100, (percentage / condition.percentage) * 100);

      return {
        met: metPercentage && metDays,
        progress,
        display: `${percentage}% por ${daysTracked}/${condition.days}d`,
      };
    }

    case 'level_reached': {
      const level = userStats.current_level || 0;
      const progress = Math.min(100, (level / condition.level) * 100);
      return {
        met: level >= condition.level,
        progress,
        display: `Nível ${level}/${condition.level}`,
      };
    }

    case 'badges_earned': {
      const earned = context.earnedBadgeIds.length;
      const progress = Math.min(100, (earned / condition.count) * 100);
      return {
        met: earned >= condition.count,
        progress,
        display: `${earned}/${condition.count} badges`,
      };
    }

    case 'compound': {
      const results = await Promise.all(
        condition.conditions.map(c => evaluateCondition(c, context))
      );

      if (condition.operator === 'AND') {
        const allMet = results.every(r => r.met);
        const avgProgress = results.reduce((sum, r) => sum + r.progress, 0) / results.length;
        return {
          met: allMet,
          progress: avgProgress,
          display: results.map(r => r.display).join(' + '),
        };
      } else {
        const anyMet = results.some(r => r.met);
        const maxProgress = Math.max(...results.map(r => r.progress));
        return {
          met: anyMet,
          progress: maxProgress,
          display: results.map(r => r.display).join(' ou '),
        };
      }
    }

    default:
      return { met: false, progress: 0, display: 'Desconhecido' };
  }
}

// ============================================================================
// BADGE AWARDING
// ============================================================================

/**
 * Award a badge to user
 */
async function awardBadge(
  userId: string,
  badge: BadgeDefinition,
  progress: number
): Promise<BadgeAwardResult> {
  log.info('Awarding badge:', { userId, badgeId: badge.id });

  try {
    // Insert into user_achievements
    const { error: insertError } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: badge.id,
        earned_at: new Date().toISOString(),
        metadata: {
          progress_at_unlock: progress,
          badge_name: badge.name,
          badge_category: badge.category,
          badge_rarity: badge.rarity,
        },
      });

    if (insertError) {
      // Check if already earned (duplicate key)
      if (insertError.code === '23505') {
        log.info('Badge already earned:', badge.id);
        return { success: false, xpAwarded: 0, cpAwarded: 0, error: 'Badge already earned' };
      }
      throw insertError;
    }

    // Award XP
    if (badge.xp_reward > 0) {
      await addXP(userId, badge.xp_reward);
    }

    // Award CP (only for White Hat badges)
    if (badge.cp_reward > 0 && badge.hat_type === 'white_hat') {
      const { error: cpError } = await supabase
        .from('cp_transactions')
        .insert({
          user_id: userId,
          amount: badge.cp_reward,
          category: 'growth',
          source: `badge_${badge.id}`,
          description: `Badge conquistado: ${badge.name}`,
          metadata: {
            badge_id: badge.id,
            badge_category: badge.category,
            badge_rarity: badge.rarity,
          },
        });

      if (cpError) {
        log.error('Error awarding CP for badge:', cpError);
      }

      // Update CP balance
      await updateCPBalance(userId, badge.cp_reward);
    }

    log.info('Badge awarded successfully:', {
      badgeId: badge.id,
      xpAwarded: badge.xp_reward,
      cpAwarded: badge.hat_type === 'white_hat' ? badge.cp_reward : 0,
    });

    return {
      success: true,
      badge,
      xpAwarded: badge.xp_reward,
      cpAwarded: badge.hat_type === 'white_hat' ? badge.cp_reward : 0,
    };
  } catch (error) {
    log.error('Error awarding badge:', error);
    return {
      success: false,
      xpAwarded: 0,
      cpAwarded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update CP balance after awarding
 */
async function updateCPBalance(userId: string, amount: number): Promise<void> {
  const { data: stats } = await supabase
    .from('user_stats')
    .select('consciousness_points')
    .eq('user_id', userId)
    .single();

  if (!stats) return;

  const cp = stats.consciousness_points || {};
  const updatedCP = {
    ...cp,
    total_cp: (cp.total_cp || 0) + amount,
    current_cp: (cp.current_cp || 0) + amount,
    lifetime_cp: (cp.lifetime_cp || 0) + amount,
    cp_by_category: {
      ...cp.cp_by_category,
      growth: (cp.cp_by_category?.growth || 0) + amount,
    },
    cp_earned_today: (cp.cp_earned_today || 0) + amount,
    cp_earned_this_week: (cp.cp_earned_this_week || 0) + amount,
    cp_earned_this_month: (cp.cp_earned_this_month || 0) + amount,
    last_earned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('user_stats')
    .update({ consciousness_points: updatedCP })
    .eq('user_id', userId);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Evaluate all badges for a user
 * Returns badges with progress info
 */
export async function evaluateAllBadges(
  userId: string
): Promise<BadgeWithProgress[]> {
  log.info('Evaluating all badges for user:', userId);

  const context = await buildEvaluationContext(userId);
  if (!context) {
    return [];
  }

  const results: BadgeWithProgress[] = [];

  for (const badge of BADGE_CATALOG) {
    // Check if badge can be earned based on hat type
    const canEarn = canEarnBadge(badge, context.blackHatEnabled);
    const isEarned = context.earnedBadgeIds.includes(badge.id);

    if (isEarned) {
      // Already earned
      results.push({
        ...badge,
        earned: true,
        progress: 100,
        progress_display: 'Conquistado!',
        can_earn: canEarn,
      });
    } else if (!canEarn) {
      // Can't earn (Black Hat disabled)
      results.push({
        ...badge,
        earned: false,
        progress: 0,
        progress_display: 'Desabilitado',
        can_earn: false,
      });
    } else {
      // Evaluate condition
      const { met, progress, display } = await evaluateCondition(
        badge.unlock_condition,
        context
      );

      results.push({
        ...badge,
        earned: false,
        progress,
        progress_display: display,
        can_earn: canEarn,
      });
    }
  }

  return results;
}

/**
 * Check for new badges to award
 * Call this after relevant user actions
 */
export async function checkAndAwardBadges(
  userId: string
): Promise<BadgeAwardResult[]> {
  log.info('Checking for new badges to award:', userId);

  const context = await buildEvaluationContext(userId);
  if (!context) {
    return [];
  }

  const newBadges: BadgeAwardResult[] = [];

  // Only check White Hat badges (or Black Hat if enabled)
  const badgesToCheck = BADGE_CATALOG.filter(b =>
    canEarnBadge(b, context.blackHatEnabled) &&
    !context.earnedBadgeIds.includes(b.id)
  );

  for (const badge of badgesToCheck) {
    const { met, progress } = await evaluateCondition(
      badge.unlock_condition,
      context
    );

    if (met) {
      const result = await awardBadge(userId, badge, progress);
      if (result.success) {
        newBadges.push(result);
        // Update context to include newly earned badge
        context.earnedBadgeIds.push(badge.id);
      }
    }
  }

  if (newBadges.length > 0) {
    log.info(`Awarded ${newBadges.length} new badge(s)`);
  }

  return newBadges;
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    log.error('Error fetching user badges:', error);
    return [];
  }

  return data.map(a => ({
    id: a.id,
    user_id: a.user_id,
    badge_id: a.achievement_id,
    earned_at: a.earned_at,
    displayed: a.displayed ?? true,
    favorite: a.favorite ?? false,
    progress_at_unlock: a.metadata?.progress_at_unlock ?? 100,
    metadata: a.metadata,
  }));
}

/**
 * Get badges by category with progress
 */
export async function getBadgesByCategory(
  userId: string,
  category: BadgeCategory
): Promise<BadgeWithProgress[]> {
  const allBadges = await evaluateAllBadges(userId);
  return allBadges.filter(b => b.category === category);
}

/**
 * Get badge statistics for user
 */
export async function getBadgeStats(userId: string): Promise<{
  total: number;
  earned: number;
  available: number;
  byCategory: Record<BadgeCategory, { total: number; earned: number }>;
  byRarity: Record<string, { total: number; earned: number }>;
  totalXpFromBadges: number;
  totalCpFromBadges: number;
}> {
  const context = await buildEvaluationContext(userId);
  if (!context) {
    return {
      total: 0,
      earned: 0,
      available: 0,
      byCategory: {} as any,
      byRarity: {},
      totalXpFromBadges: 0,
      totalCpFromBadges: 0,
    };
  }

  const availableBadges = BADGE_CATALOG.filter(b =>
    canEarnBadge(b, context.blackHatEnabled)
  );

  const earnedBadges = availableBadges.filter(b =>
    context.earnedBadgeIds.includes(b.id)
  );

  const byCategory: Record<BadgeCategory, { total: number; earned: number }> = {
    reflection: { total: 0, earned: 0 },
    flow: { total: 0, earned: 0 },
    comeback: { total: 0, earned: 0 },
    connection: { total: 0, earned: 0 },
    mastery: { total: 0, earned: 0 },
  };

  const byRarity: Record<string, { total: number; earned: number }> = {
    common: { total: 0, earned: 0 },
    rare: { total: 0, earned: 0 },
    epic: { total: 0, earned: 0 },
    legendary: { total: 0, earned: 0 },
  };

  let totalXpFromBadges = 0;
  let totalCpFromBadges = 0;

  for (const badge of availableBadges) {
    byCategory[badge.category].total++;
    byRarity[badge.rarity].total++;

    if (context.earnedBadgeIds.includes(badge.id)) {
      byCategory[badge.category].earned++;
      byRarity[badge.rarity].earned++;
      totalXpFromBadges += badge.xp_reward;
      if (badge.hat_type === 'white_hat') {
        totalCpFromBadges += badge.cp_reward;
      }
    }
  }

  return {
    total: availableBadges.length,
    earned: earnedBadges.length,
    available: availableBadges.length - earnedBadges.length,
    byCategory,
    byRarity,
    totalXpFromBadges,
    totalCpFromBadges,
  };
}

/**
 * Toggle badge favorite status
 */
export async function toggleBadgeFavorite(
  userId: string,
  badgeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('favorite')
    .eq('user_id', userId)
    .eq('achievement_id', badgeId)
    .single();

  if (error || !data) return false;

  const newFavorite = !data.favorite;

  await supabase
    .from('user_achievements')
    .update({ favorite: newFavorite })
    .eq('user_id', userId)
    .eq('achievement_id', badgeId);

  return newFavorite;
}

/**
 * Toggle Black Hat badges setting
 */
export async function toggleBlackHatBadges(
  userId: string,
  enabled: boolean
): Promise<void> {
  const { data: stats } = await supabase
    .from('user_stats')
    .select('streak_trend')
    .eq('user_id', userId)
    .single();

  if (!stats) return;

  const updatedTrend = {
    ...stats.streak_trend,
    black_hat_enabled: enabled,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('user_stats')
    .update({ streak_trend: updatedTrend })
    .eq('user_id', userId);

  log.info('Black Hat badges toggled:', { userId, enabled });
}

// ============================================================================
// EXPORT
// ============================================================================

export const badgeEvaluationService = {
  evaluateAllBadges,
  checkAndAwardBadges,
  getUserBadges,
  getBadgesByCategory,
  getBadgeStats,
  toggleBadgeFavorite,
  toggleBlackHatBadges,
};

export default badgeEvaluationService;
