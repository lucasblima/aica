/**
 * Studio Workspace Components
 *
 * Barrel export for all workspace components including stage components
 * and workspace layout/container components.
 *
 * Migration Status:
 * - Wave 5 Stream 1: SetupStage, GuestTypeSelector, GuestInfoForm (COMPLETED)
 * - Wave 5 Stream 2: ResearchStage, PautaStage (COMPLETED)
 * - Wave 5 Stream 3: ProductionStage (COMPLETED)
 * - Wave 6: WorkspaceHeader, StageStepper, StageRenderer, PodcastWorkspace (COMPLETED)
 *
 * @module studio/components/workspace
 */

// Main Workspace Container (Wave 6)
export { default as PodcastWorkspace } from './PodcastWorkspace';

// Workspace Layout Components (Wave 6)
export { default as WorkspaceHeader } from './WorkspaceHeader';
export { default as StageStepper } from './StageStepper';
export { default as StageRenderer } from './StageRenderer';

// Setup Stage (Wave 5 Stream 1)
export { default as SetupStage } from './SetupStage';
export { default as GuestTypeSelector } from './GuestTypeSelector';
export type { GuestCategory } from './GuestTypeSelector';
export { default as GuestInfoForm } from './GuestInfoForm';
export type { GuestManualData } from './GuestInfoForm';

// Research Stage (Wave 5 Stream 2)
export { default as ResearchStage } from './ResearchStage';

// Pauta Stage (Wave 5 Stream 2)
export { default as PautaStage } from './PautaStage';

// Production Stage (Wave 5 Stream 3)
export { default as ProductionStage } from './ProductionStage';
