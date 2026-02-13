/**
 * Onboarding Module Types
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

// =============================================================================
// ONBOARDING STEPS
// =============================================================================

export type OnboardingStep = 'welcome' | 'whatsapp_import' | 'ready';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'whatsapp_import',
  'ready',
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Bem-vindo',
  whatsapp_import: 'Importar Conversas',
  ready: 'Pronto!',
};

// =============================================================================
// ONBOARDING STATE
// =============================================================================

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedAt: string | null;
  isCompleted: boolean;
}

// =============================================================================
// USER PROFILE
// =============================================================================

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_step: OnboardingStep;
  onboarding_completed_at: string | null;
  timezone: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// USER CREDITS
// =============================================================================

export interface UserCredits {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  last_transaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  transaction_type: 'signup_bonus' | 'purchase' | 'conversation_analysis' | 'refund' | 'admin_adjustment';
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

// =============================================================================
// ONBOARDING DATA (AGGREGATED)
// =============================================================================

export interface OnboardingData {
  profile: UserProfile | null;
  credits: UserCredits | null;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

export interface UseOnboardingReturn {
  /** Current onboarding step */
  currentStep: OnboardingStep;
  /** Index of current step (0-based) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether this is the first step */
  isFirstStep: boolean;
  /** Whether this is the last step */
  isLastStep: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** User profile data */
  profile: UserProfile | null;
  /** User credits data */
  credits: UserCredits | null;
  /** Go to next step */
  goToNextStep: () => Promise<void>;
  /** Go to previous step */
  goToPreviousStep: () => Promise<void>;
  /** Go to specific step */
  goToStep: (step: OnboardingStep) => Promise<void>;
  /** Complete onboarding */
  complete: () => Promise<void>;
  /** Skip onboarding */
  skip: () => Promise<void>;
  /** Refresh onboarding data */
  refresh: () => Promise<void>;
}
