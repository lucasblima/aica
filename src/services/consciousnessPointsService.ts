/**
 * Consciousness Points Service
 * Issue #XXX: Gamification 2.0 - Meaningful Reward System
 *
 * Manages Consciousness Points (CP) - a separate currency from XP that rewards:
 * - Quality of presence, not just quantity
 * - Relationship care (integrates with Health Score)
 * - Reflection and self-awareness
 * - Intentional action over mechanical completion
 */

import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { notificationService } from './notificationService';
import { streakRecoveryService } from './streakRecoveryService';
import {
  CPCategory,
  CPTransaction,
  CPBalance,
  CPReward,
  CPConfig,
  CP_REWARDS,
  DEFAULT_CP_CONFIG,
  DEFAULT_CP_BALANCE,
  getCPReward,
  calculateStreakMultiplier,
  applyDailyCap,
  formatCP,
  getCPCategoryDisplayName,
  getCPCategoryIcon,
} from '@/types/consciousnessPoints';

const log = createNamespacedLogger('ConsciousnessPointsService');

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get user's CP balance
 */
export async function getCPBalance(userId: string): Promise<CPBalance> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('consciousness_points')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found, return default
        return { ...DEFAULT_CP_BALANCE, user_id: userId };
      }
      throw error;
    }

    if (!data.consciousness_points) {
      return { ...DEFAULT_CP_BALANCE, user_id: userId };
    }

    return data.consciousness_points as CPBalance;
  } catch (error) {
    log.error('Error getting CP balance', { userId, error });
    return { ...DEFAULT_CP_BALANCE, user_id: userId };
  }
}

/**
 * Award consciousness points to user
 */
export async function awardCP(
  userId: string,
  rewardId: string,
  options: {
    customAmount?: number;
    customDescription?: string;
    metadata?: Record<string, unknown>;
    silent?: boolean;
  } = {}
): Promise<{
  success: boolean;
  awarded: number;
  balance: CPBalance;
  message?: string;
}> {
  try {
    const reward = getCPReward(rewardId);
    if (!reward && !options.customAmount) {
      return {
        success: false,
        awarded: 0,
        balance: await getCPBalance(userId),
        message: `Reward ${rewardId} not found`,
      };
    }

    // Get current balance
    const currentBalance = await getCPBalance(userId);
    const config = DEFAULT_CP_CONFIG;

    // Calculate base amount
    let baseAmount = options.customAmount || reward?.amount || 0;

    // Check daily cap for this reward type
    if (reward?.max_daily) {
      const todayTransactions = await getTransactionsToday(userId, rewardId);
      if (todayTransactions.length >= reward.max_daily) {
        return {
          success: false,
          awarded: 0,
          balance: currentBalance,
          message: `Limite diário atingido para ${reward.name}`,
        };
      }
    }

    // Check cooldown
    if (reward?.cooldown_hours) {
      const lastTransaction = await getLastTransaction(userId, rewardId);
      if (lastTransaction) {
        const hoursSince = getHoursSince(lastTransaction.created_at);
        if (hoursSince < reward.cooldown_hours) {
          const hoursRemaining = Math.ceil(reward.cooldown_hours - hoursSince);
          return {
            success: false,
            awarded: 0,
            balance: currentBalance,
            message: `Aguarde ${hoursRemaining}h para ${reward.name}`,
          };
        }
      }
    }

    // Apply streak multiplier
    const streakStatus = await streakRecoveryService.getStreakStatus(userId);
    const multiplier = calculateStreakMultiplier(streakStatus.trendPercentage, config);
    const multipliedAmount = Math.round(baseAmount * multiplier);

    // Apply daily cap
    const cappedAmount = applyDailyCap(
      currentBalance.cp_earned_today,
      multipliedAmount,
      config
    );

    if (cappedAmount === 0) {
      return {
        success: false,
        awarded: 0,
        balance: currentBalance,
        message: 'Limite diário de CP atingido. Volte amanhã!',
      };
    }

    // Create transaction
    const transaction: Omit<CPTransaction, 'id' | 'created_at'> = {
      user_id: userId,
      amount: cappedAmount,
      category: reward?.category || 'intention',
      source: rewardId,
      description: options.customDescription || reward?.description || 'CP earned',
      metadata: options.metadata,
    };

    // Save transaction
    const { error: txError } = await supabase
      .from('cp_transactions')
      .insert(transaction);

    if (txError) {
      log.warn('Could not save CP transaction, continuing anyway', { txError });
    }

    // Update balance
    const today = new Date().toISOString().split('T')[0];
    const newBalance: CPBalance = {
      ...currentBalance,
      total_cp: currentBalance.total_cp + cappedAmount,
      current_cp: currentBalance.current_cp + cappedAmount,
      lifetime_cp: currentBalance.lifetime_cp + cappedAmount,
      cp_by_category: {
        ...currentBalance.cp_by_category,
        [reward?.category || 'intention']:
          (currentBalance.cp_by_category[reward?.category || 'intention'] || 0) + cappedAmount,
      },
      cp_earned_today: currentBalance.cp_earned_today + cappedAmount,
      cp_earned_this_week: currentBalance.cp_earned_this_week + cappedAmount,
      cp_earned_this_month: currentBalance.cp_earned_this_month + cappedAmount,
      last_earned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to database
    await saveCPBalance(userId, newBalance);

    // Show notification (unless silent)
    if (!options.silent) {
      const icon = reward ? getCPCategoryIcon(reward.category) : '✨';
      const categoryName = reward
        ? getCPCategoryDisplayName(reward.category)
        : 'Consciência';

      notificationService.show({
        type: 'success',
        title: `+${cappedAmount} CP`,
        message: `${categoryName}: ${reward?.name || 'Pontos ganhos'}`,
        icon,
        duration: 3000,
      });
    }

    log.info('CP awarded', {
      userId,
      rewardId,
      baseAmount,
      multiplier,
      cappedAmount,
    });

    return {
      success: true,
      awarded: cappedAmount,
      balance: newBalance,
    };
  } catch (error) {
    log.error('Error awarding CP', { userId, rewardId, error });
    return {
      success: false,
      awarded: 0,
      balance: await getCPBalance(userId),
      message: 'Erro ao adicionar CP',
    };
  }
}

/**
 * Award CP for relationship care (Health Score integration)
 * Called when user cares for an at-risk contact
 */
export async function awardRelationshipCareCP(
  userId: string,
  contactId: string,
  contactName: string
): Promise<{ success: boolean; awarded: number }> {
  const result = await awardCP(userId, 'relationship_care', {
    customDescription: `Cuidou de ${contactName}`,
    metadata: { contactId, contactName },
  });

  return {
    success: result.success,
    awarded: result.awarded,
  };
}

/**
 * Get CP transaction history
 */
export async function getCPHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    category?: CPCategory;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<CPTransaction[]> {
  try {
    let query = supabase
      .from('cp_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.category) {
      query = query.eq('category', options.category);
    }
    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error getting CP history', { userId, error });
    return [];
  }
}

/**
 * Get CP leaderboard
 */
export async function getCPLeaderboard(
  limit: number = 10
): Promise<{ rank: number; userName: string; totalCP: number }[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_cp_leaderboard', { p_limit: limit });

    if (error) throw error;

    return (data || []).map((entry: { rank: number; user_name: string; total_cp: number }) => ({
      rank: entry.rank,
      userName: entry.user_name || 'Anonymous',
      totalCP: entry.total_cp || 0,
    }));
  } catch (error) {
    log.error('Error getting CP leaderboard', { error });
    return [];
  }
}

/**
 * Reset daily CP counters (should be called by a cron job)
 */
export async function resetDailyCounters(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('reset_daily_cp_counters');

    if (error) throw error;
    log.info('Daily CP counters reset', { count: data });
  } catch (error) {
    log.error('Error resetting daily CP counters', { error });
  }
}

/**
 * Check and award weekly bonus
 */
export async function checkWeeklyBonus(userId: string): Promise<{
  awarded: boolean;
  amount: number;
}> {
  try {
    const config = DEFAULT_CP_CONFIG;
    if (!config.weeklyBonusEnabled) {
      return { awarded: false, amount: 0 };
    }

    // Get days active this week
    const weekStart = getWeekStart();
    const { data, error } = await supabase
      .from('cp_transactions')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString());

    if (error) throw error;

    // Count unique days
    const uniqueDays = new Set(
      (data || []).map((t) => t.created_at.split('T')[0])
    );

    if (uniqueDays.size >= config.weeklyBonusMinDays) {
      const result = await awardCP(userId, 'consistency_milestone', {
        customAmount: config.weeklyBonusAmount,
        customDescription: `Bonus semanal: ${uniqueDays.size} dias ativos`,
      });

      return {
        awarded: result.success,
        amount: result.awarded,
      };
    }

    return { awarded: false, amount: 0 };
  } catch (error) {
    log.error('Error checking weekly bonus', { userId, error });
    return { awarded: false, amount: 0 };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Save CP balance to database
 */
async function saveCPBalance(userId: string, balance: CPBalance): Promise<void> {
  const { error } = await supabase
    .from('user_stats')
    .update({
      consciousness_points: balance,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    log.error('Error saving CP balance', { userId, error });
    throw error;
  }
}

/**
 * Get transactions for today by source
 */
async function getTransactionsToday(
  userId: string,
  source: string
): Promise<CPTransaction[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('cp_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('source', source)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lte('created_at', `${today}T23:59:59.999Z`);

  if (error) {
    log.warn('Error getting today transactions', { error });
    return [];
  }

  return data || [];
}

/**
 * Get last transaction for a source
 */
async function getLastTransaction(
  userId: string,
  source: string
): Promise<CPTransaction | null> {
  const { data, error } = await supabase
    .from('cp_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('source', source)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      log.warn('Error getting last transaction', { error });
    }
    return null;
  }

  return data;
}

/**
 * Calculate hours since a timestamp
 */
function getHoursSince(timestamp: string): number {
  const now = new Date();
  const then = new Date(timestamp);
  return (now.getTime() - then.getTime()) / (1000 * 60 * 60);
}

/**
 * Get start of current week (Monday)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const consciousnessPointsService = {
  getCPBalance,
  awardCP,
  awardRelationshipCareCP,
  getCPHistory,
  getCPLeaderboard,
  resetDailyCounters,
  checkWeeklyBonus,
};

export default consciousnessPointsService;
