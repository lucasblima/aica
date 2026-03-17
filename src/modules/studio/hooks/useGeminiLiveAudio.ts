/**
 * useGeminiLiveAudio - React hook for Gemini Live real-time áudio sessions
 *
 * Wraps GeminiLiveAudioService for use in React components with proper
 * state management and lifecycle handling.
 *
 * @module studio/hooks/useGeminiLiveAudio
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getGeminiLiveAudioService,
  type AudioConnectionStatus,
  type AudioSessionConfig,
  type AudioMessage,
} from '@/modules/studio/services/geminiLiveAudioService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useGeminiLiveAudio');

export interface UseGeminiLiveAudioOptions {
  /** System instruction for the AI conversation */
  systemInstruction?: string;
  /** Voice name for Gemini output (e.g. "Kore", "Puck", "Charon") */
  voiceName?: string;
  /** Enable text transcriptions of áudio (default: true) */
  enableTranscription?: boolean;
}

export interface UseGeminiLiveAudioReturn {
  /** Connect to Gemini Live and start áudio session */
  connect: () => Promise<void>;
  /** Disconnect and stop áudio session */
  disconnect: () => void;
  /** Send a text message within the live session */
  sendText: (text: string) => void;
  /** Current connection status */
  status: AudioConnectionStatus;
  /** Whether áudio is actively streaming */
  isStreaming: boolean;
  /** Accumulated transcript messages */
  transcript: string;
  /** Input áudio level (0-100) for waveform visualization */
  audioLevel: number;
  /** Error message if any */
  error: string | null;
  /** All messages in the conversation */
  messages: AudioMessage[];
  /** Clear all messages */
  clearMessages: () => void;
}

export function useGeminiLiveAudio(
  options: UseGeminiLiveAudioOptions = {}
): UseGeminiLiveAudioReturn {
  const [status, setStatus] = useState<AudioConnectionStatus>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AudioMessage[]>([]);

  // Use refs for values that change frequently but don't need re-renders
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track partial transcripts to build complete messages
  const currentUserTranscript = useRef('');
  const currentModelTranscript = useRef('');

  const connect = useCallback(async () => {
    setError(null);

    const config: AudioSessionConfig = {
      systemInstruction: optionsRef.current.systemInstruction,
      voiceName: optionsRef.current.voiceName,
      enableTranscription: optionsRef.current.enableTranscription,
    };

    try {
      const service = getGeminiLiveAudioService();
      await service.connect(config, {
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'error') {
            setAudioLevel(0);
          }
        },
        onTranscript: (text, role) => {
          if (role === 'user') {
            currentUserTranscript.current += text;
          } else {
            currentModelTranscript.current += text;
          }
        },
        onAudioResponse: () => {
          // Audio playback is handled internally by the service.
          // This callback is available for future waveform visualization of output.
        },
        onError: (err) => {
          log.error('Audio session error:', err);
          setError(err.message);
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onInterrupted: () => {
          log.debug('Model generation interrupted');
        },
        onTurnComplete: () => {
          // Flush user transcript first to maintain chronological order
          if (currentUserTranscript.current.trim()) {
            const msg: AudioMessage = {
              role: 'user',
              content: currentUserTranscript.current.trim(),
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, msg]);
            currentUserTranscript.current = '';
          }

          // Flush accumulated model transcript to messages
          if (currentModelTranscript.current.trim()) {
            const msg: AudioMessage = {
              role: 'model',
              content: currentModelTranscript.current.trim(),
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, msg]);
            currentModelTranscript.current = '';
          }
        },
      });
    } catch (err) {
      log.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, []);

  const disconnect = useCallback(() => {
    const service = getGeminiLiveAudioService();
    service.disconnect();
    setAudioLevel(0);

    // Flush any remaining transcripts
    if (currentModelTranscript.current.trim()) {
      const msg: AudioMessage = {
        role: 'model',
        content: currentModelTranscript.current.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msg]);
      currentModelTranscript.current = '';
    }
    if (currentUserTranscript.current.trim()) {
      const msg: AudioMessage = {
        role: 'user',
        content: currentUserTranscript.current.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msg]);
      currentUserTranscript.current = '';
    }
  }, []);

  const sendText = useCallback((text: string) => {
    const service = getGeminiLiveAudioService();
    service.sendText(text);

    // Add user text message to conversation
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text, timestamp: new Date() },
    ]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    currentUserTranscript.current = '';
    currentModelTranscript.current = '';
  }, []);

  // Derive computed values
  const isStreaming = status === 'streaming';
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Você' : 'IA'}: ${m.content}`)
    .join('\n');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const service = getGeminiLiveAudioService();
      if (service.getStatus() !== 'idle' && service.getStatus() !== 'disconnected') {
        service.disconnect();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    sendText,
    status,
    isStreaming,
    transcript,
    audioLevel,
    error,
    messages,
    clearMessages,
  };
}
