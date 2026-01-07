import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles } from 'lucide-react';

interface SelfKnowledgeMockupProps {
  className?: string;
}

/**
 * SelfKnowledgeMockup Component
 *
 * Represents identity and personal insights.
 * Features:
 * - Mini Identity Passport card (floating, rotated)
 * - Insight bubble with sparkle icon
 * - Semi-transparent user icon background
 * - Floating animation on elements
 *
 * Aspect Ratio: Horizontal 16:9 (wide-rectangle BentoCard)
 */
export function SelfKnowledgeMockup({ className = '' }: SelfKnowledgeMockupProps) {
  return (
    <motion.div
      className={`relative w-full h-full flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%)',
        }}
      />

      {/* Semi-transparent User icon background */}
      <User
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-48 md:h-48 text-ceramic-text-secondary opacity-10"
        strokeWidth={1}
      />

      {/* Mini Identity Passport - Floating and Rotated */}
      <motion.div
        className="absolute left-8 md:left-12 top-1/2 -translate-y-1/2"
        initial={{ opacity: 0, x: -30, rotateZ: 0 }}
        whileInView={{ opacity: 1, x: 0, rotateZ: -5 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.6 }}
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-32 md:w-40 bg-ceramic-base rounded-2xl p-3 md:p-4"
          style={{
            boxShadow: `
              6px 6px 16px rgba(163, 158, 145, 0.25),
              -4px -4px 12px rgba(255, 255, 255, 0.95)
            `,
          }}
        >
          {/* Top accent bar */}
          <div
            className="h-1 w-full rounded-full mb-2"
            style={{
              background: 'linear-gradient(90deg, #D97706 0%, #F59E0B 50%, #FBBF24 100%)',
              opacity: 0.6,
            }}
          />

          {/* Avatar and level */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
              }}
            >
              <User className="w-4 h-4 md:w-5 md:h-5 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-2 w-12 bg-ceramic-text-secondary/20 rounded-full" />
              <div className="h-1.5 w-8 bg-ceramic-text-secondary/10 rounded-full" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full bg-ceramic-text-secondary/10 rounded-full overflow-hidden">
            <div
              className="h-full w-3/5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #D97706 0%, #F59E0B 100%)',
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Insight Bubble - Floating */}
      <motion.div
        className="absolute right-8 md:right-12 top-1/2 -translate-y-1/2"
        initial={{ opacity: 0, x: 30, scale: 0.8 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6, type: 'spring' }}
        animate={{
          y: [0, 8, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3"
          style={{
            boxShadow: `
              4px 4px 12px rgba(163, 158, 145, 0.15),
              -2px -2px 8px rgba(255, 255, 255, 0.9)
            `,
          }}
        >
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-amber-600" fill="#D97706" />
          <span className="text-xs md:text-sm font-semibold text-ceramic-text-primary whitespace-nowrap">
            Insight
          </span>
        </div>
      </motion.div>

      {/* Decorative sparkles */}
      <motion.div
        className="absolute top-8 right-1/4"
        animate={{
          opacity: [0.3, 0.7, 0.3],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Sparkles className="w-4 h-4 text-amber-500" fill="#F59E0B" opacity={0.6} />
      </motion.div>
      <motion.div
        className="absolute bottom-12 left-1/3"
        animate={{
          opacity: [0.4, 0.8, 0.4],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      >
        <Sparkles className="w-3 h-3 text-amber-400" fill="#FBBF24" opacity={0.5} />
      </motion.div>
    </motion.div>
  );
}

export default SelfKnowledgeMockup;
