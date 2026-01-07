/**
 * Landing Page - Digital Ceramic Redesign
 *
 * Operation "Digital Desire" - Apple-inspired landing page
 * following the "Digital Ceramic" aesthetic.
 *
 * @module landing
 */

// Main Page Component
export { LandingPageV2 as LandingPage, default } from './LandingPageV2';

// Section Components
export { DigitalHero } from './DigitalHero';
export { BentoFeatures } from './BentoFeatures';
export { ScrollStory } from './ScrollStory';
export { ScrollStorySection } from './ScrollStorySection';
export { MinimalFooter } from './MinimalFooter';

// UI Components - Note: BentoCard and CeramicPillButton have been moved to src/components/ui/
// Use: import { BentoCard } from '../../components/ui/BentoCard'
// Use: import { CeramicPillButton } from '../../components/ui/CeramicPillButton'
export { MockupPlaceholder } from './MockupPlaceholder';

// Hooks
export { useScrollReveal } from './hooks/useScrollReveal';
