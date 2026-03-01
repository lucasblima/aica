/**
 * Studio Module Hooks - Public API
 *
 * Centralized export for all Studio module hooks.
 * Import from this file to access any Studio-related hooks.
 *
 * @example
 * ```ts
 * import { useWorkspaceState, useAutoSave } from '@/modules/studio/hooks'
 * ```
 */

// ============================================
// WORKSPACE STATE MANAGEMENT
// ============================================

export { useWorkspaceState } from './useWorkspaceState';
export { useAutoSave } from './useAutoSave';

// ============================================
// DATA HOOKS
// ============================================

export { useStudioData } from './useStudioData';
export { useSavedPauta } from './useSavedPauta';

// ============================================
// AI SERVICES (WAVE 4)
// ============================================

export { useWorkspaceAI } from './useWorkspaceAI';
export type {
  UseWorkspaceAI,
  Dossier,
  GuestSearchResult,
  CustomSource,
  ResearchOptions,
  ResearchResult,
  Topic,
  ConnectionStatus,
  LiveMode
} from './useWorkspaceAI';

// ============================================
// FILE SEARCH INTEGRATION
// ============================================

export { usePodcastFileSearch, usePodcastQuickSearch } from './usePodcastFileSearch';
export type { UsePodcastFileSearchOptions, PodcastSearchContext } from './usePodcastFileSearch';

// ============================================
// RE-EXPORTS FROM useSavedPauta
// ============================================

export type { UseSavedPautaResult } from './useSavedPauta';

// ============================================
// SCIENTIFIC SCORING (SPRINT 6)
// ============================================

export { useGuestScoring } from './useGuestScoring';
export type { UseGuestScoringResult, StoredGuestScore } from './useGuestScoring';

export { useNarrativeAnalysis } from './useNarrativeAnalysis';
export type { UseNarrativeAnalysisResult } from './useNarrativeAnalysis';
