/**
 * EraforgeGameContext - FSM State Management for EraForge module
 *
 * Manages game modes, current world/child selection, and turn state.
 * Uses React Context + useReducer following Studio/Flux FSM pattern.
 */

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import type {
  World,
  ChildProfile,
  Turn,
  WorldMember,
} from '../types/eraforge.types';

// ============================================
// TYPES
// ============================================

export type EraforgeMode = 'HOME' | 'PLAYING' | 'SIMULATION' | 'PARENT_DASHBOARD';

export interface EraforgeGameState {
  mode: EraforgeMode;
  currentWorld: World | null;
  currentChild: ChildProfile | null;
  currentMember: WorldMember | null;
  currentScenario: Turn | null;
  turnsRemaining: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export type EraforgeGameAction =
  | { type: 'GO_HOME' }
  | { type: 'SET_WORLD'; payload: World }
  | { type: 'SET_CHILD'; payload: { child: ChildProfile; member: WorldMember } }
  | { type: 'START_GAME'; payload: { turnsRemaining: number } }
  | { type: 'END_GAME' }
  | { type: 'NEXT_TURN'; payload: Turn }
  | { type: 'DECREMENT_TURN' }
  | { type: 'GO_SIMULATION' }
  | { type: 'GO_PARENT_DASHBOARD' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export interface EraforgeGameActions {
  goHome: () => void;
  setWorld: (world: World) => void;
  setChild: (child: ChildProfile, member: WorldMember) => void;
  startGame: (turnsRemaining: number) => void;
  endGame: () => void;
  nextTurn: (turn: Turn) => void;
  decrementTurn: () => void;
  goSimulation: () => void;
  goParentDashboard: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface EraforgeGameContextValue {
  state: EraforgeGameState;
  actions: EraforgeGameActions;
}

// ============================================
// INITIAL STATE
// ============================================

const INITIAL_STATE: EraforgeGameState = {
  mode: 'HOME',
  currentWorld: null,
  currentChild: null,
  currentMember: null,
  currentScenario: null,
  turnsRemaining: 0,
  isPlaying: false,
  isLoading: false,
  error: null,
};

// ============================================
// REDUCER
// ============================================

function eraforgeGameReducer(state: EraforgeGameState, action: EraforgeGameAction): EraforgeGameState {
  switch (action.type) {
    case 'GO_HOME':
      return {
        ...INITIAL_STATE,
      };

    case 'SET_WORLD':
      return {
        ...state,
        currentWorld: action.payload,
        error: null,
      };

    case 'SET_CHILD':
      return {
        ...state,
        currentChild: action.payload.child,
        currentMember: action.payload.member,
        error: null,
      };

    case 'START_GAME':
      return {
        ...state,
        mode: 'PLAYING',
        turnsRemaining: action.payload.turnsRemaining,
        isPlaying: true,
        error: null,
      };

    case 'END_GAME':
      return { ...INITIAL_STATE };

    case 'NEXT_TURN':
      return {
        ...state,
        currentScenario: action.payload,
      };

    case 'DECREMENT_TURN':
      return {
        ...state,
        turnsRemaining: Math.max(0, state.turnsRemaining - 1),
      };

    case 'GO_SIMULATION':
      return {
        ...state,
        mode: 'SIMULATION',
        isPlaying: false,
      };

    case 'GO_PARENT_DASHBOARD':
      return {
        ...state,
        mode: 'PARENT_DASHBOARD',
        isPlaying: false,
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

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

const EraforgeGameContext = createContext<EraforgeGameContextValue | null>(null);

// ============================================
// HOOKS
// ============================================

export function useEraforgeGame(): EraforgeGameContextValue {
  const context = useContext(EraforgeGameContext);
  if (!context) {
    throw new Error('useEraforgeGame must be used within an EraforgeGameProvider');
  }
  return context;
}

export function useEraforgeMode(): EraforgeMode {
  const { state } = useEraforgeGame();
  return state.mode;
}

// ============================================
// PROVIDER
// ============================================

interface EraforgeGameProviderProps {
  children: React.ReactNode;
}

export function EraforgeGameProvider({ children }: EraforgeGameProviderProps) {
  const [state, dispatch] = useReducer(eraforgeGameReducer, INITIAL_STATE);

  const actions = useMemo<EraforgeGameActions>(() => ({
    goHome: () => dispatch({ type: 'GO_HOME' }),
    setWorld: (world: World) => dispatch({ type: 'SET_WORLD', payload: world }),
    setChild: (child: ChildProfile, member: WorldMember) =>
      dispatch({ type: 'SET_CHILD', payload: { child, member } }),
    startGame: (turnsRemaining: number) =>
      dispatch({ type: 'START_GAME', payload: { turnsRemaining } }),
    endGame: () => dispatch({ type: 'END_GAME' }),
    nextTurn: (turn: Turn) => dispatch({ type: 'NEXT_TURN', payload: turn }),
    decrementTurn: () => dispatch({ type: 'DECREMENT_TURN' }),
    goSimulation: () => dispatch({ type: 'GO_SIMULATION' }),
    goParentDashboard: () => dispatch({ type: 'GO_PARENT_DASHBOARD' }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
  }), []);

  const value = useMemo<EraforgeGameContextValue>(
    () => ({ state, actions }),
    [state, actions]
  );

  return (
    <EraforgeGameContext.Provider value={value}>
      {children}
    </EraforgeGameContext.Provider>
  );
}

export default EraforgeGameContext;
