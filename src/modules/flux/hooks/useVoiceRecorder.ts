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
  const retryCountRef = useRef(0);
  const maxRetries = 2;

  const Ctor = getSpeechRecognitionConstructor();
  const isSupported = Ctor !== null;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const createRecognition = useCallback((onRetry: () => void) => {
    if (!Ctor) return null;

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
      // Successful result — reset retry counter
      retryCountRef.current = 0;
    };

    recognition.onerror = (event: { error: string }) => {
      log.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed') {
        setError('Permissao de microfone negada. Verifique as configuracoes do navegador.');
        setIsRecording(false);
        stopTimer();
        return;
      }

      if (event.error === 'no-speech') {
        // Not critical — user just didn't speak yet
        return;
      }

      // Network errors: auto-retry before showing error
      if (event.error === 'network' && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        log.warn(`Network error, retrying (${retryCountRef.current}/${maxRetries})...`);
        setTimeout(() => onRetry(), 500);
        return;
      }

      // Final error after retries exhausted or non-network error
      const errorMessages: Record<string, string> = {
        network: 'Erro de conexao com o servico de voz. Use o campo de texto como alternativa.',
        'audio-capture': 'Microfone nao detectado. Verifique se esta conectado.',
        aborted: 'Gravacao cancelada.',
      };
      setError(errorMessages[event.error] || 'Erro no reconhecimento de voz. Use o campo de texto.');
      setIsRecording(false);
      stopTimer();
    };

    recognition.onend = () => {
      // Only stop if we're not in a retry cycle
      if (retryCountRef.current === 0 || retryCountRef.current >= maxRetries) {
        setIsRecording(false);
        stopTimer();
      }
    };

    return recognition;
  }, [Ctor, stopTimer]);

  const startRecording = useCallback(() => {
    if (!Ctor) {
      setError('Reconhecimento de voz nao suportado neste navegador');
      return;
    }

    setError(null);
    setTranscript('');
    setDuration(0);
    retryCountRef.current = 0;

    const tryStart = () => {
      const recognition = createRecognition(tryStart);
      if (!recognition) return;

      recognitionRef.current = recognition;

      try {
        recognition.start();
        if (retryCountRef.current === 0) {
          // Only set timer on first start
          startTimeRef.current = Date.now();
          timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setDuration(elapsed);
            if (elapsed >= 120) {
              recognition.stop();
            }
          }, 1000);
        }
        setIsRecording(true);
      } catch (err) {
        log.error('Failed to start recognition:', err);
        setError('Erro ao iniciar gravacao. Tente novamente.');
        stopTimer();
        setIsRecording(false);
      }
    };

    tryStart();
  }, [Ctor, createRecognition, stopTimer]);

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
