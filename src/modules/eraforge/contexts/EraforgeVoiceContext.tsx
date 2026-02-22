/**
 * EraforgeVoiceContext - Voice interaction state for EraForge
 *
 * Manages voice input/output state and wires to EraforgeVoiceService
 * for real TTS (ElevenLabs) and STT (Web Speech API) functionality.
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useEraforgeVoiceHook } from '../hooks/useEraforgeVoice';
import type { AdvisorId } from '../types/eraforge.types';

// ============================================
// TYPES
// ============================================

export interface EraforgeVoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

export interface EraforgeVoiceActions {
  speak: (text: string, advisorId?: AdvisorId) => Promise<void>;
  listen: () => Promise<string | null>;
  stopSpeaking: () => void;
  clearError: () => void;
  /** @deprecated Use speak/listen directly */
  startListening: () => void;
  /** @deprecated Use speak/listen directly */
  stopListening: (transcript?: string) => void;
  /** @deprecated Use speak/listen directly */
  startSpeaking: () => void;
  /** @deprecated Use speak/listen directly */
  toggleVoice: () => void;
  /** @deprecated Use speak/listen directly */
  setTranscript: (transcript: string) => void;
  /** @deprecated Use clearError */
  setError: (error: string | null) => void;
}

export interface EraforgeVoiceContextValue {
  state: EraforgeVoiceState;
  actions: EraforgeVoiceActions;
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
  const voice = useEraforgeVoiceHook();

  // Local state for voiceEnabled toggle and transcript
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [transcript, setTranscript] = React.useState('');

  const state = useMemo<EraforgeVoiceState>(() => ({
    isListening: voice.isListening,
    isSpeaking: voice.isSpeaking,
    voiceEnabled,
    voiceSupported: voice.voiceSupported,
    transcript,
    interimTranscript: voice.interimTranscript,
    error: voice.error,
  }), [
    voice.isListening,
    voice.isSpeaking,
    voice.interimTranscript,
    voice.voiceSupported,
    voice.error,
    voiceEnabled,
    transcript,
  ]);

  const wrappedListen = useCallback(async (): Promise<string | null> => {
    const result = await voice.listen();
    if (result) {
      setTranscript(result);
    }
    return result;
  }, [voice.listen]);

  const actions = useMemo<EraforgeVoiceActions>(() => ({
    speak: voice.speak,
    listen: wrappedListen,
    stopSpeaking: voice.stopSpeaking,
    clearError: voice.clearError,
    // Backward-compatible shims
    startListening: () => { wrappedListen(); },
    stopListening: (t?: string) => {
      if (t) setTranscript(t);
    },
    startSpeaking: () => { /* managed by speak() */ },
    toggleVoice: () => setVoiceEnabled(prev => !prev),
    setTranscript: (t: string) => setTranscript(t),
    setError: (e: string | null) => { /* managed by service */ void e; },
  }), [voice.speak, wrappedListen, voice.stopSpeaking, voice.clearError]);

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
