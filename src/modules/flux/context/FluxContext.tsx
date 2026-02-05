/**
 * Flux Context - FSM State Management
 *
 * Global state management for the Flux module using React Context.
 * Implements Finite State Machine for navigation and view control.
 *
 * Pattern follows Studio module's StudioContext architecture.
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import type {
  FluxState,
  FluxAction,
  FluxContextValue,
  FluxActions,
} from '../types';
import { INITIAL_FLUX_STATE } from '../types';

// ============================================
// CONTEXT CREATION
// ============================================

const FluxContext = createContext<FluxContextValue | undefined>(undefined);

// ============================================
// REDUCER
// ============================================

/**
 * Reducer for Flux state transitions (FSM)
 */
function fluxReducer(state: FluxState, action: FluxAction): FluxState {
  switch (action.type) {
    case 'VIEW_DASHBOARD':
      return {
        ...state,
        mode: 'viewing_dashboard',
        selectedAthleteId: null,
        selectedBlockId: null,
        canvasEditMode: false,
      };

    case 'VIEW_ATHLETE_DETAIL':
      return {
        ...state,
        mode: 'viewing_athlete_detail',
        selectedAthleteId: action.payload.athleteId,
        selectedBlockId: null,
        canvasEditMode: false,
      };

    case 'EDIT_CANVAS':
      return {
        ...state,
        mode: 'editing_canvas',
        selectedAthleteId: action.payload.athleteId,
        selectedBlockId: action.payload.blockId,
        canvasEditMode: true,
      };

    case 'MANAGE_ALERTS':
      return {
        ...state,
        mode: 'managing_alerts',
        alertFilters: action.payload?.filters || state.alertFilters,
      };

    case 'UPDATE_ALERT_FILTERS':
      return {
        ...state,
        alertFilters: {
          ...state.alertFilters,
          ...action.payload,
        },
      };

    case 'TOGGLE_CANVAS_EDIT_MODE':
      return {
        ...state,
        canvasEditMode: !state.canvasEditMode,
      };

    default:
      return state;
  }
}

// ============================================
// PROVIDER COMPONENT
// ============================================

interface FluxProviderProps {
  children: React.ReactNode;
  initialState?: Partial<FluxState>;
}

/**
 * Flux Context Provider
 *
 * Wrap your Flux module routes with this provider.
 *
 * @example
 * ```tsx
 * <FluxProvider>
 *   <FluxDashboard />
 * </FluxProvider>
 * ```
 */
export function FluxProvider({ children, initialState }: FluxProviderProps) {
  const [state, dispatch] = useReducer(
    fluxReducer,
    initialState ? { ...INITIAL_FLUX_STATE, ...initialState } : INITIAL_FLUX_STATE
  );

  // ============================================
  // ACTION CREATORS (Memoized)
  // ============================================

  const actions: FluxActions = useMemo(
    () => ({
      viewDashboard: () => {
        dispatch({ type: 'VIEW_DASHBOARD' });
      },

      viewAthleteDetail: (athleteId: string) => {
        dispatch({ type: 'VIEW_ATHLETE_DETAIL', payload: { athleteId } });
      },

      editCanvas: (blockId: string, athleteId: string) => {
        dispatch({ type: 'EDIT_CANVAS', payload: { blockId, athleteId } });
      },

      manageAlerts: (filters?: FluxState['alertFilters']) => {
        dispatch({ type: 'MANAGE_ALERTS', payload: { filters } });
      },

      updateAlertFilters: (filters: FluxState['alertFilters']) => {
        dispatch({ type: 'UPDATE_ALERT_FILTERS', payload: filters });
      },

      toggleCanvasEditMode: () => {
        dispatch({ type: 'TOGGLE_CANVAS_EDIT_MODE' });
      },
    }),
    []
  );

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<FluxContextValue>(
    () => ({
      state,
      dispatch,
      actions,
    }),
    [state, actions]
  );

  return <FluxContext.Provider value={value}>{children}</FluxContext.Provider>;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to access Flux context
 *
 * @throws Error if used outside FluxProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, actions } = useFlux();
 *
 *   return (
 *     <button onClick={() => actions.viewDashboard()}>
 *       Back to Dashboard
 *     </button>
 *   );
 * }
 * ```
 */
export function useFlux(): FluxContextValue {
  const context = useContext(FluxContext);

  if (!context) {
    throw new Error('useFlux must be used within a FluxProvider');
  }

  return context;
}

// ============================================
// SELECTOR HOOKS (Convenience)
// ============================================

/**
 * Hook to get current mode
 */
export function useFluxMode() {
  const { state } = useFlux();
  return state.mode;
}

/**
 * Hook to get selected athlete ID
 */
export function useSelectedAthleteId() {
  const { state } = useFlux();
  return state.selectedAthleteId;
}

/**
 * Hook to get selected block ID
 */
export function useSelectedBlockId() {
  const { state } = useFlux();
  return state.selectedBlockId;
}

/**
 * Hook to get alert filters
 */
export function useAlertFilters() {
  const { state } = useFlux();
  return state.alertFilters;
}

/**
 * Hook to check if in canvas edit mode
 */
export function useIsCanvasEditMode() {
  const { state } = useFlux();
  return state.canvasEditMode;
}
