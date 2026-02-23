/**
 * useVoiceRecorder — browser speech-to-text hook
 *
 * Uses the Web Speech API (SpeechRecognition) for real-time transcription.
 * Falls back gracefully when the API is not available (e.g., Firefox).
 */

import { useState, useCallback, useRef } from 'react';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useVoiceRecorder');

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  transcript: string;
  duration: number;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  clearTranscript: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionInstance)
    | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const Ctor = getSpeechRecognitionConstructor();
  const isSupported = Ctor !== null;

  const startRecording = useCallback(() => {
    if (!Ctor) {
      setError('Reconhecimento de voz nao suportado neste navegador');
      return;
    }

    setError(null);
    setTranscript('');
    setDuration(0);

    const recognition = new Ctor();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (event: { error: string }) => {
      log.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permissao de microfone negada');
      } else if (event.error === 'no-speech') {
        // Not a critical error — user just didn't speak
      } else {
        setError('Erro no reconhecimento de voz');
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognitionRef.current = recognition;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
      // Max 120 seconds
      if (elapsed >= 120) {
        recognition.stop();
      }
    }, 1000);

    try {
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      log.error('Failed to start recognition:', err);
      setError('Erro ao iniciar gravacao');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [Ctor]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setDuration(0);
    setError(null);
  }, []);

  return {
    isRecording,
    isSupported,
    transcript,
    duration,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
