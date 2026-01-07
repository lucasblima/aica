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
 * - Landing pages (entry point for new users)
 * - TrailSelectionFlow (optional contextual trails)
 */

// Landing Page - Digital Ceramic Redesign
export { LandingPageV2 } from './components/landing-v2';
export {
  DigitalHero,
  BentoFeatures,
  BentoCard,
  ScrollStory,
  ScrollStorySection,
  MinimalFooter,
  CeramicPillButton,
  MockupPlaceholder,
  useScrollReveal,
} from './components/landing-v2';

// Landing Page V3 - Previous version (backup)
export { LandingPageV3 } from './components/landing-v3';

// Landing Page V4 - Current default
export { LandingPageV4 } from './components/landing-v4';

// Optional Contextual Trails (accessible from /profile/trails)
export { default as TrailSelectionFlow } from './components/TrailSelectionFlow';
