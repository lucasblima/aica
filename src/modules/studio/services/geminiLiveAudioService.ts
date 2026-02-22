/**
 * Gemini Live Audio Service - Real-time audio streaming for interview preparation
 *
 * Manages WebSocket connection to Gemini Multimodal Live API for real-time
 * voice-based interview preparation during podcast research.
 *
 * Architecture:
 * 1. Edge Function `gemini-live-token` creates ephemeral token (server-side)
 * 2. Client connects directly to Gemini Live API via @google/genai SDK
 * 3. Audio captured via getUserMedia → PCM 16kHz 16-bit mono → Gemini
 * 4. Gemini responds with PCM 24kHz audio → AudioContext → speakers
 *
 * @module studio/services/geminiLiveAudioService
 */

import { GoogleGenAI, Modality } from '@google/genai';
import type { Session, LiveServerMessage, LiveConnectConfig } from '@google/genai';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GeminiLiveAudio');

// ============================================
// TYPES
// ============================================

export type AudioConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'error'
  | 'disconnected';

export interface AudioSessionConfig {
  /** System instruction for the AI (e.g. interview context) */
  systemInstruction?: string;
  /** Voice name for Gemini output */
  voiceName?: string;
  /** Whether to include text transcription */
  enableTranscription?: boolean;
}

export interface AudioMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface AudioServiceCallbacks {
  onTranscript: (text: string, role: 'user' | 'model') => void;
  onAudioResponse: (pcmData: ArrayBuffer) => void;
  onStatusChange: (status: AudioConnectionStatus) => void;
  onError: (error: Error) => void;
  onAudioLevel: (level: number) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const AUDIO_CHANNELS = 1; // mono
const RECONNECT_MAX_RETRIES = 3;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const AUDIO_CHUNK_INTERVAL_MS = 100; // send audio chunks every 100ms

// ============================================
// SERVICE CLASS
// ============================================

export class GeminiLiveAudioService {
  private session: Session | null = null;
  private callbacks: AudioServiceCallbacks | null = null;
  private status: AudioConnectionStatus = 'idle';

  // Audio capture
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  // Audio playback
  private playbackContext: AudioContext | null = null;
  private playbackQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private nextPlaybackTime = 0;

  // Audio level monitoring
  private analyserNode: AnalyserNode | null = null;
  private levelAnimationFrame: number | null = null;

  // Reconnection
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Connect to Gemini Live API with audio streaming
   */
  async connect(config: AudioSessionConfig, callbacks: AudioServiceCallbacks): Promise<void> {
    if (this.session) {
      log.warn('Already connected, disconnecting first');
      this.disconnect();
    }

    this.callbacks = callbacks;
    this.setStatus('connecting');

    try {
      // 1. Get ephemeral token from Edge Function
      const token = await this.getEphemeralToken();

      // 2. Connect to Gemini Live API
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const liveConfig: LiveConnectConfig = {
        responseModalities: [Modality.AUDIO],
      };

      if (config.systemInstruction) {
        liveConfig.systemInstruction = config.systemInstruction;
      }

      if (config.voiceName) {
        liveConfig.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: config.voiceName },
          },
        };
      }

      if (config.enableTranscription !== false) {
        liveConfig.inputAudioTranscription = {};
        liveConfig.outputAudioTranscription = {};
      }

      this.session = await ai.live.connect({
        model: GEMINI_LIVE_MODEL,
        config: liveConfig,
        callbacks: {
          onopen: () => {
            log.info('WebSocket connected to Gemini Live API');
            this.reconnectAttempts = 0;
            this.setStatus('connected');
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            log.error('WebSocket error:', e.message);
            this.callbacks?.onError(new Error(e.message || 'WebSocket error'));
          },
          onclose: (e: CloseEvent) => {
            log.info('WebSocket closed:', e.code, e.reason);
            if (this.status !== 'disconnected' && this.status !== 'idle') {
              this.handleDisconnection();
            }
          },
        },
      });

      // 3. Start audio capture
      await this.startAudioCapture();
      this.setStatus('streaming');
      log.info('Audio streaming started');
    } catch (error) {
      log.error('Failed to connect:', error);
      this.setStatus('error');
      this.callbacks?.onError(
        error instanceof Error ? error : new Error(String(error))
      );
      this.cleanup();
    }
  }

  /**
   * Disconnect and clean up all resources
   */
  disconnect(): void {
    log.info('Disconnecting');
    this.setStatus('disconnected');
    this.cleanup();
  }

  /**
   * Send a text message within the live session
   */
  sendText(text: string): void {
    if (!this.session) {
      log.warn('Cannot send text: no active session');
      return;
    }

    try {
      this.session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
      log.debug('Sent text message:', text.substring(0, 50));
    } catch (error) {
      log.error('Failed to send text:', error);
      this.callbacks?.onError(
        error instanceof Error ? error : new Error('Failed to send text')
      );
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): AudioConnectionStatus {
    return this.status;
  }

  // ============================================
  // PRIVATE: Audio Capture
  // ============================================

  private async startAudioCapture(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: INPUT_SAMPLE_RATE,
        channelCount: AUDIO_CHANNELS,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Analyser for audio level monitoring
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.sourceNode.connect(this.analyserNode);

    // ScriptProcessor for PCM data extraction
    // Buffer size: INPUT_SAMPLE_RATE * AUDIO_CHUNK_INTERVAL_MS / 1000
    const bufferSize = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(
      bufferSize,
      AUDIO_CHANNELS,
      AUDIO_CHANNELS
    );

    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      if (this.status !== 'streaming' || !this.session) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16Data = this.float32ToPcm16(inputData);
      this.sendAudioChunk(pcm16Data);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    // Start audio level monitoring
    this.startLevelMonitoring();
  }

  private float32ToPcm16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit signed integer (little-endian)
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }

    return buffer;
  }

  private sendAudioChunk(pcmData: ArrayBuffer): void {
    if (!this.session) return;

    try {
      const base64 = this.arrayBufferToBase64(pcmData);
      this.session.sendRealtimeInput({
        audio: {
          data: base64,
          mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
        },
      });
    } catch (error) {
      log.warn('Failed to send audio chunk:', error);
    }
  }

  // ============================================
  // PRIVATE: Audio Playback
  // ============================================

  private async playAudioData(base64Audio: string): Promise<void> {
    const pcmData = this.base64ToArrayBuffer(base64Audio);

    // Notify callback of raw audio data
    this.callbacks?.onAudioResponse(pcmData);

    // Queue for playback
    this.playbackQueue.push(pcmData);

    if (!this.isPlaying) {
      this.processPlaybackQueue();
    }
  }

  private processPlaybackQueue(): void {
    if (this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    }

    const pcmData = this.playbackQueue.shift()!;
    const float32Data = this.pcm16ToFloat32(pcmData);

    const audioBuffer = this.playbackContext.createBuffer(
      AUDIO_CHANNELS,
      float32Data.length,
      OUTPUT_SAMPLE_RATE
    );
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.playbackContext.destination);

    const now = this.playbackContext.currentTime;
    const startTime = Math.max(now, this.nextPlaybackTime);
    source.start(startTime);
    this.nextPlaybackTime = startTime + audioBuffer.duration;

    source.onended = () => {
      this.processPlaybackQueue();
    };
  }

  private pcm16ToFloat32(pcmBuffer: ArrayBuffer): Float32Array {
    const view = new DataView(pcmBuffer);
    const numSamples = pcmBuffer.byteLength / 2;
    const float32 = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const int16 = view.getInt16(i * 2, true); // little-endian
      float32[i] = int16 / 0x8000;
    }

    return float32;
  }

  private clearPlaybackQueue(): void {
    this.playbackQueue = [];
    this.isPlaying = false;
    this.nextPlaybackTime = 0;
  }

  // ============================================
  // PRIVATE: Audio Level Monitoring
  // ============================================

  private startLevelMonitoring(): void {
    if (!this.analyserNode) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const monitor = () => {
      if (!this.analyserNode || this.status === 'disconnected' || this.status === 'idle') {
        return;
      }

      this.analyserNode.getByteFrequencyData(dataArray);

      // Calculate RMS level scaled to 0-100
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = Math.min(100, Math.round((rms / 128) * 100));

      this.callbacks?.onAudioLevel(level);
      this.levelAnimationFrame = requestAnimationFrame(monitor);
    };

    this.levelAnimationFrame = requestAnimationFrame(monitor);
  }

  // ============================================
  // PRIVATE: Message Handling
  // ============================================

  private handleServerMessage(message: LiveServerMessage): void {
    const content = message.serverContent;

    if (!content) {
      // setupComplete or other non-content messages
      if (message.setupComplete) {
        log.debug('Session setup complete');
      }
      return;
    }

    // Handle audio data from model
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
          this.playAudioData(part.inlineData.data);
        }
        if (part.text) {
          this.callbacks?.onTranscript(part.text, 'model');
        }
      }
    }

    // Handle transcriptions
    if (content.inputTranscription?.text) {
      this.callbacks?.onTranscript(content.inputTranscription.text, 'user');
    }
    if (content.outputTranscription?.text) {
      this.callbacks?.onTranscript(content.outputTranscription.text, 'model');
    }

    // Handle interruption
    if (content.interrupted) {
      log.debug('Generation interrupted by user');
      this.clearPlaybackQueue();
      this.callbacks?.onInterrupted?.();
    }

    // Handle turn complete
    if (content.turnComplete) {
      this.callbacks?.onTurnComplete?.();
    }
  }

  // ============================================
  // PRIVATE: Reconnection
  // ============================================

  private handleDisconnection(): void {
    // Auto-reconnection not supported for live audio sessions (ephemeral tokens are single-use).
    // Transition to error immediately so the user can reconnect manually.
    log.warn('Connection lost — manual reconnect required (ephemeral tokens are single-use)');
    this.setStatus('error');
    this.callbacks?.onError(new Error('Conexao perdida. Clique em Iniciar Conversa para reconectar.'));
    this.cleanup();
  }

  // ============================================
  // PRIVATE: Token & Auth
  // ============================================

  private async getEphemeralToken(): Promise<string> {
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('gemini-live-token', {
      headers: {
        Authorization: `Bearer ${authSession.access_token}`,
      },
    });

    if (error) {
      throw new Error(`Failed to get ephemeral token: ${error.message}`);
    }

    if (!data?.token) {
      throw new Error('No token received from server');
    }

    log.debug('Ephemeral token obtained');
    return data.token;
  }

  // ============================================
  // PRIVATE: Utilities
  // ============================================

  private setStatus(status: AudioConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.callbacks?.onStatusChange(status);
  }

  private cleanup(): void {
    // Stop reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop audio level monitoring
    if (this.levelAnimationFrame) {
      cancelAnimationFrame(this.levelAnimationFrame);
      this.levelAnimationFrame = null;
    }

    // Stop audio capture
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Stop audio playback
    this.clearPlaybackQueue();
    if (this.playbackContext) {
      this.playbackContext.close().catch(() => {});
      this.playbackContext = null;
    }

    // Close WebSocket session
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Already closed
      }
      this.session = null;
    }

    this.callbacks = null;
    this.reconnectAttempts = 0;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer) as any));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// ============================================
// SINGLETON
// ============================================

let serviceInstance: GeminiLiveAudioService | null = null;

export function getGeminiLiveAudioService(): GeminiLiveAudioService {
  if (!serviceInstance) {
    serviceInstance = new GeminiLiveAudioService();
  }
  return serviceInstance;
}

export function resetGeminiLiveAudioService(): void {
  if (serviceInstance) {
    serviceInstance.disconnect();
    serviceInstance = null;
  }
}
