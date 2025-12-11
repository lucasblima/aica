/**
 * Onboarding Types
 * Comprehensive TypeScript interfaces for contextual trails and onboarding flow
 * Based on spec: docs/onboarding/TRILHAS_CONTEXTUAIS_E_PERGUNTAS.md
 */

// =====================================================
// CONTEXTUAL TRAILS & QUESTIONS
// =====================================================

/**
 * Represents a single answer option in a contextual question
 */
export interface ContextualAnswer {
  id: string;
  label: string;
  value: string;
  icon?: string; // Emoji or icon name (e.g., "😄", "😰")
  description?: string; // Optional brief description
  weight: number; // 0-10 scale for score calculation
  triggerModules?: string[]; // Module IDs unlocked by this answer
}

/**
 * Represents a single question in a contextual trail
 */
export interface ContextualQuestion {
  id: string;
  question: string;
  helpText?: string; // Optional helper text
  type: 'single' | 'multiple'; // Single or multiple choice
  answers: ContextualAnswer[];
  order: number; // Order within the trail
  isRequired: boolean;
}

/**
 * Represents a complete contextual trail
 * (e.g., "health-emotional", "finance", etc.)
 */
export interface ContextualTrail {
  id:
    | 'health-emotional'
    | 'health-physical'
    | 'finance'
    | 'relationships'
    | 'growth';
  name: string; // Friendly name in Portuguese
  icon: string; // Lucide icon name
  color: string; // Tailwind color or hex
  description: string; // Brief description
  questions: ContextualQuestion[];
  recommendedModules: string[]; // Default recommended modules
  priority: number; // 1 = highest priority
}

// =====================================================
// USER RESPONSES & CAPTURES
// =====================================================

/**
 * Single response to a question during trail completion
 */
export interface ContextualQuestionResponse {
  questionId: string;
  selectedAnswerIds: string[]; // Array to support multiple-choice questions
  answeredAt?: Date;
}

/**
 * User's responses to a single trail (before saving)
 */
export interface TrailResponse {
  userId: string;
  trailId: string;
  responses: ContextualQuestionResponse[];
  completedAt?: Date;
  trailScore?: number; // Calculated on backend
  recommendedModules?: string[]; // Calculated on backend
}

/**
 * In-memory representation during onboarding flow
 */
export interface OnboardingContextCapture {
  userId: string;
  trailId: string;
  responses: ContextualQuestionResponse[];
  completedAt: Date;
  trailScore: number; // Score 0-100 (average of weights * 10)
  recommendedModules: string[]; // Union of all triggerModules
}

/**
 * Database stored record (maps to onboarding_context_captures table)
 */
export interface StoredContextCapture {
  id: string;
  user_id: string;
  trail_id: string;
  responses: Record<string, {
    selectedAnswerIds: string[];
    answeredAt: string;
  }>;
  trail_score: number | null;
  recommended_modules: string[];
  created_at: string;
  updated_at: string;
}

// =====================================================
// ONBOARDING STATUS & PROGRESS
// =====================================================

/**
 * Status of user's onboarding progress
 */
export interface OnboardingStatus {
  userId: string;
  trailsCompleted: number; // How many trails user has completed
  totalTrails: number; // Total available trails (5)
  completedTrailIds: string[];
  allRecommendedModules: string[]; // Union of all recommended modules
  averageTrailScore: number; // Average score across all trails
  isOnboardingComplete: boolean; // true if 3+ trails completed
  lastCompletedTrailAt?: Date;
}

/**
 * Response from trail capture endpoint
 */
export interface CaptureTrailResponse {
  success: boolean;
  trailId: string;
  trailScore: number;
  recommendedModules: string[];
  pointsAwarded?: number;
  nextStep: 'complete_more_trails' | 'view_recommendations' | 'step_2_moment_capture';
  message: string;
}

/**
 * Response from onboarding finalization
 */
export interface FinalizeOnboardingResponse {
  success: boolean;
  nextStep: 'step_2_moment_capture' | 'step_3_recommendations';
  allRecommendedModules: string[];
  averageScore: number;
  pointsAwarded?: number;
  message: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Request body for capturing trail responses
 */
export interface CaptureTrailRequest {
  userId: string;
  trailId: string;
  responses: Array<{
    questionId: string;
    selectedAnswerIds: string[];
  }>;
}

/**
 * Request body for finalizing onboarding
 */
export interface FinalizeOnboardingRequest {
  userId: string;
  trailIds: string[]; // All trails completed by user
}

/**
 * Request body for getting onboarding status
 */
export interface GetOnboardingStatusRequest {
  userId: string;
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Map of trail ID to list of recommended modules
 */
export type TrailToModulesMap = Record<string, string[]>;

/**
 * Weighted answer for score calculation
 */
export interface WeightedAnswer {
  answerId: string;
  weight: number;
  triggerModules: string[];
}

/**
 * Calculation intermediate data
 */
export interface TrailScoreCalculation {
  questionWeights: number[];
  averageWeight: number;
  trailScore: number; // 0-10 scale
  allTriggerModules: Set<string>;
  recommendedModules: string[];
}

/**
 * Type for UI state during onboarding flow
 */
export interface OnboardingFlowState {
  currentStep: 'trails-selection' | 'trail-questions' | 'results' | 'complete';
  selectedTrailIds: string[];
  currentTrailId?: string;
  currentQuestionIndex: number;
  responses: Record<string, TrailResponse>; // Map of trailId -> responses
  completedTrails: Set<string>;
  isLoading: boolean;
  error?: string;
}

/**
 * Module recommendation with confidence score
 */
export interface ModuleRecommendation {
  moduleId: string;
  moduleName: string;
  confidence: number; // 0-1
  reasonFromTrails: string[]; // e.g., ['health-emotional', 'relationships']
  priority: 'high' | 'medium' | 'low';
}
