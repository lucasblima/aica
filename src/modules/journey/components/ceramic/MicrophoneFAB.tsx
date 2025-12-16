/**
 * MicrophoneFAB - Voice Input Floating Action Button
 *
 * The primary interaction point of the app for voice input.
 * Features the Digital Ceramic System design with concave inset effect.
 *
 * @component
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MicrophoneIcon } from '@heroicons/react/24/solid';

export interface MicrophoneFABProps {
  /** Whether the microphone is currently recording */
  isRecording: boolean;
  /** Callback when the FAB is pressed */
  onPress: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * MicrophoneFAB Component
 *
 * A large circular floating action button designed for voice input.
 * Uses the Digital Ceramic System with inset concave styling.
 *
 * States:
 * - Inactive: Ceramic cream background with concave inset shadow
 * - Active/Recording: Amber inner glow with pulse animation
 * - Hover: Subtle elevation effect
 * - Disabled: Reduced opacity
 */
export const MicrophoneFAB: React.FC<MicrophoneFABProps> = ({
  isRecording,
  onPress,
  disabled = false,
}) => {
  return (
    <motion.button
      onClick={onPress}
      disabled={disabled}
      className={`
        fixed bottom-6 right-6 z-50
        w-16 h-16
        rounded-full
        flex items-center justify-center
        transition-all duration-200 ease-in-out
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isRecording ? '' : 'ceramic-concave hover:ceramic-elevated'}
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
      }}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
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
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      role="button"
      aria-pressed={isRecording}
    >
      <motion.div
        animate={
          isRecording
            ? {
                scale: [1, 1.1, 1],
              }
            : { scale: 1 }
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
      >
        <MicrophoneIcon
          className={`
            w-7 h-7
            transition-colors duration-200
            ${isRecording ? 'text-amber-600' : 'text-[#5C554B]'}
            ${!disabled && !isRecording && 'group-hover:text-[#4A463F]'}
          `}
        />
      </motion.div>
    </motion.button>
  );
};

export default MicrophoneFAB;
