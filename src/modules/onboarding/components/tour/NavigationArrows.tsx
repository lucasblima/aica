/**
 * Navigation Arrows Component
 * Previous/Next navigation buttons for tour carousel
 *
 * Features:
 * - Animated arrow buttons
 * - Disabled state when at boundaries
 * - Keyboard accessible
 * - Tooltip hints
 * - WCAG AAA compliant
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationArrowsProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  ariaLabel?: string;
}

export const NavigationArrows: React.FC<NavigationArrowsProps> = ({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  ariaLabel = 'Tour carousel navigation',
}) => {
  const buttonBaseClasses =
    'flex items-center justify-center w-12 h-12 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500';

  const buttonDisabledClasses = 'opacity-30 cursor-not-allowed';

  return (
    <div
      className="flex items-center justify-center gap-6"
      aria-label={ariaLabel}
      role="group"
    >
      {/* Previous Button */}
      <motion.button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className={`${buttonBaseClasses} ${
          !canGoPrevious ? buttonDisabledClasses : 'bg-white hover:bg-gray-50 border border-gray-200'
        }`}
        whileHover={canGoPrevious ? { scale: 1.1 } : {}}
        whileTap={canGoPrevious ? { scale: 0.95 } : {}}
        aria-label={canGoPrevious ? 'Previous slide' : 'First slide'}
        title={canGoPrevious ? 'Slide anterior' : 'Você está no primeiro slide'}
      >
        <ChevronLeft
          size={24}
          className={canGoPrevious ? 'text-[#5C554B]' : 'text-[#C9C3B8]'}
        />
      </motion.button>

      {/* Next Button */}
      <motion.button
        onClick={onNext}
        disabled={!canGoNext}
        className={`${buttonBaseClasses} ${
          !canGoNext ? buttonDisabledClasses : 'bg-white hover:bg-gray-50 border border-gray-200'
        }`}
        whileHover={canGoNext ? { scale: 1.1 } : {}}
        whileTap={canGoNext ? { scale: 0.95 } : {}}
        aria-label={canGoNext ? 'Next slide' : 'Last slide'}
        title={canGoNext ? 'Próximo slide' : 'Você está no último slide'}
      >
        <ChevronRight
          size={24}
          className={canGoNext ? 'text-[#5C554B]' : 'text-[#C9C3B8]'}
        />
      </motion.button>
    </div>
  );
};
