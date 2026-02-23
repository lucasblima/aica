/**
 * EF_AdvisorPanel - Advisor selection panel with speech bubbles
 *
 * Displays 3 featured advisors (historian, scientist, explorer).
 * On tap: shows speech bubble with advisor hint, auto-TTS.
 * Uses Framer Motion for advisor pop and bubble slide-up.
 * Frosted glass bubble design.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springElevation } from '@/lib/animations/ceramic-motion';
import { ADVISOR_CONFIG } from '../types/eraforge.types';
import { EF_VoiceWave } from './EF_VoiceWave';
import type { AdvisorId } from '../types/eraforge.types';

interface EF_AdvisorPanelProps {
  onSelectAdvisor: (advisorId: AdvisorId) => void;
  selectedAdvisor?: AdvisorId | null;
  advisorHint?: string | null;
  isLoading?: boolean;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  voiceSupported?: boolean;
}

const FEATURED_ADVISORS: { id: AdvisorId; emoji: string }[] = [
  { id: 'historian', emoji: '📜' },
  { id: 'scientist', emoji: '🔬' },
  { id: 'explorer', emoji: '🧭' },
];

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

  useEffect(() => {
    if (advisorHint && bubbleRef.current) {
      bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [advisorHint]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-ceramic-text-secondary mb-2 font-fredoka">
        Conselheiros
      </h3>

      {/* Advisor buttons */}
      <div className="flex gap-3">
        {FEATURED_ADVISORS.map(({ id, emoji }) => {
          const config = ADVISOR_CONFIG[id];
          const isSelected = selectedAdvisor === id;

          return (
            <motion.button
              key={id}
              onClick={() => onSelectAdvisor(id)}
              disabled={isLoading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
              transition={springElevation}
              className={`flex-1 p-3 rounded-xl text-center transition-colors ${
                isSelected
                  ? 'bg-amber-100 ring-2 ring-ceramic-warning shadow-ceramic-emboss'
                  : 'bg-ceramic-card shadow-ceramic-emboss disabled:opacity-50'
              }`}
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-xs font-bold text-ceramic-text-primary truncate font-fredoka">
                {config.name}
              </div>
              <div className="text-[10px] text-ceramic-text-secondary mt-0.5 truncate">
                {config.specialty}
              </div>
            </motion.button>
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
      <AnimatePresence>
        {advisorHint && selectedAdvisor && !isLoading && (
          <motion.div
            ref={bubbleRef}
            className="mt-3 relative"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={springElevation}
          >
            {/* Bubble arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0
                            border-l-[8px] border-l-transparent
                            border-r-[8px] border-r-transparent
                            border-b-[8px] border-b-amber-50/80" />

            {/* Bubble content — frosted glass */}
            <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {FEATURED_ADVISORS.find((a) => a.id === selectedAdvisor)?.emoji}
                </span>
                <span className="text-xs font-bold text-amber-800 font-fredoka">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
