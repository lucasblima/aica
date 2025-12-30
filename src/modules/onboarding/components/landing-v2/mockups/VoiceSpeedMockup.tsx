import React from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface VoiceSpeedMockupProps {
  className?: string;
}

/**
 * VoiceSpeedMockup Component
 *
 * Represents instant voice capture functionality.
 * Features:
 * - Neumorphic circular mic button
 * - Animated waveform (12 vertical bars)
 * - Recording time indicator
 * - Cyan/turquoise color scheme
 *
 * Aspect Ratio: Horizontal 2:1 (wide BentoCard)
 */
export function VoiceSpeedMockup({ className = '' }: VoiceSpeedMockupProps) {
  return (
    <motion.div
      className={`relative w-full h-full flex items-center justify-center gap-4 md:gap-6 p-4 md:p-6 ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #CFFAFE 0%, #A5F3FC 100%)',
        }}
      />

      {/* Mic Button - Ceramic Concave */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-ceramic-base flex items-center justify-center"
          style={{
            boxShadow: `
              inset 6px 6px 12px rgba(163, 158, 145, 0.30),
              inset -6px -6px 12px rgba(255, 255, 255, 1.0)
            `,
          }}
        >
          <Mic className="w-8 h-8 md:w-10 md:h-10 text-cyan-600" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Waveform - 12 animated bars */}
      <div className="relative z-10 flex items-center gap-0.5 md:gap-1 h-12 md:h-16">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 md:w-1.5 bg-cyan-600/70 rounded-full"
            initial={{ height: 8 }}
            animate={{
              height: [8, 16 + Math.random() * 24, 8],
            }}
            transition={{
              duration: 0.6 + Math.random() * 0.4,
              repeat: Infinity,
              delay: i * 0.05,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Recording Time Indicator */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <div
          className="bg-white/60 backdrop-blur-sm rounded-full px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2"
          style={{
            boxShadow: `
              2px 2px 6px rgba(163, 158, 145, 0.15),
              -1px -1px 4px rgba(255, 255, 255, 0.9)
            `,
          }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-red-500"
            animate={{
              opacity: [1, 0.3, 1],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className="text-xs md:text-sm font-semibold text-ceramic-text-primary tabular-nums">
            0:24
          </span>
        </div>
      </motion.div>

      {/* Decorative sound waves */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <motion.div
          className="w-40 h-40 md:w-56 md:h-56 rounded-full border-2 border-cyan-600"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
        <motion.div
          className="absolute w-32 h-32 md:w-48 md:h-48 rounded-full border-2 border-cyan-600"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.4,
          }}
        />
      </div>
    </motion.div>
  );
}

export default VoiceSpeedMockup;
