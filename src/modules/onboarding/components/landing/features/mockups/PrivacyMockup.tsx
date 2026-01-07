import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface PrivacyMockupProps {
  className?: string;
}

/**
 * PrivacyMockup Component
 *
 * Mockup representing data privacy and encryption.
 * Features:
 * - Lock icon with ceramic elevation
 * - Blurred text lines simulating protected data
 * - Purple/lavender gradient background
 * - Subtle pulse animation on lock icon
 *
 * Aspect Ratio: Square (fills large-square BentoCard)
 */
export function PrivacyMockup({ className = '' }: PrivacyMockupProps) {
  return (
    <motion.div
      className={`relative w-full h-full flex flex-col items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
        }}
      />

      {/* Blurred data lines */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 md:p-12">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-full max-w-xs h-3 md:h-4 rounded-full bg-white/40"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          />
        ))}
      </div>

      {/* Lock Icon - Central Focus */}
      <motion.div
        className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-ceramic-base flex items-center justify-center"
        style={{
          boxShadow: `
            6px 6px 16px rgba(163, 158, 145, 0.20),
            -6px -6px 16px rgba(255, 255, 255, 0.90)
          `,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5, type: 'spring', stiffness: 200 }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Lock className="w-12 h-12 md:w-16 md:h-16 text-purple-600" strokeWidth={1.5} />
      </motion.div>

      {/* Decorative frosted circles */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/20"
        style={{
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-24 h-24 md:w-36 md:h-36 rounded-full bg-white/30"
        style={{
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />
    </motion.div>
  );
}

export default PrivacyMockup;
