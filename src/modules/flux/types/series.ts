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

  // Coach notes
  coach_notes?: string;

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
  coach_notes?: string;
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

// ============================================================================
// AUTO-NAMING (Market-standard workout terminology)
// ============================================================================

const MODALITY_LABELS: Record<string, string> = {
  running: 'Corrida',
  walking: 'Caminhada',
  swimming: 'Natação',
  cycling: 'Ciclismo',
  strength: 'Musculação',
};

/**
 * Classify workout type based on series structure using standard terminology:
 *
 * Running/Walking:
 *   - Intervalado: multiple series with Z3+ and rest periods
 *   - Fartlek: mixed zones (2+ different zones)
 *   - Tempo Run: single zone Z3
 *   - Progressivo: zones increase across series
 *   - Longo / Contínuo: single series Z1-Z2
 *   - Tiros: short high-intensity (Z4-Z5)
 *
 * Swimming:
 *   - Séries: multiple distance sets
 *   - Contínuo: single long distance
 *   - Educativos: low zone technique work
 *
 * Cycling:
 *   - Sweet Spot: Z3 sustained efforts
 *   - FTP: Z4 threshold work
 *   - Endurance: Z1-Z2 long rides
 *   - VO2max: Z5 intervals
 *
 * Strength:
 *   - Força Máxima: low reps (1-5), high load
 *   - Hipertrofia: moderate reps (6-12)
 *   - Resistência Muscular: high reps (13+)
 *   - Circuito: 4+ different series
 */
export function generateWorkoutName(
  modality: string,
  series: WorkoutSeries[]
): string {
  const label = MODALITY_LABELS[modality] || modality;
  if (series.length === 0) return `Treino de ${label}`;

  const zones = series.filter((s) => 'zone' in s).map((s) => (s as any).zone as IntensityZone);
  const uniqueZones = [...new Set(zones)].sort();

  // --- STRENGTH ---
  if (modality === 'strength') {
    const avgReps = series.reduce((sum, s) => sum + ((s as StrengthSeries).reps || 0), 0) / series.length;
    const totalSeries = series.reduce((sum, s) => sum + (s.repetitions ?? 1), 0);

    if (series.length >= 4) {
      return `Circuito ${totalSeries} séries`;
    }
    if (avgReps <= 5) {
      return `Força Máxima ${series.length}x${Math.round(avgReps)}rep`;
    }
    if (avgReps <= 12) {
      return `Hipertrofia ${series.length}x${Math.round(avgReps)}rep`;
    }
    return `Resistência Muscular ${series.length}x${Math.round(avgReps)}rep`;
  }

  // --- SWIMMING ---
  if (modality === 'swimming') {
    const distances = series.map((s) => (s as SwimmingSeries).distance_meters || 0);
    const totalDist = distances.reduce((a, b) => a + b, 0);
    const reps = series[0]?.repetitions ?? 1;
    const zoneStr = uniqueZones.length > 0 ? ` ${uniqueZones.join('/')}` : '';

    if (series.length === 1 && reps === 1) {
      return `Contínuo ${totalDist}m${zoneStr}`;
    }
    if (uniqueZones.length === 1 && uniqueZones[0] === 'Z1') {
      return `Educativos ${reps}x${distances[0]}m`;
    }
    return `Séries ${reps}x${distances[0]}m${zoneStr}`;
  }

  // --- CYCLING ---
  if (modality === 'cycling') {
    const mainSeries = series[0];
    const reps = mainSeries?.repetitions ?? 1;
    const zoneStr = uniqueZones.length > 0 ? ` ${uniqueZones.join('/')}` : '';

    if (uniqueZones.length === 1) {
      if (uniqueZones[0] === 'Z5') return `VO2max ${reps}x séries${zoneStr}`;
      if (uniqueZones[0] === 'Z4') return `FTP ${reps}x séries${zoneStr}`;
      if (uniqueZones[0] === 'Z3') return `Sweet Spot ${reps}x séries${zoneStr}`;
      if (uniqueZones[0] === 'Z1' || uniqueZones[0] === 'Z2') return `Endurance${zoneStr}`;
    }
    return `Intervalado Ciclismo${zoneStr}`;
  }

  // --- RUNNING / WALKING ---
  const reps = series[0]?.repetitions ?? 1;
  const zoneStr = uniqueZones.length > 0 ? ` ${uniqueZones.join('/')}` : '';

  // Check if zones are progressive (ascending)
  if (zones.length >= 2) {
    const isProgressive = zones.every((z, i) => i === 0 || z >= zones[i - 1]);
    if (isProgressive && uniqueZones.length >= 2) {
      return `Progressivo ${label}${zoneStr}`;
    }
  }

  // Multiple different zones = Fartlek
  if (uniqueZones.length >= 2) {
    return `Fartlek${zoneStr}`;
  }

  // High intensity short intervals
  if (uniqueZones.length === 1 && (uniqueZones[0] === 'Z4' || uniqueZones[0] === 'Z5')) {
    if (series.length > 1 || reps > 1) {
      return `Tiros ${reps > 1 ? `${reps}x` : ''}${uniqueZones[0]}`;
    }
  }

  // Z3 = Tempo Run
  if (uniqueZones.length === 1 && uniqueZones[0] === 'Z3') {
    return `Tempo Run ${label}${zoneStr}`;
  }

  // Multiple series with rest = Intervalado
  if (series.length > 1 || reps > 1) {
    return `Intervalado ${reps > 1 ? `${reps}x ` : ''}${label}${zoneStr}`;
  }

  // Single low-intensity series = Contínuo/Longo
  return `${modality === 'walking' ? 'Caminhada' : 'Contínuo'}${zoneStr}`;
}

/**
 * Generate a structured description from exercise structure.
 * Format: "Aq: ... | 3x10min Z3 c/ 2min intervalo | Des: ..."
 */
export function generateWorkoutDescription(
  modality: string,
  structure: ExerciseStructureV2
): string {
  const parts: string[] = [];

  // Warmup
  if (structure.warmup) {
    parts.push(`Aq: ${structure.warmup}`);
  }

  // Series summary
  for (const s of structure.series) {
    const reps = s.repetitions ?? 1;
    const repsStr = reps > 1 ? `${reps}x` : '';
    let workStr = '';

    if ('distance_meters' in s && s.distance_meters) {
      workStr = `${s.distance_meters}m`;
    } else if ('work_value' in s && s.work_value) {
      if (s.work_unit === 'minutes') workStr = `${s.work_value}min`;
      else if (s.work_unit === 'seconds') workStr = `${s.work_value}s`;
      else if (s.work_unit === 'time' && 'unit_detail' in s) {
        const detail = (s as CyclingSeries).unit_detail;
        workStr = detail === 'minutes' ? `${s.work_value}min` : `${s.work_value}s`;
      } else workStr = `${s.work_value}m`;
    } else if ('reps' in s && s.reps) {
      const load = (s as StrengthSeries).load_kg;
      workStr = `${s.reps}rep${load ? ` ${load}kg` : ''}`;
    }

    const zone = 'zone' in s ? ` ${(s as any).zone}` : '';
    const restMin = s.rest_minutes ?? 0;
    const restSec = s.rest_seconds ?? 0;
    const restStr = (restMin > 0 || restSec > 0)
      ? ` c/ ${restMin > 0 ? `${restMin}min` : ''}${restSec > 0 ? `${restSec}s` : ''} intervalo`
      : '';

    parts.push(`${repsStr}${workStr}${zone}${restStr}`);
  }

  // Cooldown
  if (structure.cooldown) {
    parts.push(`Des: ${structure.cooldown}`);
  }

  return parts.join(' | ');
}
