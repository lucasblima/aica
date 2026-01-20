/**
 * Notification Scheduler Service
 * Issue #12: WhatsApp Integration via Evolution API
 *
 * Frontend service for managing scheduled WhatsApp notifications:
 * - Create/update/delete scheduled notifications
 * - Manage notification templates
 * - View notification history
 */

import { supabase } from '@/services/supabaseClient';
import {
  ScheduledNotification,
  NotificationTemplate,
  NotificationLog,
  NotificationType,
  NotificationStatus,
  RecurrencePattern,
  CreateNotificationRequest,
  PaginatedResponse,
} from '@/types/whatsapp';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const DEFAULT_MAX_ATTEMPTS = 3;

// ============================================================================
// SCHEDULED NOTIFICATIONS
// ============================================================================

/**
 * Create a new scheduled notification
 */
export async function createNotification(
  request: CreateNotificationRequest
): Promise<ScheduledNotification> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('scheduled_notifications')
    .insert({
      user_id: user.id,
      target_phone: request.target_phone,
      target_name: request.target_name || null,
      notification_type: request.notification_type,
      message_template: request.message_template,
      message_variables: request.message_variables || {},
      scheduled_for: request.scheduled_for,
      timezone: request.timezone || DEFAULT_TIMEZONE,
      is_recurring: request.is_recurring || false,
      recurrence_pattern: request.recurrence_pattern || null,
      recurrence_config: request.recurrence_config || null,
      recurrence_end_date: request.recurrence_end_date || null,
      priority: request.priority || 5,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[notificationSchedulerService] createNotification error:', error);
    throw error;
  }

  return data as ScheduledNotification;
}

/**
 * Get all scheduled notifications for the current user
 */
export async function getScheduledNotifications(
  status?: NotificationStatus,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<PaginatedResponse<ScheduledNotification>> {
  let query = supabase
    .from('scheduled_notifications')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('scheduled_for', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[notificationSchedulerService] getScheduledNotifications error:', error);
    throw error;
  }

  return {
    data: data as ScheduledNotification[],
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Get a specific notification by ID
 */
export async function getNotification(notificationId: string): Promise<ScheduledNotification | null> {
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('id', notificationId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[notificationSchedulerService] getNotification error:', error);
    throw error;
  }

  return data as ScheduledNotification;
}

/**
 * Update a scheduled notification
 */
export async function updateNotification(
  notificationId: string,
  updates: Partial<CreateNotificationRequest>
): Promise<ScheduledNotification> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.target_phone) updateData.target_phone = updates.target_phone;
  if (updates.target_name !== undefined) updateData.target_name = updates.target_name;
  if (updates.notification_type) updateData.notification_type = updates.notification_type;
  if (updates.message_template) updateData.message_template = updates.message_template;
  if (updates.message_variables) updateData.message_variables = updates.message_variables;
  if (updates.scheduled_for) updateData.scheduled_for = updates.scheduled_for;
  if (updates.timezone) updateData.timezone = updates.timezone;
  if (updates.is_recurring !== undefined) updateData.is_recurring = updates.is_recurring;
  if (updates.recurrence_pattern !== undefined) updateData.recurrence_pattern = updates.recurrence_pattern;
  if (updates.recurrence_config !== undefined) updateData.recurrence_config = updates.recurrence_config;
  if (updates.recurrence_end_date !== undefined) updateData.recurrence_end_date = updates.recurrence_end_date;
  if (updates.priority !== undefined) updateData.priority = updates.priority;

  const { data, error } = await supabase
    .from('scheduled_notifications')
    .update(updateData)
    .eq('id', notificationId)
    .select('*')
    .single();

  if (error) {
    console.error('[notificationSchedulerService] updateNotification error:', error);
    throw error;
  }

  return data as ScheduledNotification;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scheduled_notifications')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .in('status', ['scheduled', 'queued']); // Can only cancel pending notifications

  if (error) {
    console.error('[notificationSchedulerService] cancelNotification error:', error);
    throw error;
  }

  return true;
}

/**
 * Delete a notification (soft delete)
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scheduled_notifications')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) {
    console.error('[notificationSchedulerService] deleteNotification error:', error);
    throw error;
  }

  return true;
}

/**
 * Reschedule a notification
 */
export async function rescheduleNotification(
  notificationId: string,
  newScheduledFor: string
): Promise<ScheduledNotification> {
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .update({
      scheduled_for: newScheduledFor,
      status: 'scheduled',
      attempts: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select('*')
    .single();

  if (error) {
    console.error('[notificationSchedulerService] rescheduleNotification error:', error);
    throw error;
  }

  return data as ScheduledNotification;
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Get all available notification templates
 */
export async function getTemplates(
  includeSystem = true
): Promise<NotificationTemplate[]> {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('notification_templates')
    .select('*')
    .eq('is_active', true)
    .order('template_name');

  if (user && includeSystem) {
    // Get user's templates and system templates
    query = query.or(`user_id.eq.${user.id},is_system.eq.true`);
  } else if (user) {
    // Get only user's templates
    query = query.eq('user_id', user.id);
  } else {
    // Get only system templates
    query = query.eq('is_system', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[notificationSchedulerService] getTemplates error:', error);
    throw error;
  }

  return data as NotificationTemplate[];
}

/**
 * Get a specific template by key
 */
export async function getTemplateByKey(templateKey: string): Promise<NotificationTemplate | null> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('template_key', templateKey)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[notificationSchedulerService] getTemplateByKey error:', error);
    throw error;
  }

  return data as NotificationTemplate;
}

/**
 * Create a custom notification template
 */
export async function createTemplate(
  templateKey: string,
  templateName: string,
  messageTemplate: string,
  notificationType: NotificationType,
  options: {
    description?: string;
    requiredVariables?: string[];
    sampleVariables?: Record<string, string>;
    defaultPriority?: number;
  } = {}
): Promise<NotificationTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notification_templates')
    .insert({
      template_key: templateKey,
      template_name: templateName,
      template_description: options.description || null,
      message_template: messageTemplate,
      required_variables: options.requiredVariables || [],
      sample_variables: options.sampleVariables || null,
      notification_type: notificationType,
      default_priority: options.defaultPriority || 5,
      is_system: false,
      user_id: user.id,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[notificationSchedulerService] createTemplate error:', error);
    throw error;
  }

  return data as NotificationTemplate;
}

/**
 * Update a custom template (cannot update system templates)
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<{
    template_name: string;
    template_description: string;
    message_template: string;
    required_variables: string[];
    sample_variables: Record<string, string>;
    default_priority: number;
    is_active: boolean;
  }>
): Promise<NotificationTemplate> {
  const { data, error } = await supabase
    .from('notification_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('is_system', false) // Prevent updating system templates
    .select('*')
    .single();

  if (error) {
    console.error('[notificationSchedulerService] updateTemplate error:', error);
    throw error;
  }

  return data as NotificationTemplate;
}

/**
 * Delete a custom template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notification_templates')
    .delete()
    .eq('id', templateId)
    .eq('is_system', false); // Prevent deleting system templates

  if (error) {
    console.error('[notificationSchedulerService] deleteTemplate error:', error);
    throw error;
  }

  return true;
}

// ============================================================================
// NOTIFICATION LOGS
// ============================================================================

/**
 * Get notification logs for a specific notification
 */
export async function getNotificationLogs(
  notificationId: string
): Promise<NotificationLog[]> {
  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('notification_id', notificationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[notificationSchedulerService] getNotificationLogs error:', error);
    throw error;
  }

  return data as NotificationLog[];
}

/**
 * Get recent notification logs for current user
 */
export async function getRecentLogs(
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<PaginatedResponse<NotificationLog>> {
  const { data, error, count } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[notificationSchedulerService] getRecentLogs error:', error);
    throw error;
  }

  return {
    data: data as NotificationLog[],
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit,
  };
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

/**
 * Schedule a quick reminder
 */
export async function scheduleReminder(
  targetPhone: string,
  message: string,
  scheduledFor: string,
  targetName?: string
): Promise<ScheduledNotification> {
  return createNotification({
    target_phone: targetPhone,
    target_name: targetName,
    notification_type: 'reminder',
    message_template: message,
    scheduled_for: scheduledFor,
    priority: 3, // High priority for reminders
  });
}

/**
 * Schedule a daily report notification
 */
export async function scheduleDailyReport(
  targetPhone: string,
  time: string, // HH:mm format
  targetName?: string,
  variables?: Record<string, string>
): Promise<ScheduledNotification> {
  // Calculate next occurrence
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  let scheduledFor = new Date(now);
  scheduledFor.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduledFor <= now) {
    scheduledFor.setDate(scheduledFor.getDate() + 1);
  }

  return createNotification({
    target_phone: targetPhone,
    target_name: targetName,
    notification_type: 'daily_report',
    message_template: 'Bom dia, {{name}}! Aqui esta seu resumo do dia:\n\n{{summary}}\n\nTarefas pendentes: {{pending_tasks}}',
    message_variables: variables || { name: targetName || 'usuario', summary: '', pending_tasks: '0' },
    scheduled_for: scheduledFor.toISOString(),
    is_recurring: true,
    recurrence_pattern: 'daily',
    priority: 5,
  });
}

/**
 * Schedule a weekly summary notification
 */
export async function scheduleWeeklySummary(
  targetPhone: string,
  dayOfWeek: number, // 0 = Sunday, 6 = Saturday
  time: string,
  targetName?: string
): Promise<ScheduledNotification> {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);

  // Find next occurrence of the day
  let scheduledFor = new Date(now);
  const currentDay = scheduledFor.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil <= 0) daysUntil += 7;

  scheduledFor.setDate(scheduledFor.getDate() + daysUntil);
  scheduledFor.setHours(hours, minutes, 0, 0);

  return createNotification({
    target_phone: targetPhone,
    target_name: targetName,
    notification_type: 'weekly_summary',
    message_template: 'Oi {{name}}! Seu resumo semanal:\n\nHumor predominante: {{mood}}\nMomentos registrados: {{moments_count}}\n\n{{insight}}',
    message_variables: { name: targetName || 'usuario', mood: '', moments_count: '0', insight: '' },
    scheduled_for: scheduledFor.toISOString(),
    is_recurring: true,
    recurrence_pattern: 'weekly',
    priority: 5,
  });
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<{
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  successRate: number;
  pendingNotifications: number;
}> {
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .select('status')
    .is('deleted_at', null);

  if (error) {
    console.error('[notificationSchedulerService] getNotificationStats error:', error);
    throw error;
  }

  const notifications = data || [];
  const totalSent = notifications.filter(n => n.status === 'sent').length;
  const totalFailed = notifications.filter(n => n.status === 'failed').length;
  const totalScheduled = notifications.filter(n => n.status === 'scheduled').length;

  return {
    totalScheduled,
    totalSent,
    totalFailed,
    successRate: totalSent + totalFailed > 0
      ? (totalSent / (totalSent + totalFailed)) * 100
      : 0,
    pendingNotifications: notifications.filter(n =>
      ['scheduled', 'queued', 'sending'].includes(n.status)
    ).length,
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Notifications
  createNotification,
  getScheduledNotifications,
  getNotification,
  updateNotification,
  cancelNotification,
  deleteNotification,
  rescheduleNotification,

  // Templates
  getTemplates,
  getTemplateByKey,
  createTemplate,
  updateTemplate,
  deleteTemplate,

  // Logs
  getNotificationLogs,
  getRecentLogs,

  // Quick actions
  scheduleReminder,
  scheduleDailyReport,
  scheduleWeeklySummary,

  // Statistics
  getNotificationStats,
};
