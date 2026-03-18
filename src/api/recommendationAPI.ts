/**
 * Recommendation API
 * REST endpoints for recommendation engine
 * Handles recommendation generation, feedback, and module management
 *
 * @see docs/onboarding/MODULOS_RECOMENDACOES_LOGIC.md
 */

import { supabase } from '@/services/supabaseClient';
import { RecommendationEngine, getRecommendationEngine } from '@/services/recommendationEngine';
import {
  RecommendationResult,
  GenerateRecommendationsRequest,
  GenerateRecommendationsResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
  GetModuleRequest,
  GetModuleResponse,
  ListModulesRequest,
  ListModulesResponse,
  ModuleDefinition,
  RecommendationError,
} from '@/types/recommendationTypes';
import { MODULE_CATALOG, getModuleById, getModulesByCategory } from '@/data/moduleDefinitions';
import { StoredContextCapture } from '@/types/onboardingTypes';
import { createNamespacedLogger } from '@/lib/logger';

const logger = createNamespacedLogger('RecommendationAPI');

// =====================================================
// GENERATE RECOMMENDATIONS ENDPOINT
// =====================================================

/**
 * Generate personalized module recommendations for a user
 * POST /api/recommendations/generate
 */
export async function generateRecommendations(
  request: GenerateRecommendationsRequest
): Promise<GenerateRecommendationsResponse> {
  try {
    logger.debug(`Generating recommendations for user: ${request.userId}`);

    // Check cache first (if not forcing refresh)
    if (!request.forceRefresh) {
      const cachedRecs = await getCachedRecommendations(request.userId);
      if (cachedRecs) {
        logger.debug('Returning cached recommendations');
        return {
          success: true,
          data: cachedRecs,
          message: 'Recomendações carregadas do cache',
          cacheHit: true,
          cacheTTL: Math.floor(
            (new Date(cachedRecs.nextReviewDate).getTime() - Date.now()) / 1000
          ),
        };
      }
    }

    // Gather inputs for recommendation engine
    const [trailContexts, moments, completedModules, userFeedback] = await Promise.all([
      getTrailContexts(request.userId),
      getMomentEntries(request.userId),
      getCompletedModules(request.userId),
      getUserFeedback(request.userId),
    ]);

    // Generate recommendations using engine
    const engine = getRecommendationEngine();
    const recommendations = await engine.generateRecommendations(
      request.userId,
      trailContexts,
      moments,
      completedModules,
      userFeedback
    );

    // Limit results if specified
    if (request.limitResults && request.limitResults > 0) {
      recommendations.recommendations = recommendations.recommendations.slice(0, request.limitResults);
    }

    // Cache the recommendations
    await cacheRecommendations(request.userId, recommendations);

    // Log analytics event
    await logAnalyticsEvent('recommendations_generated', {
      userId: request.userId,
      count: recommendations.recommendations.length,
      topModule: recommendations.recommendations[0]?.moduleId,
    });

    return {
      success: true,
      data: recommendations,
      message: `${recommendations.recommendations.length} recomendações personalizadas geradas com sucesso`,
      cacheHit: false,
    };
  } catch (error) {
    logger.error('Error generating recommendations', error);

    return {
      success: false,
      message:
        error instanceof RecommendationError
          ? error.message
          : 'Erro ao gerar recomendações. Tente novamente mais tarde.',
    };
  }
}

/**
 * Get recommendations from cache if available and not expired
 */
async function getCachedRecommendations(userId: string): Promise<RecommendationResult | null> {
  try {
    const { data, error } = await supabase
      .from('user_module_recommendations')
      .select('recommendations_data, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    // Check if cache is expired
    if (new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data.recommendations_data as RecommendationResult;
  } catch (error) {
    logger.error('Error retrieving cached recommendations', error);
    return null;
  }
}

/**
 * Cache recommendations in database
 */
async function cacheRecommendations(userId: string, result: RecommendationResult): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

    const { error } = await supabase
      .from('user_module_recommendations')
      .upsert(
        {
          user_id: userId,
          recommended_modules: result.recommendations.map(r => r.moduleId),
          recommendations_data: result,
          generated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
    logger.debug('Recommendations cached successfully');
  } catch (error) {
    logger.error('Error caching recommendations', error);
    // Don't throw - caching failure shouldn't block recommendation delivery
  }
}

// =====================================================
// FEEDBACK ENDPOINTS
// =====================================================

/**
 * Submit user feedback on a recommendation
 * POST /api/recommendations/feedback
 */
export async function submitRecommendationFeedback(
  request: SubmitFeedbackRequest
): Promise<SubmitFeedbackResponse> {
  try {
    logger.debug(`Recording feedback: user ${request.userId}, module ${request.moduleId}, action ${request.action}`);

    // Validate request
    if (!request.userId || !request.moduleId) {
      return {
        success: false,
        message: 'userId e moduleId são obrigatórios',
      };
    }

    // Record feedback in database
    const { error } = await supabase.rpc('record_module_feedback', {
      p_user_id: request.userId,
      p_module_id: request.moduleId,
      p_action: request.action,
      p_feedback: request.feedback || null,
      p_rating: request.rating || null,
    });

    if (error) throw error;

    // Update user recommendations to trigger refresh if appropriate
    const shouldRefresh = ['completed', 'rejected'].includes(request.action);

    logger.debug('Feedback recorded successfully', {
      moduleId: request.moduleId,
      action: request.action,
      refreshTriggered: shouldRefresh,
    });

    // Log analytics event
    await logAnalyticsEvent('recommendation_feedback', {
      userId: request.userId,
      moduleId: request.moduleId,
      action: request.action,
      rating: request.rating,
    });

    return {
      success: true,
      message: 'Obrigado pelo feedback! Isso nos ajuda a melhorar recomendações futuras.',
      recommendationRefreshTriggered: shouldRefresh,
    };
  } catch (error) {
    logger.error('Error submitting feedback', error);

    return {
      success: false,
      message: 'Erro ao registrar feedback. Tente novamente.',
    };
  }
}

// =====================================================
// MODULE ENDPOINTS
// =====================================================

/**
 * Get details for a specific module
 * GET /api/modules/:moduleId
 */
export async function getModule(request: GetModuleRequest): Promise<GetModuleResponse> {
  try {
    const module = getModuleById(request.moduleId);

    if (!module) {
      return {
        success: false,
      };
    }

    // Get recommendation context if user is authenticated
    const recommendationContext = undefined; // Would need user context to fetch stats

    return {
      success: true,
      module,
      recommendationContext,
    };
  } catch (error) {
    logger.error('Error getting module', error);

    return {
      success: false,
    };
  }
}

/**
 * List all available modules with optional filtering
 * GET /api/modules
 */
export async function listModules(request: ListModulesRequest): Promise<ListModulesResponse> {
  try {
    let modules = MODULE_CATALOG;

    // Filter by category
    if (request.category) {
      modules = modules.filter(m => m.category === request.category);
    }

    // Filter by difficulty
    if (request.difficulty) {
      modules = modules.filter(m => m.difficulty === request.difficulty);
    }

    // Apply pagination
    const limit = request.limit || 50;
    const offset = request.offset || 0;
    const total = modules.length;

    const paginatedModules = modules.slice(offset, offset + limit);

    return {
      success: true,
      modules: paginatedModules,
      total,
      limit,
      offset,
    };
  } catch (error) {
    logger.error('Error listing modules', error);

    return {
      success: false,
    };
  }
}

/**
 * Get module recommendations for current user
 * GET /api/recommendations
 */
export async function getUserRecommendations(userId: string): Promise<GenerateRecommendationsResponse> {
  if (!userId) {
    return {
      success: false,
      message: 'User ID is required',
    };
  }

  return generateRecommendations({
    userId,
    forceRefresh: false,
    limitResults: 6,
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get trail context captures for user
 */
async function getTrailContexts(userId: string): Promise<StoredContextCapture[]> {
  try {
    const { data, error } = await supabase
      .from('onboarding_context_captures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return (data || []) as StoredContextCapture[];
  } catch (error) {
    logger.error('Error fetching trail contexts', error);
    return [];
  }
}

/**
 * Get moment entries for user
 */
async function getMomentEntries(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching moment entries', error);
    return [];
  }
}

/**
 * Get completed modules for user
 */
async function getCompletedModules(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('module_feedback')
      .select('module_id')
      .eq('user_id', userId)
      .eq('action', 'completed');

    if (error) throw error;

    return (data || []).map(record => record.module_id);
  } catch (error) {
    logger.error('Error fetching completed modules', error);
    return [];
  }
}

/**
 * Get user feedback history on modules
 */
async function getUserFeedback(userId: string): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('module_feedback')
      .select('module_id, action, feedback_text, rating, feedback_at')
      .eq('user_id', userId)
      .order('feedback_at', { ascending: false });

    if (error) throw error;

    // Convert to map keyed by module_id
    const feedback: Record<string, any> = {};
    for (const record of data || []) {
      if (!feedback[record.module_id]) {
        feedback[record.module_id] = {
          action: record.action,
          feedback: record.feedback_text,
          rating: record.rating,
          feedbackAt: new Date(record.feedback_at),
        };
      }
    }

    return feedback;
  } catch (error) {
    logger.error('Error fetching user feedback', error);
    return {};
  }
}

/**
 * Log analytics event
 */
async function logAnalyticsEvent(eventName: string, eventData: any): Promise<void> {
  try {
    // Would integrate with analytics service
    logger.debug(`Analytics event: ${eventName}`, eventData);
  } catch (error) {
    logger.error('Error logging analytics event', error);
  }
}

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

/**
 * Refresh recommendations for a user (admin)
 * POST /api/admin/recommendations/refresh/:userId
 */
export async function adminRefreshRecommendations(userId: string): Promise<GenerateRecommendationsResponse> {
  return generateRecommendations({
    userId,
    forceRefresh: true,
  });
}

/**
 * Get module statistics (admin)
 * GET /api/admin/modules/stats
 */
export async function getModuleStatistics(): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('v_module_recommendation_stats')
      .select('*')
      .order('acceptance_rate', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Error fetching module statistics', error);

    return {
      success: false,
      message: 'Error fetching statistics',
    };
  }
}

/**
 * Get user feedback trends (admin)
 * GET /api/admin/users/:userId/feedback-trends
 */
export async function getUserFeedbackTrends(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('v_user_feedback_trends')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    logger.error('Error fetching user feedback trends', error);

    return {
      success: false,
      message: 'Error fetching trends',
    };
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const recommendationAPI = {
  // Main endpoints
  generateRecommendations,
  submitRecommendationFeedback,
  getModule,
  listModules,
  getUserRecommendations,

  // Admin endpoints
  adminRefreshRecommendations,
  getModuleStatistics,
  getUserFeedbackTrends,
};

export default recommendationAPI;
