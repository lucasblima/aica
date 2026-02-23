/**
 * useVoiceRecorder — records audio via MediaRecorder, transcribes via Gemini Edge Function
 *
 * Primary: MediaRecorder (local, works everywhere) → transcribe-audio Edge Function (Gemini)
 * This avoids Web Speech API's dependency on Google's servers which fails with "network" errors.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useVoiceRecorder');

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  isSupported: boolean;
  transcript: string;
  duration: number;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  clearTranscript: () => void;
}

function isMediaRecorderSupported(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

function getPreferredMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
  return 'audio/webm';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the data:audio/...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const isSupported = isMediaRecorderSupported();

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const base64 = await blobToBase64(audioBlob);
      // Use the simple mime type for Gemini (strip codecs)
      const simpleMime = mimeType.split(';')[0];

      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64, mimeType: simpleMime },
      });

      if (fnError) {
        log.error('Edge Function error:', fnError);
        setError('Erro na transcricao. Suas observacoes foram gravadas — use o campo de texto.');
        return;
      }

      if (data?.success && data.transcript) {
        setTranscript(data.transcript);
      } else if (data?.success && !data.transcript) {
        setError('Audio nao reconhecido. Tente falar mais perto do microfone.');
      } else {
        log.error('Transcription failed:', data?.error);
        setError('Erro na transcricao. Use o campo de texto como alternativa.');
      }
    } catch (err) {
      log.error('Transcription error:', err);
      setError('Erro ao enviar audio. Verifique sua conexao.');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Gravacao de audio nao suportada neste navegador');
      return;
    }

    setError(null);
    setTranscript('');
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopTimer();
        stopStream();

        const chunks = chunksRef.current;
        if (chunks.length === 0) {
          setError('Nenhum audio capturado. Tente novamente.');
          return;
        }

        const audioBlob = new Blob(chunks, { type: mimeType });
        log.info(`Audio recorded: ${(audioBlob.size / 1024).toFixed(1)}KB, ${mimeType}`);

        // Only transcribe if audio is substantial (>1KB = ~0.5s of audio)
        if (audioBlob.size < 1024) {
          setError('Audio muito curto. Fale por mais tempo.');
          return;
        }

        await transcribeAudio(audioBlob, mimeType);
      };

      recorder.onerror = () => {
        log.error('MediaRecorder error');
        setError('Erro na gravacao. Tente novamente.');
        setIsRecording(false);
        stopTimer();
        stopStream();
      };

      // Start recording with 1s timeslices
      recorder.start(1000);
      setIsRecording(true);

      // Timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= 120) {
          recorder.stop();
          setIsRecording(false);
        }
      }, 1000);
    } catch (err) {
      log.error('Failed to access microphone:', err);
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setError('Permissao de microfone negada. Verifique as configuracoes do navegador.');
      } else if (e.name === 'NotFoundError') {
        setError('Microfone nao encontrado. Verifique se esta conectado.');
      } else {
        setError('Erro ao acessar microfone. Verifique as permissoes.');
      }
    }
  }, [isSupported, stopTimer, stopStream, transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
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
    isTranscribing,
    isSupported,
    transcript,
    duration,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
