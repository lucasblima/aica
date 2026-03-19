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
import { createNamespacedLogger } from '@/lib/logger';
import { HelpCircle } from 'lucide-react';

const log = createNamespacedLogger('HelpButton');
import { useTour } from '@/contexts/TourContext';

interface HelpButtonProps {
  tourKey: string;
  className?: string;
}

/**
 * Safe wrapper that catches context errors from useTour.
 * The hook is always called (not conditional), but if TourProvider
 * is missing, useTour() throws — we catch at the ErrorBoundary level
 * by wrapping the inner component.
 */
function HelpButtonInner({ tourKey, className = '' }: HelpButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { startTour } = useTour();

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsLoading(true);
      // forceStart = true allows re-watching completed tours
      await startTour(tourKey, true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      log.error('[HelpButton] Error starting tour:', errorMsg);
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
}

class HelpButtonErrorBoundary extends React.Component<
  { children: React.ReactNode; className?: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; className?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    log.warn('[HelpButton] TourContext not available:', error);
  }

  render() {
    if (this.state.hasError) {
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
            ${this.props.className || ''}
          `}
          aria-label="Tour indisponível"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      );
    }
    return this.props.children;
  }
}

export const HelpButton: React.FC<HelpButtonProps> = ({ tourKey, className = '' }) => {
  return (
    <HelpButtonErrorBoundary className={className}>
      <HelpButtonInner tourKey={tourKey} className={className} />
    </HelpButtonErrorBoundary>
  );
};
