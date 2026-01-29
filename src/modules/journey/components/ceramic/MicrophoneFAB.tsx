/**
 * MicrophoneFAB - Voice Input Floating Action Button
 *
 * The primary interaction point of the app for voice input.
 * Features the Digital Ceramic System design with concave inset effect.
 *
 * States:
 * - idle: Ceramic concave button, ready to record
 * - recording: Amber glow with pulsing wave animation
 * - processing: Spinner animation while transcribing
 * - error: Red glow with error indicator
 *
 * @component
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicrophoneIcon, StopIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export interface MicrophoneFABProps {
  /** Current state of recording */
  state?: 'idle' | 'recording' | 'processing' | 'error';
  /** Callback when the FAB is pressed */
  onPress: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Error message to display in tooltip */
  errorMessage?: string | null;
  /** Interim transcript for visual feedback */
  interimTranscript?: string;
}

/**
 * MicrophoneFAB Component
 *
 * A large circular floating action button designed for voice input.
 * Uses the Digital Ceramic System with inset concave styling.
 *
 * Features:
 * - Animated wave rings during recording
 * - Smooth state transitions
 * - Error state with visual feedback
 * - Processing spinner
 * - Accessible ARIA labels
 */
export const MicrophoneFAB: React.FC<MicrophoneFABProps> = ({
  state = 'idle',
  onPress,
  disabled = false,
  errorMessage = null,
  interimTranscript = '',
}) => {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isError = state === 'error';

  // Wave animation rings
  const WaveRing = ({ delay = 0 }: { delay?: number }) => (
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-amber-500/30"
      initial={{ scale: 1, opacity: 0.6 }}
      animate={
        isRecording
          ? {
              scale: [1, 1.5, 2],
              opacity: [0.6, 0.3, 0],
            }
          : { scale: 1, opacity: 0 }
      }
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeOut',
        delay,
      }}
    />
  );

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main Button */}
      <motion.button
        onClick={onPress}
        disabled={disabled || isProcessing}
        className={`
          relative
          w-16 h-16
          rounded-full
          flex items-center justify-center
          transition-all duration-200 ease-in-out
          ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isRecording || isError ? '' : 'ceramic-concave hover:ceramic-elevated'}
        `}
        style={{
          backgroundColor: '#F0EFE9',
          ...(isRecording && {
            boxShadow: `
              inset 6px 6px 12px rgba(163, 158, 145, 0.30),
              inset -6px -6px 12px rgba(255, 255, 255, 1.0),
              0 0 20px rgba(217, 119, 6, 0.4)
            `,
          }),
          ...(isError && {
            boxShadow: `
              inset 6px 6px 12px rgba(163, 158, 145, 0.30),
              inset -6px -6px 12px rgba(255, 255, 255, 1.0),
              0 0 20px rgba(239, 68, 68, 0.4)
            `,
          }),
        }}
        whileTap={!disabled && !isProcessing ? { scale: 0.95 } : undefined}
        animate={
          isRecording
            ? {
                boxShadow: [
                  `
                    inset 6px 6px 12px rgba(163, 158, 145, 0.30),
                    inset -6px -6px 12px rgba(255, 255, 255, 1.0),
                    0 0 20px rgba(217, 119, 6, 0.4)
                  `,
                  `
                    inset 6px 6px 12px rgba(163, 158, 145, 0.30),
                    inset -6px -6px 12px rgba(255, 255, 255, 1.0),
                    0 0 30px rgba(217, 119, 6, 0.6)
                  `,
                  `
                    inset 6px 6px 12px rgba(163, 158, 145, 0.30),
                    inset -6px -6px 12px rgba(255, 255, 255, 1.0),
                    0 0 20px rgba(217, 119, 6, 0.4)
                  `,
                ],
              }
            : {}
        }
        transition={
          isRecording
            ? {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : { duration: 0.2 }
        }
        aria-label={
          isRecording
            ? 'Parar gravação'
            : isProcessing
            ? 'Processando...'
            : isError
            ? 'Erro na gravação'
            : 'Iniciar gravação de voz'
        }
        role="button"
        aria-pressed={isRecording}
        title={errorMessage || undefined}
      >
        {/* Wave Rings - Only visible during recording */}
        <AnimatePresence>
          {isRecording && (
            <>
              <WaveRing delay={0} />
              <WaveRing delay={0.4} />
              <WaveRing delay={0.8} />
            </>
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div
          animate={
            isRecording
              ? {
                  scale: [1, 1.1, 1],
                }
              : isProcessing
              ? {
                  rotate: [0, 360],
                }
              : { scale: 1, rotate: 0 }
          }
          transition={
            isRecording
              ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : isProcessing
              ? {
                  duration: 1,
                  repeat: Infinity,
                  ease: 'linear',
                }
              : { duration: 0.2 }
          }
        >
          {isError ? (
            <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
          ) : isRecording ? (
            <StopIcon className="w-7 h-7 text-amber-600" />
          ) : (
            <MicrophoneIcon
              className={`
                w-7 h-7
                transition-colors duration-200
                ${isProcessing ? 'text-amber-600' : 'text-[#5C554B]'}
                ${!disabled && !isProcessing && 'group-hover:text-[#4A463F]'}
              `}
            />
          )}
        </motion.div>
      </motion.button>

      {/* Transcript Preview - Shows during recording if there's interim text */}
      <AnimatePresence>
        {isRecording && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 right-0 ceramic-card p-3 rounded-lg shadow-lg max-w-xs"
          >
            <p className="text-xs text-[#5C554B] line-clamp-2">{interimTranscript}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1 h-1 bg-amber-600 rounded-full animate-pulse" />
              <span className="text-[10px] text-[#948D82]">Ouvindo...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Tooltip */}
      <AnimatePresence>
        {isError && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 right-0 bg-red-50 border border-red-200 p-3 rounded-lg shadow-lg max-w-xs"
          >
            <p className="text-xs text-red-700">{errorMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MicrophoneFAB;
