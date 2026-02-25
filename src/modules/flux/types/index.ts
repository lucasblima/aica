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
  InvitationStatus,
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

  // Athlete Groups (localStorage-based)
  AthleteGroupData,
  AthleteGroup,

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
  ModalityLevel,

  // Athlete Portal
  MyAthleteProfile,
} from './flux';

export {
  INITIAL_FLUX_STATE,
  LEVEL_LABELS,
  STATUS_CONFIG,
  SEVERITY_COLORS,
  MODALITY_CONFIG,
  TRAINING_MODALITIES,
  GROUP_COLORS,
  getGroupColorClasses,
} from './flux';

// ============================================
// FLOW MODULE TYPES (Intelligent Prescription System)
// ============================================

export type {
  // Enums & Constants
  WorkoutCategory,
  WorkoutIntensity,
  MicrocycleWeekFocus,
  MicrocycleStatus,
  PaceZone,
  SendMethod,
  ScheduledWorkoutStatus,
  AutomationTriggerType,
  AutomationActionType,
  CoachMessageTriggerType,

  // Exercise Structure (V2 from series.ts, re-exported via flow.ts)
  ExerciseStructureV2,

  // Workout Templates
  WorkoutTemplate,
  WorkoutTemplateV2,
  CreateWorkoutTemplateV2Input,
  UpdateWorkoutTemplateV2Input,
  WorkoutCategorySimplified,

  // Microcycles (3-week planning)
  Microcycle,
  CreateMicrocycleInput,
  UpdateMicrocycleInput,

  // Workout Slots
  WorkoutSlot,
  CreateWorkoutSlotInput,
  UpdateWorkoutSlotInput,

  // Athlete Profiles (Flow)
  FlowAthleteProfile,
  CreateFlowAthleteProfileInput,
  UpdateFlowAthleteProfileInput,

  // Coach Messages
  CoachMessage,
  CreateCoachMessageInput,
  UpdateCoachMessageInput,

  // Scheduled Workouts
  ScheduledWorkout,
  CreateScheduledWorkoutInput,
  UpdateScheduledWorkoutInput,

  // Workout Automations
  WorkoutAutomation,
  CreateWorkoutAutomationInput,
  UpdateWorkoutAutomationInput,

  // Computed/Helper Types
  MicrocycleWithSlots,
  WeekSummary,
  IntensityCalculation,
  LevelingRecommendation,
  AutomationLog,

  // UI State Types
  TemplateFilters,
  MicrocycleEditorState,
  CRMFilters,
  BulkActionPayload,

  // API Response Types
  FlowModuleStats,
  TemplateUsageStats,
} from './flow';

// ============================================
// ZONE TYPES (Intensity Zones)
// ============================================

export type {
  FTPZone,
  CSSZone,
  PaceZoneInfo,
} from './zones';

export {
  FTP_ZONES,
  CSS_ZONES,
  PACE_ZONES,
  getZoneColor,
  getPaceZoneInfo,
  getFTPZoneByPercentage,
  getCSSZoneByPercentage,
  getRPEColor,
  getRPELabel,
} from './zones';

// ============================================
// PAR-Q TYPES
// ============================================

export type {
  ParQRiskLevel,
  ParQClearanceStatus,
  MedicalDocumentType,
  ParQWizardStep,
  FollowUpCategory,
  ParQClassicQuestion,
  FollowUpQuestion,
  FollowUpCategoryBlock,
  ParQResponse,
  AthleteDocument,
  ParQWizardState,
  ParQStatus,
  WorkoutClearanceResult,
  SubmitParQInput,
  UploadDocumentInput,
} from './parq';
