/**
 * Unified Efficiency Service
 * Gamification 2.0: Holistic productivity measurement
 *
 * Calculates the Unified Efficiency Score from 5 components:
 * 1. Task Completion Rate (25%)
 * 2. Focus Quality (25%)
 * 3. Consistency Score (20%)
 * 4. Priority Alignment (20%)
 * 5. Time Efficiency (10%)
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  eachDayOfInterval,
  format,
} from 'date-fns';
import type {
  EfficiencyComponent,
  UnifiedEfficiencyScore,
  ComponentScore,
  EfficiencyCalculationInput,
  EfficiencyHistoryEntry,
  EfficiencyStats,
} from '@/types/unifiedEfficiency';
import {
  EFFICIENCY_WEIGHTS,
  getEfficiencyLevel,
  calculateTrend,
  findStrongestComponent,
  findWeakestComponent,
  suggestFocusArea,
  DEFAULT_EFFICIENCY_SCORE,
} from '@/types/unifiedEfficiency';

const log = createNamespacedLogger('UnifiedEfficiencyService');

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch task data for efficiency calculation
 */
async function fetchTaskData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  planned: number;
  completed: number;
  completedQ1: number;
  completedQ2: number;
  completedOnTime: number;
  overdue: number;
}> {
  // Fetch all tasks in the period
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, status, priority, due_date, completed_at, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    log.error('Error fetching tasks:', error);
    return {
      planned: 0,
      completed: 0,
      completedQ1: 0,
      completedQ2: 0,
      completedOnTime: 0,
      overdue: 0,
    };
  }

  const allTasks = tasks || [];
  const planned = allTasks.length;
  const completed = allTasks.filter(t => t.status === 'completed').length;

  // Q1 = priority 1 (Urgent & Important)
  const completedQ1 = allTasks.filter(
    t => t.status === 'completed' && t.priority === 1
  ).length;

  // Q2 = priority 2 (Not Urgent & Important)
  const completedQ2 = allTasks.filter(
    t => t.status === 'completed' && t.priority === 2
  ).length;

  // Completed on time
  const completedOnTime = allTasks.filter(t => {
    if (t.status !== 'completed' || !t.due_date || !t.completed_at) return false;
    return new Date(t.completed_at) <= new Date(t.due_date);
  }).length;

  // Overdue (not completed and past due date)
  const now = new Date();
  const overdue = allTasks.filter(t => {
    if (t.status === 'completed' || !t.due_date) return false;
    return new Date(t.due_date) < now;
  }).length;

  return {
    planned,
    completed,
    completedQ1,
    completedQ2,
    completedOnTime,
    overdue,
  };
}

/**
 * Fetch focus session data
 */
async function fetchFocusData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  sessionsCount: number;
  totalMinutes: number;
  avgSessionMinutes: number;
}> {
  // Fetch focus sessions from life_events
  const { data: sessions, error } = await supabase
    .from('life_events')
    .select('id, metadata')
    .eq('user_id', userId)
    .eq('event_type', 'focus_session')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    log.error('Error fetching focus sessions:', error);
    return { sessionsCount: 0, totalMinutes: 0, avgSessionMinutes: 0 };
  }

  const allSessions = sessions || [];
  const sessionsCount = allSessions.length;

  const totalMinutes = allSessions.reduce((sum, s) => {
    const duration = s.metadata?.duration_minutes || 0;
    return sum + duration;
  }, 0);

  const avgSessionMinutes = sessionsCount > 0
    ? Math.round(totalMinutes / sessionsCount)
    : 0;

  return { sessionsCount, totalMinutes, avgSessionMinutes };
}

/**
 * Fetch activity data (active days)
 */
async function fetchActivityData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  activeDays: number;
  totalDays: number;
}> {
  // Count unique days with any activity
  const { data: activities, error } = await supabase
    .from('life_events')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    log.error('Error fetching activities:', error);
    return { activeDays: 0, totalDays: 1 };
  }

  // Count unique days
  const uniqueDays = new Set<string>();
  (activities || []).forEach(a => {
    const day = format(new Date(a.created_at), 'yyyy-MM-dd');
    uniqueDays.add(day);
  });

  // Also check tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString());

  (tasks || []).forEach(t => {
    if (t.completed_at) {
      const day = format(new Date(t.completed_at), 'yyyy-MM-dd');
      uniqueDays.add(day);
    }
  });

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  return {
    activeDays: uniqueDays.size,
    totalDays: allDays.length,
  };
}

/**
 * Fetch previous period score for comparison
 */
async function fetchPreviousScore(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<{
  score: number | null;
  components: Record<EfficiencyComponent, number> | null;
}> {
  const { data, error } = await supabase
    .from('efficiency_history')
    .select('total_score, components')
    .eq('user_id', userId)
    .eq('period', period)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { score: null, components: null };
  }

  return {
    score: data.total_score,
    components: data.components as Record<EfficiencyComponent, number>,
  };
}

// ============================================================================
// COMPONENT CALCULATION
// ============================================================================

/**
 * Calculate Task Completion Rate (0-100)
 */
function calculateCompletionRate(
  planned: number,
  completed: number
): number {
  if (planned === 0) return 50; // Neutral if no tasks planned
  const rate = (completed / planned) * 100;
  return Math.min(100, Math.round(rate));
}

/**
 * Calculate Focus Quality (0-100)
 * Based on session count and average duration
 */
function calculateFocusQuality(
  sessionsCount: number,
  avgSessionMinutes: number
): number {
  // Ideal: 3+ sessions per day, 25+ minutes each
  const sessionScore = Math.min(100, (sessionsCount / 3) * 100);
  const durationScore = Math.min(100, (avgSessionMinutes / 25) * 100);

  // Weight: 40% count, 60% quality
  return Math.round(sessionScore * 0.4 + durationScore * 0.6);
}

/**
 * Calculate Consistency Score (0-100)
 * Based on percentage of active days
 */
function calculateConsistency(
  activeDays: number,
  totalDays: number
): number {
  if (totalDays === 0) return 0;
  const rate = (activeDays / totalDays) * 100;
  return Math.round(rate);
}

/**
 * Calculate Priority Alignment (0-100)
 * Rewards completing Q1 and Q2 tasks
 */
function calculatePriorityAlignment(
  completedQ1: number,
  completedQ2: number,
  totalCompleted: number
): number {
  if (totalCompleted === 0) return 50; // Neutral

  const priorityCompleted = completedQ1 + completedQ2;
  const rate = (priorityCompleted / totalCompleted) * 100;

  // Bonus for Q1 (urgent & important)
  const q1Bonus = Math.min(20, completedQ1 * 5);

  return Math.min(100, Math.round(rate + q1Bonus));
}

/**
 * Calculate Time Efficiency (0-100)
 * Based on on-time completion rate
 */
function calculateTimeEfficiency(
  completedOnTime: number,
  totalCompleted: number,
  overdue: number
): number {
  if (totalCompleted === 0 && overdue === 0) return 50; // Neutral

  // Penalize overdue tasks
  const total = totalCompleted + overdue;
  if (total === 0) return 50;

  const onTimeRate = (completedOnTime / total) * 100;
  const overduePenalty = Math.min(30, overdue * 5);

  return Math.max(0, Math.round(onTimeRate - overduePenalty));
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate unified efficiency score for a user
 */
export async function calculateEfficiencyScore(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<UnifiedEfficiencyScore> {
  log.info('Calculating efficiency score:', { userId, period });

  // Determine date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'daily':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'weekly':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'monthly':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
  }

  // Fetch all data in parallel
  const [taskData, focusData, activityData, previousData] = await Promise.all([
    fetchTaskData(userId, startDate, endDate),
    fetchFocusData(userId, startDate, endDate),
    fetchActivityData(userId, startDate, endDate),
    fetchPreviousScore(userId, period),
  ]);

  // Calculate individual components
  const completionRateScore = calculateCompletionRate(
    taskData.planned,
    taskData.completed
  );

  const focusQualityScore = calculateFocusQuality(
    focusData.sessionsCount,
    focusData.avgSessionMinutes
  );

  const consistencyScore = calculateConsistency(
    activityData.activeDays,
    activityData.totalDays
  );

  const priorityAlignmentScore = calculatePriorityAlignment(
    taskData.completedQ1,
    taskData.completedQ2,
    taskData.completed
  );

  const timeEfficiencyScore = calculateTimeEfficiency(
    taskData.completedOnTime,
    taskData.completed,
    taskData.overdue
  );

  // Build component scores
  const componentScores: Record<EfficiencyComponent, number> = {
    completion_rate: completionRateScore,
    focus_quality: focusQualityScore,
    consistency: consistencyScore,
    priority_alignment: priorityAlignmentScore,
    time_efficiency: timeEfficiencyScore,
  };

  // Calculate deltas and trends
  const componentDetails: Record<EfficiencyComponent, ComponentScore> = {} as any;

  for (const [comp, score] of Object.entries(componentScores) as [EfficiencyComponent, number][]) {
    const previousScore = previousData.components?.[comp] ?? score;
    const delta = score - previousScore;

    componentDetails[comp] = {
      component: comp,
      score,
      weight: EFFICIENCY_WEIGHTS[comp],
      weightedScore: score * (EFFICIENCY_WEIGHTS[comp] / 100),
      trend: calculateTrend(delta),
      delta,
    };
  }

  // Calculate total weighted score
  const totalScore = Object.values(componentDetails).reduce(
    (sum, c) => sum + c.weightedScore,
    0
  );

  const roundedTotal = Math.round(totalScore);
  const previousTotal = previousData.score ?? roundedTotal;
  const totalDelta = roundedTotal - previousTotal;

  // Build result
  const result: UnifiedEfficiencyScore = {
    user_id: userId,
    total_score: roundedTotal,
    level: getEfficiencyLevel(roundedTotal),
    components: componentDetails,
    overall_trend: calculateTrend(totalDelta),
    score_delta: totalDelta,
    strongest_component: findStrongestComponent(componentScores),
    weakest_component: findWeakestComponent(componentScores),
    suggested_focus: suggestFocusArea(componentScores),
    period,
    calculated_at: new Date().toISOString(),
    previous_score: previousData.score,
  };

  log.info('Efficiency score calculated:', {
    totalScore: roundedTotal,
    level: result.level,
    strongest: result.strongest_component,
    weakest: result.weakest_component,
  });

  return result;
}

// ============================================================================
// HISTORY & PERSISTENCE
// ============================================================================

/**
 * Save efficiency score to history
 */
export async function saveEfficiencyScore(
  score: UnifiedEfficiencyScore
): Promise<void> {
  const componentScores: Record<EfficiencyComponent, number> = {} as any;
  for (const [comp, data] of Object.entries(score.components)) {
    componentScores[comp as EfficiencyComponent] = data.score;
  }

  const { error } = await supabase
    .from('efficiency_history')
    .upsert({
      user_id: score.user_id,
      date: format(new Date(), 'yyyy-MM-dd'),
      total_score: score.total_score,
      components: componentScores,
      period: score.period,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date,period',
    });

  if (error) {
    log.error('Error saving efficiency score:', error);
    throw error;
  }
}

/**
 * Get efficiency history for a user
 */
export async function getEfficiencyHistory(
  userId: string,
  options: {
    period?: 'daily' | 'weekly' | 'monthly';
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<EfficiencyHistoryEntry[]> {
  const { period = 'daily', limit = 30, startDate, endDate } = options;

  let query = supabase
    .from('efficiency_history')
    .select('*')
    .eq('user_id', userId)
    .eq('period', period)
    .order('date', { ascending: false })
    .limit(limit);

  if (startDate) {
    query = query.gte('date', format(startDate, 'yyyy-MM-dd'));
  }
  if (endDate) {
    query = query.lte('date', format(endDate, 'yyyy-MM-dd'));
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching efficiency history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get efficiency statistics
 */
export async function getEfficiencyStats(
  userId: string,
  days: number = 30
): Promise<EfficiencyStats> {
  const startDate = subDays(new Date(), days);

  const { data, error } = await supabase
    .from('efficiency_history')
    .select('*')
    .eq('user_id', userId)
    .eq('period', 'daily')
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .order('date', { ascending: false });

  if (error || !data || data.length === 0) {
    return {
      average_score: 0,
      average_by_component: {
        completion_rate: 0,
        focus_quality: 0,
        consistency: 0,
        priority_alignment: 0,
        time_efficiency: 0,
      },
      highest_score: 0,
      highest_score_date: null,
      best_component: 'completion_rate',
      score_trend_7d: 0,
      score_trend_30d: 0,
      days_above_70: 0,
      days_above_90: 0,
      current_good_streak: 0,
      best_good_streak: 0,
    };
  }

  const entries = data as EfficiencyHistoryEntry[];

  // Calculate averages
  const avgScore = entries.reduce((sum, e) => sum + e.total_score, 0) / entries.length;

  const avgByComponent: Record<EfficiencyComponent, number> = {
    completion_rate: 0,
    focus_quality: 0,
    consistency: 0,
    priority_alignment: 0,
    time_efficiency: 0,
  };

  const components: EfficiencyComponent[] = [
    'completion_rate',
    'focus_quality',
    'consistency',
    'priority_alignment',
    'time_efficiency',
  ];

  for (const comp of components) {
    const sum = entries.reduce((s, e) => s + (e.components[comp] || 0), 0);
    avgByComponent[comp] = Math.round(sum / entries.length);
  }

  // Find highest score
  let highestScore = 0;
  let highestScoreDate: string | null = null;

  for (const entry of entries) {
    if (entry.total_score > highestScore) {
      highestScore = entry.total_score;
      highestScoreDate = entry.date;
    }
  }

  // Find best component
  const bestComponent = findStrongestComponent(avgByComponent);

  // Calculate trends
  const recent7 = entries.slice(0, 7);
  const older7 = entries.slice(7, 14);
  const avgRecent7 = recent7.reduce((s, e) => s + e.total_score, 0) / (recent7.length || 1);
  const avgOlder7 = older7.length > 0
    ? older7.reduce((s, e) => s + e.total_score, 0) / older7.length
    : avgRecent7;
  const scoreTrend7d = Math.round(avgRecent7 - avgOlder7);

  const recent30 = entries.slice(0, Math.min(30, entries.length));
  const avgRecent30 = recent30.reduce((s, e) => s + e.total_score, 0) / (recent30.length || 1);
  const scoreTrend30d = Math.round(avgRecent30 - avgScore);

  // Count days above thresholds
  const daysAbove70 = entries.filter(e => e.total_score >= 70).length;
  const daysAbove90 = entries.filter(e => e.total_score >= 90).length;

  // Calculate streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  for (const entry of entries) {
    if (entry.total_score >= 70) {
      tempStreak++;
      if (currentStreak === 0) currentStreak = tempStreak;
    } else {
      if (tempStreak > bestStreak) bestStreak = tempStreak;
      tempStreak = 0;
      if (currentStreak === 0) currentStreak = 0;
    }
  }
  if (tempStreak > bestStreak) bestStreak = tempStreak;

  return {
    average_score: Math.round(avgScore),
    average_by_component: avgByComponent,
    highest_score: highestScore,
    highest_score_date: highestScoreDate,
    best_component: bestComponent,
    score_trend_7d: scoreTrend7d,
    score_trend_30d: scoreTrend30d,
    days_above_70: daysAbove70,
    days_above_90: daysAbove90,
    current_good_streak: currentStreak,
    best_good_streak: bestStreak,
  };
}

// ============================================================================
// UPDATE USER STATS
// ============================================================================

/**
 * Update efficiency score in user_stats
 */
export async function updateUserEfficiencyScore(
  userId: string,
  score: UnifiedEfficiencyScore
): Promise<void> {
  const componentScores: Record<EfficiencyComponent, number> = {} as any;
  for (const [comp, data] of Object.entries(score.components)) {
    componentScores[comp as EfficiencyComponent] = data.score;
  }

  const { error } = await supabase
    .from('user_stats')
    .update({
      efficiency_score: {
        total_score: score.total_score,
        level: score.level,
        components: componentScores,
        strongest: score.strongest_component,
        weakest: score.weakest_component,
        suggested_focus: score.suggested_focus,
        trend: score.overall_trend,
        delta: score.score_delta,
        updated_at: score.calculated_at,
      },
    })
    .eq('user_id', userId);

  if (error) {
    log.error('Error updating user efficiency score:', error);
    throw error;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const unifiedEfficiencyService = {
  calculateEfficiencyScore,
  saveEfficiencyScore,
  getEfficiencyHistory,
  getEfficiencyStats,
  updateUserEfficiencyScore,
};

export default unifiedEfficiencyService;
