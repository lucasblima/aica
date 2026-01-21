/**
 * Onboarding API
 * Client-side API layer for onboarding endpoints
 * Provides HTTP endpoints for trail management and capture
 *
 * Note: For production deployment, these endpoints should be moved to:
 * - Supabase Edge Functions, or
 * - Backend server API routes
 *
 * Currently implemented as service-layer functions for frontend use.
 */

import {
  CaptureTrailRequest,
  CaptureTrailResponse,
  OnboardingStatus,
  ContextualTrail,
  FinalizeOnboardingResponse,
} from '../types/onboardingTypes';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('OnboardingAPI');
import {
  getCourseTrails,
  getTrailById_API,
  captureTrailResponses,
  getUserOnboardingStatus,
  calculateRecommendedModules,
  isOnboardingComplete,
  getOnboardingProgressPercentage,
} from '../services/onboardingService';

/**
 * GET /api/onboarding/trails
 * List all available contextual trails
 */
export async function listAllTrails(): Promise<{
  success: boolean;
  trails: ContextualTrail[];
  error?: string;
}> {
  try {
    const trails = await getCourseTrails();
    return {
      success: true,
      trails,
    };
  } catch (error) {
    log.error('Error listing trails:', error);
    return {
      success: false,
      trails: [],
      error: error instanceof Error ? error.message : 'Failed to list trails',
    };
  }
}

/**
 * GET /api/onboarding/trails/:trailId
 * Get details of a specific trail
 */
export async function getTrailDetails(trailId: string): Promise<{
  success: boolean;
  trail?: ContextualTrail;
  error?: string;
}> {
  try {
    const trail = await getTrailById_API(trailId);
    if (!trail) {
      return {
        success: false,
        error: `Trail not found: ${trailId}`,
      };
    }
    return {
      success: true,
      trail,
    };
  } catch (error) {
    log.error(`Error getting trail ${trailId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trail details',
    };
  }
}

/**
 * POST /api/onboarding/capture-context
 * Capture user responses to a contextual trail
 *
 * Request body:
 * {
 *   userId: string,
 *   trailId: string,
 *   responses: [
 *     { questionId: string, selectedAnswerIds: string[] },
 *     ...
 *   ]
 * }
 */
export async function captureContextualTrail(
  request: CaptureTrailRequest
): Promise<CaptureTrailResponse> {
  try {
    const { userId, trailId, responses } = request;

    // Validate inputs
    if (!userId) {
      return {
        success: false,
        trailId,
        trailScore: 0,
        recommendedModules: [],
        nextStep: 'view_recommendations',
        message: 'User ID is required',
      };
    }

    if (!trailId) {
      return {
        success: false,
        trailId,
        trailScore: 0,
        recommendedModules: [],
        nextStep: 'view_recommendations',
        message: 'Trail ID is required',
      };
    }

    if (!responses || responses.length === 0) {
      return {
        success: false,
        trailId,
        trailScore: 0,
        recommendedModules: [],
        nextStep: 'view_recommendations',
        message: 'No responses provided',
      };
    }

    // Capture responses
    const result = await captureTrailResponses(userId, trailId, responses);

    if (!result.success) {
      return {
        success: false,
        trailId,
        trailScore: 0,
        recommendedModules: [],
        nextStep: 'view_recommendations',
        message: result.error || 'Failed to capture trail responses',
      };
    }

    // Determine next step
    const status = await getUserOnboardingStatus(userId);
    let nextStep: 'complete_more_trails' | 'view_recommendations' | 'step_2_moment_capture' =
      'view_recommendations';

    if (status) {
      if (status.trailsCompleted < 3) {
        nextStep = 'complete_more_trails';
      } else if (status.trailsCompleted >= 3) {
        nextStep = 'step_2_moment_capture';
      }
    }

    return {
      success: true,
      trailId,
      trailScore: result.trailScore,
      recommendedModules: result.recommendedModules,
      pointsAwarded: result.pointsAwarded,
      nextStep,
      message: `Trail "${trailId}" completed successfully`,
    };
  } catch (error) {
    log.error('Error capturing trail context:', error);
    return {
      success: false,
      trailId: request.trailId,
      trailScore: 0,
      recommendedModules: [],
      nextStep: 'view_recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET /api/onboarding/status
 * Get user's onboarding status and progress
 */
export async function getOnboardingStatusEndpoint(userId: string): Promise<{
  success: boolean;
  status?: OnboardingStatus;
  progressPercentage?: number;
  isComplete?: boolean;
  error?: string;
}> {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    const status = await getUserOnboardingStatus(userId);
    if (!status) {
      return {
        success: false,
        error: 'Failed to get onboarding status',
      };
    }

    const progressPercentage = await getOnboardingProgressPercentage(userId);
    const isComplete = await isOnboardingComplete(userId);

    return {
      success: true,
      status,
      progressPercentage,
      isComplete,
    };
  } catch (error) {
    log.error('Error getting onboarding status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status',
    };
  }
}

/**
 * POST /api/onboarding/finalize
 * Finalize onboarding after user completes sufficient trails
 * Creates aggregated recommendations and transitions to next step
 */
export async function finalizeOnboarding(userId: string): Promise<FinalizeOnboardingResponse> {
  try {
    if (!userId) {
      return {
        success: false,
        nextStep: 'step_3_recommendations',
        allRecommendedModules: [],
        averageScore: 0,
        message: 'User ID is required',
      };
    }

    // Get current status
    const status = await getUserOnboardingStatus(userId);
    if (!status) {
      return {
        success: false,
        nextStep: 'step_3_recommendations',
        allRecommendedModules: [],
        averageScore: 0,
        message: 'Failed to get onboarding status',
      };
    }

    // Check if minimum trials completed
    if (status.trailsCompleted < 3) {
      return {
        success: false,
        nextStep: 'view_recommendations',
        allRecommendedModules: status.allRecommendedModules,
        averageScore: status.averageTrailScore,
        message: `Please complete at least 3 trails. You have completed ${status.trailsCompleted}`,
      };
    }

    // Calculate module recommendations
    const recommendations = await calculateRecommendedModules(userId);

    // Award bonus points for completing onboarding
    const bonusPoints = 50;

    return {
      success: true,
      nextStep: 'step_2_moment_capture',
      allRecommendedModules: status.allRecommendedModules,
      averageScore: status.averageTrailScore,
      pointsAwarded: bonusPoints,
      message: `Onboarding completed! You have ${recommendations.length} personalized module recommendations.`,
    };
  } catch (error) {
    log.error('Error finalizing onboarding:', error);
    return {
      success: false,
      nextStep: 'step_3_recommendations',
      allRecommendedModules: [],
      averageScore: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET /api/onboarding/recommendations/:userId
 * Get personalized module recommendations for user
 */
export async function getUserRecommendations(userId: string): Promise<{
  success: boolean;
  modules?: Array<{
    moduleId: string;
    moduleName: string;
    confidence: number;
    priority: 'high' | 'medium' | 'low';
    reasonFromTrails: string[];
  }>;
  error?: string;
}> {
  try {
    const recommendations = await calculateRecommendedModules(userId);
    return {
      success: true,
      modules: recommendations,
    };
  } catch (error) {
    log.error('Error getting recommendations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recommendations',
    };
  }
}

/**
 * Utility: Check if user has completed onboarding
 */
export async function checkOnboardingCompletion(userId: string): Promise<boolean> {
  try {
    return await isOnboardingComplete(userId);
  } catch (error) {
    log.error('Error checking onboarding completion:', error);
    return false;
  }
}

/**
 * Utility: Get onboarding progress as percentage
 */
export async function getOnboardingProgress(userId: string): Promise<number> {
  try {
    return await getOnboardingProgressPercentage(userId);
  } catch (error) {
    log.error('Error getting progress:', error);
    return 0;
  }
}

// =====================================================
// HTTP CLIENT VERSIONS
// These can be used if you want to call these as HTTP endpoints
// =====================================================

/**
 * HTTP GET /api/onboarding/trails
 */
export async function httpListTrails() {
  return listAllTrails();
}

/**
 * HTTP GET /api/onboarding/trails/:trailId
 */
export async function httpGetTrail(trailId: string) {
  return getTrailDetails(trailId);
}

/**
 * HTTP POST /api/onboarding/capture-context
 */
export async function httpCaptureContext(request: CaptureTrailRequest) {
  return captureContextualTrail(request);
}

/**
 * HTTP GET /api/onboarding/status?userId=:userId
 */
export async function httpGetStatus(userId: string) {
  return getOnboardingStatusEndpoint(userId);
}

/**
 * HTTP POST /api/onboarding/finalize
 */
export async function httpFinalizeOnboarding(userId: string) {
  return finalizeOnboarding(userId);
}

/**
 * HTTP GET /api/onboarding/recommendations/:userId
 */
export async function httpGetRecommendations(userId: string) {
  return getUserRecommendations(userId);
}
