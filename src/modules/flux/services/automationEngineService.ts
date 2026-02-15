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
   * Placeholder implementations for other triggers
   * TODO: Implement these based on requirements
   */
  private static async checkWorkoutCompleted(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    // Check if any workout was completed in last 5 minutes
    return { shouldTrigger: false, reason: 'Not implemented yet' };
  }

  private static async checkWorkoutMissed(
    automation: WorkoutAutomation
  ): Promise<TriggerEvaluationResult> {
    // Check if scheduled workout was missed (past scheduled time + no completion)
    return { shouldTrigger: false, reason: 'Not implemented yet' };
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
    // Check if new athlete was added in last 5 minutes
    return { shouldTrigger: false, reason: 'Not implemented yet' };
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
   * Placeholder implementations for other actions
   */
  private static async executeSendEmail(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    // TODO: Implement email sending
    throw new Error('Email sending not implemented yet');
  }

  private static async executeAdjustWorkout(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    // TODO: Implement workout adjustment logic
    throw new Error('Workout adjustment not implemented yet');
  }

  private static async executeSendNotification(
    automation: WorkoutAutomation,
    context?: Record<string, any>
  ): Promise<string> {
    // TODO: Implement in-app notification
    throw new Error('In-app notification not implemented yet');
  }
}
