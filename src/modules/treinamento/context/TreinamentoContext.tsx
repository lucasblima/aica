/**
 * SwimFlux Context - FSM State Management
 *
 * Global state management for the SwimFlux module using React Context.
 * Implements Finite State Machine for navigation and view control.
 *
 * Pattern follows Studio module's StudioContext architecture.
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import type {
  SwimFluxState,
  SwimFluxAction,
  SwimFluxContextValue,
  SwimFluxActions,
} from '../types';
import { INITIAL_SWIMFLUX_STATE } from '../types';

// ============================================
// CONTEXT CREATION
// ============================================

const SwimFluxContext = createContext<SwimFluxContextValue | undefined>(undefined);

// ============================================
// REDUCER
// ============================================

/**
 * Reducer for SwimFlux state transitions (FSM)
 */
function swimFluxReducer(state: SwimFluxState, action: SwimFluxAction): SwimFluxState {
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

interface SwimFluxProviderProps {
  children: React.ReactNode;
  initialState?: Partial<SwimFluxState>;
}

/**
 * SwimFlux Context Provider
 *
 * Wrap your SwimFlux module routes with this provider.
 *
 * @example
 * ```tsx
 * <SwimFluxProvider>
 *   <SwimFluxDashboard />
 * </SwimFluxProvider>
 * ```
 */
export function SwimFluxProvider({ children, initialState }: SwimFluxProviderProps) {
  const [state, dispatch] = useReducer(
    swimFluxReducer,
    initialState ? { ...INITIAL_SWIMFLUX_STATE, ...initialState } : INITIAL_SWIMFLUX_STATE
  );

  // ============================================
  // ACTION CREATORS (Memoized)
  // ============================================

  const actions: SwimFluxActions = useMemo(
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

      manageAlerts: (filters?: SwimFluxState['alertFilters']) => {
        dispatch({ type: 'MANAGE_ALERTS', payload: { filters } });
      },

      updateAlertFilters: (filters: SwimFluxState['alertFilters']) => {
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

  const value = useMemo<SwimFluxContextValue>(
    () => ({
      state,
      dispatch,
      actions,
    }),
    [state, actions]
  );

  return <SwimFluxContext.Provider value={value}>{children}</SwimFluxContext.Provider>;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to access SwimFlux context
 *
 * @throws Error if used outside SwimFluxProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, actions } = useSwimFlux();
 *
 *   return (
 *     <button onClick={() => actions.viewDashboard()}>
 *       Back to Dashboard
 *     </button>
 *   );
 * }
 * ```
 */
export function useSwimFlux(): SwimFluxContextValue {
  const context = useContext(SwimFluxContext);

  if (!context) {
    throw new Error('useSwimFlux must be used within a SwimFluxProvider');
  }

  return context;
}

// ============================================
// SELECTOR HOOKS (Convenience)
// ============================================

/**
 * Hook to get current mode
 */
export function useSwimFluxMode() {
  const { state } = useSwimFlux();
  return state.mode;
}

/**
 * Hook to get selected athlete ID
 */
export function useSelectedAthleteId() {
  const { state } = useSwimFlux();
  return state.selectedAthleteId;
}

/**
 * Hook to get selected block ID
 */
export function useSelectedBlockId() {
  const { state } = useSwimFlux();
  return state.selectedBlockId;
}

/**
 * Hook to get alert filters
 */
export function useAlertFilters() {
  const { state } = useSwimFlux();
  return state.alertFilters;
}

/**
 * Hook to check if in canvas edit mode
 */
export function useIsCanvasEditMode() {
  const { state } = useSwimFlux();
  return state.canvasEditMode;
}
