/**
 * StudioContext - Global state management for Studio module
 * Uses React Context + useReducer for centralized state management
 * Pattern based on PodcastWorkspaceContext with Finite State Machine (FSM)
 *
 * CRITICAL: This is the ONLY place where mode transitions should happen
 * NEVER use useEffect for navigation logic
 */

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import type {
  StudioState,
  StudioAction,
  StudioActions,
  StudioContextValue,
  StudioProject,
} from '../types/studio';

// Import initial state from types
import { INITIAL_STUDIO_STATE as INITIAL_STATE } from '../types/studio';

// ============================================
// REDUCER
// ============================================

/**
 * Studio state reducer - handles ALL state transitions
 * This is the ONLY way to change studio state
 */
function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    // Loading transitions
    case 'START_LOADING':
      return {
        ...state,
        mode: 'LOADING',
        isLoading: true,
        error: null,
      };

    case 'FINISH_LOADING':
      return {
        ...state,
        mode: action.payload.project ? 'WORKSPACE' : 'LIBRARY',
        currentProject: action.payload.project || null,
        isLoading: false,
        error: null,
      };

    // Mode transitions - EXPLICIT and CONTROLLED
    case 'GO_TO_LIBRARY':
      return {
        ...state,
        mode: 'LIBRARY',
        currentProject: null,
        currentShowId: null,
        currentShowTitle: null,
        error: null,
      };

    case 'GO_TO_SHOW_PAGE':
      return {
        ...state,
        mode: 'SHOW_PAGE',
        currentProject: null,
        currentShowId: action.payload.showId,
        currentShowTitle: action.payload.showTitle,
        error: null,
      };

    case 'GO_TO_WIZARD':
      return {
        ...state,
        mode: 'WIZARD',
        wizardProjectType: action.payload?.projectType || state.wizardProjectType || 'podcast',
        error: null,
      };

    case 'GO_TO_WORKSPACE':
      return {
        ...state,
        mode: 'WORKSPACE',
        currentProject: action.payload,
        currentShowId: action.payload.showId || null,
        currentShowTitle: action.payload.showTitle || null,
        error: null,
      };

    // Show selection (for podcasts)
    case 'SELECT_SHOW':
      return {
        ...state,
        currentShowId: action.payload.showId,
        currentShowTitle: action.payload.showTitle,
      };

    case 'CLEAR_SHOW':
      return {
        ...state,
        currentShowId: null,
        currentShowTitle: null,
      };

    // User/Auth
    case 'SET_USER_ID':
      return {
        ...state,
        userId: action.payload,
      };

    // Error handling
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

const StudioContext = createContext<StudioContextValue | null>(null);

// ============================================
// HOOK
// ============================================

/**
 * Hook to access StudioContext
 * Must be used within a StudioProvider
 */
export function useStudio(): StudioContextValue {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

interface StudioProviderProps {
  children: React.ReactNode;
  initialState?: StudioState;
}

/**
 * StudioProvider - Wraps the app with studio state
 * Provides state and actions to all children
 */
export function StudioProvider({ children, initialState }: StudioProviderProps) {
  const [state, dispatch] = useReducer(
    studioReducer,
    initialState || INITIAL_STATE
  );

  // Create action creators - memoized to prevent unnecessary re-renders
  const actions = useMemo<StudioActions>(() => ({
    goToLibrary: () => {
      dispatch({ type: 'GO_TO_LIBRARY' });
    },

    goToShowPage: (showId: string, showTitle: string) => {
      dispatch({ type: 'GO_TO_SHOW_PAGE', payload: { showId, showTitle } });
    },

    goToWizard: (projectType) => {
      dispatch({ type: 'GO_TO_WIZARD', payload: projectType ? { projectType } : undefined });
    },

    goToWorkspace: (project: StudioProject) => {
      dispatch({ type: 'GO_TO_WORKSPACE', payload: project });
    },

    selectShow: (showId: string, showTitle: string) => {
      dispatch({ type: 'SELECT_SHOW', payload: { showId, showTitle } });
    },

    clearShow: () => {
      dispatch({ type: 'CLEAR_SHOW' });
    },

    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },

    clearError: () => {
      dispatch({ type: 'CLEAR_ERROR' });
    },

    setUserId: (userId: string | null) => {
      dispatch({ type: 'SET_USER_ID', payload: userId });
    },
  }), []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<StudioContextValue>(
    () => ({ state, actions }),
    [state, actions]
  );

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}

export default StudioContext;
