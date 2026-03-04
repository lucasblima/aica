/**
 * Flux Module Hooks - Barrel Export
 *
 * Real-time hooks for Flow module data subscriptions
 */

export { useAthletes } from './useAthletes';
export type { UseAthletesOptions } from './useAthletes';

export { useWorkoutTemplates } from './useWorkoutTemplates';

export { useMicrocycles } from './useMicrocycles';
export type { UseMicrocyclesOptions } from './useMicrocycles';

export { useWorkoutSlots } from './useWorkoutSlots';

export { useAutomations } from './useAutomations';
export type { UseAutomationsOptions } from './useAutomations';

export { useAlerts } from './useAlerts';
export type { UseAlertsReturn } from './useAlerts';

export { useExercises } from './useExercises';
export type { UseExercisesOptions, UseExercisesReturn } from './useExercises';

export { useCanvasSlots } from './useCanvasSlots';
export type { UseCanvasSlotsOptions, UseCanvasSlotsReturn } from './useCanvasSlots';

export { useCanvasDragDrop } from './useCanvasDragDrop';
export type { UseCanvasDragDropOptions, UseCanvasDragDropReturn } from './useCanvasDragDrop';

export { useCanvasLoadCalc } from './useCanvasLoadCalc';
export type { UseCanvasLoadCalcOptions, UseCanvasLoadCalcReturn } from './useCanvasLoadCalc';

export { useAthleteForm, MODALITY_OPTIONS, LEVEL_OPTIONS } from './useAthleteForm';
export type {
  AthleteFormData,
  AthleteFormErrors,
  UseAthleteFormOptions,
  UseAthleteFormReturn,
} from './useAthleteForm';

export { useFluxGamification } from './useFluxGamification';
export type { FluxGamificationHook } from './useFluxGamification';

export { usePerformanceTests } from './usePerformanceTests';
export type { UsePerformanceTestsOptions, UsePerformanceTestsReturn } from './usePerformanceTests';

export { useAthleteFeedback } from './useAthleteFeedback';
export type {
  FeedbackEntry,
  FeedbackEntryRow,
  FeedbackSlotSummary,
  WeekFeedbackSummary,
  QuestionnaireData,
  SubmitDailyFeedbackInput,
  SubmitExerciseFeedbackInput,
  SubmitWeeklyFeedbackInput,
} from './useAthleteFeedback';

// Training Science (Sprint 6 — Fatigue Modeling)
export { useTrainingLoad } from './useTrainingLoad';
export type { UseTrainingLoadOptions, UseTrainingLoadReturn } from './useTrainingLoad';

export { useAthleteReadiness } from './useAthleteReadiness';
export type { UseAthleteReadinessOptions, UseAthleteReadinessReturn } from './useAthleteReadiness';

// Coach Availability (Edge Function: fetch-coach-availability)
export { useCoachAvailability } from './useCoachAvailability';
export type { CoachBusySlot, UseCoachAvailabilityOptions, UseCoachAvailabilityReturn } from './useCoachAvailability';

// Athlete Fatigue Assessment (Edge Function: assess-athlete-fatigue)
export { useAthleteFatigue } from './useAthleteFatigue';
export type { FatigueAssessment, UseAthleteFatigueOptions, UseAthleteFatigueReturn } from './useAthleteFatigue';
