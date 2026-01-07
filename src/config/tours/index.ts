/**
 * Central export for all tour configurations
 * Each tour is a guided introduction to a specific app feature
 */

import { TourConfig } from '@/contexts/TourContext';
import { atlasFirstVisitTour } from './atlasFirstVisitTour';

/**
 * All available tours
 * Add new tours here as they are created
 */
export const allTours: TourConfig[] = [
  atlasFirstVisitTour,
  // journeyFirstVisitTour, // To be created in Phase 2
  // studioFirstVisitTour, // To be created in Phase 2
  // financeFirstVisitTour, // To be created in Phase 2
  // grantsFirstVisitTour, // To be created in Phase 2
];

export { atlasFirstVisitTour };
// Additional exports for Phase 2 tours will be added here
