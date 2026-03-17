/**
 * EraForge Voice Service
 *
 * Real implementation of TTS (ElevenLabs via Edge Function) and
 * STT (Web Speech API) for child-friendly voice interactions.
 *
 * Security: NO áudio data is stored. Audio blobs are revoked after playback.
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import type { AdvisorId } from '../types/eraforge.types';

const log = createNamespacedLogger('EraforgeVoiceService');

// ============================================
// TYPES
// ============================================

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  preview_url: string | null;
}

export interface SpeechResult {
  audioUrl: string | null;
  duration: number;
}

export interface ListenResult {
  transcript: string;
  confidence: number;
}

// ============================================
// AUDIO CACHE (in-memory only, no persistence)
// ============================================

const audioCache = new Map<string, { blob: Blob; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 20;

function getCacheKey(text: string, advisorId?: AdvisorId): string {
  return `${advisorId || 'default'}:${text.slice(0, 100)}`;
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of audioCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      audioCache.delete(key);
    }
  }
  // Evict oldest if over max
  if (audioCache.size > MAX_CACHE_ENTRIES) {
    const oldest = [...audioCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < oldest.length - MAX_CACHE_ENTRIES; i++) {
      audioCache.delete(oldest[i][0]);
    }
  }
}

// ============================================
// TTS — ElevenLabs via Edge Function
// ============================================

export class EraforgeVoiceService {
  private static currentAudio: HTMLAudioElement | null = null;
  private static currentObjectUrl: string | null = null;

  /**
   * Synthesize speech from text via eraforge-tts Edge Function.
   * Returns an áudio blob URL for playback.
   */
  static async speak(
    text: string,
    advisorId?: AdvisorId,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<{ data: SpeechResult | null; error: string | null }> {
    if (!text || text.trim().length === 0) {
      return { data: null, error: 'Empty text' };
    }

    try {
      // Stop any currently playing áudio
      EraforgeVoiceService.stopSpeaking();

      // Check cache first
      const cacheKey = getCacheKey(text, advisorId);
      pruneCache();
      const cached = audioCache.get(cacheKey);

      let audioBlob: Blob;

      if (cached) {
        log.debug('Cache hit for TTS', { cacheKey });
        audioBlob = cached.blob;
        cached.timestamp = Date.now(); // refresh TTL
      } else {
        log.debug('Calling eraforge-tts Edge Function', {
          textLength: text.length,
          advisorId,
        });

        // Get current session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          return { data: null, error: 'Not authenticated' };
        }

        const response = await supabase.functions.invoke('eraforge-tts', {
          body: {
            text: text.trim(),
            advisor_id: advisorId,
          },
        });

        if (response.error) {
          log.error('Edge Function error', response.error);
          return { data: null, error: response.error.message || 'TTS request failed' };
        }

        // The response data is the áudio blob
        if (response.data instanceof Blob) {
          audioBlob = response.data;
        } else {
          // If the response is not a blob, it might be an error JSON
          const errorData = response.data as { success?: boolean; error?: string };
          if (errorData && !errorData.success) {
            return { data: null, error: errorData.error || 'TTS generation failed' };
          }
          return { data: null, error: 'Unexpected response format' };
        }

        // Cache the blob
        audioCache.set(cacheKey, { blob: audioBlob, timestamp: Date.now() });
      }

      // Create object URL and play
      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);

      EraforgeVoiceService.currentAudio = audio;
      EraforgeVoiceService.currentObjectUrl = objectUrl;

      return new Promise((resolve) => {
        audio.onloadedmetadata = () => {
          onStart?.();
        };

        audio.onplay = () => {
          onStart?.();
        };

        audio.onended = () => {
          onEnd?.();
          // Clean up object URL (blob stays in cache)
          URL.revokeObjectURL(objectUrl);
          EraforgeVoiceService.currentAudio = null;
          EraforgeVoiceService.currentObjectUrl = null;
          resolve({
            data: { audioUrl: null, duration: audio.duration },
            error: null,
          });
        };

        audio.onerror = () => {
          onEnd?.();
          URL.revokeObjectURL(objectUrl);
          EraforgeVoiceService.currentAudio = null;
          EraforgeVoiceService.currentObjectUrl = null;
          resolve({ data: null, error: 'Audio playback failed' });
        };

        audio.play().catch((err) => {
          log.error('Audio play() rejected', err);
          onEnd?.();
          URL.revokeObjectURL(objectUrl);
          EraforgeVoiceService.currentAudio = null;
          EraforgeVoiceService.currentObjectUrl = null;
          resolve({ data: null, error: 'Audio playback blocked by browser' });
        });
      });
    } catch (err) {
      log.error('speak() error', err);
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Stop any currently playing TTS áudio.
   */
  static stopSpeaking(): void {
    if (EraforgeVoiceService.currentAudio) {
      EraforgeVoiceService.currentAudio.pause();
      EraforgeVoiceService.currentAudio.currentTime = 0;
      EraforgeVoiceService.currentAudio = null;
    }
    if (EraforgeVoiceService.currentObjectUrl) {
      URL.revokeObjectURL(EraforgeVoiceService.currentObjectUrl);
      EraforgeVoiceService.currentObjectUrl = null;
    }
  }

  // ============================================
  // STT — Web Speech API
  // ============================================

  /**
   * Listen for speech input using Web Speech API (pt-BR).
   * Returns transcript after silence or 10s timeout.
   */
  static async listen(
    onInterimResult?: (transcript: string) => void,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<{ data: ListenResult | null; error: string | null }> {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return { data: null, error: 'Speech recognition not supported in this browser' };
    }

    return new Promise((resolve) => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      let finalTranscript = '';
      let finalConfidence = 0;
      let resolved = false;

      // 10s timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          recognition.stop();
          onEnd?.();
          if (finalTranscript) {
            resolve({ data: { transcript: finalTranscript, confidence: finalConfidence }, error: null });
          } else {
            resolve({ data: null, error: 'Tempo esgotado. Tente falar novamente.' });
          }
        }
      }, 10_000);

      recognition.onstart = () => {
        log.debug('STT started');
        onStart?.();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            finalConfidence = result[0].confidence;
          } else {
            interim += result[0].transcript;
          }
        }
        if (interim) {
          onInterimResult?.(interim);
        }
      };

      recognition.onend = () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          onEnd?.();
          if (finalTranscript) {
            resolve({
              data: { transcript: finalTranscript, confidence: finalConfidence },
              error: null,
            });
          } else {
            resolve({ data: null, error: 'Nenhuma fala detectada. Tente novamente.' });
          }
        }
      };

      recognition.onerror = (event: any) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          onEnd?.();
          const errorMap: Record<string, string> = {
            'not-allowed': 'Permissao de microfone negada.',
            'no-speech': 'Nenhuma fala detectada. Tente novamente.',
            'áudio-capture': 'Microfone não encontrado.',
            'network': 'Erro de rede no reconhecimento de voz.',
          };
          const message = errorMap[event.error] || `Erro de reconhecimento: ${event.error}`;
          resolve({ data: null, error: message });
        }
      };

      recognition.start();
    });
  }

  // ============================================
  // CAPABILITY CHECK
  // ============================================

  /**
   * Check if voice features are supported in this browser.
   */
  static isVoiceSupported(): boolean {
    const hasSpeechRecognition =
      !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
    const hasAudioContext = !!(window as any).AudioContext || !!(window as any).webkitAudioContext;
    return hasSpeechRecognition && hasAudioContext;
  }

  /**
   * Get available voice options for display purposes.
   */
  static async getAvailableVoices(): Promise<{ data: VoiceOption[] | null; error: any }> {
    const voices: VoiceOption[] = [
      { id: 'historian', name: 'Prof. Chronos (Narrador)', language: 'pt-BR', preview_url: null },
      { id: 'scientist', name: 'Dra. Eureka (Gentil)', language: 'pt-BR', preview_url: null },
      { id: 'explorer', name: 'Capitao Vento (Energico)', language: 'pt-BR', preview_url: null },
      { id: 'philosopher', name: 'Sabio Logos (Profundo)', language: 'pt-BR', preview_url: null },
    ];
    return { data: voices, error: null };
  }
}
