/**
 * Flux Module - Public API
 *
 * Barrel export for the Flux swim training management module.
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
  FluxProvider,
  useFlux,
  useFluxMode,
  useSelectedAthleteId,
  useSelectedBlockId,
  useAlertFilters,
  useIsCanvasEditMode,
} from './context/FluxContext';

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

export { default as FluxDashboard } from './views/FluxDashboard';
export { default as AthleteDetailView } from './views/AthleteDetailView';
export { default as CanvasEditorView } from './views/CanvasEditorView';
export { default as AlertsView } from './views/AlertsView';
