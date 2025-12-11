/**
 * Feedback Loop Service
 * PHASE 3.3: Learning Feedback Loop for Recommendations
 *
 * Handles user feedback on module recommendations and dynamically adjusts
 * recommendation weights based on learning from user acceptance/rejection patterns.
 *
 * Key responsibilities:
 * 1. Record user feedback on recommendations
 * 2. Calculate dynamic module weights per user
 * 3. Track module completion and rating
 * 4. Award gamification points
 * 5. Decay old recommendations
 * 6. Generate user preference insights
 */

import { supabase } from './supabaseClient';
import { gamificationService } from './gamificationService';
import { notificationService } from './notificationService';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface ModuleFeedback {
  id?: string;
  user_id: string;
  module_id: string;
  recommendation_id?: string;
  feedback_type: 'accepted' | 'rejected' | 'skipped';
  confidence_score_at_time?: number;
  reason?: string;
  progress?: number;
  completed_at?: string;
  rating?: number;
  interacted_at?: string;
}

export interface UserModuleWeight {
  id?: string;
  user_id: string;
  module_id: string;
  base_weight: number;
  acceptance_bonus: number;
  rejection_penalty: number;
  completion_bonus: number;
  rating_bonus: number;
  recency_decay: number;
  final_weight: number;
  total_feedback_count: number;
  last_feedback_date?: string;
}

export interface UserModulePreferences {
  userId: string;
  accepted_modules: Array<{
    moduleId: string;
    moduleName: string;
    acceptedAt: string;
    completionRate: number;
    rating?: number;
  }>;
  rejected_modules: Array<{
    moduleId: string;
    moduleName: string;
    rejectedAt: string;
    reasons: string[];
  }>;
  in_progress_modules: Array<{
    moduleId: string;
    moduleName: string;
    progress: number;
    startedAt: string;
  }>;
  completed_modules: Array<{
    moduleId: string;
    moduleName: string;
    completedAt: string;
    rating: number;
    timeSpent: number;
  }>;
  stats: {
    total_accepted: number;
    total_rejected: number;
    total_completed: number;
    acceptance_rate: number; // 0-1
    completion_rate: number; // 0-1
    avg_rating: number;
    learning_pace: 'fast' | 'steady' | 'slow';
  };
}

export interface ModuleCompletionResult {
  moduleId: string;
  success: boolean;
  xpAwarded: number;
  achievement_unlocked?: string;
  newLevel?: number;
  levelUpBonus?: number;
}

export interface WeightCalculationResult {
  module_id: string;
  user_id: string;
  old_weight: number;
  new_weight: number;
  adjustment_reason: string;
}

// Learning formula parameters
const LEARNING_WEIGHTS = {
  ACCEPTANCE_BONUS: 5.0,
  REJECTION_PENALTY: -3.0,
  COMPLETION_BONUS: 10.0,
  RATING_BONUS: 2.0,
  RECENCY_DECAY: -0.1, // per day
};

const WEIGHT_LIMITS = {
  MIN: 0.1,
  MAX: 10.0,
};

const RECENCY_THRESHOLDS = {
  RECENT_DAYS: 7, // Last 7 days = 2x weight
  DECAY_DAYS: 30, // After 30 days, start decaying
};

// Gamification points for feedback
const GAMIFICATION_REWARDS = {
  ACCEPT_RECOMMENDATION: 5, // CP points
  COMPLETE_MODULE: 50, // Base CP
  COMPLETE_WITH_RATING: 10, // Bonus per rating point
  STREAK_5_MODULES: 100, // 5 modules in a row
  STREAK_10_MODULES: 300, // 10 modules completed
};

const ACHIEVEMENTS_CONDITIONS = {
  EARLY_ADOPTER: { type: 'first_module_completed' },
  LEARNER: { type: 'modules_completed', count: 5 },
  MASTERY: { type: 'modules_completed', count: 10 },
  CONSISTENT: { type: 'consecutive_days', days: 7 },
};

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class FeedbackLoopService {
  private logger = {
    log: (msg: string, data?: any) => console.log(`[FeedbackLoopService] ${msg}`, data),
    error: (msg: string, error?: any) => console.error(`[FeedbackLoopService] ${msg}`, error),
    debug: (msg: string, data?: any) => {
      if (process.env.DEBUG_FEEDBACK) {
        console.debug(`[FeedbackLoopService] ${msg}`, data);
      }
    },
  };

  /**
   * Record user feedback on a recommendation
   * Updates module weights and triggers gamification
   */
  async recordModuleFeedback(
    userId: string,
    moduleId: string,
    feedbackType: 'accepted' | 'rejected' | 'skipped',
    options: {
      recommendationId?: string;
      confidenceScore?: number;
      reason?: string;
    } = {}
  ): Promise<ModuleFeedback> {
    try {
      this.logger.log(`Recording feedback: user=${userId}, module=${moduleId}, type=${feedbackType}`);

      // Create feedback record
      const feedbackData: ModuleFeedback = {
        user_id: userId,
        module_id: moduleId,
        feedback_type: feedbackType,
        recommendation_id: options.recommendationId,
        confidence_score_at_time: options.confidenceScore,
        reason: options.reason,
        interacted_at: new Date().toISOString(),
      };

      // Insert feedback into database
      const { data, error } = await supabase
        .from('user_module_feedback')
        .insert([feedbackData])
        .select()
        .single();

      if (error) throw error;

      this.logger.log('Feedback recorded successfully', { feedbackId: data.id });

      // Award gamification points if accepted
      if (feedbackType === 'accepted') {
        await this.awardFeedbackPoints(userId, moduleId, feedbackType);
      }

      // Trigger weight recalculation (handled by database trigger)
      // But we can also manually update for immediate effect
      await this.updateModuleWeight(userId, moduleId, feedbackType);

      // Send notification
      await this.notifyFeedbackReceived(userId, feedbackType, moduleId);

      return data;
    } catch (error) {
      this.logger.error('Failed to record feedback', error);
      throw error;
    }
  }

  /**
   * Update module weight based on feedback
   * Implements the dynamic weight learning formula
   */
  async updateModuleWeight(
    userId: string,
    moduleId: string,
    feedbackType: 'accepted' | 'rejected' | 'skipped'
  ): Promise<WeightCalculationResult> {
    try {
      this.logger.debug(`Calculating weight for user=${userId}, module=${moduleId}`);

      // Get current weight
      const { data: currentWeight, error: fetchError } = await supabase
        .from('user_module_weights')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const oldWeight = currentWeight?.final_weight ?? 1.0;

      // Get feedback statistics
      const feedbackStats = await this.getModuleFeedbackStats(userId, moduleId);
      const daysSinceLastFeedback = await this.getDaysSinceLastFeedback(userId, moduleId);

      // Calculate new weight using learning formula
      let newWeight = 1.0;

      // Base acceptance/rejection adjustments
      newWeight +=
        feedbackStats.accepted_count * LEARNING_WEIGHTS.ACCEPTANCE_BONUS +
        feedbackStats.rejected_count * LEARNING_WEIGHTS.REJECTION_PENALTY;

      // Completion bonus
      newWeight += feedbackStats.completed_count * LEARNING_WEIGHTS.COMPLETION_BONUS;

      // Rating bonus
      if (feedbackStats.average_rating) {
        newWeight += feedbackStats.average_rating * LEARNING_WEIGHTS.RATING_BONUS;
      }

      // Recency decay
      const recencyDecay = this.calculateRecencyDecay(daysSinceLastFeedback);
      newWeight *= recencyDecay;

      // Clamp weight
      newWeight = Math.max(WEIGHT_LIMITS.MIN, Math.min(WEIGHT_LIMITS.MAX, newWeight));

      // Update or insert weight record
      const { data, error } = await supabase
        .from('user_module_weights')
        .upsert(
          [
            {
              user_id: userId,
              module_id: moduleId,
              final_weight: newWeight,
              total_feedback_count:
                feedbackStats.accepted_count + feedbackStats.rejected_count,
              last_feedback_date: new Date().toISOString(),
              weight_recalculated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'user_id,module_id' }
        )
        .select()
        .single();

      if (error) throw error;

      // Log weight change to audit trail
      await this.auditWeightChange(userId, moduleId, oldWeight, newWeight, feedbackType);

      return {
        module_id: moduleId,
        user_id: userId,
        old_weight: oldWeight,
        new_weight: newWeight,
        adjustment_reason: `Feedback: ${feedbackType} (accepted: ${feedbackStats.accepted_count}, rejected: ${feedbackStats.rejected_count})`,
      };
    } catch (error) {
      this.logger.error('Failed to update module weight', error);
      throw error;
    }
  }

  /**
   * Recalculate all weights for a user after batch feedback updates
   */
  async recalculateUserWeights(userId: string): Promise<Map<string, number>> {
    try {
      this.logger.log(`Recalculating all weights for user=${userId}`);

      // Get all modules the user has interacted with
      const { data: feedbackRecords, error } = await supabase
        .from('user_module_feedback')
        .select('module_id')
        .eq('user_id', userId)
        .distinct();

      if (error) throw error;

      const weights = new Map<string, number>();

      // Recalculate weight for each module
      for (const record of feedbackRecords || []) {
        const result = await this.updateModuleWeight(userId, record.module_id, 'accepted');
        weights.set(record.module_id, result.new_weight);
      }

      this.logger.log(`Recalculated ${weights.size} module weights for user`);
      return weights;
    } catch (error) {
      this.logger.error('Failed to recalculate user weights', error);
      throw error;
    }
  }

  /**
   * Get user's preferences based on feedback history
   */
  async getUserPreferences(userId: string): Promise<UserModulePreferences> {
    try {
      this.logger.log(`Getting preferences for user=${userId}`);

      // Get all feedback for user
      const { data: allFeedback, error } = await supabase
        .from('user_module_feedback')
        .select(
          `
          id,
          module_id,
          feedback_type,
          progress,
          completed_at,
          rating,
          reason,
          interacted_at,
          module_definitions(id, name)
        `
        )
        .eq('user_id', userId)
        .order('interacted_at', { ascending: false });

      if (error) throw error;

      // Categorize feedback
      const accepted = [];
      const rejected = [];
      const inProgress = [];
      const completed = [];

      for (const feedback of allFeedback || []) {
        const moduleInfo = feedback.module_definitions as any;
        const moduleName = moduleInfo?.name || 'Unknown Module';

        if (feedback.feedback_type === 'accepted') {
          if (feedback.completed_at) {
            completed.push({
              moduleId: feedback.module_id,
              moduleName,
              completedAt: feedback.completed_at,
              rating: feedback.rating || 0,
              timeSpent: 0, // Could be calculated from timestamps
            });
          } else if (feedback.progress && feedback.progress > 0) {
            inProgress.push({
              moduleId: feedback.module_id,
              moduleName,
              progress: feedback.progress,
              startedAt: feedback.interacted_at,
            });
          } else {
            accepted.push({
              moduleId: feedback.module_id,
              moduleName,
              acceptedAt: feedback.interacted_at,
              completionRate: 0,
            });
          }
        } else if (feedback.feedback_type === 'rejected') {
          const reasons = [];
          if (feedback.reason) {
            try {
              const parsedReasons = JSON.parse(feedback.reason);
              reasons.push(...parsedReasons);
            } catch {
              reasons.push(feedback.reason);
            }
          }
          rejected.push({
            moduleId: feedback.module_id,
            moduleName,
            rejectedAt: feedback.interacted_at,
            reasons,
          });
        }
      }

      // Calculate statistics
      const total = allFeedback?.length || 0;
      const stats = {
        total_accepted: accepted.length,
        total_rejected: rejected.length,
        total_completed: completed.length,
        acceptance_rate: total > 0 ? accepted.length / total : 0,
        completion_rate: accepted.length > 0 ? completed.length / accepted.length : 0,
        avg_rating:
          completed.length > 0
            ? completed.reduce((sum, m) => sum + (m.rating || 0), 0) / completed.length
            : 0,
        learning_pace: this.determineLearningPace(completed.length, allFeedback?.length || 0),
      };

      return {
        userId,
        accepted_modules: accepted,
        rejected_modules: rejected,
        in_progress_modules: inProgress,
        completed_modules: completed,
        stats,
      };
    } catch (error) {
      this.logger.error('Failed to get user preferences', error);
      throw error;
    }
  }

  /**
   * Handle module completion and award points
   */
  async handleModuleCompletion(
    userId: string,
    moduleId: string,
    options: {
      rating?: number;
      timeSpent?: number;
      feedback?: string;
    } = {}
  ): Promise<ModuleCompletionResult> {
    try {
      this.logger.log(`Handling module completion: user=${userId}, module=${moduleId}`);

      // Update feedback record
      const { data: feedback, error: updateError } = await supabase
        .from('user_module_feedback')
        .update({
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: options.rating,
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .order('interacted_at', { ascending: false })
        .limit(1)
        .select()
        .single();

      if (updateError && updateError.code !== 'PGRST116') throw updateError;

      // Calculate XP rewards
      let xpAwarded = GAMIFICATION_REWARDS.COMPLETE_MODULE;
      if (options.rating) {
        xpAwarded += options.rating * GAMIFICATION_REWARDS.COMPLETE_WITH_RATING;
      }

      // Award points
      const { newLevel, levelUpBonus } = await gamificationService.addXp(userId, xpAwarded);

      this.logger.log(`Awarded ${xpAwarded} XP to user`, { newLevel, levelUpBonus });

      // Check for achievements
      const preferences = await this.getUserPreferences(userId);
      let achievementUnlocked: string | undefined;

      if (preferences.stats.total_completed === 1) {
        achievementUnlocked = 'EARLY_ADOPTER';
      } else if (preferences.stats.total_completed === 5) {
        achievementUnlocked = 'LEARNER';
      } else if (preferences.stats.total_completed === 10) {
        achievementUnlocked = 'MASTERY';
      }

      // Update weight based on completion
      await this.updateModuleWeight(userId, moduleId, 'accepted');

      // Send notification
      await this.notifyModuleCompleted(userId, moduleId, {
        rating: options.rating,
        xpAwarded,
        achievementUnlocked,
      });

      return {
        moduleId,
        success: true,
        xpAwarded,
        achievement_unlocked: achievementUnlocked,
        newLevel,
        levelUpBonus,
      };
    } catch (error) {
      this.logger.error('Failed to handle module completion', error);
      throw error;
    }
  }

  /**
   * Get module completion status
   */
  async getModuleCompletionStatus(
    userId: string,
    moduleId: string
  ): Promise<{
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
    rating?: number;
    completedAt?: string;
  }> {
    try {
      const { data: feedback, error } = await supabase
        .from('user_module_feedback')
        .select('progress, rating, completed_at, feedback_type')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .order('interacted_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') {
        return { status: 'not_started', progress: 0 };
      }

      if (error) throw error;

      const status = feedback?.completed_at
        ? 'completed'
        : feedback?.progress && feedback.progress > 0
          ? 'in_progress'
          : 'not_started';

      return {
        status: status as any,
        progress: feedback?.progress || 0,
        rating: feedback?.rating,
        completedAt: feedback?.completed_at,
      };
    } catch (error) {
      this.logger.error('Failed to get module completion status', error);
      throw error;
    }
  }

  /**
   * Decay old recommendations (run daily)
   * Reduces weight for recommendations older than threshold
   */
  async decayOldRecommendations(userId: string, decayDays: number = 30): Promise<number> {
    try {
      this.logger.log(`Decaying recommendations older than ${decayDays} days for user=${userId}`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - decayDays);

      // Get all weights for this user
      const { data: weights, error: fetchError } = await supabase
        .from('user_module_weights')
        .select('*')
        .eq('user_id', userId)
        .lt('last_feedback_date', cutoffDate.toISOString());

      if (fetchError) throw fetchError;

      if (!weights || weights.length === 0) {
        this.logger.log('No old recommendations to decay');
        return 0;
      }

      // Apply decay to each weight
      const updates = weights.map((weight) => {
        const decayFactor = this.calculateRecencyDecay(decayDays);
        return {
          ...weight,
          final_weight: Math.max(WEIGHT_LIMITS.MIN, weight.final_weight * decayFactor),
          weight_recalculated_at: new Date().toISOString(),
        };
      });

      const { error: updateError } = await supabase
        .from('user_module_weights')
        .upsert(updates, { onConflict: 'user_id,module_id' });

      if (updateError) throw updateError;

      this.logger.log(`Decayed ${weights.length} module weights`);
      return weights.length;
    } catch (error) {
      this.logger.error('Failed to decay old recommendations', error);
      throw error;
    }
  }

  /**
   * Get recommended modules for a user based on learned weights
   * Called during recommendation generation to use dynamic weights
   */
  async getUserModuleWeights(userId: string): Promise<Map<string, number>> {
    try {
      const { data: weights, error } = await supabase
        .from('user_module_weights')
        .select('module_id, final_weight')
        .eq('user_id', userId);

      if (error) throw error;

      const weightMap = new Map<string, number>();
      for (const weight of weights || []) {
        weightMap.set(weight.module_id, weight.final_weight);
      }

      return weightMap;
    } catch (error) {
      this.logger.error('Failed to get user module weights', error);
      return new Map();
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get feedback statistics for a module
   */
  private async getModuleFeedbackStats(
    userId: string,
    moduleId: string
  ): Promise<{
    accepted_count: number;
    rejected_count: number;
    completed_count: number;
    average_rating: number | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_module_feedback_summary')
        .select(
          'accepted_count, rejected_count, completed_count, average_rating'
        )
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single();

      if (error && error.code === 'PGRST116') {
        return {
          accepted_count: 0,
          rejected_count: 0,
          completed_count: 0,
          average_rating: null,
        };
      }

      if (error) throw error;

      return (
        data || {
          accepted_count: 0,
          rejected_count: 0,
          completed_count: 0,
          average_rating: null,
        }
      );
    } catch (error) {
      this.logger.error('Failed to get feedback stats', error);
      return {
        accepted_count: 0,
        rejected_count: 0,
        completed_count: 0,
        average_rating: null,
      };
    }
  }

  /**
   * Get days since last feedback
   */
  private async getDaysSinceLastFeedback(userId: string, moduleId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_module_feedback')
        .select('interacted_at')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .order('interacted_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') return 0;
      if (error) throw error;

      const lastDate = new Date(data?.interacted_at);
      const now = new Date();
      return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    } catch (error) {
      this.logger.error('Failed to get days since feedback', error);
      return 0;
    }
  }

  /**
   * Calculate recency decay factor
   * Recent feedback (< 7 days) gets 2x weight
   * Older feedback (> 30 days) decays progressively
   */
  private calculateRecencyDecay(daysSince: number): number {
    if (daysSince <= RECENCY_THRESHOLDS.RECENT_DAYS) {
      return 2.0; // 2x weight for recent feedback
    }

    if (daysSince >= RECENCY_THRESHOLDS.DECAY_DAYS) {
      // Start decaying after 30 days
      const decayDays = daysSince - RECENCY_THRESHOLDS.DECAY_DAYS;
      return Math.max(0.5, 1.0 - decayDays * 0.01);
    }

    return 1.0; // Normal weight
  }

  /**
   * Determine learning pace based on completion speed
   */
  private determineLearningPace(completed: number, total: number): 'fast' | 'steady' | 'slow' {
    if (total === 0) return 'steady';

    const completionRate = completed / total;

    if (completionRate >= 0.7) return 'fast';
    if (completionRate >= 0.4) return 'steady';
    return 'slow';
  }

  /**
   * Award gamification points for feedback
   */
  private async awardFeedbackPoints(userId: string, moduleId: string, feedbackType: string) {
    try {
      if (feedbackType === 'accepted') {
        await gamificationService.addXp(userId, GAMIFICATION_REWARDS.ACCEPT_RECOMMENDATION);
      }
    } catch (error) {
      this.logger.error('Failed to award feedback points', error);
    }
  }

  /**
   * Audit trail for weight changes
   */
  private async auditWeightChange(
    userId: string,
    moduleId: string,
    oldWeight: number,
    newWeight: number,
    reason: string
  ) {
    try {
      await supabase.from('user_module_weight_audit').insert([
        {
          user_id: userId,
          module_id: moduleId,
          old_weight: oldWeight,
          new_weight: newWeight,
          reason,
          changed_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      this.logger.error('Failed to audit weight change', error);
    }
  }

  /**
   * Send notification for feedback received
   */
  private async notifyFeedbackReceived(userId: string, feedbackType: string, moduleId: string) {
    try {
      if (feedbackType === 'accepted') {
        await notificationService.send({
          userId,
          type: 'recommendation_accepted',
          title: 'Great choice!',
          message: 'You accepted a module recommendation. Keep up the learning!',
          icon: '👍',
        });
      }
    } catch (error) {
      this.logger.error('Failed to send feedback notification', error);
    }
  }

  /**
   * Send notification for module completion
   */
  private async notifyModuleCompleted(
    userId: string,
    moduleId: string,
    details: any
  ) {
    try {
      await notificationService.send({
        userId,
        type: 'module_completed',
        title: 'Module Completed!',
        message: `Congratulations! You earned ${details.xpAwarded} XP.`,
        icon: '🎉',
        metadata: details,
      });
    } catch (error) {
      this.logger.error('Failed to send completion notification', error);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const feedbackLoopService = new FeedbackLoopService();
