/**
 * Flux Module Types - Public API
 *
 * Centralized export for all Flux module types.
 * Import from this file to access any Flux-related types.
 *
 * @example
 * ```ts
 * import type { FluxState, Athlete, Alert } from '@/modules/flux/types'
 * ```
 */

// ============================================
// CORE FLUX TYPES
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
  TrainingModality,

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
  FluxMode,
  FluxState,
  FluxAction,
  FluxContextValue,
  FluxActions,

  // Component Props
  AthleteCardProps,
  AlertBadgeProps,
  LevelBadgeProps,
  ProgressionBarProps,

  // Helper Types
  FluxLoadResult,
  AthleteWithMetrics,
} from './flux';

export {
  INITIAL_FLUX_STATE,
  LEVEL_LABELS,
  STATUS_CONFIG,
  SEVERITY_COLORS,
  MODALITY_CONFIG,
  TRAINING_MODALITIES,
} from './flux';
