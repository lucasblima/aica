/**
 * EF_VoiceWave - Animated voice wave during recording/speaking
 *
 * Shows an animated sound wave visualization when STT is listening
 * or TTS is speaking. Includes mic/stop buttons as fallback controls.
 * Uses Ceramic design tokens with Fredoka/Nunito fonts.
 */

import React, { useMemo } from 'react';

interface EF_VoiceWaveProps {
  /** Whether the microphone is actively listening */
  isListening?: boolean;
  /** Whether TTS audio is playing */
  isSpeaking?: boolean;
  /** Interim transcript text to display */
  interimTranscript?: string;
  /** Callback to start listening */
  onListen?: () => void;
  /** Callback to stop speaking */
  onStopSpeaking?: () => void;
  /** Whether voice is supported */
  voiceSupported?: boolean;
  /** Error message */
  error?: string | null;
  /** Additional className */
  className?: string;
}

const BAR_COUNT = 5;

export function EF_VoiceWave({
  isListening = false,
  isSpeaking = false,
  interimTranscript = '',
  onListen,
  onStopSpeaking,
  voiceSupported = true,
  error = null,
  className = '',
}: EF_VoiceWaveProps) {
  const isActive = isListening || isSpeaking;

  // Generate bar animation delays
  const barDelays = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => i * 0.12),
    []
  );

  if (!voiceSupported) {
    return (
      <div className={`flex items-center gap-2 text-ceramic-text-secondary text-xs font-nunito ${className}`}>
        <span>Voz nao disponivel neste navegador</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Wave visualization */}
      <div className="flex items-center gap-0.5 h-8 min-w-[40px]">
        {barDelays.map((delay, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-200 ${
              isActive
                ? isListening
                  ? 'bg-amber-500'
                  : 'bg-ceramic-info'
                : 'bg-ceramic-border'
            }`}
            style={{
              height: isActive ? undefined : '8px',
              animation: isActive
                ? `ef-voice-wave 0.8s ease-in-out ${delay}s infinite alternate`
                : 'none',
            }}
          />
        ))}
      </div>

      {/* Status / Transcript */}
      <div className="flex-1 min-w-0">
        {error ? (
          <span className="text-ceramic-error text-xs font-nunito truncate block">{error}</span>
        ) : isListening && interimTranscript ? (
          <span className="text-ceramic-text-primary text-sm font-nunito truncate block italic">
            {interimTranscript}...
          </span>
        ) : isListening ? (
          <span className="text-amber-600 text-xs font-nunito animate-pulse">
            Ouvindo...
          </span>
        ) : isSpeaking ? (
          <span className="text-ceramic-info text-xs font-nunito animate-pulse">
            Falando...
          </span>
        ) : null}
      </div>

      {/* Controls — always visible as fallback */}
      <div className="flex items-center gap-2 shrink-0">
        {isSpeaking ? (
          <button
            type="button"
            onClick={onStopSpeaking}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       bg-ceramic-error/10 hover:bg-ceramic-error/20
                       text-ceramic-error transition-colors"
            aria-label="Parar narrador"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="button"
            onClick={onListen}
            disabled={isListening}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
              ${isListening
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600'
              }`}
            aria-label={isListening ? 'Ouvindo...' : 'Falar com o jogo'}
          >
            <MicIcon />
          </button>
        )}
      </div>

      {/* CSS animation for wave bars */}
      <style>{`
        @keyframes ef-voice-wave {
          0% { height: 6px; }
          100% { height: 24px; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// INLINE ICONS (to avoid external deps)
// ============================================

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
