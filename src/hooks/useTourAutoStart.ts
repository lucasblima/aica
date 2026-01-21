import { useEffect } from 'react';
import { useTour } from '@/contexts/TourContext';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useTourAutoStart');

/**
 * Hook to auto-start a tour if the user hasn't seen it before
 * Use this in the main component of each feature module
 *
 * @param tourKey - The unique key of the tour to auto-start
 *
 * @example
 * // In AtlasModule component
 * useTourAutoStart('atlas-first-visit');
 */
export const useTourAutoStart = (tourKey: string): void => {
  const { startTour, hasTourCompleted, isLoading } = useTour();

  useEffect(() => {
    // Only auto-start if tour is enabled and user hasn't completed it
    if (!isLoading && !hasTourCompleted(tourKey)) {
      startTour(tourKey).catch(err => {
        log.error(`Failed to start tour ${tourKey}:`, err);
      });
    }
  }, [tourKey, startTour, hasTourCompleted, isLoading]);
};
