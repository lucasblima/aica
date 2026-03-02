/**
 * Landing Page — AICA Life OS landing experience.
 *
 * Orchestrator + section components + data + hooks.
 */

// Main component
export { LandingPage, default } from './LandingPage';

// Section components
export { HeroSection } from './components/HeroSection';
export { DifferentiatorSection } from './components/DifferentiatorSection';
export { ScoringEngineSection } from './components/ScoringEngineSection';
export { GrantsShowcaseSection } from './components/GrantsShowcaseSection';
export { CompoundEffectSection } from './components/CompoundEffectSection';
export { GamificationSection } from './components/GamificationSection';
export { PricingSection } from './components/PricingSection';
export { CTASection } from './components/CTASection';
export { FooterSection } from './components/FooterSection';

// Hooks
export { useScrollReveal } from './hooks/useScrollReveal';

// Data
export {
  DOMAINS,
  SCORING_MODELS,
  SPIRAL_PAIRS,
  CP_CATEGORIES,
  PRICING_TIERS,
  COMPOUND_EXAMPLES,
} from './data/landingData';

// Types
export type {
  Domain,
  ScoringModel,
  SpiralPair,
  CPCategory,
  PricingTier,
  CompoundExample,
} from './data/landingData';
