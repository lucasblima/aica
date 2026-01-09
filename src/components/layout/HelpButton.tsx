/**
 * HelpButton Component
 * Icon-only help button that triggers optional tours on-demand
 *
 * Features:
 * - Click to start/restart tour
 * - Matches SettingsMenu styling (ceramic-card, w-10 h-10)
 * - Hover animation (rotate-90 transition)
 * - Allows re-watching completed tours (silent re-watch, no DB reset)
 * - Screen reader accessible (aria-label)
 * - Mobile responsive (48px+ touch target)
 */

import React, { useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTour } from '@/contexts/TourContext';

interface HelpButtonProps {
  tourKey: string;
  className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  tourKey,
  className = ''
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  let tourContext;
  try {
    tourContext = useTour();
  } catch (err) {
    console.warn('[HelpButton] TourContext not available:', err);
    // Render disabled button if TourContext is not available
    return (
      <button
        disabled
        title="Tour system not available"
        className={`
          w-10 h-10
          ceramic-card
          flex items-center justify-center
          text-ceramic-text-secondary
          opacity-30
          cursor-not-allowed
          ${className}
        `}
        aria-label="Tour indisponível"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    );
  }

  const { startTour } = tourContext;

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsLoading(true);
      // forceStart = true allows re-watching completed tours
      await startTour(tourKey, true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[HelpButton] Error starting tour:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [startTour, tourKey]);

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        w-10 h-10
        ceramic-card
        flex items-center justify-center
        text-ceramic-text-secondary
        hover:text-ceramic-text-primary
        hover:rotate-90
        transition-all
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
      aria-label="Iniciar tour"
      title="Iniciar tour"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
};
