/**
 * EF_VoiceWave - Animated voice wave during recording/speaking
 *
 * Shows an animated sound wave visualization when STT is listening
 * or TTS is speaking. Uses Framer Motion for smooth bar animations.
 * Includes glow effects on active states.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface EF_VoiceWaveProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  interimTranscript?: string;
  onListen?: () => void;
  onStopSpeaking?: () => void;
  voiceSupported?: boolean;
  error?: string | null;
  className?: string;
}

const BAR_COUNT = 5;

// Heights vary per bar for frequency-like effect (center tallest)
const BAR_MAX_HEIGHTS = [16, 22, 28, 22, 16];
const BAR_MIN_HEIGHT = 6;

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

  const barDelays = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => i * 0.12),
    []
  );

  if (!voiceSupported) {
    return (
      <div className={`flex items-center gap-2 text-ceramic-text-secondary text-xs ${className}`}>
        <span>Voz não disponível neste navegador</span>
      </div>
    );
  }

  const glowClass = isActive
    ? isListening
      ? 'shadow-[0_0_12px_rgba(217,119,6,0.3)]'
      : 'shadow-[0_0_12px_rgba(123,143,162,0.3)]'
    : '';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Wave visualization */}
      <div className={`flex items-center gap-0.5 h-8 min-w-[40px] rounded-lg px-1 transition-shadow duration-300 ${glowClass}`}>
        {barDelays.map((delay, i) => (
          <motion.div
            key={i}
            className={`w-1 rounded-full ${
              isActive
                ? isListening
                  ? 'bg-amber-500'
                  : 'bg-ceramic-info'
                : 'bg-ceramic-border'
            }`}
            animate={{
              height: isActive
                ? [BAR_MIN_HEIGHT, BAR_MAX_HEIGHTS[i], BAR_MIN_HEIGHT]
                : BAR_MIN_HEIGHT,
            }}
            transition={
              isActive
                ? {
                    duration: 0.8,
                    delay,
                    repeat: Infinity,
                    repeatType: 'reverse' as const,
                    ease: 'easeInOut',
                  }
                : { duration: 0.2 }
            }
          />
        ))}
      </div>

      {/* Status / Transcript */}
      <div className="flex-1 min-w-0">
        {error ? (
          <span className="text-ceramic-error text-xs truncate block">{error}</span>
        ) : isListening && interimTranscript ? (
          <span className="text-ceramic-text-primary text-sm truncate block italic">
            {interimTranscript}...
          </span>
        ) : isListening ? (
          <span className="text-amber-600 text-xs animate-pulse">
            Ouvindo...
          </span>
        ) : isSpeaking ? (
          <span className="text-ceramic-info text-xs animate-pulse">
            Falando...
          </span>
        ) : null}
      </div>

      {/* Controls */}
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
    </div>
  );
}

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
