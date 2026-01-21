/**
 * Feedback API
 * PHASE 3.3: Learning Feedback Loop for Recommendations
 *
 * Client-side API for feedback loop endpoints
 * Communicates with backend to record feedback and retrieve updated recommendations
 */

import { supabase } from '@/services/supabaseClient';
import {
  ModuleFeedback,
  UserModulePreferences,
  ModuleCompletionResult,
  UserModuleWeight,
} from '@/services/feedbackLoopService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('FeedbackAPI');

// ============================================================================
// API ENDPOINTS
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

/**
 * Record user feedback on a module recommendation
 *
 * POST /api/recommendations/:moduleId/feedback
 *
 * @param moduleId - Module ID
 * @param feedbackType - Type of feedback (accepted, rejected, skipped)
 * @param options - Additional feedback options
 */
export async function submitModuleFeedback(
  moduleId: string,
  feedbackType: 'accepted' | 'rejected' | 'skipped',
  options: {
    recommendationId?: string;
    confidenceScore?: number;
    reason?: string;
  } = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/recommendations/${moduleId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        userId: sessionData.session.user.id,
        moduleId,
        feedbackType,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to submit feedback',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    log.error('submitModuleFeedback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a module as complete
 *
 * POST /api/modules/:moduleId/complete
 *
 * @param moduleId - Module ID
 * @param options - Completion options (rating, timeSpent, feedback)
 */
export async function completeModule(
  moduleId: string,
  options: {
    rating?: number;
    timeSpent?: number;
    feedback?: string;
  } = {}
): Promise<ModuleCompletionResult | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/modules/${moduleId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        userId: sessionData.session.user.id,
        moduleId,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to complete module');
    }

    return await response.json();
  } catch (error) {
    log.error('completeModule error:', error);
    return null;
  }
}

/**
 * Get user's module preferences and statistics
 *
 * GET /api/user/module-preferences
 */
export async function getUserModulePreferences(): Promise<UserModulePreferences | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/user/module-preferences`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }

    return await response.json();
  } catch (error) {
    log.error('getUserModulePreferences error:', error);
    return null;
  }
}

/**
 * Get updated recommendations with learned weights
 *
 * GET /api/user/recommendations/updated
 */
export async function getUpdatedRecommendations(): Promise<any | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/user/recommendations/updated`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch updated recommendations');
    }

    return await response.json();
  } catch (error) {
    log.error('getUpdatedRecommendations error:', error);
    return null;
  }
}

/**
 * Get user's module weights (used for UI display)
 *
 * GET /api/user/module-weights
 */
export async function getUserModuleWeights(): Promise<Map<string, number>> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/user/module-weights`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weights');
    }

    const data: UserModuleWeight[] = await response.json();
    const weights = new Map<string, number>();

    data.forEach((weight) => {
      weights.set(weight.module_id, weight.final_weight);
    });

    return weights;
  } catch (error) {
    log.error('getUserModuleWeights error:', error);
    return new Map();
  }
}

/**
 * Get module completion status
 *
 * GET /api/modules/:moduleId/status
 *
 * @param moduleId - Module ID
 */
export async function getModuleStatus(moduleId: string): Promise<any | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/modules/${moduleId}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch module status');
    }

    return await response.json();
  } catch (error) {
    log.error('getModuleStatus error:', error);
    return null;
  }
}

/**
 * Fetch all user feedback records (paginated)
 *
 * GET /api/user/feedback?limit=20&offset=0
 */
export async function getUserFeedbackHistory(
  limit: number = 20,
  offset: number = 0
): Promise<{ data: ModuleFeedback[]; total: number } | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${API_BASE_URL}/user/feedback?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch feedback history');
    }

    return await response.json();
  } catch (error) {
    log.error('getUserFeedbackHistory error:', error);
    return null;
  }
}

/**
 * Get analytics for a specific module
 *
 * GET /api/analytics/modules/:moduleId
 */
export async function getModuleAnalytics(moduleId: string): Promise<any | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/analytics/modules/${moduleId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch module analytics');
    }

    return await response.json();
  } catch (error) {
    log.error('getModuleAnalytics error:', error);
    return null;
  }
}

/**
 * Admin endpoint: Rebuild all user weights (batch operation)
 *
 * POST /api/admin/rebuild-weights
 */
export async function adminRebuildWeights(): Promise<{ success: boolean; message?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/admin/rebuild-weights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Failed to rebuild weights');
    }

    return await response.json();
  } catch (error) {
    log.error('adminRebuildWeights error:', error);
    return { success: false, message: 'Failed to rebuild weights' };
  }
}

/**
 * Update user's module progress in real-time
 *
 * POST /api/modules/:moduleId/progress
 */
export async function updateModuleProgress(
  moduleId: string,
  progress: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/modules/${moduleId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        userId: sessionData.session.user.id,
        moduleId,
        progress: Math.max(0, Math.min(100, progress)),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to update progress',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    log.error('updateModuleProgress error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch submit multiple feedback entries
 * Useful for bulk imports or testing
 */
export async function batchSubmitFeedback(
  feedbackEntries: Array<{
    moduleId: string;
    feedbackType: 'accepted' | 'rejected' | 'skipped';
    options?: any;
  }>
): Promise<{ success: boolean; results: any[] }> {
  const results = [];

  for (const entry of feedbackEntries) {
    const result = await submitModuleFeedback(entry.moduleId, entry.feedbackType, entry.options);
    results.push(result);
  }

  return {
    success: results.every((r) => r.success),
    results,
  };
}

/**
 * Recalculate weights for current user
 */
export async function recalculateUserWeights(): Promise<{ success: boolean; weights?: Map<string, number> }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/user/recalculate-weights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        userId: sessionData.session.user.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to recalculate weights');
    }

    const data: UserModuleWeight[] = await response.json();
    const weights = new Map<string, number>();

    data.forEach((weight) => {
      weights.set(weight.module_id, weight.final_weight);
    });

    return { success: true, weights };
  } catch (error) {
    log.error('recalculateUserWeights error:', error);
    return { success: false };
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to feedback updates for a module
 * Useful for live leaderboards or group feedback
 */
export function subscribeToModuleFeedback(
  moduleId: string,
  onUpdate: (data: any) => void
): () => void {
  const channel = supabase
    .channel(`module_feedback:${moduleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_module_feedback',
        filter: `module_id=eq.${moduleId}`,
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    channel.unsubscribe();
  };
}

/**
 * Subscribe to weight changes
 */
export function subscribeToWeightChanges(
  userId: string,
  onUpdate: (data: any) => void
): () => void {
  const channel = supabase
    .channel(`weight_changes:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_module_weights',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
