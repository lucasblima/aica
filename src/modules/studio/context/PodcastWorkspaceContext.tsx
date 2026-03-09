/**
 * PodcastWorkspaceContext - State Management for Podcast Workspace
 * Uses React Context + useReducer for local state management
 * Pattern based on grants module WorkspaceContext
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/context/
 * Wave 3: Context Migration - Updated type imports to new paths
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type {
  PodcastWorkspaceState,
  WorkspaceAction,
  WorkspaceActions,
  PodcastStageId,
  StageCompletionMap,
  StageCompletionStatus,
  SetupState,
  ResearchState,
  PautaState,
  ProductionState,
  WorkspaceCustomSource,
  Dossier,
  Topic,
  TopicCategory,
  SavedPauta,
  SuggestionCardStatus,
} from '../types';
import { deepResearchGuest, analyzeGaps, indexSources } from '../services/podcastAIService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PodcastWorkspaceContext');

// ============================================
// INITIAL STATE
// ============================================

const initialSetupState: SetupState = {
  guestType: null,
  guestName: '',
  guestReference: '',
  guestBio: '',
  guestContactId: null,
  phone: '',
  email: '',
  theme: '',
  themeMode: 'manual',
  season: '',
  location: '',
  scheduledDate: '',
  scheduledTime: '',
  isSearching: false,
  searchResults: null,
};

const initialResearchState: ResearchState = {
  dossier: null,
  customSources: [],
  isGenerating: false,
  lastGenerated: null,
  error: null,
  deepResearch: null,
  suggestionCards: [],
  isAnalyzingGaps: false,
  fileSearchStoreId: null,
  chatOpen: false,
};

const initialPautaState: PautaState = {
  topics: [],
  categories: [],
  savedPautas: [],
  activePautaId: null,
  isGenerating: false,
};

const initialProductionState: ProductionState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  startedAt: null,
  finishedAt: null,
  currentTopicId: null,
  recordingFilePath: null,
};

export function createInitialState(episodeId: string, showId: string, showTitle: string): PodcastWorkspaceState {
  return {
    currentStage: 'setup',
    visitedStages: ['setup'],
    setup: initialSetupState,
    research: initialResearchState,
    pauta: initialPautaState,
    production: initialProductionState,
    episodeId,
    showId,
    showTitle,
    lastSaved: null,
    isDirty: false,
    isLoading: false,
    error: null,
  };
}

// ============================================
// REDUCER
// ============================================

function workspaceReducer(state: PodcastWorkspaceState, action: WorkspaceAction): PodcastWorkspaceState {
  switch (action.type) {
    // Navigation
    case 'SET_STAGE':
      return {
        ...state,
        currentStage: action.payload,
        visitedStages: state.visitedStages.includes(action.payload)
          ? state.visitedStages
          : [...state.visitedStages, action.payload],
      };

    case 'MARK_STAGE_VISITED':
      return {
        ...state,
        visitedStages: state.visitedStages.includes(action.payload)
          ? state.visitedStages
          : [...state.visitedStages, action.payload],
      };

    // Setup actions
    case 'UPDATE_SETUP':
      return {
        ...state,
        setup: { ...state.setup, ...action.payload },
        isDirty: true,
      };

    case 'SET_GUEST_TYPE':
      return {
        ...state,
        setup: { ...state.setup, guestType: action.payload },
        isDirty: true,
      };

    case 'SET_GUEST_NAME':
      return {
        ...state,
        setup: { ...state.setup, guestName: action.payload },
        isDirty: true,
      };

    case 'SET_THEME':
      return {
        ...state,
        setup: { ...state.setup, theme: action.payload },
        isDirty: true,
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        setup: { ...state.setup, searchResults: action.payload, isSearching: false },
      };

    // Research actions
    case 'UPDATE_RESEARCH':
      return {
        ...state,
        research: { ...state.research, ...action.payload },
        isDirty: true,
      };

    case 'SET_DOSSIER':
      return {
        ...state,
        research: {
          ...state.research,
          dossier: action.payload,
          lastGenerated: new Date(),
          isGenerating: false,
        },
        isDirty: true,
      };

    case 'ADD_CUSTOM_SOURCE':
      return {
        ...state,
        research: {
          ...state.research,
          customSources: [...state.research.customSources, action.payload],
        },
        isDirty: true,
      };

    case 'REMOVE_CUSTOM_SOURCE':
      return {
        ...state,
        research: {
          ...state.research,
          customSources: state.research.customSources.filter(s => s.id !== action.payload),
        },
        isDirty: true,
      };

    case 'START_DOSSIER_GENERATION':
      return {
        ...state,
        research: { ...state.research, isGenerating: true, error: null },
      };

    case 'FINISH_DOSSIER_GENERATION':
      return {
        ...state,
        research: {
          ...state.research,
          dossier: action.payload,
          isGenerating: false,
          lastGenerated: new Date(),
        },
        isDirty: true,
      };

    case 'SET_RESEARCH_ERROR':
      return {
        ...state,
        research: { ...state.research, error: action.payload, isGenerating: false },
      };

    // Suggestion card actions (NotebookLM UX)
    case 'SET_SUGGESTION_CARDS':
      return {
        ...state,
        research: { ...state.research, suggestionCards: action.payload, isAnalyzingGaps: false },
      };

    case 'UPDATE_CARD_STATUS':
      return {
        ...state,
        research: {
          ...state.research,
          suggestionCards: state.research.suggestionCards.map(c =>
            c.id === action.payload.cardId ? { ...c, status: action.payload.status } : c
          ),
        },
      };

    case 'UPDATE_CARD_TEXT':
      return {
        ...state,
        research: {
          ...state.research,
          suggestionCards: state.research.suggestionCards.map(c =>
            c.id === action.payload.cardId ? { ...c, fullText: action.payload.fullText } : c
          ),
        },
      };

    case 'INSERT_CARD_TO_DOSSIER': {
      const { cardId, targetSection, text } = action.payload;
      const currentDossier = state.research.dossier;
      if (!currentDossier) return state;

      let updatedDossier: Dossier;
      if (targetSection === 'bio') {
        updatedDossier = {
          ...currentDossier,
          biography: currentDossier.biography
            ? `${currentDossier.biography}\n\n${text}`
            : text,
        };
      } else if (targetSection === 'noticias') {
        updatedDossier = {
          ...currentDossier,
          controversies: [...(currentDossier.controversies || []), text],
        };
      } else {
        updatedDossier = {
          ...currentDossier,
          biography: currentDossier.biography
            ? `${currentDossier.biography}\n\n${text}`
            : text,
        };
      }

      return {
        ...state,
        research: {
          ...state.research,
          dossier: updatedDossier,
          suggestionCards: state.research.suggestionCards.map(c =>
            c.id === cardId ? { ...c, status: 'inserted' as const } : c
          ),
        },
        isDirty: true,
      };
    }

    case 'SET_ANALYZING_GAPS':
      return {
        ...state,
        research: { ...state.research, isAnalyzingGaps: action.payload },
      };

    case 'SET_FILE_SEARCH_STORE':
      return {
        ...state,
        research: { ...state.research, fileSearchStoreId: action.payload },
      };

    case 'TOGGLE_CHAT':
      return {
        ...state,
        research: {
          ...state.research,
          chatOpen: action.payload !== undefined ? action.payload : !state.research.chatOpen,
        },
      };

    // Pauta actions
    case 'UPDATE_PAUTA':
      return {
        ...state,
        pauta: { ...state.pauta, ...action.payload },
        isDirty: true,
      };

    case 'SET_TOPICS':
      return {
        ...state,
        pauta: { ...state.pauta, topics: action.payload },
        isDirty: true,
      };

    case 'ADD_TOPIC':
      return {
        ...state,
        pauta: { ...state.pauta, topics: [...state.pauta.topics, action.payload] },
        isDirty: true,
      };

    case 'UPDATE_TOPIC':
      return {
        ...state,
        pauta: {
          ...state.pauta,
          topics: state.pauta.topics.map(t =>
            t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
          ),
        },
        isDirty: true,
      };

    case 'REMOVE_TOPIC':
      return {
        ...state,
        pauta: {
          ...state.pauta,
          topics: state.pauta.topics.filter(t => t.id !== action.payload),
        },
        isDirty: true,
      };

    case 'REORDER_TOPICS':
      return {
        ...state,
        pauta: { ...state.pauta, topics: action.payload },
        isDirty: true,
      };

    case 'SET_CATEGORIES':
      return {
        ...state,
        pauta: { ...state.pauta, categories: action.payload },
        isDirty: true,
      };

    case 'ADD_CATEGORY':
      return {
        ...state,
        pauta: { ...state.pauta, categories: [...state.pauta.categories, action.payload] },
        isDirty: true,
      };

    case 'SET_SAVED_PAUTAS':
      return {
        ...state,
        pauta: { ...state.pauta, savedPautas: action.payload },
      };

    case 'SET_ACTIVE_PAUTA':
      return {
        ...state,
        pauta: { ...state.pauta, activePautaId: action.payload },
      };

    // Production actions
    case 'UPDATE_PRODUCTION':
      return {
        ...state,
        production: { ...state.production, ...action.payload },
        isDirty: true,
      };

    case 'START_RECORDING':
      return {
        ...state,
        production: {
          ...state.production,
          isRecording: true,
          isPaused: false,
          startedAt: new Date(),
        },
        isDirty: true,
      };

    case 'PAUSE_RECORDING':
      return {
        ...state,
        production: { ...state.production, isPaused: true },
      };

    case 'RESUME_RECORDING':
      return {
        ...state,
        production: { ...state.production, isPaused: false },
      };

    case 'STOP_RECORDING':
      return {
        ...state,
        production: {
          ...state.production,
          isRecording: false,
          isPaused: false,
          finishedAt: new Date(),
        },
        isDirty: true,
      };

    case 'UPDATE_DURATION':
      return {
        ...state,
        production: { ...state.production, duration: action.payload },
      };

    case 'SET_CURRENT_TOPIC':
      return {
        ...state,
        production: { ...state.production, currentTopicId: action.payload },
      };

    // Global actions
    case 'HYDRATE':
      return {
        ...state,
        ...action.payload,
        isDirty: false,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        lastSaved: new Date(),
        isDirty: false,
      };

    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: true,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'RESET_WORKSPACE':
      return createInitialState(state.episodeId, state.showId, state.showTitle);

    default:
      return state;
  }
}

// ============================================
// COMPLETION CALCULATORS
// ============================================

function calculateSetupCompletion(state: PodcastWorkspaceState): StageCompletionStatus {
  const { guestType, guestName, theme } = state.setup;

  // Complete: guest type, name, and theme are all set
  if (guestType && guestName.trim() && theme.trim()) {
    return 'complete';
  }

  // Partial: guest type and name are set, but theme is missing
  if (guestType && guestName.trim()) {
    return 'partial';
  }

  // None: missing critical fields
  return 'none';
}

function calculateResearchCompletion(state: PodcastWorkspaceState): StageCompletionStatus {
  const { dossier } = state.research;

  if (!dossier) return 'none';

  // Complete: dossier exists with substantial bio
  if (dossier.biography && dossier.biography.length > 200) {
    return 'complete';
  }

  // Partial: dossier exists but limited content
  if (dossier.biography && dossier.biography.length > 0) {
    return 'partial';
  }

  return 'none';
}

function calculatePautaCompletion(state: PodcastWorkspaceState): StageCompletionStatus {
  const { topics } = state.pauta;

  // Complete: at least one topic exists
  if (topics.length > 0) {
    return 'complete';
  }

  return 'none';
}

function calculateProductionCompletion(state: PodcastWorkspaceState): StageCompletionStatus {
  const { duration, finishedAt, isRecording } = state.production;

  // Complete: recording finished with duration
  if (finishedAt && duration > 0) {
    return 'complete';
  }

  // Partial: recording started or in progress
  if (isRecording || duration > 0) {
    return 'partial';
  }

  return 'none';
}

// ============================================
// CONTEXT
// ============================================

interface WorkspaceContextValue {
  state: PodcastWorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  actions: WorkspaceActions;
  stageCompletions: StageCompletionMap;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ============================================
// HOOK
// ============================================

export function usePodcastWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('usePodcastWorkspace must be used within a PodcastWorkspaceProvider');
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

interface PodcastWorkspaceProviderProps {
  children: React.ReactNode;
  initialState: PodcastWorkspaceState;
  onSave?: (state: PodcastWorkspaceState) => Promise<void>;
  onGenerateDossier?: (guestName: string, theme: string, customSources?: WorkspaceCustomSource[]) => Promise<Dossier>;
  onSearchGuestProfile?: (name: string, reference: string) => Promise<any>;
}

export function PodcastWorkspaceProvider({
  children,
  initialState,
  onSave,
  onGenerateDossier,
  onSearchGuestProfile,
}: PodcastWorkspaceProviderProps) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Calculate stage completions
  const stageCompletions = useMemo<StageCompletionMap>(() => {
    return {
      setup: calculateSetupCompletion(state),
      research: calculateResearchCompletion(state),
      pauta: calculatePautaCompletion(state),
      production: calculateProductionCompletion(state),
    };
  }, [state]);

  // Create actions
  const actions = useMemo<WorkspaceActions>(() => ({
    // Navigation
    setStage: (stageId: PodcastStageId) => {
      dispatch({ type: 'SET_STAGE', payload: stageId });
    },

    // Setup actions
    updateSetup: (updates: Partial<SetupState>) => {
      dispatch({ type: 'UPDATE_SETUP', payload: updates });
    },

    setGuestType: (type: 'public_figure' | 'common_person') => {
      dispatch({ type: 'SET_GUEST_TYPE', payload: type });
    },

    searchGuestProfile: async (name: string, reference: string) => {
      if (!onSearchGuestProfile) return;

      dispatch({ type: 'UPDATE_SETUP', payload: { isSearching: true } });
      try {
        const results = await onSearchGuestProfile(name, reference);
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
      } catch (error) {
        log.error('Error searching guest profile:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Erro ao buscar perfil do convidado' });
      }
    },

    // Research actions
    generateDossier: async () => {
      if (!onGenerateDossier) return;

      dispatch({ type: 'START_DOSSIER_GENERATION' });
      try {
        const { guestName, theme } = state.setup;
        const { customSources } = state.research;

        const dossier = await onGenerateDossier(guestName, theme, customSources);
        dispatch({ type: 'FINISH_DOSSIER_GENERATION', payload: dossier });
      } catch (error) {
        log.error('Error generating dossier:', error);
        dispatch({ type: 'SET_RESEARCH_ERROR', payload: 'Erro ao gerar dossier' });
      }
    },

    regenerateDossier: async () => {
      if (!onGenerateDossier) return;

      dispatch({ type: 'START_DOSSIER_GENERATION' });
      try {
        const { guestName, theme } = state.setup;
        const { customSources } = state.research;

        const dossier = await onGenerateDossier(guestName, theme, customSources);
        dispatch({ type: 'FINISH_DOSSIER_GENERATION', payload: dossier });
      } catch (error) {
        log.error('Error regenerating dossier:', error);
        dispatch({ type: 'SET_RESEARCH_ERROR', payload: 'Erro ao regerar dossier' });
      }
    },

    deepResearch: async (depth: 'quick' | 'standard' | 'deep' = 'standard') => {
      dispatch({ type: 'START_DOSSIER_GENERATION' });
      try {
        const { guestName, guestReference, guestBio, theme } = state.setup;
        // Build guestContext from available fields — studio-deep-research requires non-empty string
        const guestContext = guestBio || guestReference || theme || guestName;
        const result = await deepResearchGuest(guestName, guestContext, depth);

        // Store deep research result and convert to dossier
        dispatch({
          type: 'UPDATE_RESEARCH',
          payload: { deepResearch: result },
        });

        const dossier: Dossier = {
          guestName,
          episodeTheme: state.setup.theme || result.suggestedThemes[0] || 'Carreira & Atualidades',
          biography: result.dossier.biography,
          controversies: result.dossier.controversies.map(c =>
            typeof c === 'string' ? c : c.title
          ),
          suggestedTopics: result.suggestedThemes,
          iceBreakers: result.dossier.iceBreakers,
          technicalSheet: result.dossier.technicalSheet,
        };
        dispatch({ type: 'FINISH_DOSSIER_GENERATION', payload: dossier });
      } catch (error: any) {
        log.error('Error in deep research:', error);
        dispatch({ type: 'SET_RESEARCH_ERROR', payload: error.message || 'Erro na pesquisa aprofundada' });
      }
    },

    addCustomSource: (source: WorkspaceCustomSource) => {
      dispatch({ type: 'ADD_CUSTOM_SOURCE', payload: source });
    },

    removeCustomSource: (sourceId: string) => {
      dispatch({ type: 'REMOVE_CUSTOM_SOURCE', payload: sourceId });
    },

    // Suggestion card actions (NotebookLM UX)
    analyzeGaps: async () => {
      const { dossier, customSources } = state.research;
      if (!dossier) return;

      dispatch({ type: 'SET_ANALYZING_GAPS', payload: true });
      try {
        const result = await analyzeGaps(
          dossier,
          state.setup.guestName,
          state.setup.theme,
          customSources.length > 0 ? customSources : undefined
        );
        if (result.success && result.data) {
          dispatch({ type: 'SET_SUGGESTION_CARDS', payload: result.data.suggestions });
        } else {
          dispatch({ type: 'SET_ANALYZING_GAPS', payload: false });
          log.error('Gap analysis returned no data');
        }
      } catch (error) {
        log.error('Error analyzing gaps:', error);
        dispatch({ type: 'SET_ANALYZING_GAPS', payload: false });
      }
    },

    updateCardStatus: (cardId: string, status: SuggestionCardStatus) => {
      dispatch({ type: 'UPDATE_CARD_STATUS', payload: { cardId, status } });
    },

    updateCardText: (cardId: string, fullText: string) => {
      dispatch({ type: 'UPDATE_CARD_TEXT', payload: { cardId, fullText } });
    },

    insertCardToDossier: (cardId: string) => {
      const card = state.research.suggestionCards.find(c => c.id === cardId);
      if (!card) return;
      dispatch({
        type: 'INSERT_CARD_TO_DOSSIER',
        payload: { cardId, targetSection: card.targetSection, text: card.fullText },
      });
    },

    toggleChat: (open?: boolean) => {
      dispatch({ type: 'TOGGLE_CHAT', payload: open });
    },

    indexCustomSources: async () => {
      const { customSources } = state.research;
      if (customSources.length === 0) return;

      try {
        const sources = customSources.map(s => ({
          content: s.content,
          type: (s.type === 'url' ? 'url' : 'text') as 'text' | 'url',
          label: s.label || s.content.substring(0, 50) || 'Source',
        }));
        const result = await indexSources({ sources });
        if (result.success && result.data) {
          dispatch({ type: 'SET_FILE_SEARCH_STORE', payload: result.data.storeId });
        }
      } catch (error) {
        log.error('Error indexing custom sources:', error);
      }
    },

    // Pauta actions
    addTopic: async (topic: Topic) => {
      // Se o topic já tem um ID válido (UUID), usar ele
      // Caso contrário, gerar um UUID (mas PautaStage já deve enviar com ID)
      const newTopic: Topic = {
        ...topic,
        id: topic.id || crypto.randomUUID(),  // ✅ FIX: Use UUID instead of topic_${Date.now()}
      };
      dispatch({ type: 'ADD_TOPIC', payload: newTopic });
    },

    updateTopic: async (topicId: string, updates: Partial<Topic>) => {
      dispatch({ type: 'UPDATE_TOPIC', payload: { id: topicId, updates } });
    },

    removeTopic: async (topicId: string) => {
      dispatch({ type: 'REMOVE_TOPIC', payload: topicId });
    },

    reorderTopics: async (topics: Topic[]) => {
      dispatch({ type: 'REORDER_TOPICS', payload: topics });
    },

    generatePauta: async (config: any) => {
      // Will be implemented with AI service
      log.debug('Generate pauta with config:', config);
    },

    loadSavedPautas: async () => {
      // Will be implemented with database service
      log.debug('Load saved pautas');
    },

    // Production actions
    startRecording: () => {
      dispatch({ type: 'START_RECORDING' });
    },

    pauseRecording: () => {
      dispatch({ type: 'PAUSE_RECORDING' });
    },

    resumeRecording: () => {
      dispatch({ type: 'RESUME_RECORDING' });
    },

    stopRecording: () => {
      dispatch({ type: 'STOP_RECORDING' });
    },

    setCurrentTopic: (topicId: string | null) => {
      dispatch({ type: 'SET_CURRENT_TOPIC', payload: topicId });
    },

    updateDuration: (seconds: number) => {
      dispatch({ type: 'UPDATE_DURATION', payload: seconds });
    },

    setCategories: (categories: TopicCategory[]) => {
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    },

    // Global actions
    save: async () => {
      if (onSave) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          await onSave(state);
          dispatch({ type: 'MARK_SAVED' });
        } catch (error) {
          log.error('Error saving workspace:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Erro ao salvar' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    },

    hydrate: (data: Partial<PodcastWorkspaceState>) => {
      dispatch({ type: 'HYDRATE', payload: data });
    },
  }), [state, onSave, onGenerateDossier, onSearchGuestProfile]);

  const value = useMemo(
    () => ({ state, dispatch, actions, stageCompletions }),
    [state, actions, stageCompletions]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export default WorkspaceContext;
