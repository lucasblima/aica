/**
 * Studio Module Types - Public API
 *
 * Centralized export for all Studio module types.
 * Import from this file to access any Studio-related types.
 *
 * @example
 * ```ts
 * import type { StudioState, PodcastWorkspaceState } from '@/modules/studio/types'
 * ```
 */

// ============================================
// CORE STUDIO TYPES
// ============================================

export type {
  // Finite State Machine
  StudioMode,

  // Project Types
  ProjectType,
  StudioProject,
  ProjectMetadata,
  PodcastProjectMetadata,
  VideoProjectMetadata,
  ArticleProjectMetadata,

  // Studio State
  StudioState,
  StudioAction,
  StudioActions,
  StudioContextValue,

  // Project Type Config
  ProjectTypeConfig,

  // Component Props
  StudioLibraryProps,
  StudioWizardProps,
  StudioWorkspaceProps,

  // Helper Types
  StudioDataLoadResult,
  CreateProjectConfig,

  // Deep Research
  DeepResearchResult,
  DeepResearchControversy,

  // Article types
  ArticleOutlineItem,
} from './studio';

export { INITIAL_STUDIO_STATE } from './studio';

// ============================================
// PODCAST TYPES
// ============================================

export type {
  PodcastShow,
} from './podcast';

// ============================================
// PODCAST WORKSPACE TYPES
// ============================================

export type {
  // Imported Types
  Topic,
  TopicCategory,
  TechnicalSheet,
  Dossier,
  SavedPauta,

  // Custom Source
  WorkspaceCustomSource,

  // Stage Definitions
  PodcastStageId,
  PodcastStage,

  // Stage-Specific States
  SetupState,
  ResearchState,
  PautaState,
  ProductionState,

  // Workspace State
  PodcastWorkspaceState,

  // Actions
  WorkspaceAction,
  WorkspaceActions,

  // Completion Status
  StageCompletionStatus,
  StageCompletionMap,

  // Helper Types
  WorkspaceLoadResult,
  AutoSaveConfig,
} from './podcast-workspace';

export { PODCAST_STAGES } from './podcast-workspace';

// ============================================
// RESEARCH TYPES (NotebookLM UX)
// ============================================

export type {
  SuggestionCardType,
  SuggestionCardStatus,
  SuggestionCard,
  GapAnalysisRequest,
  GapAnalysisResponse,
  EnrichCardRequest,
  EnrichCardResponse,
  FileSearchRequest,
  FileSearchResponse,
  ResearchChatContext,
} from './research';

export { CARD_TYPE_CONFIG } from './research';

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if a project is a podcast project.
 */
export function isPodcastProject(project: import('./studio').StudioProject): project is import('./studio').StudioProject & {
  metadata: import('./studio').PodcastProjectMetadata
} {
  return project.type === 'podcast';
}

/**
 * Type guard to check if metadata is podcast metadata.
 */
export function isPodcastMetadata(metadata: import('./studio').ProjectMetadata): metadata is import('./studio').PodcastProjectMetadata {
  return metadata.type === 'podcast';
}
