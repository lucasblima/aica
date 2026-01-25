/**
 * Central export for all tour configurations
 * Each tour is a guided introduction to a specific app feature
 *
 * Tours are non-blocking and contextual - they appear when relevant
 * and users can skip without consequences (organic onboarding).
 */

import { TourConfig } from '@/contexts/TourContext';
import { atlasFirstVisitTour } from './atlasFirstVisitTour';
import { journeyFirstVisitTour } from './journeyFirstVisitTour';
import { studioFirstVisitTour } from './studioFirstVisitTour';
import { financeFirstVisitTour } from './financeFirstVisitTour';
import { grantsFirstVisitTour } from './grantsFirstVisitTour';
import { gamificationIntroTour } from './gamificationIntroTour';

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
  gamificationIntroTour,
];

/**
 * Get tour by key
 */
export function getTourByKey(key: string): TourConfig | undefined {
  return allTours.find(tour => tour.key === key);
}

/**
 * Get tours for a specific module
 */
export function getToursByModule(module: TourConfig['module']): TourConfig[] {
  return allTours.filter(tour => tour.module === module);
}

/**
 * Get auto-start tours
 */
export function getAutoStartTours(): TourConfig[] {
  return allTours.filter(tour => tour.autoStart);
}

export {
  atlasFirstVisitTour,
  journeyFirstVisitTour,
  studioFirstVisitTour,
  financeFirstVisitTour,
  grantsFirstVisitTour,
  gamificationIntroTour,
};
