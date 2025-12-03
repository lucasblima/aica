/**
 * Daily Report Service
 *
 * Handles programmatic generation of daily reports
 * Can be used by n8n workflow or called directly
 *
 * Functions:
 * - Aggregate daily metrics
 * - Call Gemini for insights
 * - Store report in Supabase
 * - Trigger notifications
 */

import { supabase } from './supabaseClient';
import { DailyReport, DailyReportCreateInput } from '../types/memoryTypes';
import { generateDailyReportInsights } from './geminiMemoryService';
import { notificationService, sendDailyReportNotification } from './notificationService';

// ============================================================================
// DAILY REPORT GENERATION
// ============================================================================

export interface DailyReportMetrics {
  date: string;
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number;
  totalTimeSpent: number;
  averageSentiment: number;
  topSubjects: string[];
  productivityScore: number;
  memoryCount: number;
  contactCount: number;
  topContacts: string[];
}

/**
 * Generate a complete daily report for a user
 */
export async function generateDailyReport(
  userId: string,
  reportDate?: string
): Promise<DailyReport | null> {
  try {
    const date = reportDate || new Date().toISOString().split('T')[0];

    console.log(`🔄 Generating daily report for user ${userId} on ${date}`);

    // Step 1: Check if report already exists
    const existingReport = await getDailyReport(userId, date);
    if (existingReport) {
      console.log(`⚠️  Report already exists for ${date}, skipping generation`);
      return existingReport;
    }

    // Step 2: Aggregate metrics
    const metrics = await aggregateDailyMetrics(userId, date);
    console.log('✅ Metrics aggregated', metrics);

    // Step 3: Generate insights via Gemini
    const insights = await generateDailyReportInsights(userId, date, metrics);
    console.log('✅ Insights generated via Gemini');

    // Step 4: Create report object
    const report = buildReportObject(userId, date, metrics, insights);

    // Step 5: Insert into Supabase
    const savedReport = await insertDailyReport(report);
    console.log('✅ Report saved to Supabase');

    // Step 6: Send notifications
    await notifyUserOfReport(userId, savedReport);
    console.log('✅ Notifications sent');

    return savedReport;
  } catch (error) {
    console.error(`❌ Error generating daily report: ${error}`);
    throw error;
  }
}

// ============================================================================
// METRICS AGGREGATION
// ============================================================================

/**
 * Aggregate all metrics for a specific day
 */
export async function aggregateDailyMetrics(
  userId: string,
  date: string
): Promise<DailyReportMetrics> {
  try {
    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${date}T23:59:59Z`;

    // Get completed tasks
    const { data: completedTasks } = await supabase
      .from('work_items')
      .select('id, title, estimated_duration, completed_at, association_id')
      .eq('user_id', userId)
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd);

    // Get all tasks created today
    const { data: allTasks } = await supabase
      .from('work_items')
      .select('id, state')
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    // Get memories from today
    const { data: memories } = await supabase
      .from('memories')
      .select('id, sentiment_score, subjects')
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    // Get contacts interacted with
    const { data: contacts } = await supabase
      .from('contact_network')
      .select('id, name, last_interaction_at')
      .eq('user_id', userId)
      .gte('last_interaction_at', dayStart);

    // Calculate metrics
    const tasksCompletedCount = completedTasks?.length || 0;
    const tasksTotalCount = allTasks?.length || 0;
    const completionRate = tasksTotalCount > 0 ? tasksCompletedCount / tasksTotalCount : 0;

    const totalTimeSpent = completedTasks?.reduce((sum, task) => {
      return sum + (task.estimated_duration || 0);
    }, 0) || 0;

    const averageSentiment = memories && memories.length > 0
      ? memories.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / memories.length
      : 0;

    const topSubjects = memories
      ? [...new Set(memories.flatMap((m) => m.subjects || []))].slice(0, 5)
      : [];

    // Calculate productivity score (0-100)
    let productivityScore = 50; // base
    productivityScore += Math.min(30, ((tasksCompletedCount / 10) * 30)); // task completion
    productivityScore += Math.min(20, ((totalTimeSpent / 480) * 20)); // time spent (8 hours = 480 min)
    productivityScore += Math.min(20, (memories?.length || 0) * 2); // memory creation
    productivityScore = Math.max(0, Math.min(100, productivityScore));

    const topContacts = contacts?.map((c) => c.name) || [];

    return {
      date,
      tasksCompleted: tasksCompletedCount,
      tasksTotal: tasksTotalCount,
      completionRate,
      totalTimeSpent,
      averageSentiment,
      topSubjects,
      productivityScore,
      memoryCount: memories?.length || 0,
      contactCount: contacts?.length || 0,
      topContacts,
    };
  } catch (error) {
    console.error('Error aggregating daily metrics:', error);
    throw error;
  }
}

// ============================================================================
// REPORT BUILDING
// ============================================================================

/**
 * Build a complete DailyReport object
 */
function buildReportObject(
  userId: string,
  date: string,
  metrics: DailyReportMetrics,
  insights: Awaited<ReturnType<typeof generateDailyReportInsights>>
): DailyReportCreateInput {
  return {
    report_date: date,
    tasks_completed: metrics.tasksCompleted,
    tasks_total: metrics.tasksTotal,
    productivity_score: metrics.productivityScore,
    mood: undefined, // User sets this via UI
    mood_score: metrics.averageSentiment,
    energy_level: undefined, // User sets this via UI
    stress_level: undefined, // User sets this via UI
    active_modules: metrics.topSubjects,
    notes: undefined,
    location: undefined,
    weather_notes: undefined,
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get daily report for a specific date
 */
export async function getDailyReport(
  userId: string,
  date: string
): Promise<DailyReport | null> {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('report_date', date)
      .single();

    if (error?.code === 'PGRST116') return null; // Not found
    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error fetching daily report: ${error}`);
    throw error;
  }
}

/**
 * Insert daily report to Supabase
 */
async function insertDailyReport(
  report: DailyReportCreateInput
): Promise<DailyReport> {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .insert([report])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting daily report:', error);
    throw error;
  }
}

/**
 * Update existing daily report
 */
export async function updateDailyReport(
  userId: string,
  date: string,
  updates: Partial<DailyReport>
): Promise<DailyReport> {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .update(updates)
      .eq('user_id', userId)
      .eq('report_date', date)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating daily report:', error);
    throw error;
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Notify user that their report is ready
 */
async function notifyUserOfReport(
  userId: string,
  report: DailyReport
): Promise<void> {
  try {
    // In-app notification
    notificationService.showDailyReportReady(report);

    // Browser notification (if user has enabled it)
    sendDailyReportNotification(report.report_date);

    // Optional: Send email notification (implement via your backend)
    // await sendEmailNotification(userId, report);
  } catch (error) {
    console.error('Error sending notifications:', error);
    // Don't throw - notifications are nice-to-have
  }
}

// ============================================================================
// ANALYTICS & STATISTICS
// ============================================================================

/**
 * Get report statistics for a user over a date range
 */
export async function getReportStatistics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  avgProductivity: number;
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
  totalTasksCompleted: number;
  reportCount: number;
  dateRange: { start: string; end: string };
}> {
  try {
    const { data: reports } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .gte('report_date', startDate)
      .lte('report_date', endDate);

    if (!reports || reports.length === 0) {
      return {
        avgProductivity: 0,
        avgMood: 0,
        avgEnergy: 0,
        avgStress: 0,
        totalTasksCompleted: 0,
        reportCount: 0,
        dateRange: { start: startDate, end: endDate },
      };
    }

    const avgProductivity =
      reports.reduce((sum, r) => sum + (r.productivity_score || 0), 0) / reports.length;

    const avgMood =
      reports.reduce((sum, r) => sum + (r.mood_score || 0), 0) / reports.length;

    const avgEnergy =
      reports.reduce((sum, r) => sum + (r.energy_level || 0), 0) / reports.length;

    const avgStress =
      reports.reduce((sum, r) => sum + (r.stress_level || 0), 0) / reports.length;

    const totalTasksCompleted = reports.reduce((sum, r) => sum + (r.tasks_completed || 0), 0);

    return {
      avgProductivity,
      avgMood,
      avgEnergy,
      avgStress,
      totalTasksCompleted,
      reportCount: reports.length,
      dateRange: { start: startDate, end: endDate },
    };
  } catch (error) {
    console.error('Error getting report statistics:', error);
    throw error;
  }
}

/**
 * Get all reports for a user in a date range
 */
export async function getReportsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyReport[]> {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports for range:', error);
    throw error;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate reports for multiple users (for batch processing)
 */
export async function generateReportsForAllUsers(
  date?: string
): Promise<{ success: number; failed: number; errors: Array<{ userId: string; error: string }> }> {
  try {
    const reportDate = date || new Date().toISOString().split('T')[0];

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('is_active', true);

    if (usersError) throw usersError;

    const results = { success: 0, failed: 0, errors: [] as Array<{ userId: string; error: string }> };

    // Process each user sequentially (not in parallel to avoid rate limits)
    for (const user of users || []) {
      try {
        await generateDailyReport(user.id, reportDate);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Failed to generate report for user ${user.id}:`, error);
      }

      // Rate limiting: wait 1 second between users
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  } catch (error) {
    console.error('Error in batch report generation:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a report exists for a given date
 */
export async function reportExists(userId: string, date: string): Promise<boolean> {
  try {
    const report = await getDailyReport(userId, date);
    return report !== null;
  } catch {
    return false;
  }
}

/**
 * Get the last report for a user
 */
export async function getLastReport(userId: string): Promise<DailyReport | null> {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .limit(1)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching last report:', error);
    throw error;
  }
}

/**
 * Delete a report (careful operation)
 */
export async function deleteReport(userId: string, date: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('daily_reports')
      .delete()
      .eq('user_id', userId)
      .eq('report_date', date);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}
