/**
 * EraforgeVoiceContext - Voice interaction state for EraForge
 *
 * Manages voice input/output state for the child-friendly game interface.
 * Placeholder for ElevenLabs TTS integration.
 */

import React, { createContext, useContext, useReducer, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface EraforgeVoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  transcript: string;
  error: string | null;
}

export type EraforgeVoiceAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING'; payload?: string }
  | { type: 'START_SPEAKING' }
  | { type: 'STOP_SPEAKING' }
  | { type: 'TOGGLE_VOICE' }
  | { type: 'SET_TRANSCRIPT'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null };

export interface EraforgeVoiceActions {
  startListening: () => void;
  stopListening: (transcript?: string) => void;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  toggleVoice: () => void;
  setTranscript: (transcript: string) => void;
  setError: (error: string | null) => void;
}

export interface EraforgeVoiceContextValue {
  state: EraforgeVoiceState;
  actions: EraforgeVoiceActions;
}

// ============================================
// INITIAL STATE
// ============================================

const INITIAL_STATE: EraforgeVoiceState = {
  isListening: false,
  isSpeaking: false,
  voiceEnabled: false,
  transcript: '',
  error: null,
};

// ============================================
// REDUCER
// ============================================

function eraforgeVoiceReducer(state: EraforgeVoiceState, action: EraforgeVoiceAction): EraforgeVoiceState {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, isListening: true, transcript: '', error: null };

    case 'STOP_LISTENING':
      return {
        ...state,
        isListening: false,
        transcript: action.payload ?? state.transcript,
      };

    case 'START_SPEAKING':
      return { ...state, isSpeaking: true };

    case 'STOP_SPEAKING':
      return { ...state, isSpeaking: false };

    case 'TOGGLE_VOICE':
      return { ...state, voiceEnabled: !state.voiceEnabled };

    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isListening: false, isSpeaking: false };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

const EraforgeVoiceContext = createContext<EraforgeVoiceContextValue | null>(null);

// ============================================
// HOOKS
// ============================================

export function useEraforgeVoice(): EraforgeVoiceContextValue {
  const context = useContext(EraforgeVoiceContext);
  if (!context) {
    throw new Error('useEraforgeVoice must be used within an EraforgeVoiceProvider');
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

interface EraforgeVoiceProviderProps {
  children: React.ReactNode;
}

export function EraforgeVoiceProvider({ children }: EraforgeVoiceProviderProps) {
  const [state, dispatch] = useReducer(eraforgeVoiceReducer, INITIAL_STATE);

  const actions = useMemo<EraforgeVoiceActions>(() => ({
    startListening: () => dispatch({ type: 'START_LISTENING' }),
    stopListening: (transcript?: string) =>
      dispatch({ type: 'STOP_LISTENING', payload: transcript }),
    startSpeaking: () => dispatch({ type: 'START_SPEAKING' }),
    stopSpeaking: () => dispatch({ type: 'STOP_SPEAKING' }),
    toggleVoice: () => dispatch({ type: 'TOGGLE_VOICE' }),
    setTranscript: (transcript: string) =>
      dispatch({ type: 'SET_TRANSCRIPT', payload: transcript }),
    setError: (error: string | null) =>
      dispatch({ type: 'SET_ERROR', payload: error }),
  }), []);

  const value = useMemo<EraforgeVoiceContextValue>(
    () => ({ state, actions }),
    [state, actions]
  );

  return (
    <EraforgeVoiceContext.Provider value={value}>
      {children}
    </EraforgeVoiceContext.Provider>
  );
}

export default EraforgeVoiceContext;
