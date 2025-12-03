/**
 * Efficiency Score Service
 *
 * Calculates and tracks efficiency metrics across:
 * - Daily completion rates
 * - Module-specific performance
 * - Time utilization
 * - Trend analysis
 * - Historical data aggregation
 */

import { supabase } from './supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

export interface EfficiencyScore {
  overall: number; // 0-100
  productivity: number; // 0-100
  focus: number; // 0-100
  consistency: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
}

export interface ModuleEfficiency {
  moduleId: string;
  moduleName: string;
  score: number;
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number;
  averageTimePerTask: number;
  lastActivityDate?: string;
}

export interface EfficiencyTrend {
  date: string;
  score: number;
  tasksCompleted: number;
  productivityLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface EfficiencyMetrics {
  date: string;
  score: EfficiencyScore;
  moduleScores: ModuleEfficiency[];
  weeklyAverage: number;
  monthlyAverage: number;
  bestDay?: string;
  worstDay?: string;
  streakDays: number;
  consistencyDays: number; // Days with >70% completion
}

// ============================================================================
// DAILY EFFICIENCY CALCULATION
// ============================================================================

/**
 * Calculate efficiency score for a specific date
 */
export async function calculateDailyEfficiency(
  userId: string,
  date: string
): Promise<EfficiencyScore> {
  try {
    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${date}T23:59:59Z`;

    // Get tasks for the day
    const { data: tasks } = await supabase
      .from('work_items')
      .select('id, title, completed_at, estimated_duration, association_id')
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    const taskList = tasks || [];
    const completedTasks = taskList.filter(t => t.completed_at);
    const completionRate = taskList.length > 0
      ? Math.round((completedTasks.length / taskList.length) * 100)
      : 0;

    // Get daily report for insights
    const { data: dailyReports } = await supabase
      .from('daily_reports')
      .select('productivity_score, mood, energy_level, stress_level')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    const report = dailyReports;

    // Calculate time utilization
    const totalEstimatedTime = taskList.reduce((sum, t) => sum + (t.estimated_duration || 0), 0);
    const averageTaskTime = taskList.length > 0 ? totalEstimatedTime / taskList.length : 0;
    const focusScore = calculateFocusScore(completedTasks.length, averageTaskTime);

    // Get user achievements/streak info for consistency
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    const consistencyScore = calculateConsistencyScore(
      completionRate,
      streak?.current_streak || 0,
      report?.energy_level || 3
    );

    // Overall score: weighted average
    const overallScore = Math.round(
      completionRate * 0.4 +
      focusScore * 0.3 +
      consistencyScore * 0.3
    );

    // Determine trend (compare to previous 3 days)
    const trend = await calculateTrend(userId, date);

    return {
      overall: Math.min(100, overallScore),
      productivity: Math.min(100, report?.productivity_score || completionRate),
      focus: focusScore,
      consistency: consistencyScore,
      trend,
    };
  } catch (error) {
    console.error('Error calculating daily efficiency:', error);
    return {
      overall: 0,
      productivity: 0,
      focus: 0,
      consistency: 0,
      trend: 'stable',
    };
  }
}

/**
 * Calculate focus score based on task completion depth
 */
function calculateFocusScore(completedCount: number, avgTaskTime: number): number {
  // More completed tasks + reasonable task duration = better focus
  const completionBonus = Math.min(100, completedCount * 15);
  const focusBonus = avgTaskTime > 0 && avgTaskTime <= 120 ? 100 : Math.max(0, 100 - (avgTaskTime - 120) / 10);
  return Math.round((completionBonus * 0.6 + focusBonus * 0.4) / Math.max(completionBonus, focusBonus || 1));
}

/**
 * Calculate consistency score based on completion rate and streak
 */
function calculateConsistencyScore(completionRate: number, streakDays: number, energyLevel: number): number {
  const completionScore = completionRate;
  const streakScore = Math.min(100, streakDays * 5); // 20 days = 100
  const energyScore = (energyLevel / 5) * 100; // Normalize 1-5 to 0-100

  return Math.round((completionScore * 0.5 + streakScore * 0.3 + energyScore * 0.2));
}

/**
 * Calculate trend comparing to previous 3 days
 */
async function calculateTrend(userId: string, date: string): Promise<'improving' | 'stable' | 'declining'> {
  try {
    const currentDate = new Date(date);
    const threeDay = new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000);

    const { data: reports } = await supabase
      .from('daily_reports')
      .select('productivity_score, date')
      .eq('user_id', userId)
      .gte('date', threeDay.toISOString().split('T')[0])
      .lte('date', date)
      .order('date', { ascending: true });

    if (!reports || reports.length < 2) return 'stable';

    const recentScore = reports[reports.length - 1]?.productivity_score || 0;
    const avgPrevious = reports
      .slice(0, -1)
      .reduce((sum, r) => sum + (r.productivity_score || 0), 0) / (reports.length - 1);

    if (recentScore > avgPrevious + 10) return 'improving';
    if (recentScore < avgPrevious - 10) return 'declining';
    return 'stable';
  } catch (error) {
    return 'stable';
  }
}

// ============================================================================
// MODULE EFFICIENCY
// ============================================================================

/**
 * Calculate efficiency scores for each life module
 */
export async function calculateModuleEfficiency(
  userId: string,
  date: string
): Promise<ModuleEfficiency[]> {
  try {
    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${date}T23:59:59Z`;

    // Get all life areas/modules for the user
    const { data: modules } = await supabase
      .from('life_areas')
      .select('id, name, association_id')
      .eq('association_id', (
        await supabase
          .from('associations')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'personal')
          .single()
      ).data?.id);

    if (!modules) return [];

    const moduleEfficiencies: ModuleEfficiency[] = [];

    for (const module of modules) {
      const { data: moduleTasks } = await supabase
        .from('work_items')
        .select('id, title, completed_at, estimated_duration, updated_at')
        .eq('module_id', module.id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      const tasks = moduleTasks || [];
      const completed = tasks.filter(t => t.completed_at).length;
      const total = tasks.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const totalTime = tasks.reduce((sum, t) => sum + (t.estimated_duration || 0), 0);
      const avgTime = total > 0 ? totalTime / total : 0;

      const lastActivityDate = tasks.length > 0
        ? tasks.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at
        : undefined;

      moduleEfficiencies.push({
        moduleId: module.id,
        moduleName: module.name,
        score: completionRate,
        tasksCompleted: completed,
        tasksTotal: total,
        completionRate,
        averageTimePerTask: avgTime,
        lastActivityDate,
      });
    }

    return moduleEfficiencies;
  } catch (error) {
    console.error('Error calculating module efficiency:', error);
    return [];
  }
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Get efficiency trends for the last 30 days
 */
export async function getEfficiencyTrends(
  userId: string,
  days: number = 30
): Promise<EfficiencyTrend[]> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: reports } = await supabase
      .from('daily_reports')
      .select('date, productivity_score, tasks_completed')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    return (reports || []).map(report => ({
      date: report.date,
      score: report.productivity_score || 0,
      tasksCompleted: report.tasks_completed || 0,
      productivityLevel: getProductivityLevel(report.productivity_score || 0),
    }));
  } catch (error) {
    console.error('Error fetching efficiency trends:', error);
    return [];
  }
}

/**
 * Get comprehensive efficiency metrics
 */
export async function getEfficiencyMetrics(
  userId: string,
  date: string
): Promise<EfficiencyMetrics> {
  try {
    // Daily score
    const score = await calculateDailyEfficiency(userId, date);

    // Module scores
    const moduleScores = await calculateModuleEfficiency(userId, date);

    // Weekly and monthly averages
    const currentDate = new Date(date);
    const weekStart = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: weekReports } = await supabase
      .from('daily_reports')
      .select('productivity_score')
      .eq('user_id', userId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', date);

    const { data: monthReports } = await supabase
      .from('daily_reports')
      .select('productivity_score')
      .eq('user_id', userId)
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', date);

    const weeklyAverage = weekReports && weekReports.length > 0
      ? Math.round(weekReports.reduce((sum, r) => sum + (r.productivity_score || 0), 0) / weekReports.length)
      : 0;

    const monthlyAverage = monthReports && monthReports.length > 0
      ? Math.round(monthReports.reduce((sum, r) => sum + (r.productivity_score || 0), 0) / monthReports.length)
      : 0;

    // Best and worst days
    let bestDay: string | undefined;
    let worstDay: string | undefined;
    if (monthReports && monthReports.length > 0) {
      const sorted = [...monthReports].sort((a, b) => (b.productivity_score || 0) - (a.productivity_score || 0));
      bestDay = (sorted[0] as any).date;
      worstDay = (sorted[sorted.length - 1] as any).date;
    }

    // Consistency days (>70% completion)
    const consistencyDays = (monthReports || []).filter(r => (r.productivity_score || 0) >= 70).length;

    // Streak info
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    return {
      date,
      score,
      moduleScores,
      weeklyAverage,
      monthlyAverage,
      bestDay,
      worstDay,
      streakDays: streak?.current_streak || 0,
      consistencyDays,
    };
  } catch (error) {
    console.error('Error getting efficiency metrics:', error);
    return {
      date,
      score: { overall: 0, productivity: 0, focus: 0, consistency: 0, trend: 'stable' },
      moduleScores: [],
      weeklyAverage: 0,
      monthlyAverage: 0,
      streakDays: 0,
      consistencyDays: 0,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map productivity score to productivity level
 */
export function getProductivityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}

/**
 * Get color for productivity level
 */
export function getProductivityColor(level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'): string {
  const colors: Record<string, string> = {
    excellent: '#10b981',
    good: '#3b82f6',
    fair: '#f59e0b',
    poor: '#ef4444',
    critical: '#dc2626',
  };
  return colors[level] || '#6b7280';
}

/**
 * Get emoji for productivity level
 */
export function getProductivityEmoji(level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'): string {
  const emojis: Record<string, string> = {
    excellent: '🌟',
    good: '👍',
    fair: '😐',
    poor: '⚠️',
    critical: '❌',
  };
  return emojis[level] || '❓';
}
