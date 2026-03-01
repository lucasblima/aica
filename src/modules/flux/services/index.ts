/**
 * Flux Module Services - Barrel Export
 *
 * All CRUD services for Flux/Flow module tables
 */

// Base Flux services
export { AthleteService } from './athleteService';
export type { CreateAthleteInput, UpdateAthleteInput } from './athleteService';

// Flow module services
export { WorkoutTemplateService } from './workoutTemplateService';

export { MicrocycleService } from './microcycleService';

export { WorkoutSlotService } from './workoutSlotService';
export type { CreateWorkoutSlotInput, UpdateWorkoutSlotInput } from './workoutSlotService';

export { AthleteProfileService } from './athleteProfileService';

export { AutomationService } from './automationService';
export { AutomationEngineService } from './automationEngineService';


// AI services
export { FluxAIService } from './fluxAIService';
export type { LoadAnalysisResult, LoadSuggestion, LoadAdjustmentAI, RecoveryResult, WeeklySummaryResult } from './fluxAIService';

// Exercise library
export { ExerciseService } from './exerciseService';
export type { Exercise, CreateExerciseInput, UpdateExerciseInput, ExerciseFilters } from './exerciseService';

// WhatsApp integration
export { publishWorkoutViaWhatsApp, updateScheduledWorkoutStatus } from './fluxWhatsAppService';
export type { PublishWorkoutParams, PublishWorkoutResult } from './fluxWhatsAppService';

// Utility services
export { IntensityCalculatorService } from './intensityCalculatorService';
export { LevelingEngineService } from './levelingEngineService';

// Performance tests
export { PerformanceTestService } from './performanceTestService';
export type {
  PerformanceTest,
  PerformanceTestType,
  PerformanceTestUnit,
  CreatePerformanceTestInput,
  UpdatePerformanceTestInput,
} from './performanceTestService';

// Cross-module bridges
export { createTrainingMoment, recordWorkoutCompletion } from './fluxJourneyBridge';
export { createMicrocycleTask, completeMicrocycleTask } from './fluxAtlasBridge';

// Fatigue modeling (Sprint 6 — Training Science)
export {
  computeEMA,
  computeCTL,
  computeATL,
  computeTSB,
  computeTrainingLoad,
  classifyFatigueRisk,
  computeACWR,
  assessReadiness,
  computeSessionRPE,
  computeFluxDomainScore,
  storeStressEntry,
  updateAthleteReadiness,
  getStressHistory,
} from './fatigueModeling';
export type {
  DailyStressEntry,
  TrainingLoadMetrics,
  FatigueRisk,
  ReadinessAssessment,
  StressHistoryRow,
} from './fatigueModeling';
