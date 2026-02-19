/**
 * Automation Engine Service
 *
 * Trigger detection and action execution for workout automations
 * Runs periodically via Edge Function or manually via UI
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  WorkoutAutomation,
  AutomationTriggerType,
  AutomationActionType,
} from '../types/flow';

const log = createNamespacedLogger('AutomationEngine');

interface TriggerEvaluationResult {
  shouldTrigger: boolean;
  context?: Record<string, any>;
  reason?: string;
}

interface AutomationExecutionResult {
  automationId: string;
  triggered: boolean;
  actionExecuted: boolean;
  error?: string;
  details?: string;
  reason?: string;
}

export class AutomationEngineService {
  /**
   * Main orchestrator - detects and executes all active automations
   * Called by Edge Function on schedule or manually via UI
   */
  static async detectAndExecuteAutomations(
    userId?: string
  ): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = [];

    try {
      // Get user ID if not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        userId = user.id;
      }

      // Fetch all active automations for user
      const { data: automations, error } = await supabase
        .from('workout_automations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      if (!automations || automations.length === 0) {
        log.info('No active automations found');
        return results;
      }

      log.info(`Processing ${automations.length} active automations`);

      // Process each automation
      for (const automation of automations) {
        try {
          const result = await this.processAutomation(automation as WorkoutAutomation);
          results.push(result);

          if (result.triggered && result.actionExecuted) {
            // Update automation stats
            await supabase
              .from('workout_automations')
              .update({
                last_triggered_at: new Date().toISOString(),
                times_triggered: automation.times_triggered + 1,
              })
              .eq('id', automation.id);
          }
        } catch (error) {
          log.error(`Error processing automation ${automation.id}:`, error);
          results.push({
            automationId: automation.id,
            triggered: false,
            actionExecuted: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      log.error('Error in automation detection:', error);
      throw error;
    }
  }

  /**
   * Process a single automation: evaluate trigger + execute action
   */
  private static async processAutomation(
    automation: WorkoutAutomation
  ): Promise<AutomationExecutionResult> {
    // 1. Evaluate trigger
    const evaluation = await this.evaluateTrigger(automation);

    if (!evaluation.shouldTrigger) {
      return {
        automationId: automation.id,
        triggered: false,
        actionExecuted: false,
        reason: evaluation.reason,
      };
    }

    // 2. Execute action
    try {
      const actionResult = await this.executeAction(automation, evaluation.context);

      return {
        automationId: automation.id,
        triggered: true,
        actionExecuted: true,
        details: actionResult,
      };
    } catch (error) {
      return {
        automationId: automation.id,
        triggered: true,
        actionExecuted: false,
        error: error instanceof Error ? error.message : 'Action execution failed',
      };
    }
  }

  // ============================================================================
  // TRIGGER EVALUATION
  // ============================================================================

  /**
   * Evaluate if automation trigger conditions are met
   */
  private static async evaluateTrigger(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    switch (automation.trigger_type) {
      case 'microcycle_starts':
        return await this.checkMicrocycleStart(automation);

      case 'workout_completed':
        return await this.checkWorkoutCompleted(automation);

      case 'workout_missed':
        return await this.checkWorkoutMissed(automation);

      case 'consistency_drops':
        return await this.checkConsistencyDrops(automation);

      case 'weekly_summary':
        return await this.checkWeeklySummary(automation);

      case 'athlete_joins':
        return await this.checkAthleteJoins(automation);

      case 'trial_expiring':
        return await this.checkTrialExpiring(automation);

      default:
        return {
          shouldTrigger: false,
          reason: `Unknown trigger type: ${automation.trigger_type}`,
        };
    }
  }

  /**
   * Check if any microcycle just started (status changed to 'active')
   */
  private static async checkMicrocycleStart(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    try {
      // Look for microcycles that became active in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let query = supabase
        .from('microcycles')
        .select('*, athlete_profiles!inner(*)')
        .eq('user_id', automation.user_id)
        .eq('status', 'active')
        .gte('updated_at', fiveMinutesAgo);

      // Apply filters
      if (!automation.applies_to_athletes || automation.applies_to_athletes.length === 0) {
        // No specific athletes filter
      } else {
        query = query.in('athlete_id', automation.applies_to_athletes);
      }

      if (automation.applies_to_modality && automation.applies_to_modality.length > 0) {
        query = query.in('athlete_profiles.modality', automation.applies_to_modality);
      }

      if (automation.applies_to_level && automation.applies_to_level.length > 0) {
        query = query.in('athlete_profiles.level', automation.applies_to_level);
      }

      const { data: microcycles, error } = await query;

      if (error) throw error;

      if (microcycles && microcycles.length > 0) {
        return {
          shouldTrigger: true,
          context: { microcycles },
        };
      }

      return {
        shouldTrigger: false,
        reason: 'No recently started microcycles found',
      };
    } catch (error) {
      log.error('Error checking microcycle start:', error);
      return { shouldTrigger: false, reason: 'Error evaluating trigger' };
    }
  }

  /**
   * Check if consistency dropped below threshold
   */
  private static async checkConsistencyDrops(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    try {
      const threshold = automation.trigger_config?.consistency_threshold || 70;

      let query = supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', automation.user_id)
        .lt('consistency_rate', threshold);

      // Apply filters
      if (automation.applies_to_athletes && automation.applies_to_athletes.length > 0) {
        query = query.in('athlete_id', automation.applies_to_athletes);
      }

      if (automation.applies_to_modality && automation.applies_to_modality.length > 0) {
        query = query.in('modality', automation.applies_to_modality);
      }

      if (automation.applies_to_level && automation.applies_to_level.length > 0) {
        query = query.in('level', automation.applies_to_level);
      }

      const { data: athletes, error } = await query;

      if (error) throw error;

      if (athletes && athletes.length > 0) {
        return {
          shouldTrigger: true,
          context: { athletes, threshold },
        };
      }

      return {
        shouldTrigger: false,
        reason: `No athletes with consistency < ${threshold}%`,
      };
    } catch (error) {
      log.error('Error checking consistency drops:', error);
      return { shouldTrigger: false, reason: 'Error evaluating trigger' };
    }
  }

  /**
   * Check if trial is expiring soon
   */
  private static async checkTrialExpiring(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    try {
      const daysBeforeExpiry = automation.trigger_config?.days_before_expiry || 3;

      const today = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(today.getDate() + daysBeforeExpiry);

      const { data: athletes, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('user_id', automation.user_id)
        .eq('status', 'trial')
        .gte('trial_expires_at', today.toISOString())
        .lte('trial_expires_at', expiryDate.toISOString());

      if (error) throw error;

      if (athletes && athletes.length > 0) {
        return {
          shouldTrigger: true,
          context: { athletes, daysBeforeExpiry },
        };
      }

      return {
        shouldTrigger: false,
        reason: `No trials expiring in ${daysBeforeExpiry} days`,
      };
    } catch (error) {
      log.error('Error checking trial expiring:', error);
      return { shouldTrigger: false, reason: 'Error evaluating trigger' };
    }
  }

  /**
   * Check if any workout was completed recently
   */
  private static async checkWorkoutCompleted(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Find workout slots completed recently, joined with microcycles to get athlete info
      const { data: completedSlots, error } = await supabase
        .from('workout_slots')
        .select('*, microcycles!inner(athlete_id, athlete_profiles!inner(*))')
        .eq('user_id', automation.user_id)
        .eq('completed', true)
        .gte('updated_at', fiveMinutesAgo);

      if (error) throw error;

      if (!completedSlots || completedSlots.length === 0) {
        return { shouldTrigger: false, reason: 'No recently completed workouts' };
      }

      // Extract unique athletes from completed slots
      const athleteMap = new Map<string, any>();
      for (const slot of completedSlots) {
        const mc = slot.microcycles as any;
        const profile = mc?.athlete_profiles;
        if (profile) {
          athleteMap.set(mc.athlete_id, profile);
        }
      }

      let athletes = Array.from(athleteMap.values());

      // Apply athlete filter if set
      if (automation.applies_to_athletes && automation.applies_to_athletes.length > 0) {
        athletes = athletes.filter((a: any) =>
          automation.applies_to_athletes!.includes(a.athlete_id || a.id)
        );
      }

      if (automation.applies_to_modality && automation.applies_to_modality.length > 0) {
        athletes = athletes.filter((a: any) =>
          automation.applies_to_modality!.includes(a.modality)
        );
      }

      if (automation.applies_to_level && automation.applies_to_level.length > 0) {
        athletes = athletes.filter((a: any) =>
          automation.applies_to_level!.includes(a.level)
        );
      }

      if (athletes.length > 0) {
        return {
          shouldTrigger: true,
          context: { athletes, completedSlots },
        };
      }

      return { shouldTrigger: false, reason: 'No matching athletes with completed workouts' };
    } catch (error) {
      log.error('Error checking workout completed:', error);
      return { shouldTrigger: false, reason: 'Error evaluating trigger' };
    }
  }

  private static async checkWorkoutMissed(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    try {
      // Find active microcycles for this coach
      const { data: microcycles, error: mcError } = await supabase
        .from('microcycles')
        .select('*, athlete_profiles!inner(*)')
        .eq('user_id', automation.user_id)
        .eq('status', 'active');

      if (mcError) throw mcError;
      if (!microcycles || microcycles.length === 0) {
        return { shouldTrigger: false, reason: 'No active microcycles' };
      }

      const missedAthletes: any[] = [];

      for (const mc of microcycles) {
        // Calculate which slots should already be completed based on current date
        const startDate = new Date(mc.start_date);
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceStart < 0) continue; // Microcycle hasn't started yet

        // Get incomplete workout slots for this microcycle that are in the past
        const { data: missedSlots, error: slotError } = await supabase
          .from('workout_slots')
          .select('*')
          .eq('microcycle_id', mc.id)
          .eq('completed', false);

        if (slotError) {
          log.error(`Error fetching slots for microcycle ${mc.id}:`, slotError);
          continue;
        }

        if (!missedSlots) continue;

        // Check which slots are in the past based on week_number and day_of_week
        const pastSlots = missedSlots.filter((slot: any) => {
          const slotDayOffset = ((slot.week_number - 1) * 7) + (slot.day_of_week - 1);
          return slotDayOffset < daysSinceStart;
        });

        if (pastSlots.length > 0) {
          const profile = (mc as any).athlete_profiles;
          if (profile) {
            missedAthletes.push({
              ...profile,
              missed_count: pastSlots.length,
            });
          }
        }
      }

      // Apply athlete filter if set
      let filtered = missedAthletes;
      if (automation.applies_to_athletes && automation.applies_to_athletes.length > 0) {
        filtered = filtered.filter((a: any) =>
          automation.applies_to_athletes!.includes(a.athlete_id || a.id)
        );
      }

      if (automation.applies_to_modality && automation.applies_to_modality.length > 0) {
        filtered = filtered.filter((a: any) =>
          automation.applies_to_modality!.includes(a.modality)
        );
      }

      if (automation.applies_to_level && automation.applies_to_level.length > 0) {
        filtered = filtered.filter((a: any) =>
          automation.applies_to_level!.includes(a.level)
        );
      }

      if (filtered.length > 0) {
        return {
          shouldTrigger: true,
          context: {
            athletes: filtered,
            reason: `${filtered.length} athlete(s) with missed workouts`,
          },
        };
      }

      return { shouldTrigger: false, reason: 'No athletes with missed workouts' };
    } catch (error) {
      log.error('Error checking workout missed:', error);
      return { shouldTrigger: false, reason: 'Error evaluating trigger' };
    }
  }

  private static async checkWeeklySummary(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    // Check if it's time to send weekly summary (e.g., every Sunday)
    const today = new Date();
    if (today.getDay() === 0) {
      // Sunday
      return { shouldTrigger: true, context: { day: 'Sunday' } };
    }
    return { shouldTrigger: false, reason: 'Not Sunday' };
  }

  private static async checkAthleteJoins(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: newAthletes, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('user_id', automation.user_id)
        .gte('created_at', fiveMinutesAgo);

      if (error) throw error;

      if (newAthletes && newAthletes.length > 0) {
        return {
          shouldTrigger: true,
          context: {
            athletes: newAthletes,
            reason: `${newAthletes.length} new athlete(s) joined`,
          },
        };
      }

      return { shouldTrigger: false, reason: 'No new athletes in last 5 minutes' };
    } catch (error) {
      log.error('Error checking athlete joins:', error);
      return { shouldTrigger: false, reason: 'Error evaluating trigger' };
    }
  }

  // ============================================================================
  // ACTION EXECUTION
  // ============================================================================

  /**
   * Execute the configured action
   */
  private static async executeAction(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    switch (automation.action_type) {
      case 'send_whatsapp':
        return await this.executeSendWhatsApp(automation, context);

      case 'send_email':
        return await this.executeSendEmail(automation, context);

      case 'create_alert':
        return await this.executeCreateAlert(automation, context);

      case 'adjust_workout':
        return await this.executeAdjustWorkout(automation, context);

      case 'send_notification':
        return await this.executeSendNotification(automation, context);

      default:
        throw new Error(`Unknown action type: ${automation.action_type}`);
    }
  }

  /**
   * Create in-app alert for coach to contact athletes manually.
   * Previously sent WhatsApp messages via Evolution API (removed — WhatsApp ToS violation risk).
   */
  private static async executeSendWhatsApp(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    const athletes = context?.athletes || context?.microcycles?.map((m: any) => m.athlete_profiles);

    if (!athletes || athletes.length === 0) {
      throw new Error('No target athletes found');
    }

    let alertsCreated = 0;

    for (const athlete of athletes) {
      try {
        await supabase.from('alerts').insert({
          user_id: automation.user_id,
          athlete_id: athlete.athlete_id || athlete.id,
          alert_type: 'motivation',
          severity: 'medium',
          keywords_detected: [],
          message_preview: `Automação "${automation.name}": contatar ${athlete.name} manualmente`,
          feedback_id: null,
        });

        alertsCreated++;
      } catch (error) {
        log.error(`Error creating alert for ${athlete.name}:`, error);
      }
    }

    return `Created ${alertsCreated} alert(s) to contact athlete(s) manually`;
  }

  /**
   * Create alert in alerts table
   */
  private static async executeCreateAlert(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    const severity = automation.action_config?.alert_severity || 'medium';
    const athletes = context?.athletes || [];

    let alertsCreated = 0;

    for (const athlete of athletes) {
      try {
        await supabase.from('alerts').insert({
          user_id: automation.user_id,
          athlete_id: athlete.athlete_id || athlete.id,
          alert_type: 'motivation', // Default type
          severity,
          keywords_detected: [],
          message_preview: `Automation triggered: ${automation.name}`,
          feedback_id: null,
        });

        alertsCreated++;
      } catch (error) {
        log.error(`Error creating alert for ${athlete.name}:`, error);
      }
    }

    return `Created ${alertsCreated} alert(s)`;
  }

  /**
   * Send email notification to coach about athlete via notification system
   */
  private static async executeSendEmail(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    const athletes = context?.athletes || context?.microcycles?.map((m: any) => m.athlete_profiles);

    if (!athletes || athletes.length === 0) {
      throw new Error('No target athletes found for email');
    }

    const reason = context?.reason || `Automação "${automation.name}" disparada`;
    let emailsScheduled = 0;

    for (const athlete of athletes) {
      try {
        const athleteName = athlete.name || 'Atleta';

        await supabase.from('scheduled_notifications').insert({
          user_id: automation.user_id,
          recipient_id: automation.user_id, // Coach receives the email
          channel: 'email',
          title: `Flux: ${automation.name}`,
          body: `Atleta ${athleteName} — ${reason}`,
          action_url: `/flux/athlete/${athlete.athlete_id || athlete.id}`,
          send_at: new Date().toISOString(),
          status: 'pending',
        });

        emailsScheduled++;
      } catch (error) {
        log.error(`Error scheduling email for athlete ${athlete.name}:`, error);
      }
    }

    return `Scheduled ${emailsScheduled} email notification(s) to coach`;
  }

  private static async executeAdjustWorkout(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    const adjustmentPct = automation.action_config?.adjustment_percentage || -10;
    const athletes = context?.athletes || [];

    if (athletes.length === 0) {
      throw new Error('No target athletes found for workout adjustment');
    }

    let slotsAdjusted = 0;

    for (const athlete of athletes) {
      try {
        // Find the athlete's active microcycle
        const { data: activeMc, error: mcError } = await supabase
          .from('microcycles')
          .select('id')
          .eq('user_id', automation.user_id)
          .eq('athlete_id', athlete.athlete_id || athlete.id)
          .eq('status', 'active')
          .limit(1)
          .single();

        if (mcError || !activeMc) continue;

        // Get incomplete workout slots for this microcycle
        const { data: slots, error: slotError } = await supabase
          .from('workout_slots')
          .select('id, duration, rpe, ftp_percentage, css_percentage')
          .eq('microcycle_id', activeMc.id)
          .eq('completed', false);

        if (slotError || !slots || slots.length === 0) continue;

        // Apply percentage adjustment to each incomplete slot
        const multiplier = 1 + (adjustmentPct / 100);

        for (const slot of slots) {
          const updates: Record<string, any> = {};

          if (slot.duration) {
            updates.duration = Math.round(slot.duration * multiplier);
          }
          if (slot.rpe) {
            updates.rpe = Math.max(1, Math.min(10, Math.round(slot.rpe * multiplier)));
          }
          if (slot.ftp_percentage) {
            updates.ftp_percentage = Math.round(slot.ftp_percentage * multiplier);
          }
          if (slot.css_percentage) {
            updates.css_percentage = Math.round(slot.css_percentage * multiplier);
          }

          if (Object.keys(updates).length > 0) {
            updates.coach_notes = `[Auto] Intensidade ajustada em ${adjustmentPct}% pela automação "${automation.name}"`;

            const { error: updateError } = await supabase
              .from('workout_slots')
              .update(updates)
              .eq('id', slot.id);

            if (!updateError) slotsAdjusted++;
          }
        }
      } catch (error) {
        log.error(`Error adjusting workouts for athlete ${athlete.name}:`, error);
      }
    }

    return `Adjusted ${slotsAdjusted} workout slot(s) by ${adjustmentPct}%`;
  }

  private static async executeSendNotification(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    const athletes = context?.athletes || context?.microcycles?.map((m: any) => m.athlete_profiles);

    if (!athletes || athletes.length === 0) {
      throw new Error('No target athletes found for notification');
    }

    const triggerTitles: Record<string, string> = {
      microcycle_starts: 'Novo Microciclo Iniciado',
      workout_completed: 'Treino Concluído',
      workout_missed: 'Treino Perdido',
      consistency_drops: 'Alerta de Consistência',
      weekly_summary: 'Resumo Semanal',
      athlete_joins: 'Novo Atleta',
      trial_expiring: 'Trial Expirando',
    };

    const title = triggerTitles[automation.trigger_type] || `Automação: ${automation.name}`;
    const reason = context?.reason || automation.name;
    let notificationsCreated = 0;

    for (const athlete of athletes) {
      try {
        const athleteName = athlete.name || 'Atleta';

        await supabase.from('scheduled_notifications').insert({
          user_id: automation.user_id,
          recipient_id: automation.user_id, // Coach receives the notification
          channel: 'in_app',
          title,
          body: `${athleteName} — ${reason}`,
          action_url: `/flux/athlete/${athlete.athlete_id || athlete.id}`,
          send_at: new Date().toISOString(),
          status: 'pending',
        });

        notificationsCreated++;
      } catch (error) {
        log.error(`Error creating notification for athlete ${athlete.name}:`, error);
      }
    }

    return `Created ${notificationsCreated} in-app notification(s)`;
  }
}
