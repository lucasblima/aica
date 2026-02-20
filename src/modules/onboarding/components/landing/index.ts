/**
 * Landing Page - "Ordem ao Caos" Concept
 *
 * Transform chaotic WhatsApp messages into organized, actionable modules
 * using AI-powered classification and semantic analysis.
 */

// Main component
export { LandingPage, default } from './LandingPage';

// Sub-components
export { ChaosPanel } from './components/ChaosPanel';
export { OrderPanel } from './components/OrderPanel';
export { ProcessingPipeline } from './components/ProcessingPipeline';
export { FounderStorySection } from './components/FounderStorySection';
export { ModulesOverviewSection } from './components/ModulesOverviewSection';
export { WaitlistSection } from './components/WaitlistSection';
export { TestimonialSection } from './components/TestimonialSection';
export { FooterSection } from './components/FooterSection';

// Services
export { demoProcessingService } from './services/demoProcessingService';

// Types
export type {
  DemoMessage,
  ProcessedModules,
  AtlasTask,
  JourneyMoment,
  StudioEpisode,
  Connection,
  ProcessingStage
} from './types';
