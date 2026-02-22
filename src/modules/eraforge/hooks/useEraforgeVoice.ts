/**
 * useEraforgeVoice - Voice interaction hook for EraForge
 *
 * Wraps EraforgeVoiceService with React state management.
 * Provides speak(), listen(), and voice capability detection.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { EraforgeVoiceService } from '../services/eraforgeVoiceService';
import type { AdvisorId } from '../types/eraforge.types';

export interface UseEraforgeVoiceResult {
  /** Speak text aloud via TTS */
  speak: (text: string, advisorId?: AdvisorId) => Promise<void>;
  /** Listen for speech input via STT */
  listen: () => Promise<string | null>;
  /** Stop any current TTS playback */
  stopSpeaking: () => void;
  /** Whether TTS is currently playing */
  isSpeaking: boolean;
  /** Whether STT is currently listening */
  isListening: boolean;
  /** Interim transcript while listening */
  interimTranscript: string;
  /** Whether voice features are supported */
  voiceSupported: boolean;
  /** Last error message */
  error: string | null;
  /** Clear the error state */
  clearError: () => void;
}

export function useEraforgeVoiceHook(): UseEraforgeVoiceResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [voiceSupported] = useState(() => EraforgeVoiceService.isVoiceSupported());

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      EraforgeVoiceService.stopSpeaking();
    };
  }, []);

  const speak = useCallback(async (text: string, advisorId?: AdvisorId) => {
    if (!mountedRef.current) return;
    setError(null);

    const { error: speakError } = await EraforgeVoiceService.speak(
      text,
      advisorId,
      () => { if (mountedRef.current) setIsSpeaking(true); },
      () => { if (mountedRef.current) setIsSpeaking(false); },
    );

    if (speakError && mountedRef.current) {
      setError(speakError);
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    EraforgeVoiceService.stopSpeaking();
    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, []);

  const listen = useCallback(async (): Promise<string | null> => {
    if (!mountedRef.current) return null;
    setError(null);
    setInterimTranscript('');

    const { data, error: listenError } = await EraforgeVoiceService.listen(
      (interim) => { if (mountedRef.current) setInterimTranscript(interim); },
      () => { if (mountedRef.current) setIsListening(true); },
      () => {
        if (mountedRef.current) {
          setIsListening(false);
          setInterimTranscript('');
        }
      },
    );

    if (listenError && mountedRef.current) {
      setError(listenError);
      return null;
    }

    return data?.transcript ?? null;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    speak,
    listen,
    stopSpeaking,
    isSpeaking,
    isListening,
    interimTranscript,
    voiceSupported,
    error,
    clearError,
  };
}

// Re-export context hook and types for backward compatibility
export { useEraforgeVoice } from '../contexts/EraforgeVoiceContext';
export type {
  EraforgeVoiceState,
  EraforgeVoiceActions,
  EraforgeVoiceContextValue,
} from '../contexts/EraforgeVoiceContext';
