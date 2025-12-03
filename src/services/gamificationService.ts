/**
 * Gamification Service
 *
 * Complete gamification system including:
 * - XP (Experience Points) tracking
 * - Leveling system with progression
 * - Achievement badges
 * - Streak counters (daily, task-specific)
 * - Leaderboard support
 * - Rewards and unlockables
 */

import { supabase } from './supabaseClient';
import { notificationService } from './notificationService';

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
const BADGES_CATALOG: Record<string, Badge> = {
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
    console.error('Error adding XP:', error);
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
    console.error('Error fetching user game profile:', error);
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
    console.error('Error updating streak:', error);
    throw error;
  }
}

/**
 * Get user's streak information
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
    console.error('Error fetching user streak:', error);
    return { current: 0, longest: 0, last_activity: '', active: false };
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
      console.error(`Badge ${badgeId} not found`);
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
      console.log(`User already has badge ${badgeId}`);
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
    console.error('Error awarding achievement:', error);
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
    console.error('Error fetching achievements:', error);
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
      .eq('completed_at', 'not.is', null);

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
    console.error('Error checking achievements:', error);
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
    console.error('Error fetching leaderboard:', error);
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

    const { data, error } = await supabase
      .from('user_stats')
      .select('id')
      .eq('is_active', true)
      .filter('total_xp', 'gt', userStats.total_xp)
      .or(`and(total_xp.eq.${userStats.total_xp},level.gt.${userStats.level})`);

    if (error) throw error;

    return (data?.length || 0) + 1;
  } catch (error) {
    console.error('Error fetching leaderboard position:', error);
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
