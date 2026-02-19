import { useEffect } from 'react';
import { useTour } from '@/contexts/TourContext';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useTourAutoStart');

// Tour configs with autoStart flag — import here to check before triggering
import { journeyFirstVisitTour } from '@/config/tours/journeyFirstVisitTour';
import { atlasFirstVisitTour } from '@/config/tours/atlasFirstVisitTour';
import { studioFirstVisitTour } from '@/config/tours/studioFirstVisitTour';
import { fluxFirstVisitTour } from '@/config/tours/fluxFirstVisitTour';
import { grantsFirstVisitTour } from '@/config/tours/grantsFirstVisitTour';
import { financeFirstVisitTour } from '@/config/tours/financeFirstVisitTour';

const TOUR_CONFIGS: Record<string, { autoStart?: boolean }> = {
  'journey-first-visit': journeyFirstVisitTour,
  'atlas-first-visit': atlasFirstVisitTour,
  'studio-first-visit': studioFirstVisitTour,
  'flux-first-visit': fluxFirstVisitTour,
  'grants-first-visit': grantsFirstVisitTour,
  'finance-first-visit': financeFirstVisitTour,
};

/**
 * Hook to auto-start a tour if the user hasn't seen it before
 * Use this in the main component of each feature module
 *
 * Respects the `autoStart` flag in the tour config — if `autoStart: false`,
 * the tour will NOT start automatically (but can still be triggered manually
 * via HelpButton or startTour with forceStart).
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
    // Check if autoStart is enabled in the tour config
    const config = TOUR_CONFIGS[tourKey];
    if (config && config.autoStart === false) {
      log.debug(`Tour ${tourKey} has autoStart disabled, skipping`);
      return;
    }

    // Only auto-start if tour is enabled and user hasn't completed it
    if (!isLoading && !hasTourCompleted(tourKey)) {
      startTour(tourKey).catch(err => {
        log.error(`Failed to start tour ${tourKey}:`, err);
      });
    }
  }, [tourKey, startTour, hasTourCompleted, isLoading]);
};
