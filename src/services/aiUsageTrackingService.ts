/**
 * AI Usage Tracking Service
 *
 * Handles cost tracking for all AI operations in Aica Life OS.
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. Non-blocking: NEVER throw errors that break main functionality
 * 2. Fire-and-forget: Async tracking without awaiting in critical paths
 * 3. Fail-safe: Try-catch at all levels with error logging
 * 4. Post-success: Only track AFTER AI operation succeeds
 * 5. Local pricing: No external API calls for cost calculation
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const response = await gemini.generateContent(prompt);
 *
 * // Track usage (fire-and-forget, non-blocking)
 * trackAIUsage({
 *   operation_type: 'text_generation',
 *   ai_model: 'gemini-2.0-flash',
 *   input_tokens: response.usageMetadata.promptTokenCount,
 *   output_tokens: response.usageMetadata.candidatesTokenCount,
 *   module_type: 'grants',
 *   module_id: grantId
 * });
 * ```
 */

import { supabase } from './supabaseClient';
import type { AIOperationType, ModuleType } from '../types/aiCost';

// =====================================================
// TYPES
// =====================================================

export interface TrackAIUsageParams {
  // Required
  operation_type: AIOperationType;
  ai_model: string;
  total_cost_usd?: number; // Optional - will be calculated if not provided

  // Token metrics (recommended)
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;

  // Costs (optional - will be calculated from tokens if not provided)
  input_cost_usd?: number;
  output_cost_usd?: number;

  // Performance
  duration_seconds?: number;

  // Context
  module_type?: ModuleType;
  module_id?: string;
  asset_id?: string;

  // Metadata
  request_metadata?: Record<string, any>;
}

export interface ModelPricing {
  input_price: number; // USD per 1M tokens
  output_price: number; // USD per 1M tokens
}

export interface CostCalculation {
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
}

// =====================================================
// LOCAL PRICING CACHE (fallback if DB pricing fails)
// Source: Google AI Pricing (Dec 2025)
// =====================================================

const LOCAL_PRICING_CACHE: Record<string, ModelPricing> = {
  'gemini-2.0-flash': { input_price: 0.0, output_price: 0.0 }, // Free preview
  'gemini-2.0-flash-exp': { input_price: 0.0, output_price: 0.0 },
  'gemini-2.5-flash': { input_price: 0.10, output_price: 0.40 },
  'gemini-1.5-flash': { input_price: 0.075, output_price: 0.30 },
  'gemini-1.5-flash-8b': { input_price: 0.0375, output_price: 0.15 },
  'gemini-1.5-pro': { input_price: 1.25, output_price: 5.0 },
  'text-embedding-004': { input_price: 0.00001, output_price: 0.00001 },
  'imagen-3': { input_price: 0.04, output_price: 0.04 },
  'veo-2': { input_price: 0.10, output_price: 0.10 },
};

// =====================================================
// PRICING FUNCTIONS
// =====================================================

/**
 * Get pricing for a model from DB or local cache
 */
export async function getModelPricing(modelName: string): Promise<ModelPricing | null> {
  try {
    // Try database first
    const { data, error } = await supabase.rpc('get_current_model_pricing', {
      p_model_name: modelName
    });

    if (!error && data && data.length > 0) {
      return {
        input_price: Number(data[0].input_price),
        output_price: Number(data[0].output_price)
      };
    }

    // Fallback to local cache
    const cached = LOCAL_PRICING_CACHE[modelName];
    if (cached) {
      console.warn(`[aiUsageTracking] Using local pricing for ${modelName} (DB failed)`);
      return cached;
    }

    console.error(`[aiUsageTracking] No pricing found for model: ${modelName}`);
    return null;

  } catch (err) {
    console.error('[aiUsageTracking] Error fetching pricing:', err);
    // Final fallback: use local cache
    return LOCAL_PRICING_CACHE[modelName] || null;
  }
}

/**
 * Calculate cost from token counts
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing
): CostCalculation {
  const inputCost = (inputTokens / 1_000_000) * pricing.input_price;
  const outputCost = (outputTokens / 1_000_000) * pricing.output_price;

  return {
    input_cost_usd: Number(inputCost.toFixed(6)),
    output_cost_usd: Number(outputCost.toFixed(6)),
    total_cost_usd: Number((inputCost + outputCost).toFixed(6))
  };
}

/**
 * Calculate cost using database function (preferred method)
 */
export async function calculateCostFromDB(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): Promise<CostCalculation | null> {
  try {
    const { data, error } = await supabase.rpc('calculate_token_cost', {
      p_model_name: modelName,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens
    });

    if (error) {
      console.error('[aiUsageTracking] DB cost calculation failed:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return {
      input_cost_usd: Number(data[0].input_cost_usd),
      output_cost_usd: Number(data[0].output_cost_usd),
      total_cost_usd: Number(data[0].total_cost_usd)
    };

  } catch (err) {
    console.error('[aiUsageTracking] Error calculating cost from DB:', err);
    return null;
  }
}

// =====================================================
// TRACKING FUNCTIONS
// =====================================================

/**
 * Track AI usage with automatic cost calculation
 *
 * This is a FIRE-AND-FORGET function - it never throws errors.
 * Safe to call without await in critical paths.
 */
export async function trackAIUsage(params: TrackAIUsageParams): Promise<void> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn('[aiUsageTracking] No authenticated user - skipping tracking');
      return;
    }

    // Calculate costs if not provided
    let costs: CostCalculation | null = null;

    if (params.input_cost_usd !== undefined && params.output_cost_usd !== undefined) {
      // Use provided costs
      costs = {
        input_cost_usd: params.input_cost_usd,
        output_cost_usd: params.output_cost_usd,
        total_cost_usd: params.total_cost_usd || (params.input_cost_usd + params.output_cost_usd)
      };
    } else if (params.input_tokens !== undefined && params.output_tokens !== undefined) {
      // Calculate from tokens
      costs = await calculateCostFromDB(
        params.ai_model,
        params.input_tokens,
        params.output_tokens
      );

      // Fallback to local calculation if DB fails
      if (!costs) {
        const pricing = await getModelPricing(params.ai_model);
        if (pricing) {
          costs = calculateCost(params.input_tokens, params.output_tokens, pricing);
        }
      }
    }

    if (!costs) {
      console.warn('[aiUsageTracking] Cannot calculate costs - insufficient data');
      costs = { input_cost_usd: 0, output_cost_usd: 0, total_cost_usd: 0 };
    }

    // Call database function to log usage
    const { data: recordId, error } = await supabase.rpc('log_ai_usage', {
      p_user_id: user.id,
      p_operation_type: params.operation_type,
      p_ai_model: params.ai_model,
      p_input_tokens: params.input_tokens || null,
      p_output_tokens: params.output_tokens || null,
      p_total_tokens: params.total_tokens || null,
      p_duration_seconds: params.duration_seconds || null,
      p_input_cost_usd: costs.input_cost_usd,
      p_output_cost_usd: costs.output_cost_usd,
      p_total_cost_usd: costs.total_cost_usd,
      p_module_type: params.module_type || null,
      p_module_id: params.module_id || null,
      p_asset_id: params.asset_id || null,
      p_request_metadata: params.request_metadata || null
    });

    if (error) {
      console.error('[aiUsageTracking] Failed to log usage:', error);

      // Log the error to tracking_errors table
      await logTrackingError(
        user.id,
        params.operation_type,
        params.ai_model,
        error.message,
        params
      );
      return;
    }

    if (!recordId) {
      console.warn('[aiUsageTracking] log_ai_usage returned NULL (silent failure)');
      return;
    }

    console.debug('[aiUsageTracking] Successfully logged usage:', recordId);

  } catch (err) {
    // CRITICAL: Never propagate errors from tracking
    console.error('[aiUsageTracking] Unexpected error in trackAIUsage:', err);
  }
}

/**
 * Log tracking errors to database for debugging
 */
async function logTrackingError(
  userId: string,
  operationType: string,
  aiModel: string,
  errorMessage: string,
  context: any
): Promise<void> {
  try {
    await supabase.rpc('log_tracking_error', {
      p_user_id: userId,
      p_operation_type: operationType,
      p_ai_model: aiModel,
      p_error_message: errorMessage,
      p_error_context: context
    });
  } catch (err) {
    // If we can't log the error, just warn in console
    console.warn('[aiUsageTracking] Failed to log tracking error:', err);
  }
}

// =====================================================
// BATCH TRACKING (for bulk operations)
// =====================================================

/**
 * Track multiple AI operations in parallel
 * Use this for batch operations to improve performance
 */
export async function trackAIUsageBatch(operations: TrackAIUsageParams[]): Promise<void> {
  try {
    // Execute all tracking calls in parallel
    const promises = operations.map(op => trackAIUsage(op));
    await Promise.allSettled(promises); // Never throw even if some fail

    console.debug(`[aiUsageTracking] Batch tracked ${operations.length} operations`);

  } catch (err) {
    console.error('[aiUsageTracking] Error in batch tracking:', err);
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Extract usage metadata from Gemini response
 * Compatible with both Gemini SDK response formats
 */
export function extractGeminiUsageMetadata(response: any): {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
} | null {
  try {
    // Check for usageMetadata (standard Gemini response)
    if (response.usageMetadata) {
      return {
        input_tokens: response.usageMetadata.promptTokenCount || 0,
        output_tokens: response.usageMetadata.candidatesTokenCount || 0,
        total_tokens: response.usageMetadata.totalTokenCount || 0
      };
    }

    // Check for usage (alternative format)
    if (response.usage) {
      return {
        input_tokens: response.usage.promptTokens || 0,
        output_tokens: response.usage.completionTokens || 0,
        total_tokens: response.usage.totalTokens || 0
      };
    }

    console.warn('[aiUsageTracking] No usage metadata found in response');
    return null;

  } catch (err) {
    console.error('[aiUsageTracking] Error extracting usage metadata:', err);
    return null;
  }
}

/**
 * Create a tracking wrapper for AI calls
 * Automatically tracks usage after successful completion
 *
 * @example
 * const response = await withAITracking(
 *   () => gemini.generateContent(prompt),
 *   {
 *     operation_type: 'text_generation',
 *     ai_model: 'gemini-2.0-flash',
 *     module_type: 'grants'
 *   }
 * );
 */
export async function withAITracking<T>(
  operation: () => Promise<T>,
  trackingParams: Omit<TrackAIUsageParams, 'input_tokens' | 'output_tokens' | 'total_tokens'>
): Promise<T> {
  const startTime = Date.now();

  try {
    // Execute AI operation
    const response = await operation();

    // Calculate duration
    const duration = (Date.now() - startTime) / 1000;

    // Extract usage metadata if available
    const usage = extractGeminiUsageMetadata(response);

    // Track usage (fire-and-forget)
    trackAIUsage({
      ...trackingParams,
      ...(usage || {}),
      duration_seconds: duration
    }).catch(err => {
      // Silently catch tracking errors - already logged internally
      console.debug('[aiUsageTracking] Tracking error caught in wrapper:', err);
    });

    return response;

  } catch (err) {
    // If AI operation fails, still try to track the failure
    const duration = (Date.now() - startTime) / 1000;

    trackAIUsage({
      ...trackingParams,
      duration_seconds: duration,
      request_metadata: {
        ...(trackingParams.request_metadata || {}),
        error: String(err),
        failed: true
      }
    }).catch(() => {
      // Ignore tracking errors on failed operations
    });

    // Re-throw the original error
    throw err;
  }
}

// =====================================================
// EXPORT UTILITIES
// =====================================================

export const aiUsageTracking = {
  track: trackAIUsage,
  trackBatch: trackAIUsageBatch,
  withTracking: withAITracking,
  extractUsage: extractGeminiUsageMetadata,
  calculateCost,
  getModelPricing
};

export default aiUsageTracking;
