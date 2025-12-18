/**
 * Podcast Workspace Types
 * Type definitions for the podcast unified workspace
 */

import type { Dossier, Topic, TopicCategory, SavedPauta } from '../types';

// ============================================
// STAGE DEFINITIONS
// ============================================

export type PodcastStageId = 'setup' | 'research' | 'pauta' | 'production';

export interface PodcastStage {
  id: PodcastStageId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const PODCAST_STAGES: PodcastStage[] = [
  {
    id: 'setup',
    label: '1. Configuração',
    shortLabel: 'Setup',
    icon: 'User',
    description: 'Informações básicas do episódio e convidado',
  },
  {
    id: 'research',
    label: '2. Pesquisa',
    shortLabel: 'Pesquisa',
    icon: 'Sparkles',
    description: 'Dossier e pesquisa sobre o convidado',
  },
  {
    id: 'pauta',
    label: '3. Pauta',
    shortLabel: 'Pauta',
    icon: 'FileText',
    description: 'Roteiro e tópicos do episódio',
  },
  {
    id: 'production',
    label: '4. Gravação',
    shortLabel: 'Gravação',
    icon: 'Mic',
    description: 'Gravar o episódio',
  },
];

// ============================================
// STAGE-SPECIFIC STATE TYPES
// ============================================

// Stage 1: Setup
export interface SetupState {
  guestType: 'public_figure' | 'common_person' | null;
  guestName: string;
  guestReference: string; // For AI search (title, occupation) or manual occupation
  guestBio: string; // Manual bio notes for common people
  phone: string;
  email: string;
  theme: string;
  themeMode: 'auto' | 'manual';
  season: string;
  location: string;
  scheduledDate: string;
  scheduledTime: string;
  // AI search state
  isSearching: boolean;
  searchResults: any | null;
}

// Stage 2: Research
export interface CustomSource {
  id: string;
  type: 'text' | 'url' | 'file';
  content: string;
  label?: string;
  createdAt: Date;
}

export interface ResearchState {
  dossier: Dossier | null;
  customSources: CustomSource[];
  isGenerating: boolean;
  lastGenerated: Date | null;
  error: string | null;
}

// Stage 3: Pauta
export interface PautaState {
  topics: Topic[];
  categories: TopicCategory[];
  savedPautas: SavedPauta[];
  activePautaId: string | null;
  isGenerating: boolean;
}

// Stage 4: Production
export interface ProductionState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // seconds
  startedAt: Date | null;
  finishedAt: Date | null;
  currentTopicId: string | null;
  recordingFilePath: string | null;
}

// ============================================
// WORKSPACE STATE
// ============================================

export interface PodcastWorkspaceState {
  // Navigation
  currentStage: PodcastStageId;
  visitedStages: PodcastStageId[];

  // Stage states
  setup: SetupState;
  research: ResearchState;
  pauta: PautaState;
  production: ProductionState;

  // Global metadata
  episodeId: string;
  showId: string;
  showTitle: string;

  // Save state
  lastSaved: Date | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// ACTIONS
// ============================================

export type WorkspaceAction =
  // Navigation
  | { type: 'SET_STAGE'; payload: PodcastStageId }
  | { type: 'MARK_STAGE_VISITED'; payload: PodcastStageId }

  // Setup actions
  | { type: 'UPDATE_SETUP'; payload: Partial<SetupState> }
  | { type: 'SET_GUEST_TYPE'; payload: 'public_figure' | 'common_person' }
  | { type: 'SET_GUEST_NAME'; payload: string }
  | { type: 'SET_THEME'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: any }

  // Research actions
  | { type: 'UPDATE_RESEARCH'; payload: Partial<ResearchState> }
  | { type: 'SET_DOSSIER'; payload: Dossier }
  | { type: 'ADD_CUSTOM_SOURCE'; payload: CustomSource }
  | { type: 'REMOVE_CUSTOM_SOURCE'; payload: string }
  | { type: 'START_DOSSIER_GENERATION' }
  | { type: 'FINISH_DOSSIER_GENERATION'; payload: Dossier }
  | { type: 'SET_RESEARCH_ERROR'; payload: string }

  // Pauta actions
  | { type: 'UPDATE_PAUTA'; payload: Partial<PautaState> }
  | { type: 'SET_TOPICS'; payload: Topic[] }
  | { type: 'ADD_TOPIC'; payload: Topic }
  | { type: 'UPDATE_TOPIC'; payload: { id: string; updates: Partial<Topic> } }
  | { type: 'REMOVE_TOPIC'; payload: string }
  | { type: 'REORDER_TOPICS'; payload: Topic[] }
  | { type: 'SET_CATEGORIES'; payload: TopicCategory[] }
  | { type: 'ADD_CATEGORY'; payload: TopicCategory }
  | { type: 'SET_SAVED_PAUTAS'; payload: SavedPauta[] }
  | { type: 'SET_ACTIVE_PAUTA'; payload: string | null }

  // Production actions
  | { type: 'UPDATE_PRODUCTION'; payload: Partial<ProductionState> }
  | { type: 'START_RECORDING' }
  | { type: 'PAUSE_RECORDING' }
  | { type: 'RESUME_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'UPDATE_DURATION'; payload: number }
  | { type: 'SET_CURRENT_TOPIC'; payload: string | null }

  // Global actions
  | { type: 'HYDRATE'; payload: Partial<PodcastWorkspaceState> }
  | { type: 'MARK_SAVED' }
  | { type: 'MARK_DIRTY' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_WORKSPACE' };

// ============================================
// ACTIONS INTERFACE
// ============================================

export interface WorkspaceActions {
  // Navigation
  setStage: (stageId: PodcastStageId) => void;

  // Setup actions
  updateSetup: (updates: Partial<SetupState>) => void;
  setGuestType: (type: 'public_figure' | 'common_person') => void;
  searchGuestProfile: (name: string, reference: string) => Promise<void>;

  // Research actions
  generateDossier: () => Promise<void>;
  regenerateDossier: () => Promise<void>;
  addCustomSource: (source: CustomSource) => void;
  removeCustomSource: (sourceId: string) => void;

  // Pauta actions
  addTopic: (topic: Omit<Topic, 'id'>) => Promise<void>;
  updateTopic: (topicId: string, updates: Partial<Topic>) => Promise<void>;
  removeTopic: (topicId: string) => Promise<void>;
  reorderTopics: (topics: Topic[]) => Promise<void>;
  generatePauta: (config: any) => Promise<void>;
  loadSavedPautas: () => Promise<void>;

  // Production actions
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  setCurrentTopic: (topicId: string | null) => void;

  // Global actions
  save: () => Promise<void>;
  hydrate: (data: Partial<PodcastWorkspaceState>) => void;
}

// ============================================
// COMPLETION STATUS
// ============================================

export type StageCompletionStatus = 'complete' | 'partial' | 'none';

export type StageCompletionMap = {
  [K in PodcastStageId]: StageCompletionStatus;
};

// ============================================
// HELPER TYPES
// ============================================

export interface WorkspaceLoadResult {
  state: PodcastWorkspaceState;
  error: string | null;
}
