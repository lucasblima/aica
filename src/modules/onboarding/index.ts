/**
 * Onboarding Module Exports
 *
 * NOTE: This module is now primarily used for landing pages.
 * The interactive onboarding flow has been replaced with:
 * - Organic tours via TourProvider (Phases 1-2)
 * - Optional trails via /profile/trails (Phase 3)
 * - Direct app access (Phase 4)
 *
 * Remaining components:
 * - Landing page (entry point for new users)
 * - TrailSelectionFlow (optional contextual trails)
 */

// Landing Page - Official consolidated version (from V4)
export { LandingPage } from './components/landing';
export {
  HeroSection,
  SocialProof,
  Features,
  HowItWorks,
  CTASection,
  MinimalFooter,
  CaptacaoSection,
} from './components/landing';

// Optional Contextual Trails (accessible from /profile/trails)
export { default as TrailSelectionFlow } from './components/TrailSelectionFlow';
