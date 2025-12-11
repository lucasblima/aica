/**
 * Onboarding Service
 * Backend logic for contextual trails: calculation, persistence, recommendations
 * Communicates with Supabase for data storage and retrieval
 */

import { supabase } from './supabaseClient';
import {
  ContextualTrail,
  ContextualQuestion,
  ContextualAnswer,
  TrailResponse,
  ContextualQuestionResponse,
  OnboardingStatus,
  StoredContextCapture,
  TrailScoreCalculation,
  ModuleRecommendation,
} from '../types/onboardingTypes';
import {
  CONTEXTUAL_TRAILS,
  getTrailById,
  TRAIL_TO_MODULES_MAP,
  ALL_TRAILS,
} from '../data/contextualTrails';

// =====================================================
// PUBLIC API FUNCTIONS
// =====================================================

/**
 * Get all available contextual trails
 * @returns Array of all contextual trails
 */
export async function getCourseTrails(): Promise<ContextualTrail[]> {
  return ALL_TRAILS;
}

/**
 * Get a specific trail by ID
 * @param trailId - The trail identifier
 * @returns The trail object or undefined if not found
 */
export async function getTrailById_API(trailId: string): Promise<ContextualTrail | undefined> {
  const trail = getTrailById(trailId);
  if (!trail) {
    console.warn(`Trail not found: ${trailId}`);
    return undefined;
  }
  return trail;
}

/**
 * Capture and store trail responses
 * Validates responses, calculates score, determines recommendations
 * @param userId - The user ID
 * @param trailId - The trail identifier
 * @param responses - Array of question responses
 * @returns Object with score, recommended modules, and points awarded
 */
export async function captureTrailResponses(
  userId: string,
  trailId: string,
  responses: ContextualQuestionResponse[]
): Promise<{
  success: boolean;
  trailScore: number;
  recommendedModules: string[];
  pointsAwarded: number;
  error?: string;
}> {
  try {
    // Validate trail exists
    const trail = getTrailById(trailId);
    if (!trail) {
      return {
        success: false,
        trailScore: 0,
        recommendedModules: [],
        pointsAwarded: 0,
        error: `Trail not found: ${trailId}`,
      };
    }

    // Validate and enrich responses
    const enrichedResponses = validateAndEnrichResponses(trail, responses);
    if (!enrichedResponses.valid) {
      return {
        success: false,
        trailScore: 0,
        recommendedModules: [],
        pointsAwarded: 0,
        error: enrichedResponses.error || 'Invalid responses',
      };
    }

    // Calculate trail score and recommendations
    const calculation = calculateTrailScore(trail, enrichedResponses.answers);

    // Prepare data for storage
    const storedResponses: Record<string, { selectedAnswerIds: string[]; answeredAt: string }> = {};
    responses.forEach((resp) => {
      storedResponses[resp.questionId] = {
        selectedAnswerIds: resp.selectedAnswerIds,
        answeredAt: resp.answeredAt?.toISOString() || new Date().toISOString(),
      };
    });

    // Store in database
    const { error: dbError } = await supabase
      .from('onboarding_context_captures')
      .upsert(
        {
          user_id: userId,
          trail_id: trailId,
          responses: storedResponses,
          trail_score: calculation.trailScore,
          recommended_modules: Array.from(calculation.recommendedModules),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,trail_id' }
      );

    if (dbError) {
      console.error('Database error saving trail responses:', dbError);
      return {
        success: false,
        trailScore: 0,
        recommendedModules: [],
        pointsAwarded: 0,
        error: dbError.message,
      };
    }

    // Award consciousness points
    const pointsAwarded = awardTrailCompletionPoints(calculation.trailScore);

    return {
      success: true,
      trailScore: calculation.trailScore,
      recommendedModules: Array.from(calculation.recommendedModules),
      pointsAwarded,
    };
  } catch (error) {
    console.error('Error capturing trail responses:', error);
    return {
      success: false,
      trailScore: 0,
      recommendedModules: [],
      pointsAwarded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate trail score based on responses
 * @param trail - The contextual trail
 * @param selectedAnswers - Selected answer objects with weights
 * @returns Calculation result with score and recommendations
 */
function calculateTrailScore(
  trail: ContextualTrail,
  selectedAnswers: ContextualAnswer[]
): TrailScoreCalculation {
  const weights = selectedAnswers.map((a) => a.weight);
  const averageWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;

  // Convert weight (0-10) to score (0-10)
  const trailScore = averageWeight;

  // Collect all trigger modules
  const triggerModules = new Set<string>();
  selectedAnswers.forEach((answer) => {
    if (answer.triggerModules) {
      answer.triggerModules.forEach((module) => triggerModules.add(module));
    }
  });

  // Add default trail modules if no specific triggers
  if (triggerModules.size === 0) {
    trail.recommendedModules.forEach((module) => triggerModules.add(module));
  }

  return {
    questionWeights: weights,
    averageWeight,
    trailScore,
    allTriggerModules: triggerModules,
    recommendedModules: Array.from(triggerModules),
  };
}

/**
 * Get user's onboarding status and progress
 * @param userId - The user ID
 * @returns Onboarding status object
 */
export async function getUserOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
  try {
    const { data: captures, error } = await supabase
      .from('onboarding_context_captures')
      .select('trail_id, trail_score, recommended_modules, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching onboarding status:', error);
      return null;
    }

    if (!captures || captures.length === 0) {
      return {
        userId,
        trailsCompleted: 0,
        totalTrails: 5,
        completedTrailIds: [],
        allRecommendedModules: [],
        averageTrailScore: 0,
        isOnboardingComplete: false,
      };
    }

    // Aggregate data
    const completedTrailIds = [...new Set(captures.map((c) => c.trail_id))];
    const allModulesSet = new Set<string>();

    captures.forEach((capture) => {
      if (capture.recommended_modules && Array.isArray(capture.recommended_modules)) {
        capture.recommended_modules.forEach((module) => allModulesSet.add(module));
      }
    });

    const avgScore = captures.reduce((sum, c) => sum + (c.trail_score || 0), 0) / captures.length;

    return {
      userId,
      trailsCompleted: completedTrailIds.length,
      totalTrails: 5,
      completedTrailIds,
      allRecommendedModules: Array.from(allModulesSet),
      averageTrailScore: parseFloat(avgScore.toFixed(2)),
      isOnboardingComplete: completedTrailIds.length >= 3,
      lastCompletedTrailAt: new Date(captures[0].created_at),
    };
  } catch (error) {
    console.error('Error in getUserOnboardingStatus:', error);
    return null;
  }
}

/**
 * Get all completed trails for a user from database
 * @param userId - The user ID
 * @returns Array of stored captures
 */
export async function getUserCompletedTrials(userId: string): Promise<StoredContextCapture[]> {
  try {
    const { data, error } = await supabase
      .from('onboarding_context_captures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user trials:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserCompletedTrials:', error);
    return [];
  }
}

/**
 * Calculate recommended modules across all completed trails
 * @param userId - The user ID
 * @returns Array of module recommendations with confidence scores
 */
export async function calculateRecommendedModules(
  userId: string
): Promise<ModuleRecommendation[]> {
  const status = await getUserOnboardingStatus(userId);
  if (!status) {
    return [];
  }

  // Create a map of module -> how many trails recommended it
  const moduleFrequency: Record<string, { count: number; trails: string[] }> = {};

  const captures = await getUserCompletedTrials(userId);
  captures.forEach((capture) => {
    if (capture.recommended_modules) {
      capture.recommended_modules.forEach((module) => {
        if (!moduleFrequency[module]) {
          moduleFrequency[module] = { count: 0, trails: [] };
        }
        moduleFrequency[module].count++;
        moduleFrequency[module].trails.push(capture.trail_id);
      });
    }
  });

  // Convert to ModuleRecommendation objects
  const recommendations: ModuleRecommendation[] = Object.entries(moduleFrequency).map(
    ([moduleId, data]) => ({
      moduleId,
      moduleName: moduleId.replace(/_/g, ' ').toUpperCase(),
      confidence: Math.min(data.count / status.completedTrailIds.length, 1),
      reasonFromTrails: data.trails,
      priority:
        data.count >= 3
          ? 'high'
          : data.count === 2
            ? 'medium'
            : 'low',
    })
  );

  // Sort by confidence and priority
  return recommendations.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    return b.confidence - a.confidence;
  });
}

/**
 * Check if user has completed all required trails
 * @param userId - The user ID
 * @returns Boolean indicating completion
 */
export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const status = await getUserOnboardingStatus(userId);
  return status?.isOnboardingComplete || false;
}

// =====================================================
// INTERNAL HELPER FUNCTIONS
// =====================================================

/**
 * Validate responses against trail structure
 * Enriches with answer objects containing weights
 */
function validateAndEnrichResponses(
  trail: ContextualTrail,
  responses: ContextualQuestionResponse[]
): {
  valid: boolean;
  answers: ContextualAnswer[];
  error?: string;
} {
  const enrichedAnswers: ContextualAnswer[] = [];

  // Check all required questions are answered
  const requiredQuestions = trail.questions.filter((q) => q.isRequired);
  const answeredQuestionIds = new Set(responses.map((r) => r.questionId));

  for (const question of requiredQuestions) {
    if (!answeredQuestionIds.has(question.id)) {
      return {
        valid: false,
        answers: [],
        error: `Required question not answered: ${question.id}`,
      };
    }
  }

  // Validate each response and get answer objects
  for (const response of responses) {
    const question = trail.questions.find((q) => q.id === response.questionId);
    if (!question) {
      return {
        valid: false,
        answers: [],
        error: `Question not found: ${response.questionId}`,
      };
    }

    // Get selected answers
    for (const answerId of response.selectedAnswerIds) {
      const answer = question.answers.find((a) => a.id === answerId);
      if (!answer) {
        return {
          valid: false,
          answers: [],
          error: `Answer not found: ${answerId}`,
        };
      }
      enrichedAnswers.push(answer);
    }
  }

  return {
    valid: true,
    answers: enrichedAnswers,
  };
}

/**
 * Award consciousness points for trail completion
 * Base: 10 points + bonus based on score
 */
function awardTrailCompletionPoints(trailScore: number): number {
  const basePoints = 10;
  const scoreBonus = Math.floor((trailScore / 10) * 15); // Up to 15 bonus points
  return basePoints + scoreBonus;
}

/**
 * Get stats for module recommendations
 * Returns frequency and confidence data
 */
export async function getModuleRecommendationStats(
  userId: string
): Promise<{
  totalRecommendations: number;
  highConfidenceModules: number;
  recommendationsByTrail: Record<string, number>;
}> {
  const recommendations = await calculateRecommendedModules(userId);

  const recommendationsByTrail: Record<string, number> = {};
  recommendations.forEach((rec) => {
    rec.reasonFromTrails.forEach((trail) => {
      recommendationsByTrail[trail] = (recommendationsByTrail[trail] || 0) + 1;
    });
  });

  return {
    totalRecommendations: recommendations.length,
    highConfidenceModules: recommendations.filter((r) => r.priority === 'high').length,
    recommendationsByTrail,
  };
}

/**
 * Get onboarding progress percentage
 */
export async function getOnboardingProgressPercentage(userId: string): Promise<number> {
  const status = await getUserOnboardingStatus(userId);
  if (!status) return 0;

  return Math.round((status.trailsCompleted / status.totalTrails) * 100);
}

/**
 * Reset user's onboarding (delete all trail captures)
 * Used for testing or if user wants to restart
 */
export async function resetUserOnboarding(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('onboarding_context_captures')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting onboarding:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in resetUserOnboarding:', error);
    return false;
  }
}
