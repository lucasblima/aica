/**
 * Series-Based Workout Types (V2)
 *
 * New simplified type system for workout templates based on series structure.
 * Replaces complex interval/sets system with unified series approach.
 *
 * Key changes from V1:
 * - Removed standalone intensity section (embedded in each series)
 * - Unified 3 editors (Sets/Intervals/Distance) into single SeriesEditor
 * - Added warmup/cooldown text fields
 * - Introduced visual timeline for zone distribution
 */

import type { TrainingModality, AthleteLevel } from './flux';

// ============================================================================
// UNIT TYPES
// ============================================================================

export type TimeUnit = 'minutes' | 'seconds';
export type DistanceUnit = 'meters';
export type CyclingUnit = 'time' | 'distance';

// ============================================================================
// INTENSITY ZONES (Universal for Cardio)
// ============================================================================

export type IntensityZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';

export interface ZoneConfig {
  zone: IntensityZone;
  range: string; // "≤60%", "60-70%", etc.
  color: string; // Tailwind gradient class for zone selector buttons
  bgColor: string; // Solid background color for timeline visual
}

/**
 * Zone configurations with gradient colors and ranges
 */
export const ZONE_CONFIGS: Record<IntensityZone, ZoneConfig> = {
  Z1: {
    zone: 'Z1',
    range: '≤60%',
    color: 'bg-green-500',
    bgColor: 'bg-green-500',
  },
  Z2: {
    zone: 'Z2',
    range: '60-70%',
    color: 'bg-gradient-to-r from-green-500 to-yellow-500',
    bgColor: 'bg-yellow-400',
  },
  Z3: {
    zone: 'Z3',
    range: '70-80%',
    color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    bgColor: 'bg-orange-400',
  },
  Z4: {
    zone: 'Z4',
    range: '80-90%',
    color: 'bg-gradient-to-r from-orange-500 to-red-500',
    bgColor: 'bg-red-400',
  },
  Z5: {
    zone: 'Z5',
    range: '≥90%',
    color: 'bg-red-500',
    bgColor: 'bg-red-500',
  },
};

// ============================================================================
// SERIES TYPES (Modality-Specific)
// ============================================================================

/**
 * Base interface for all series types
 */
interface SeriesBase {
  id: string; // UUID for React keys
  repetitions: number; // How many times to repeat this series (e.g., 4x)
  rest_minutes: number; // Interval rest minutes
  rest_seconds: number; // Interval rest seconds
  /** @deprecated Use rest_minutes + rest_seconds instead */
  rest_value?: number;
  /** @deprecated Use rest_minutes + rest_seconds instead */
  rest_unit?: TimeUnit;
}

/**
 * Running/Walking series with flexible unit selection
 */
export interface RunningSeries extends SeriesBase {
  type: 'running' | 'walking';
  work_value: number;
  work_unit: TimeUnit | DistanceUnit; // minutes | seconds | meters
  zone: IntensityZone;
}

/**
 * Swimming series (distance-only in meters)
 */
export interface SwimmingSeries extends SeriesBase {
  type: 'swimming';
  distance_meters: number;
  zone: IntensityZone;
}

/**
 * Cycling series with time/distance toggle
 */
export interface CyclingSeries extends SeriesBase {
  type: 'cycling';
  work_value: number;
  work_unit: CyclingUnit; // 'time' or 'distance'
  unit_detail: TimeUnit | DistanceUnit; // if time: minutes/seconds, if distance: meters
  zone: IntensityZone;
}

/**
 * Strength series (no zones, uses load and reps)
 */
export interface StrengthSeries extends SeriesBase {
  type: 'strength';
  reps: number;
  load_kg: number;
}

/**
 * Union type for all series variants
 */
export type WorkoutSeries = RunningSeries | SwimmingSeries | CyclingSeries | StrengthSeries;

// ============================================================================
// EXERCISE STRUCTURE V2
// ============================================================================

/**
 * New exercise structure with warmup + series + cooldown
 */
export interface ExerciseStructureV2 {
  warmup: string; // max 280 chars
  series: WorkoutSeries[];
  cooldown: string; // max 280 chars
}

// ============================================================================
// WORKOUT CATEGORY (Simplified)
// ============================================================================

/**
 * Simplified workout categories (removed 'recovery' and 'test')
 */
export type WorkoutCategorySimplified = 'warmup' | 'main' | 'cooldown';

// ============================================================================
// WORKOUT TEMPLATE V2
// ============================================================================

/**
 * New simplified workout template
 *
 * Removed fields from V1:
 * - duration (calculated from series)
 * - intensity (embedded in each series via zones)
 * - ftp_percentage, pace_zone, css_percentage, rpe (replaced by zones)
 * - tags, level, is_public, is_favorite (organizational fields removed)
 */
export interface WorkoutTemplateV2 {
  id: string;
  user_id: string;

  // Basic Info (reordered: modality first, then category)
  name: string;
  description?: string;
  modality: TrainingModality;
  category: WorkoutCategorySimplified;

  // Exercise Details
  exercise_structure?: ExerciseStructureV2;

  // Metadata
  created_at: string;
  updated_at: string;
  usage_count: number;
}

/**
 * Input type for creating new templates
 */
export interface CreateWorkoutTemplateV2Input {
  name: string;
  description?: string;
  modality: TrainingModality;
  category: WorkoutCategorySimplified;
  exercise_structure?: ExerciseStructureV2;
}

/**
 * Input type for updating existing templates
 */
export interface UpdateWorkoutTemplateV2Input extends Partial<CreateWorkoutTemplateV2Input> {
  id: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates an empty series based on modality
 */
export function createEmptySeries(modality: TrainingModality): WorkoutSeries {
  const id = crypto.randomUUID();

  switch (modality) {
    case 'running':
    case 'walking':
      return {
        id,
        type: modality,
        repetitions: 1,
        work_value: 0,
        work_unit: 'minutes',
        zone: 'Z2',
        rest_minutes: 0,
        rest_seconds: 0,
      };

    case 'swimming':
      return {
        id,
        type: 'swimming',
        repetitions: 1,
        distance_meters: 0,
        zone: 'Z2',
        rest_minutes: 0,
        rest_seconds: 0,
      };

    case 'cycling':
      return {
        id,
        type: 'cycling',
        repetitions: 1,
        work_value: 0,
        work_unit: 'time',
        unit_detail: 'minutes',
        zone: 'Z2',
        rest_minutes: 0,
        rest_seconds: 0,
      };

    case 'strength':
      return {
        id,
        type: 'strength',
        repetitions: 1,
        reps: 0,
        load_kg: 0,
        rest_minutes: 0,
        rest_seconds: 0,
      };

    default:
      return {
        id,
        type: 'running',
        repetitions: 1,
        work_value: 0,
        work_unit: 'minutes',
        zone: 'Z2',
        rest_minutes: 0,
        rest_seconds: 0,
      };
  }
}

/**
 * Type guard to check if series has zones (cardio modalities)
 */
export function isCardioSeries(
  series: WorkoutSeries
): series is RunningSeries | SwimmingSeries | CyclingSeries {
  return 'zone' in series;
}

/**
 * Type guard to check if series is strength
 */
export function isStrengthSeries(series: WorkoutSeries): series is StrengthSeries {
  return series.type === 'strength';
}

/**
 * Calculate total duration from series (approximate, in minutes)
 */
export function calculateTotalDuration(series: WorkoutSeries[]): number {
  let total = 0;

  for (const s of series) {
    // Work duration
    if ('work_value' in s) {
      if (s.work_unit === 'minutes') {
        total += s.work_value;
      } else if (s.work_unit === 'seconds') {
        total += s.work_value / 60;
      } else if (s.work_unit === 'meters' || s.work_unit === 'distance') {
        // Estimate: 1km = ~5-10 min depending on intensity (use 7.5 avg)
        total += (s.work_value / 1000) * 7.5;
      } else if (s.work_unit === 'time' && 'unit_detail' in s) {
        // Cycling time
        const detail = (s as CyclingSeries).unit_detail;
        if (detail === 'minutes') {
          total += s.work_value;
        } else {
          total += s.work_value / 60;
        }
      }
    } else if ('distance_meters' in s) {
      // Swimming: 100m = ~2 min avg
      total += (s.distance_meters / 100) * 2;
    } else if ('reps' in s) {
      // Strength: estimate 1 rep = 5 seconds
      total += (s.reps * 5) / 60;
    }

    // Rest duration
    const restMin = s.rest_minutes ?? 0;
    const restSec = s.rest_seconds ?? (s.rest_unit === 'minutes' ? (s.rest_value ?? 0) * 60 : (s.rest_value ?? 0));
    total += (restMin + restSec / 60) * (s.repetitions ?? 1);
  }

  return Math.round(total);
}
