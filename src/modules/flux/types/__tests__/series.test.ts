/**
 * Unit Tests for Flux Series Helpers
 *
 * Tests cover:
 * - createEmptySeries: factory for each modality (running, swimming, cycling, strength, walking)
 * - isCardioSeries / isStrengthSeries: type guards
 * - calculateTotalDuration: duration estimation from mixed series
 * - generateWorkoutName: auto-naming based on modality + series structure
 * - generateWorkoutDescription: structured description from ExerciseStructureV2
 *
 * @see src/modules/flux/types/series.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEmptySeries,
  isCardioSeries,
  isStrengthSeries,
  calculateTotalDuration,
  generateWorkoutName,
  generateWorkoutDescription,
  ZONE_CONFIGS,
} from '../series';
import type {
  WorkoutSeries,
  RunningSeries,
  SwimmingSeries,
  CyclingSeries,
  StrengthSeries,
  ExerciseStructureV2,
  IntensityZone,
} from '../series';

// ============================================================================
// Test Fixtures
// ============================================================================

/** Stable UUID for deterministic tests */
const MOCK_UUID = '00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: () => MOCK_UUID,
  });
});

function makeRunningSeries(overrides: Partial<RunningSeries> = {}): RunningSeries {
  return {
    id: MOCK_UUID,
    type: 'running',
    repetitions: 1,
    work_value: 10,
    work_unit: 'minutes',
    zone: 'Z2',
    rest_minutes: 0,
    rest_seconds: 0,
    ...overrides,
  };
}

function makeSwimmingSeries(overrides: Partial<SwimmingSeries> = {}): SwimmingSeries {
  return {
    id: MOCK_UUID,
    type: 'swimming',
    repetitions: 1,
    distance_meters: 200,
    zone: 'Z2',
    rest_minutes: 0,
    rest_seconds: 0,
    ...overrides,
  };
}

function makeCyclingSeries(overrides: Partial<CyclingSeries> = {}): CyclingSeries {
  return {
    id: MOCK_UUID,
    type: 'cycling',
    repetitions: 1,
    work_value: 20,
    work_unit: 'time',
    unit_detail: 'minutes',
    zone: 'Z2',
    rest_minutes: 0,
    rest_seconds: 0,
    ...overrides,
  };
}

function makeStrengthSeries(overrides: Partial<StrengthSeries> = {}): StrengthSeries {
  return {
    id: MOCK_UUID,
    type: 'strength',
    repetitions: 1,
    reps: 10,
    load_kg: 50,
    rest_minutes: 0,
    rest_seconds: 0,
    ...overrides,
  };
}

// ============================================================================
// ZONE_CONFIGS
// ============================================================================

describe('ZONE_CONFIGS', () => {
  it('defines all 5 zones from Z1 to Z5', () => {
    const zones: IntensityZone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
    for (const z of zones) {
      expect(ZONE_CONFIGS[z]).toBeDefined();
      expect(ZONE_CONFIGS[z].zone).toBe(z);
      expect(ZONE_CONFIGS[z].range).toBeTruthy();
      expect(ZONE_CONFIGS[z].color).toBeTruthy();
      expect(ZONE_CONFIGS[z].bgColor).toBeTruthy();
    }
  });
});

// ============================================================================
// createEmptySeries
// ============================================================================

describe('createEmptySeries', () => {
  it('creates a running series with correct defaults', () => {
    const series = createEmptySeries('running');
    expect(series).toEqual({
      id: MOCK_UUID,
      type: 'running',
      repetitions: 1,
      work_value: 0,
      work_unit: 'minutes',
      zone: 'Z2',
      rest_minutes: 0,
      rest_seconds: 0,
    });
  });

  it('creates a walking series with type "walking"', () => {
    const series = createEmptySeries('walking');
    expect(series.type).toBe('walking');
    expect('work_value' in series).toBe(true);
    expect('zone' in series).toBe(true);
  });

  it('creates a swimming series with distance_meters', () => {
    const series = createEmptySeries('swimming');
    expect(series).toEqual({
      id: MOCK_UUID,
      type: 'swimming',
      repetitions: 1,
      distance_meters: 0,
      zone: 'Z2',
      rest_minutes: 0,
      rest_seconds: 0,
    });
  });

  it('creates a cycling series with work_unit "time" and unit_detail', () => {
    const series = createEmptySeries('cycling');
    expect(series).toEqual({
      id: MOCK_UUID,
      type: 'cycling',
      repetitions: 1,
      work_value: 0,
      work_unit: 'time',
      unit_detail: 'minutes',
      zone: 'Z2',
      rest_minutes: 0,
      rest_seconds: 0,
    });
  });

  it('creates a strength series with reps and load_kg', () => {
    const series = createEmptySeries('strength');
    expect(series).toEqual({
      id: MOCK_UUID,
      type: 'strength',
      repetitions: 1,
      reps: 0,
      load_kg: 0,
      rest_minutes: 0,
      rest_seconds: 0,
    });
  });

  it('defaults to running for unknown modality (e.g. triathlon)', () => {
    const series = createEmptySeries('triathlon');
    expect(series.type).toBe('running');
  });

  it('always generates an id', () => {
    const series = createEmptySeries('running');
    expect(series.id).toBeTruthy();
  });
});

// ============================================================================
// isCardioSeries / isStrengthSeries
// ============================================================================

describe('isCardioSeries', () => {
  it('returns true for running series', () => {
    expect(isCardioSeries(makeRunningSeries())).toBe(true);
  });

  it('returns true for swimming series', () => {
    expect(isCardioSeries(makeSwimmingSeries())).toBe(true);
  });

  it('returns true for cycling series', () => {
    expect(isCardioSeries(makeCyclingSeries())).toBe(true);
  });

  it('returns false for strength series (no zone property)', () => {
    // Strength has no zone property, so 'zone' in series is false
    expect(isCardioSeries(makeStrengthSeries())).toBe(false);
  });

  it('returns false for cycling series missing optional zone property', () => {
    const s = makeCyclingSeries();
    delete (s as any).zone;
    expect(isCardioSeries(s)).toBe(false);
  });
});

describe('isStrengthSeries', () => {
  it('returns true for strength series', () => {
    expect(isStrengthSeries(makeStrengthSeries())).toBe(true);
  });

  it('returns false for running series', () => {
    expect(isStrengthSeries(makeRunningSeries())).toBe(false);
  });

  it('returns false for swimming series', () => {
    expect(isStrengthSeries(makeSwimmingSeries())).toBe(false);
  });

  it('returns false for cycling series', () => {
    expect(isStrengthSeries(makeCyclingSeries())).toBe(false);
  });
});

// ============================================================================
// calculateTotalDuration
// ============================================================================

describe('calculateTotalDuration', () => {
  it('returns 0 for empty series array', () => {
    expect(calculateTotalDuration([])).toBe(0);
  });

  it('calculates duration for running series in minutes', () => {
    const series = [makeRunningSeries({ work_value: 30, work_unit: 'minutes' })];
    expect(calculateTotalDuration(series)).toBe(30);
  });

  it('calculates duration for running series in seconds', () => {
    const series = [makeRunningSeries({ work_value: 120, work_unit: 'seconds' })];
    // 120s = 2 min
    expect(calculateTotalDuration(series)).toBe(2);
  });

  it('estimates duration for running series in meters', () => {
    // 1000m = 7.5 min estimate
    const series = [makeRunningSeries({ work_value: 1000, work_unit: 'meters' })];
    expect(calculateTotalDuration(series)).toBe(8); // Math.round(7.5)
  });

  it('calculates duration for swimming series (100m = 2min estimate)', () => {
    const series = [makeSwimmingSeries({ distance_meters: 400 })];
    // 400/100 * 2 = 8 min
    expect(calculateTotalDuration(series)).toBe(8);
  });

  it('calculates duration for cycling series in time mode (minutes)', () => {
    const series = [makeCyclingSeries({ work_value: 45, work_unit: 'time', unit_detail: 'minutes' })];
    expect(calculateTotalDuration(series)).toBe(45);
  });

  it('calculates duration for cycling series in time mode (seconds)', () => {
    const series = [makeCyclingSeries({ work_value: 300, work_unit: 'time', unit_detail: 'seconds' })];
    // 300/60 = 5 min
    expect(calculateTotalDuration(series)).toBe(5);
  });

  it('estimates duration for strength series (1 rep = 5s)', () => {
    const series = [makeStrengthSeries({ reps: 12 })];
    // 12 * 5 / 60 = 1 min
    expect(calculateTotalDuration(series)).toBe(1);
  });

  it('multiplies by repetitions', () => {
    const series = [makeRunningSeries({ work_value: 5, work_unit: 'minutes', repetitions: 4 })];
    // 5min * 4 reps = 20 min
    expect(calculateTotalDuration(series)).toBe(20);
  });

  it('adds rest between repetitions (reps - 1 intervals)', () => {
    const series = [makeRunningSeries({
      work_value: 5,
      work_unit: 'minutes',
      repetitions: 4,
      rest_minutes: 2,
      rest_seconds: 0,
    })];
    // work: 5 * 4 = 20 min, rest: 2 * 3 intervals = 6 min, total = 26
    expect(calculateTotalDuration(series)).toBe(26);
  });

  it('adds rest seconds between repetitions', () => {
    const series = [makeRunningSeries({
      work_value: 1,
      work_unit: 'minutes',
      repetitions: 3,
      rest_minutes: 0,
      rest_seconds: 30,
    })];
    // work: 1 * 3 = 3 min, rest: 0.5min * 2 intervals = 1 min, total = 4
    expect(calculateTotalDuration(series)).toBe(4);
  });

  it('does not add rest for single repetition', () => {
    const series = [makeRunningSeries({
      work_value: 10,
      work_unit: 'minutes',
      repetitions: 1,
      rest_minutes: 5,
      rest_seconds: 0,
    })];
    // Only 1 rep, no rest intervals
    expect(calculateTotalDuration(series)).toBe(10);
  });

  it('sums duration across multiple series', () => {
    const series: WorkoutSeries[] = [
      makeRunningSeries({ work_value: 10, work_unit: 'minutes' }),
      makeSwimmingSeries({ distance_meters: 200 }),  // 200/100*2 = 4 min
      makeStrengthSeries({ reps: 12 }),                // 12*5/60 = 1 min
    ];
    // 10 + 4 + 1 = 15
    expect(calculateTotalDuration(series)).toBe(15);
  });

  it('handles legacy rest_value/rest_unit fallback', () => {
    const series = [makeRunningSeries({
      work_value: 5,
      work_unit: 'minutes',
      repetitions: 3,
      rest_minutes: 0,
      rest_seconds: 0,
      rest_value: 90,
      rest_unit: 'seconds',
    })];
    // work: 5 * 3 = 15, rest: (90/60) * 2 = 3, total = 18
    expect(calculateTotalDuration(series)).toBe(18);
  });
});

// ============================================================================
// generateWorkoutName
// ============================================================================

describe('generateWorkoutName', () => {
  // --- Empty series ---
  it('returns generic name for empty series', () => {
    expect(generateWorkoutName('running', [])).toBe('Treino de Corrida');
    expect(generateWorkoutName('swimming', [])).toBe('Treino de Natação');
    expect(generateWorkoutName('cycling', [])).toBe('Treino de Ciclismo');
    expect(generateWorkoutName('strength', [])).toBe('Treino de Musculação');
    expect(generateWorkoutName('walking', [])).toBe('Treino de Caminhada');
  });

  it('returns modality string for unknown modality with empty series', () => {
    expect(generateWorkoutName('yoga', [])).toBe('Treino de yoga');
  });

  // --- Strength ---
  describe('strength naming', () => {
    it('names as "Circuito" with 4+ different series', () => {
      const series: StrengthSeries[] = [
        makeStrengthSeries({ reps: 10 }),
        makeStrengthSeries({ reps: 10 }),
        makeStrengthSeries({ reps: 10 }),
        makeStrengthSeries({ reps: 10 }),
      ];
      // 4 series, each 1 rep => totalSeries = 4
      expect(generateWorkoutName('strength', series)).toBe('Circuito 4 séries');
    });

    it('counts total repetitions not series objects for Circuito naming', () => {
      const series: StrengthSeries[] = [
        makeStrengthSeries({ reps: 10, repetitions: 3 }),
        makeStrengthSeries({ reps: 10, repetitions: 3 }),
        makeStrengthSeries({ reps: 10, repetitions: 3 }),
        makeStrengthSeries({ reps: 10, repetitions: 3 }),
      ];
      // 4 series × 3 repetitions = 12 total
      const name = generateWorkoutName('strength', series);
      expect(name).toContain('12');
    });

    it('names as "Força Maxima" for low reps (<=5)', () => {
      const series = [makeStrengthSeries({ reps: 3 })];
      expect(generateWorkoutName('strength', series)).toBe('Força Máxima 1x3rep');
    });

    it('names as "Hipertrofia" for moderate reps (6-12)', () => {
      const series = [
        makeStrengthSeries({ reps: 10 }),
        makeStrengthSeries({ reps: 8 }),
      ];
      // avgReps = 9
      expect(generateWorkoutName('strength', series)).toBe('Hipertrofia 2x9rep');
    });

    it('names as "Resistencia Muscular" for high reps (>12)', () => {
      const series = [makeStrengthSeries({ reps: 20 })];
      expect(generateWorkoutName('strength', series)).toBe('Resistência Muscular 1x20rep');
    });
  });

  // --- Swimming ---
  describe('swimming naming', () => {
    it('names as "Contínuo" for single series with 1 rep', () => {
      const series = [makeSwimmingSeries({ distance_meters: 1500, repetitions: 1 })];
      expect(generateWorkoutName('swimming', series)).toBe('Contínuo 1500m Z2');
    });

    it('names as "Educativos" for Z1 series', () => {
      const series = [makeSwimmingSeries({ distance_meters: 50, zone: 'Z1', repetitions: 8 })];
      expect(generateWorkoutName('swimming', series)).toBe('Educativos 8x50m');
    });

    it('names as "Séries" for multiple reps (non-Z1)', () => {
      const series = [makeSwimmingSeries({ distance_meters: 200, zone: 'Z3', repetitions: 4 })];
      expect(generateWorkoutName('swimming', series)).toBe('Séries 4x200m Z3');
    });
  });

  // --- Cycling ---
  describe('cycling naming', () => {
    it('names as "Endurance" for Z1/Z2', () => {
      const series = [makeCyclingSeries({ zone: 'Z2' })];
      expect(generateWorkoutName('cycling', series)).toBe('Endurance Z2');
    });

    it('names as "Sweet Spot" for Z3', () => {
      const series = [makeCyclingSeries({ zone: 'Z3', repetitions: 3 })];
      expect(generateWorkoutName('cycling', series)).toBe('Sweet Spot 3x séries Z3');
    });

    it('names as "FTP" for Z4', () => {
      const series = [makeCyclingSeries({ zone: 'Z4', repetitions: 2 })];
      expect(generateWorkoutName('cycling', series)).toBe('FTP 2x séries Z4');
    });

    it('names as "VO2max" for Z5', () => {
      const series = [makeCyclingSeries({ zone: 'Z5', repetitions: 5 })];
      expect(generateWorkoutName('cycling', series)).toBe('VO2max 5x séries Z5');
    });

    it('names as "Intervalado Ciclismo" for mixed zones', () => {
      const series = [
        makeCyclingSeries({ zone: 'Z2' }),
        makeCyclingSeries({ zone: 'Z4' }),
      ];
      expect(generateWorkoutName('cycling', series)).toBe('Intervalado Ciclismo Z2/Z4');
    });
  });

  // --- Running ---
  describe('running naming', () => {
    it('names as "Contínuo" for single low-intensity series', () => {
      const series = [makeRunningSeries({ zone: 'Z2' })];
      expect(generateWorkoutName('running', series)).toBe('Contínuo Z2');
    });

    it('names as "Caminhada" for walking with single series', () => {
      const series: RunningSeries[] = [{
        ...makeRunningSeries({ zone: 'Z1' }),
        type: 'walking',
      }];
      expect(generateWorkoutName('walking', series)).toBe('Caminhada Z1');
    });

    it('names as "Tempo Run" for Z3', () => {
      const series = [makeRunningSeries({ zone: 'Z3' })];
      expect(generateWorkoutName('running', series)).toBe('Tempo Run Corrida Z3');
    });

    it('names as "Tiros" for high-intensity Z4/Z5 with multiple reps', () => {
      const series = [makeRunningSeries({ zone: 'Z4', repetitions: 6 })];
      expect(generateWorkoutName('running', series)).toBe('Tiros 6xZ4');
    });

    it('names as "Fartlek" for non-progressive mixed zones', () => {
      const series = [
        makeRunningSeries({ zone: 'Z4' }),
        makeRunningSeries({ zone: 'Z2' }),
      ];
      expect(generateWorkoutName('running', series)).toBe('Fartlek Z2/Z4');
    });

    it('names as "Progressivo" for ascending zones', () => {
      const series = [
        makeRunningSeries({ zone: 'Z2' }),
        makeRunningSeries({ zone: 'Z3' }),
        makeRunningSeries({ zone: 'Z4' }),
      ];
      expect(generateWorkoutName('running', series)).toBe('Progressivo Corrida Z2/Z3/Z4');
    });

    it('names as "Intervalado" for multiple series with same zone', () => {
      const series = [
        makeRunningSeries({ zone: 'Z2' }),
        makeRunningSeries({ zone: 'Z2' }),
      ];
      expect(generateWorkoutName('running', series)).toBe('Intervalado Corrida Z2');
    });

    it('names as "Intervalado" with reps notation for multi-rep single series', () => {
      const series = [makeRunningSeries({ zone: 'Z2', repetitions: 4 })];
      expect(generateWorkoutName('running', series)).toBe('Intervalado 4x Corrida Z2');
    });
  });
});

// ============================================================================
// generateWorkoutDescription
// ============================================================================

describe('generateWorkoutDescription', () => {
  it('returns empty string for structure with no content', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [],
      cooldown: '',
    };
    expect(generateWorkoutDescription('running', structure)).toBe('');
  });

  it('includes warmup prefix', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '10min trote leve',
      series: [],
      cooldown: '',
    };
    expect(generateWorkoutDescription('running', structure)).toBe('Aq: 10min trote leve');
  });

  it('includes cooldown suffix', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [],
      cooldown: 'Alongamento 5min',
    };
    expect(generateWorkoutDescription('running', structure)).toBe('Des: Alongamento 5min');
  });

  it('formats running series with minutes', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [makeRunningSeries({ work_value: 10, work_unit: 'minutes', repetitions: 3, zone: 'Z3', rest_minutes: 2, rest_seconds: 0 })],
      cooldown: '',
    };
    expect(generateWorkoutDescription('running', structure)).toBe('3x10min Z3 c/ 2min intervalo');
  });

  it('formats running series with seconds', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [makeRunningSeries({ work_value: 30, work_unit: 'seconds', repetitions: 8, zone: 'Z5' })],
      cooldown: '',
    };
    expect(generateWorkoutDescription('running', structure)).toBe('8x30s Z5');
  });

  it('formats swimming series with distance', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [makeSwimmingSeries({ distance_meters: 200, repetitions: 4, zone: 'Z3', rest_minutes: 0, rest_seconds: 30 })],
      cooldown: '',
    };
    expect(generateWorkoutDescription('swimming', structure)).toBe('4x200m Z3 c/ 30s intervalo');
  });

  it('formats strength series with reps and load', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [makeStrengthSeries({ reps: 10, load_kg: 80, repetitions: 4, rest_minutes: 1, rest_seconds: 30 })],
      cooldown: '',
    };
    expect(generateWorkoutDescription('strength', structure)).toBe('4x10rep 80kg c/ 1min30s intervalo');
  });

  it('formats cycling series in time mode', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [makeCyclingSeries({ work_value: 20, work_unit: 'time', unit_detail: 'minutes', zone: 'Z3', repetitions: 3 })],
      cooldown: '',
    };
    expect(generateWorkoutDescription('cycling', structure)).toBe('3x20min Z3');
  });

  it('joins all parts with pipe separator', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '10min trote',
      series: [
        makeRunningSeries({ work_value: 5, work_unit: 'minutes', repetitions: 6, zone: 'Z4', rest_minutes: 2, rest_seconds: 0 }),
      ],
      cooldown: '5min caminhada',
    };
    const desc = generateWorkoutDescription('running', structure);
    expect(desc).toBe('Aq: 10min trote | 6x5min Z4 c/ 2min intervalo | Des: 5min caminhada');
  });

  it('handles multiple series with pipe separator', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [
        makeRunningSeries({ work_value: 10, work_unit: 'minutes', zone: 'Z2' }),
        makeRunningSeries({ work_value: 5, work_unit: 'minutes', repetitions: 4, zone: 'Z4', rest_minutes: 1, rest_seconds: 0 }),
      ],
      cooldown: '',
    };
    const desc = generateWorkoutDescription('running', structure);
    expect(desc).toBe('10min Z2 | 4x5min Z4 c/ 1min intervalo');
  });

  it('omits reps prefix when repetitions is 1', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [makeRunningSeries({ work_value: 30, work_unit: 'minutes', repetitions: 1, zone: 'Z2' })],
      cooldown: '',
    };
    // Should NOT have "1x" prefix
    expect(generateWorkoutDescription('running', structure)).toBe('30min Z2');
  });

  it('handles strength series without load (0kg)', () => {
    const structure: ExerciseStructureV2 = {
      warmup: '',
      series: [makeStrengthSeries({ reps: 15, load_kg: 0 })],
      cooldown: '',
    };
    expect(generateWorkoutDescription('strength', structure)).toBe('15rep');
  });
});
