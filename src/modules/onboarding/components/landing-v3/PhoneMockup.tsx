import React from 'react';
import { motion } from 'framer-motion';
import { springElevation } from '../../../../lib/animations/ceramic-motion';

interface PhoneMockupProps {
  className?: string;
}

/**
 * PhoneMockup - Giant phone mockup with bleeding effect
 *
 * Part of the "Monolith" hero section with Apple-level scale.
 * Features contact shadow for grounded physical presence.
 */
export function PhoneMockup({ className = '' }: PhoneMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Phone Body */}
      <motion.div
        className="relative z-10 bg-gradient-to-br from-ceramic-text-primary to-ceramic-text-secondary rounded-[60px] p-3 shadow-2xl"
        initial={{ opacity: 0, y: 80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springElevation}
      >
        {/* Screen */}
        <div className="relative bg-gradient-to-br from-ceramic-base via-white to-ceramic-highlight rounded-[52px] overflow-hidden aspect-[9/19.5]">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-ceramic-text-primary rounded-b-3xl z-20" />

          {/* Screen Content Placeholder - Gradient Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-ceramic-accent/20 via-transparent to-transparent" />

          {/* Optional: Add screenshot overlay later */}
        </div>
      </motion.div>

      {/* Contact Shadow - Critical for "weight" */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-gradient-radial from-black/20 via-black/5 to-transparent blur-3xl rounded-full"
        aria-hidden="true"
      />
    </div>
  );
}
