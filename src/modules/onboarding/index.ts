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

// Landing Page - Digital Ceramic Redesign (consolidated from landing-v2)
export { LandingPageV2 as LandingPage } from './components/landing';
export {
  DigitalHero,
  BentoFeatures,
  ScrollStory,
  ScrollStorySection,
  MinimalFooter,
  MockupPlaceholder,
  useScrollReveal,
} from './components/landing';

// Landing Page V3 - Previous version (backup)
export { LandingPageV3 } from './components/landing-v3';

// Landing Page V4 - Alternative version (backup)
export { LandingPageV4 } from './components/landing-v4';

// Note: BentoCard and CeramicPillButton have been moved to src/components/ui/
// Import from there directly if needed

// Optional Contextual Trails (accessible from /profile/trails)
export { default as TrailSelectionFlow } from './components/TrailSelectionFlow';
