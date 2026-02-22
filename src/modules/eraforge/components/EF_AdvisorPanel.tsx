/**
 * EF_AdvisorPanel - Advisor selection panel with speech bubbles
 *
 * Displays 3 featured advisors (historian, scientist, explorer).
 * On tap: shows speech bubble with advisor hint, auto-TTS.
 * Includes loading state and haptic feedback.
 */

import React, { useEffect, useRef } from 'react';
import { ADVISOR_CONFIG } from '../types/eraforge.types';
import { EF_VoiceWave } from './EF_VoiceWave';
import type { AdvisorId } from '../types/eraforge.types';

interface EF_AdvisorPanelProps {
  onSelectAdvisor: (advisorId: AdvisorId) => void;
  selectedAdvisor?: AdvisorId | null;
  /** Hint text from the selected advisor */
  advisorHint?: string | null;
  /** AI is loading the hint */
  isLoading?: boolean;
  /** TTS is speaking the hint */
  isSpeaking?: boolean;
  /** Stop TTS callback */
  onStopSpeaking?: () => void;
  /** Voice supported */
  voiceSupported?: boolean;
}

const FEATURED_ADVISORS: { id: AdvisorId; emoji: string }[] = [
  { id: 'historian', emoji: '📜' },
  { id: 'scientist', emoji: '🔬' },
  { id: 'explorer', emoji: '🧭' },
];

const fredoka = { fontFamily: "'Fredoka', 'Nunito', sans-serif" };

export function EF_AdvisorPanel({
  onSelectAdvisor,
  selectedAdvisor,
  advisorHint,
  isLoading = false,
  isSpeaking = false,
  onStopSpeaking,
  voiceSupported = true,
}: EF_AdvisorPanelProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Scroll speech bubble into view when hint appears
  useEffect(() => {
    if (advisorHint && bubbleRef.current) {
      bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [advisorHint]);

  return (
    <div>
      <h3
        className="text-sm font-semibold text-ceramic-text-secondary mb-2"
        style={fredoka}
      >
        Conselheiros
      </h3>

      {/* Advisor buttons */}
      <div className="flex gap-3">
        {FEATURED_ADVISORS.map(({ id, emoji }) => {
          const config = ADVISOR_CONFIG[id];
          const isSelected = selectedAdvisor === id;

          return (
            <button
              key={id}
              onClick={() => onSelectAdvisor(id)}
              disabled={isLoading}
              className={`flex-1 p-3 rounded-xl text-center transition-all duration-300 ${
                isSelected
                  ? 'bg-amber-100 ring-2 ring-ceramic-warning shadow-ceramic-emboss scale-[1.05]'
                  : 'bg-ceramic-card shadow-ceramic-emboss hover:scale-[1.03] disabled:opacity-50'
              }`}
              style={{
                animation: isSelected ? 'ef-advisor-pop 0.3s ease-out' : undefined,
              }}
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div
                className="text-xs font-bold text-ceramic-text-primary truncate"
                style={fredoka}
              >
                {config.name}
              </div>
              <div className="text-[10px] text-ceramic-text-secondary mt-0.5 truncate">
                {config.specialty}
              </div>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && selectedAdvisor && (
        <div className="mt-3 flex items-center justify-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-ceramic-text-secondary">
            {ADVISOR_CONFIG[selectedAdvisor].name} está pensando...
          </span>
        </div>
      )}

      {/* Speech bubble with advisor hint */}
      {advisorHint && selectedAdvisor && !isLoading && (
        <div
          ref={bubbleRef}
          className="mt-3 relative animate-[ef-slide-up_0.4s_ease-out]"
        >
          {/* Bubble arrow */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0
                          border-l-[8px] border-l-transparent
                          border-r-[8px] border-r-transparent
                          border-b-[8px] border-b-amber-50" />

          {/* Bubble content */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {FEATURED_ADVISORS.find((a) => a.id === selectedAdvisor)?.emoji}
              </span>
              <span
                className="text-xs font-bold text-amber-800"
                style={fredoka}
              >
                {ADVISOR_CONFIG[selectedAdvisor].name}
              </span>
            </div>

            <p className="text-sm text-amber-900 leading-relaxed">
              {advisorHint}
            </p>

            {/* Voice wave when speaking hint */}
            {isSpeaking && (
              <div className="mt-2">
                <EF_VoiceWave
                  isSpeaking={isSpeaking}
                  onStopSpeaking={onStopSpeaking}
                  voiceSupported={voiceSupported}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes ef-advisor-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1.05); }
        }
        @keyframes ef-slide-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
