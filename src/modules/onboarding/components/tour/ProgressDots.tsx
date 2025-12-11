/**
 * Progress Dots Component
 * Navigation indicator showing current slide and allowing jump navigation
 *
 * Features:
 * - Animated dot transitions
 * - Click to navigate to specific slide
 * - Keyboard accessible
 * - Visual feedback for current position
 * - WCAG AAA compliant
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { Pillar } from '../../../../data/pillarData';

interface ProgressDotsProps {
  pillars: Pillar[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  ariaLabel?: string;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  pillars,
  currentIndex,
  onNavigate,
  ariaLabel = 'Tour navigation dots',
}) => {
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    // Allow Enter or Space to navigate
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigate(index);
    }
  };

  return (
    <nav
      className="flex items-center justify-center gap-3"
      aria-label={ariaLabel}
      role="tablist"
    >
      {pillars.map((pillar, index) => (
        <motion.button
          key={`dot-${pillar.id}`}
          onClick={() => onNavigate(index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`relative rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
            index === currentIndex ? 'h-3 w-8' : 'h-2 w-2'
          }`}
          style={{
            backgroundColor:
              index === currentIndex ? pillar.color : '#D0CCC6',
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            width: index === currentIndex ? 32 : 8,
            height: index === currentIndex ? 12 : 8,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          aria-label={`Go to ${pillar.name} slide`}
          aria-selected={index === currentIndex}
          role="tab"
          tabIndex={index === currentIndex ? 0 : -1}
        />
      ))}
    </nav>
  );
};
