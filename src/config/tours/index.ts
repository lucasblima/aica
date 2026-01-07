/**
 * Central export for all tour configurations
 * Each tour is a guided introduction to a specific app feature
 */

import { TourConfig } from '@/contexts/TourContext';
import { atlasFirstVisitTour } from './atlasFirstVisitTour';
import { journeyFirstVisitTour } from './journeyFirstVisitTour';
import { studioFirstVisitTour } from './studioFirstVisitTour';
import { financeFirstVisitTour } from './financeFirstVisitTour';
import { grantsFirstVisitTour } from './grantsFirstVisitTour';

/**
 * All available tours
 * Add new tours here as they are created
 */
export const allTours: TourConfig[] = [
  atlasFirstVisitTour,
  journeyFirstVisitTour,
  studioFirstVisitTour,
  financeFirstVisitTour,
  grantsFirstVisitTour,
];

export {
  atlasFirstVisitTour,
  journeyFirstVisitTour,
  studioFirstVisitTour,
  financeFirstVisitTour,
  grantsFirstVisitTour,
};
