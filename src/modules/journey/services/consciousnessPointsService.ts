/**
 * Consciousness Points Service
 * Service layer for managing gamification points and levels
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import {
  UserConsciousnessStats,
  ConsciousnessPointsLog,
  AwardCPResult,
  CPReason,
  getProgressToNextLevel,
} from '../types/consciousnessPoints'

const log = createNamespacedLogger('ConsciousnessPoints')

/**
 * Get user consciousness stats
 */
export async function getUserConsciousnessStats(
  userId: string
): Promise<UserConsciousnessStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_consciousness_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // Create initial stats if not found
      if (error.code === 'PGRST116') {
        return await initializeUserStats(userId)
      }
      throw error
    }

    return data
  } catch (error) {
    log.error('Error fetching consciousness stats:', error)
    return null
  }
}

/**
 * Initialize user stats (first time)
 */
async function initializeUserStats(userId: string): Promise<UserConsciousnessStats> {
  try {
    const { data, error } = await supabase
      .from('user_consciousness_stats')
      .insert({
        user_id: userId,
        total_points: 0,
        level: 1,
        level_name: 'Observador',
        current_streak: 0,
        longest_streak: 0,
        total_moments: 0,
        total_questions_answered: 0,
        total_summaries_reflected: 0,
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    log.error('Error initializing stats:', error)
    throw error
  }
}

/**
 * Get CP log history
 */
export async function getCPLog(
  userId: string,
  limit: number = 50
): Promise<ConsciousnessPointsLog[]> {
  try {
    const { data, error } = await supabase
      .from('consciousness_points_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    log.error('Error fetching CP log:', error)
    return []
  }
}

/**
 * Get progress to next level
 */
export async function getUserProgress(userId: string): Promise<{
  stats: UserConsciousnessStats | null
  progress: ReturnType<typeof getProgressToNextLevel>
}> {
  const stats = await getUserConsciousnessStats(userId)
  if (!stats) {
    return {
      stats: null,
      progress: {
        current_level: 1,
        next_level: 2,
        points_to_next: 100,
        progress_percentage: 0,
      },
    }
  }

  const progress = getProgressToNextLevel(stats.total_points)

  return { stats, progress }
}

/**
 * Get recent achievements
 */
export async function getRecentAchievements(userId: string): Promise<{
  level_ups: { level: number; level_name: string; achieved_at: string }[]
  streaks: { streak: number; achieved_at: string }[]
}> {
  try {
    // Get level-ups from CP log (when user got enough points to level up)
    // This is a simplified version - you might want to track this separately
    const stats = await getUserConsciousnessStats(userId)

    return {
      level_ups: stats
        ? [
            {
              level: stats.level,
              level_name: stats.level_name,
              achieved_at: stats.updated_at,
            },
          ]
        : [],
      streaks: stats?.longest_streak
        ? [{ streak: stats.longest_streak, achieved_at: stats.updated_at }]
        : [],
    }
  } catch (error) {
    log.error('Error fetching achievements:', error)
    return { level_ups: [], streaks: [] }
  }
}

/**
 * Get leaderboard (top users by CP)
 */
export async function getLeaderboard(limit: number = 10): Promise<
  {
    user_id: string
    total_points: number
    level: number
    level_name: string
    rank: number
  }[]
> {
  try {
    const { data, error } = await supabase
      .from('user_consciousness_stats')
      .select('user_id, total_points, level, level_name')
      .order('total_points', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (
      data?.map((user, index) => ({
        ...user,
        rank: index + 1,
      })) || []
    )
  } catch (error) {
    log.error('Error fetching leaderboard:', error)
    return []
  }
}
