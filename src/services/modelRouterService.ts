/**
 * Model Router Service
 * Epic #132 - AICA Billing & Unified Chat System
 *
 * Intelligent routing of AI requests to optimal models based on:
 * - User's subscription tier
 * - Rate limit availability
 * - Request complexity
 * - Cost optimization
 *
 * @module services/modelRouterService
 */

import { supabase } from './supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export type ModelTier = 'premium' | 'standard' | 'lite';
export type ModelProvider = 'anthropic' | 'google';

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  tier: ModelTier;
  maxTokens: number;
  costPer1kTokens: number; // in USD
  capabilities: ModelCapability[];
  fallbackModel?: string;
}

export type ModelCapability =
  | 'chat'
  | 'code'
  | 'analysis'
  | 'creative'
  | 'summarization'
  | 'translation'
  | 'research'
  | 'document_processing';

export interface RouteRequest {
  userId: string;
  capability: ModelCapability;
  preferredTier?: ModelTier;
  estimatedTokens?: number;
  priority?: 'high' | 'normal' | 'low';
  fallbackAllowed?: boolean;
}

export interface RouteResult {
  model: AIModel;
  tier: ModelTier;
  rateLimited: boolean;
  fallback: boolean;
  queueRecommended: boolean;
  estimatedCost: number;
}

export interface UserPlanDetails {
  planName: string;
  tier: ModelTier;
  tokenLimits: Record<ModelTier, number>;
  remainingTokens: Record<ModelTier, number>;
}

// =============================================================================
// MODEL REGISTRY
// =============================================================================

export const AI_MODELS: Record<string, AIModel> = {
  // Premium Tier
  'claude-opus-4-5-20251101': {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'premium',
    maxTokens: 200000,
    costPer1kTokens: 0.075, // $15 input + $75 output / 2 avg
    capabilities: ['chat', 'code', 'analysis', 'creative', 'research'],
    fallbackModel: 'claude-sonnet-4-20250514',
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    tier: 'premium',
    maxTokens: 2000000,
    costPer1kTokens: 0.00375, // $0.00125 input + $0.005 output / 2 avg
    capabilities: ['chat', 'code', 'analysis', 'creative', 'research', 'document_processing'],
    fallbackModel: 'gemini-1.5-flash',
  },

  // Standard Tier
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    tier: 'standard',
    maxTokens: 200000,
    costPer1kTokens: 0.0225, // $3 input + $15 output / 2 avg
    capabilities: ['chat', 'code', 'analysis', 'creative', 'summarization'],
    fallbackModel: 'claude-haiku-4-20250514',
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    tier: 'standard',
    maxTokens: 1000000,
    costPer1kTokens: 0.0001875, // $0.000075 input + $0.0003 output / 2 avg
    capabilities: ['chat', 'code', 'analysis', 'summarization', 'translation'],
    fallbackModel: 'gemini-2.0-flash-lite',
  },
  'gemini-2.0-flash-exp': {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'standard',
    maxTokens: 1000000,
    costPer1kTokens: 0.0002, // Estimated
    capabilities: ['chat', 'code', 'analysis', 'summarization', 'translation', 'document_processing'],
    fallbackModel: 'gemini-2.0-flash-lite',
  },

  // Lite Tier
  'claude-haiku-4-20250514': {
    id: 'claude-haiku-4-20250514',
    name: 'Claude Haiku 4',
    provider: 'anthropic',
    tier: 'lite',
    maxTokens: 200000,
    costPer1kTokens: 0.005, // $0.25 input + $1.25 output / 2 avg
    capabilities: ['chat', 'summarization', 'translation'],
  },
  'gemini-2.0-flash-lite': {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'google',
    tier: 'lite',
    maxTokens: 1000000,
    costPer1kTokens: 0.0001, // Estimated
    capabilities: ['chat', 'summarization', 'translation'],
  },
};

// =============================================================================
// CAPABILITY TO MODEL MAPPING
// =============================================================================

const CAPABILITY_PREFERENCES: Record<ModelCapability, string[]> = {
  chat: ['gemini-2.0-flash-exp', 'claude-sonnet-4-20250514', 'gemini-2.0-flash-lite'],
  code: ['claude-opus-4-5-20251101', 'claude-sonnet-4-20250514', 'gemini-1.5-pro'],
  analysis: ['gemini-1.5-pro', 'claude-opus-4-5-20251101', 'claude-sonnet-4-20250514'],
  creative: ['claude-opus-4-5-20251101', 'gemini-1.5-pro', 'claude-sonnet-4-20250514'],
  summarization: ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'claude-haiku-4-20250514'],
  translation: ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'claude-haiku-4-20250514'],
  research: ['claude-opus-4-5-20251101', 'gemini-1.5-pro', 'claude-sonnet-4-20250514'],
  document_processing: ['gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'],
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

class ModelRouterService {
  private modelCache: Map<string, AIModel> = new Map();

  constructor() {
    // Initialize model cache
    Object.values(AI_MODELS).forEach((model) => {
      this.modelCache.set(model.id, model);
    });
  }

  // ---------------------------------------------------------------------------
  // Get User's Plan Details
  // ---------------------------------------------------------------------------

  async getUserPlanDetails(userId: string): Promise<UserPlanDetails | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_plan_details', {
        p_user_id: userId,
      });

      if (error) throw error;

      if (!data) {
        // Default to free tier
        return {
          planName: 'Free',
          tier: 'lite',
          tokenLimits: {
            premium: 50000,
            standard: 200000,
            lite: 1000000,
          },
          remainingTokens: {
            premium: 50000,
            standard: 200000,
            lite: 1000000,
          },
        };
      }

      return data as UserPlanDetails;
    } catch (error) {
      console.error('[ModelRouterService] Failed to get plan details:', error);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Check Token Availability
  // ---------------------------------------------------------------------------

  async checkTokenAvailability(
    userId: string,
    tier: ModelTier,
    estimatedTokens: number
  ): Promise<{ available: boolean; remaining: number }> {
    try {
      const { data, error } = await supabase.rpc('check_token_availability', {
        p_user_id: userId,
        p_model_tier: tier,
        p_estimated_tokens: estimatedTokens,
      });

      if (error) throw error;

      return {
        available: data?.is_available ?? true,
        remaining: data?.remaining_tokens ?? 999999,
      };
    } catch (error) {
      console.error('[ModelRouterService] Token check failed:', error);
      // Fail open for UX
      return { available: true, remaining: 999999 };
    }
  }

  // ---------------------------------------------------------------------------
  // Route Request to Optimal Model
  // ---------------------------------------------------------------------------

  async routeRequest(request: RouteRequest): Promise<RouteResult> {
    const {
      userId,
      capability,
      preferredTier = 'standard',
      estimatedTokens = 500,
      fallbackAllowed = true,
    } = request;

    // Get user's plan
    const planDetails = await this.getUserPlanDetails(userId);
    const userMaxTier = this.getTierLevel(planDetails?.tier || 'lite');
    const requestedTierLevel = this.getTierLevel(preferredTier);

    // Ensure user can't request a tier higher than their plan
    const effectiveTier = requestedTierLevel > userMaxTier
      ? this.tierFromLevel(userMaxTier)
      : preferredTier;

    // Get preferred models for capability
    const preferredModels = CAPABILITY_PREFERENCES[capability] || CAPABILITY_PREFERENCES.chat;

    // Try to find an available model
    let selectedModel: AIModel | null = null;
    let fallback = false;
    let rateLimited = false;

    for (const modelId of preferredModels) {
      const model = this.modelCache.get(modelId);
      if (!model) continue;

      // Check if model tier is appropriate
      const modelTierLevel = this.getTierLevel(model.tier);
      if (modelTierLevel > this.getTierLevel(effectiveTier)) continue;

      // Check token availability
      const availability = await this.checkTokenAvailability(
        userId,
        model.tier,
        estimatedTokens
      );

      if (availability.available) {
        selectedModel = model;
        break;
      } else if (!selectedModel) {
        // Track rate limited state
        rateLimited = true;
      }
    }

    // Try fallback if needed and allowed
    if (!selectedModel && fallbackAllowed) {
      fallback = true;

      // Find any available model at a lower tier
      for (const tier of ['standard', 'lite'] as ModelTier[]) {
        if (this.getTierLevel(tier) > this.getTierLevel(effectiveTier)) continue;

        for (const [modelId, model] of this.modelCache) {
          if (model.tier !== tier) continue;
          if (!model.capabilities.includes(capability)) continue;

          const availability = await this.checkTokenAvailability(
            userId,
            model.tier,
            estimatedTokens
          );

          if (availability.available) {
            selectedModel = model;
            break;
          }
        }

        if (selectedModel) break;
      }
    }

    // Default to lite model if nothing found
    if (!selectedModel) {
      selectedModel = AI_MODELS['gemini-2.0-flash-lite'];
    }

    // Calculate estimated cost
    const estimatedCost = (estimatedTokens / 1000) * selectedModel.costPer1kTokens;

    return {
      model: selectedModel,
      tier: selectedModel.tier,
      rateLimited,
      fallback,
      queueRecommended: rateLimited && !fallback,
      estimatedCost,
    };
  }

  // ---------------------------------------------------------------------------
  // Get Model by ID
  // ---------------------------------------------------------------------------

  getModel(modelId: string): AIModel | null {
    return this.modelCache.get(modelId) || null;
  }

  // ---------------------------------------------------------------------------
  // Get Models by Tier
  // ---------------------------------------------------------------------------

  getModelsByTier(tier: ModelTier): AIModel[] {
    return Array.from(this.modelCache.values()).filter(
      (model) => model.tier === tier
    );
  }

  // ---------------------------------------------------------------------------
  // Get Models by Capability
  // ---------------------------------------------------------------------------

  getModelsByCapability(capability: ModelCapability): AIModel[] {
    return Array.from(this.modelCache.values()).filter(
      (model) => model.capabilities.includes(capability)
    );
  }

  // ---------------------------------------------------------------------------
  // Get Best Model for Capability
  // ---------------------------------------------------------------------------

  async getBestModelForCapability(
    userId: string,
    capability: ModelCapability
  ): Promise<RouteResult> {
    return this.routeRequest({
      userId,
      capability,
      fallbackAllowed: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private getTierLevel(tier: ModelTier): number {
    switch (tier) {
      case 'premium':
        return 3;
      case 'standard':
        return 2;
      case 'lite':
        return 1;
      default:
        return 1;
    }
  }

  private tierFromLevel(level: number): ModelTier {
    switch (level) {
      case 3:
        return 'premium';
      case 2:
        return 'standard';
      default:
        return 'lite';
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const modelRouterService = new ModelRouterService();
export default modelRouterService;
