/**
 * Recommendation Engine Types
 * Complete TypeScript interfaces for the PHASE 3 Recommendation Engine
 * Supports intelligent module recommendations based on contextual trails and moment patterns
 *
 * @see docs/onboarding/MODULOS_RECOMENDACOES_LOGIC.md
 */

// =====================================================
// MODULE DEFINITION TYPES
// =====================================================

/**
 * Represents a single learning module available in the platform
 */
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  icon?: string;
  color?: string;

  // Time and complexity
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: number; // 1-10, higher = more important

  // Triggering conditions
  triggeringTrails: string[]; // Trail IDs that recommend this module
  triggeringLifeAreas: string[]; // Life areas (emotions, topics) that trigger it
  triggeringResponses?: string[]; // Specific answer IDs that trigger this module

  // Dependencies and relationships
  prerequisites: string[]; // Module IDs that should come before this one
  complementaryModules: string[]; // Related modules to recommend together

  // Content metadata
  lessons?: number; // Number of lessons/sections in module
  practiceActivities?: boolean;
  resources?: string[]; // URLs or resource references

  // Scoring boost
  urgencyBoost?: number; // Additional weight when certain conditions are met
  serendipityFactor?: number; // Randomness factor for discovery (0-0.3)
}

/**
 * Module categories for organization and filtering
 */
export type ModuleCategory =
  | 'emotional-health'
  | 'physical-health'
  | 'finance'
  | 'relationships'
  | 'personal-growth'
  | 'productivity'
  | 'wellness'
  | 'learning'
  | 'spirituality'
  | 'career';

// =====================================================
// SIGNAL EXTRACTION TYPES
// =====================================================

/**
 * Extracted signal from a completed trail
 */
export interface TrailSignal {
  trailId: string;
  trailName: string;
  strength: number; // 0-1, how important this signal is
  answeredQuestionsCount: number;
  trailScore: number; // 0-100
  selectedAnswerIds: string[];
  selectedAnswerWeights: number[];
  averageWeight: number;
  triggerModuleIds: string[]; // Modules directly triggered by this trail
}

/**
 * Extracted signal from moment entries
 */
export interface MomentSignal {
  momentId: string;
  timestamp: Date;
  emotion?: string;
  lifeAreas: string[]; // Categories mentioned (work, health, relationships, etc.)
  sentiment: number; // -1 to 1
  urgency: number; // 0-1, how urgent/important the moment feels
  keywordMatches: string[]; // Keywords detected in moment content
  pattern: string; // Human-readable pattern description
}

/**
 * Aggregated signals from user's implicit behavior
 */
export interface BehaviorSignal {
  userId: string;
  momentStreak: number; // Days of consecutive moment creation
  totalMomentCount: number;
  averageMomentSentiment: number;
  lastActivityDays: number; // Days since last moment
  engagementScore: number; // 0-1
  completedTrailCount: number;
  averageTrailScore: number;
}

/**
 * All signals combined for scoring
 */
export interface ExtractedSignals {
  trails: TrailSignal[];
  moments: MomentSignal[];
  behavior: BehaviorSignal;
  previouslyAccepted: string[]; // Module IDs user has accepted before
  previouslyRejected: string[]; // Module IDs user has rejected before
  alreadyCompleted: string[]; // Module IDs user has already completed
}

// =====================================================
// RECOMMENDATION TYPES
// =====================================================

/**
 * A single module recommendation with score and reasoning
 */
export interface ModuleRecommendation {
  moduleId: string;
  moduleName: string;
  description: string;
  score: number; // 0-100
  confidence: number; // 0-1 (score / 100)
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Reasoning
  reason: string; // Friendly explanation for user
  triggeringFactors: string[]; // What caused this recommendation
  sourcesBreakdown: {
    trailWeight: number; // 0-1
    momentWeight: number; // 0-1
    behaviorWeight: number; // 0-1
  };

  // Timing
  suggestedStartDate: Date;
  estimatedTimeToComplete: number; // minutes

  // Related
  complementaryModules: string[];
  prerequisites: ModulePrerequisite[];
}

/**
 * Module prerequisite status
 */
export interface ModulePrerequisite {
  moduleId: string;
  moduleName: string;
  isMet: boolean;
  statusMessage: string;
}

/**
 * Complete recommendation result for a user
 */
export interface RecommendationResult {
  userId: string;
  recommendations: ModuleRecommendation[];
  personalizationSummary: string;
  algorithmMetadata: {
    trailWeight: number;
    momentWeight: number;
    behaviorWeight: number;
  };
  nextReviewDate: Date;
  totalModulesEvaluated: number;
  generatedAt: Date;
}

/**
 * Internal module score during calculation
 */
export interface ModuleScore {
  moduleId: string;
  score: number;
  reasons: string[];
  trailMatches: string[]; // Which trails recommended this
  momentMatches: string[]; // Which moments recommended this
  complementaryBoosts: number;
}

// =====================================================
// FEEDBACK TYPES
// =====================================================

/**
 * User feedback on a recommendation
 */
export interface RecommendationFeedback {
  userId: string;
  moduleId: string;
  action: 'accepted' | 'rejected' | 'completed' | 'skipped';
  feedback?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  feedbackAt: Date;
}

/**
 * Aggregated feedback for learning
 */
export interface ModuleFeedbackStats {
  moduleId: string;
  totalRecommendations: number;
  acceptedCount: number;
  rejectedCount: number;
  completedCount: number;
  acceptanceRate: number; // 0-1
  completionRate: number; // 0-1
  averageRating?: number;
}

/**
 * Learned weights based on feedback
 */
export interface ModuleLearningWeights {
  moduleId: string;
  basePriority: number;
  feedbackAdjustment: number; // -1 to 1, added to base
  recommendationTendency: number; // How often to recommend (0-1)
  lastUpdated: Date;
}

// =====================================================
// DATABASE SCHEMA TYPES
// =====================================================

/**
 * Stored module recommendation record
 */
export interface StoredModuleRecommendation {
  id: string;
  user_id: string;
  recommended_modules: string[]; // Ordered array of module IDs
  recommendations_data: RecommendationResult; // Full recommendation data as JSON
  user_feedback: Record<string, RecommendationFeedback>; // Keyed by moduleId
  generated_at: string; // ISO timestamp
  expires_at: string; // ISO timestamp
  refreshed_at?: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

/**
 * Module feedback record
 */
export interface StoredModuleFeedback {
  id: string;
  user_id: string;
  module_id: string;
  action: 'accepted' | 'rejected' | 'completed' | 'skipped';
  feedback?: string;
  rating?: number;
  recommendation_id?: string; // Reference to recommendation that triggered this
  feedback_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

/**
 * Learning weights record
 */
export interface StoredModuleLearningWeights {
  id: string;
  module_id: string;
  base_priority: number;
  feedback_adjustment: number;
  recommendation_tendency: number;
  total_recommendations: number;
  accepted_count: number;
  rejected_count: number;
  completed_count: number;
  last_updated: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

/**
 * Module definition record (stored in DB)
 */
export interface StoredModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  icon?: string;
  color?: string;
  estimated_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: number;
  triggering_trails: string[]; // JSON array
  triggering_life_areas: string[]; // JSON array
  triggering_responses?: string[]; // JSON array
  prerequisites: string[]; // JSON array
  complementary_modules: string[]; // JSON array
  lessons?: number;
  practice_activities?: boolean;
  resources?: string[]; // JSON array
  urgency_boost?: number;
  serendipity_factor?: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Request to generate recommendations
 */
export interface GenerateRecommendationsRequest {
  userId: string;
  forceRefresh?: boolean; // Skip cache, regenerate
  limitResults?: number; // Default 6
}

/**
 * Response from recommendation generation
 */
export interface GenerateRecommendationsResponse {
  success: boolean;
  data?: RecommendationResult;
  message: string;
  cacheHit?: boolean;
  cacheTTL?: number; // Seconds remaining on cache
}

/**
 * Request to submit feedback
 */
export interface SubmitFeedbackRequest {
  userId: string;
  moduleId: string;
  action: 'accepted' | 'rejected' | 'completed' | 'skipped';
  feedback?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

/**
 * Response from feedback submission
 */
export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  updatedModuleScore?: number;
  recommendationRefreshTriggered?: boolean;
}

/**
 * Request to get module details
 */
export interface GetModuleRequest {
  moduleId: string;
}

/**
 * Response with module details and recommendation info
 */
export interface GetModuleResponse {
  success: boolean;
  module?: ModuleDefinition;
  recommendationContext?: {
    userScore?: number;
    userConfidence?: number;
    feedbackStats?: ModuleFeedbackStats;
  };
}

/**
 * Request to list all modules
 */
export interface ListModulesRequest {
  category?: ModuleCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
  offset?: number;
}

/**
 * Response with module list
 */
export interface ListModulesResponse {
  success: boolean;
  modules?: ModuleDefinition[];
  total?: number;
  limit?: number;
  offset?: number;
}

// =====================================================
// ALGORITHM CONFIGURATION
// =====================================================

/**
 * Configuration for recommendation algorithm
 */
export interface RecommendationAlgorithmConfig {
  // Scoring weights (should sum to 1.0)
  trailWeight: number; // Default 0.6
  momentWeight: number; // Default 0.3
  behaviorWeight: number; // Default 0.1

  // Result limits
  maxRecommendations: number; // Default 6
  minConfidenceScore: number; // Default 0.3 (30%)

  // Caching
  cacheEnabled: boolean;
  cacheTTL: number; // Seconds (default 7 days)
  forceRefreshIfOlderThan: number; // Seconds

  // Feedback learning
  acceptanceFeedbackBoost: number; // Default +5 points
  rejectionFeedbackPenalty: number; // Default -3 points
  completionFeedbackBoost: number; // Default +10 points

  // Deduplication
  excludeAlreadyCompleted: boolean;
  excludePreviouslyRejected: boolean;
  penalizeRejectedScore: number; // Multiply by this (default 0.4)

  // Advanced
  enableSerendipity: boolean; // Occasionally suggest unexpected modules
  serendipityProbability: number; // 0-1 (default 0.15)
}

// =====================================================
// LEADERBOARD & ANALYTICS TYPES
// =====================================================

/**
 * User's recommendation engagement stats
 */
export interface UserRecommendationStats {
  userId: string;
  totalRecommendations: number;
  totalAccepted: number;
  totalRejected: number;
  totalCompleted: number;
  acceptanceRate: number; // 0-1
  completionRate: number; // 0-1
  averageLearningPace: 'fast' | 'steady' | 'slow';
}

/**
 * Recommendation system analytics
 */
export interface RecommendationAnalytics {
  period: 'day' | 'week' | 'month';
  totalRecommendations: number;
  averageAcceptanceRate: number;
  averageCompletionRate: number;
  mostRecommendedModules: Array<{
    moduleId: string;
    count: number;
    acceptanceRate: number;
  }>;
  leastRecommendedModules: Array<{
    moduleId: string;
    count: number;
    acceptanceRate: number;
  }>;
  topTrailCombinations: Array<{
    trails: string[];
    recommendationCount: number;
    successRate: number;
  }>;
}

// =====================================================
// ERROR & VALIDATION TYPES
// =====================================================

/**
 * Recommendation engine error
 */
export class RecommendationError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Life area categories
 */
export type LifeArea =
  | 'health'
  | 'work'
  | 'relationships'
  | 'finance'
  | 'personal-growth'
  | 'spirituality'
  | 'family'
  | 'friends'
  | 'community'
  | 'learning';

/**
 * Module recommendation status
 */
export type RecommendationStatus =
  | 'pending' // Waiting for user action
  | 'accepted' // User accepted
  | 'rejected' // User rejected
  | 'in_progress' // User started
  | 'completed' // User finished
  | 'expired'; // Recommendation expired

/**
 * Trail-to-modules mapping
 */
export interface TrailModuleMapping {
  trailId: string;
  trailName: string;
  modules: Array<{
    moduleId: string;
    weight: number; // 0-1
    answerDependencies?: string[]; // Only trigger if specific answers selected
  }>;
}
