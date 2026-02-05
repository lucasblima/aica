/**
 * SwimFlux Module - Public API
 *
 * Barrel export for the SwimFlux swim training management module.
 * Lazy-loaded by AppRouter.tsx
 */

// ============================================
// TYPES
// ============================================

export type * from './types';

// ============================================
// CONTEXT
// ============================================

export {
  SwimFluxProvider,
  useSwimFlux,
  useSwimFluxMode,
  useSelectedAthleteId,
  useSelectedBlockId,
  useAlertFilters,
  useIsCanvasEditMode,
} from './context/SwimFluxContext';

// ============================================
// MOCK DATA (Development only)
// ============================================

export {
  MOCK_ATHLETES,
  MOCK_ATHLETES_WITH_METRICS,
  MOCK_WORKOUT_BLOCKS,
  MOCK_FEEDBACKS,
  MOCK_ALERTS,
  MOCK_EXERCISES,
  getMockAthleteById,
  getMockAthleteWithMetricsById,
  getMockAlertsForAthlete,
  getMockFeedbacksForAthlete,
  getMockActiveBlockForAthlete,
  getMockUnacknowledgedAlerts,
  getMockAlertsBySeverity,
} from './mockData';

// ============================================
// VIEWS (Lazy-loaded by router)
// ============================================

export { default as SwimFluxDashboard } from './views/SwimFluxDashboard';
export { default as AthleteDetailView } from './views/AthleteDetailView';
export { default as CanvasEditorView } from './views/CanvasEditorView';
export { default as AlertsView } from './views/AlertsView';
