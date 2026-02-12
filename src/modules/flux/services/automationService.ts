/**
 * Automation Service
 *
 * Manage workout automations (triggers + actions) and coach messages
 */

import { supabase } from '@/services/supabaseClient';
import type {
  WorkoutAutomation,
  CreateWorkoutAutomationInput,
  UpdateWorkoutAutomationInput,
  CoachMessage,
  CreateCoachMessageInput,
  UpdateCoachMessageInput,
  ScheduledWorkout,
  CreateScheduledWorkoutInput,
  UpdateScheduledWorkoutInput,
  AutomationLog,
} from '../types/flow';

export class AutomationService {
  // ============================================================================
  // WORKOUT AUTOMATIONS
  // ============================================================================

  /**
   * Get all automations for current user
   */
  static async getAutomations(): Promise<{
    data: WorkoutAutomation[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('workout_automations')
        .select('*')
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error fetching automations:', error);
      return { data: null, error };
    }
  }

  /**
   * Get active automations only
   */
  static async getActiveAutomations(): Promise<{
    data: WorkoutAutomation[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('workout_automations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error fetching active automations:', error);
      return { data: null, error };
    }
  }

  /**
   * Create automation
   */
  static async createAutomation(
    input: CreateWorkoutAutomationInput
  ): Promise<{ data: WorkoutAutomation | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('workout_automations')
        .insert({
          ...input,
          user_id: userData.user.id,
          is_active: input.is_active !== undefined ? input.is_active : true,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error creating automation:', error);
      return { data: null, error };
    }
  }

  /**
   * Update automation
   */
  static async updateAutomation(
    input: UpdateWorkoutAutomationInput
  ): Promise<{ data: WorkoutAutomation | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('workout_automations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error updating automation:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete automation
   */
  static async deleteAutomation(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('workout_automations').delete().eq('id', id);

      return { error };
    } catch (error) {
      console.error('[AutomationService] Error deleting automation:', error);
      return { error };
    }
  }

  /**
   * Toggle automation active status
   */
  static async toggleAutomation(
    id: string,
    is_active: boolean
  ): Promise<{ data: WorkoutAutomation | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workout_automations')
        .update({
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error toggling automation:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // COACH MESSAGES
  // ============================================================================

  /**
   * Get all coach message templates
   */
  static async getCoachMessages(): Promise<{
    data: CoachMessage[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error fetching coach messages:', error);
      return { data: null, error };
    }
  }

  /**
   * Get messages by trigger type
   */
  static async getMessagesByTrigger(
    triggerType: string
  ): Promise<{ data: CoachMessage[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .eq('trigger_type', triggerType)
        .eq('is_active', true);

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error fetching messages by trigger:', error);
      return { data: null, error };
    }
  }

  /**
   * Create coach message template
   */
  static async createCoachMessage(
    input: CreateCoachMessageInput
  ): Promise<{ data: CoachMessage | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('coach_messages')
        .insert({
          ...input,
          user_id: userData.user.id,
          is_active: input.is_active !== undefined ? input.is_active : true,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error creating coach message:', error);
      return { data: null, error };
    }
  }

  /**
   * Update coach message template
   */
  static async updateCoachMessage(
    input: UpdateCoachMessageInput
  ): Promise<{ data: CoachMessage | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('coach_messages')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error updating coach message:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete coach message template
   */
  static async deleteCoachMessage(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('coach_messages').delete().eq('id', id);

      return { error };
    } catch (error) {
      console.error('[AutomationService] Error deleting coach message:', error);
      return { error };
    }
  }

  // ============================================================================
  // SCHEDULED WORKOUTS
  // ============================================================================

  /**
   * Get all scheduled workouts
   */
  static async getScheduledWorkouts(): Promise<{
    data: ScheduledWorkout[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .order('scheduled_for', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error fetching scheduled workouts:', error);
      return { data: null, error };
    }
  }

  /**
   * Get scheduled workouts for a specific microcycle
   */
  static async getScheduledWorkoutsByMicrocycle(
    microcycleId: string
  ): Promise<{ data: ScheduledWorkout[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('microcycle_id', microcycleId)
        .order('scheduled_for', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error fetching scheduled workouts by microcycle:', error);
      return { data: null, error };
    }
  }

  /**
   * Get pending scheduled workouts
   */
  static async getPendingScheduled(): Promise<{
    data: ScheduledWorkout[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error fetching pending scheduled:', error);
      return { data: null, error };
    }
  }

  /**
   * Create scheduled workout
   */
  static async scheduleWorkout(
    input: CreateScheduledWorkoutInput
  ): Promise<{ data: ScheduledWorkout | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('scheduled_workouts')
        .insert({
          ...input,
          user_id: userData.user.id,
          send_method: input.send_method || 'whatsapp',
          status: 'pending',
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error scheduling workout:', error);
      return { data: null, error };
    }
  }

  /**
   * Update scheduled workout
   */
  static async updateScheduledWorkout(
    input: UpdateScheduledWorkoutInput
  ): Promise<{ data: ScheduledWorkout | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('scheduled_workouts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error updating scheduled workout:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark scheduled workout as sent
   */
  static async markAsSent(
    id: string,
    whatsappMessageId?: string
  ): Promise<{ data: ScheduledWorkout | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          whatsapp_message_id: whatsappMessageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error marking as sent:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark scheduled workout as failed
   */
  static async markAsFailed(
    id: string,
    reason: string
  ): Promise<{ data: ScheduledWorkout | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .update({
          status: 'failed',
          failed_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AutomationService] Error marking as failed:', error);
      return { data: null, error };
    }
  }

  /**
   * Cancel scheduled workout
   */
  static async cancelScheduled(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('scheduled_workouts')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return { error };
    } catch (error) {
      console.error('[AutomationService] Error cancelling scheduled workout:', error);
      return { error };
    }
  }

  /**
   * Schedule weekly workout plan via WhatsApp
   * Integrates with notification-sender Edge Function
   */
  static async scheduleWeeklyPlan(params: {
    microcycleId: string;
    athleteId: string;
    weekNumber: 1 | 2 | 3;
    scheduledFor: Date;
    messageTemplateId?: string;
  }): Promise<{ data: ScheduledWorkout | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // 1. Fetch athlete info
      const { data: athlete, error: athleteError } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('athlete_id', params.athleteId)
        .single();

      if (athleteError || !athlete) {
        return { data: null, error: athleteError || new Error('Athlete not found') };
      }

      // 2. Fetch microcycle info
      const { data: microcycle, error: microcycleError } = await supabase
        .from('microcycles')
        .select('*')
        .eq('id', params.microcycleId)
        .single();

      if (microcycleError || !microcycle) {
        return { data: null, error: microcycleError || new Error('Microcycle not found') };
      }

      // 3. Fetch coach message template (or use default)
      let messageTemplate = 'Olá {{athlete_name}}, aqui está seu plano da semana {{week_number}}! 💪';
      if (params.messageTemplateId) {
        const { data: template } = await supabase
          .from('coach_messages')
          .select('message_template')
          .eq('id', params.messageTemplateId)
          .single();

        if (template) messageTemplate = template.message_template;
      } else {
        // Try to find default weekly plan template
        const { data: defaultTemplate } = await supabase
          .from('coach_messages')
          .select('message_template')
          .eq('user_id', userData.user.id)
          .eq('trigger_type', 'microcycle_start')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (defaultTemplate) messageTemplate = defaultTemplate.message_template;
      }

      // 4. Process template variables
      const focusKey = `week_${params.weekNumber}_focus` as keyof typeof microcycle;
      const processedMessage = this.processMessageTemplate(messageTemplate, {
        athlete_name: athlete.name,
        week_number: params.weekNumber,
        microcycle_title: microcycle.name,
        focus: (microcycle[focusKey] as string) || '',
      });

      // 5. Create scheduled_workouts entry
      const { data: scheduledWorkout, error: workoutError } = await supabase
        .from('scheduled_workouts')
        .insert({
          user_id: userData.user.id,
          microcycle_id: params.microcycleId,
          athlete_id: params.athleteId,
          scheduled_for: params.scheduledFor.toISOString(),
          send_method: 'whatsapp',
          message_text: processedMessage,
          message_data: {
            week_number: params.weekNumber,
            focus_area: (microcycle[focusKey] as string) || '',
          },
          status: 'pending',
          whatsapp_recipient_phone: athlete.phone,
        })
        .select()
        .single();

      if (workoutError) {
        return { data: null, error: workoutError };
      }

      // 6. Create notification in scheduled_notifications table (for notification-sender)
      const { error: notificationError } = await supabase
        .from('scheduled_notifications')
        .insert({
          user_id: userData.user.id,
          target_phone: athlete.phone,
          target_name: athlete.name,
          notification_type: 'weekly_plan',
          message_template: messageTemplate,
          message_variables: {
            athlete_name: athlete.name,
            week_number: params.weekNumber.toString(),
            microcycle_title: microcycle.name,
            focus: (microcycle[focusKey] as string) || '',
          },
          scheduled_for: params.scheduledFor.toISOString(),
          timezone: 'America/Sao_Paulo',
          status: 'scheduled',
          priority: 5,
        });

      if (notificationError) {
        console.error('[AutomationService] Error creating notification:', notificationError);
        // Don't fail the whole operation, just log the error
      }

      return { data: scheduledWorkout, error: null };
    } catch (error) {
      console.error('[AutomationService] Error scheduling weekly plan:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // MESSAGE TEMPLATE PROCESSING
  // ============================================================================

  /**
   * Process message template with athlete data
   */
  static processMessageTemplate(
    template: string,
    data: {
      athlete_name?: string;
      week_number?: number;
      consistency_rate?: number;
      load_total?: number;
      focus_area?: string;
      [key: string]: any;
    }
  ): string {
    let processed = template;

    // Replace all {{variable}} occurrences
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    });

    return processed;
  }
}
