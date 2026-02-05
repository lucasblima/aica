/**
 * SwimFlux Module Types - Public API
 *
 * Centralized export for all SwimFlux module types.
 * Import from this file to access any SwimFlux-related types.
 *
 * @example
 * ```ts
 * import type { SwimFluxState, Athlete, Alert } from '@/modules/swimflux/types'
 * ```
 */

// ============================================
// CORE SWIMFLUX TYPES
// ============================================

export type {
  // Enums
  AthleteLevel,
  AthleteStatus,
  BlockStatus,
  PlanStatus,
  AlertType,
  AlertSeverity,
  ExerciseCategory,

  // Database Models
  Athlete,
  AnamnesisData,
  WorkoutBlock,
  CanvasData,
  WeekData,
  DayData,
  ExerciseInstance,
  WeeklyPlan,
  Feedback,
  IAAnalysis,
  Alert,
  Exercise,

  // UI State
  SwimFluxMode,
  SwimFluxState,
  SwimFluxAction,
  SwimFluxContextValue,
  SwimFluxActions,

  // Component Props
  AthleteCardProps,
  AlertBadgeProps,
  LevelBadgeProps,
  ProgressionBarProps,

  // Helper Types
  SwimFluxLoadResult,
  AthleteWithMetrics,
} from './swimflux';

export {
  INITIAL_SWIMFLUX_STATE,
  LEVEL_LABELS,
  STATUS_CONFIG,
  SEVERITY_COLORS,
} from './swimflux';
