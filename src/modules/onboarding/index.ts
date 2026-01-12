/**
 * Onboarding Module Exports
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Public API for the onboarding module including:
 * - Landing page (entry point for new users)
 * - WhatsApp onboarding flow (pairing, sync, ready)
 * - TrailSelectionFlow (optional contextual trails)
 */

// =============================================================================
// LANDING PAGE
// =============================================================================
export { LandingPage } from './components/landing';
export {
  ChaosPanel,
  OrderPanel,
  ProcessingPipeline,
} from './components/landing';

// =============================================================================
// WHATSAPP ONBOARDING FLOW
// =============================================================================
export { OnboardingFlow } from './components/OnboardingFlow';
export { PairingCodeDisplay } from './components/PairingCodeDisplay';
export { WelcomeStep } from './components/WelcomeStep';
export { WhatsAppPairingStep } from './components/WhatsAppPairingStep';
export { ContactsSyncStep } from './components/ContactsSyncStep';
export { ReadyStep } from './components/ReadyStep';

// =============================================================================
// HOOKS
// =============================================================================
export { useOnboarding } from './hooks/useOnboarding';

// =============================================================================
// SERVICES
// =============================================================================
export * from './services/onboardingService';

// =============================================================================
// TYPES
// =============================================================================
export * from './types';

// =============================================================================
// LEGACY - Optional Contextual Trails
// =============================================================================
export { default as TrailSelectionFlow } from './components/TrailSelectionFlow';
