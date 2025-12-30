import React from 'react';
import { motion } from 'framer-motion';

interface CeramicDesignMockupProps {
  className?: string;
}

/**
 * CeramicDesignMockup Component
 *
 * Showcases the neumorphic/ceramic design system elements.
 * Features:
 * - Elevated ceramic button (shadow-out)
 * - Recessed ceramic input (shadow-in)
 * - Mini progress bar with amber gradient
 * - Uses actual ceramic CSS classes for authenticity
 *
 * Aspect Ratio: Horizontal 16:9 (wide-rectangle BentoCard)
 */
export function CeramicDesignMockup({ className = '' }: CeramicDesignMockupProps) {
  return (
    <motion.div
      className={`relative w-full h-full flex items-center justify-center p-6 md:p-8 ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
        }}
      />

      {/* Ceramic UI Elements Container */}
      <div className="relative z-10 w-full max-w-xs md:max-w-sm space-y-4 md:space-y-6">
        {/* Elevated Button */}
        <motion.button
          className="ceramic-card w-full h-12 md:h-14 rounded-2xl flex items-center justify-center"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-sm md:text-base font-semibold text-ceramic-text-primary">
            Botao Ceramico
          </span>
        </motion.button>

        {/* Recessed Input */}
        <motion.div
          className="ceramic-inset h-12 md:h-14 rounded-2xl px-4 flex items-center"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-sm md:text-base text-ceramic-text-secondary italic">
            Campo recuado...
          </span>
        </motion.div>

        {/* Progress Bar with Amber Gradient */}
        <motion.div
          className="space-y-2"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
            <span>Progresso</span>
            <span className="font-bold">68%</span>
          </div>
          <div className="ceramic-progress-groove h-2.5">
            <motion.div
              className="ceramic-progress-fill h-full"
              initial={{ width: 0 }}
              whileInView={{ width: '68%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
          </div>
        </motion.div>

        {/* Small Badge Demo */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <div className="ceramic-badge-gold flex items-center gap-2 px-3 py-1.5">
            <span className="text-xs font-bold">5</span>
            <span className="text-xs">Nivel</span>
          </div>
          <div className="ceramic-inset-sm text-xs text-ceramic-text-secondary">
            Explorador
          </div>
        </motion.div>
      </div>

      {/* Decorative texture hint - subtle macro pattern */}
      <div
        className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(217, 119, 6, 0.3) 1px, transparent 1px)',
          backgroundSize: '8px 8px',
        }}
      />
    </motion.div>
  );
}

export default CeramicDesignMockup;
