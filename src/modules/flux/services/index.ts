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


// Utility services
export { IntensityCalculatorService } from './intensityCalculatorService';
export { LevelingEngineService } from './levelingEngineService';
