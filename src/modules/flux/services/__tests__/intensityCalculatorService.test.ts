/**
 * Intensity Calculator Service & Zone Helpers Tests
 *
 * Covers:
 * - IntensityCalculatorService: cycling (FTP), running (pace), swimming (CSS), strength (RPE)
 * - Zone helpers: getFTPZoneByPercentage, getCSSZoneByPercentage, getRPEColor, getRPELabel
 * - Edge cases: boundary values, invalid inputs, missing thresholds
 *
 * Run with:
 *   npx vitest run src/modules/flux/services/__tests__/intensityCalculatorService.test.ts
 */

import { describe, it, expect } from 'vitest';
import { IntensityCalculatorService } from '../intensityCalculatorService';
import {
  getFTPZoneByPercentage,
  getCSSZoneByPercentage,
  getRPEColor,
  getRPELabel,
  FTP_ZONES,
  CSS_ZONES,
  PACE_ZONES,
  getZoneColor,
  getPaceZoneInfo,
} from '../../types/zones';
import type { FlowAthleteProfile } from '../../types/flow';

// ============================================================================
// HELPER: create minimal FlowAthleteProfile for testing
// ============================================================================

function makeProfile(
  overrides: Partial<FlowAthleteProfile> & { modality: FlowAthleteProfile['modality'] }
): FlowAthleteProfile {
  return {
    id: 'test-id',
    user_id: 'user-1',
    athlete_id: 'athlete-1',
    name: 'Test Athlete',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as FlowAthleteProfile;
}

// ============================================================================
// CYCLING - FTP-based calculations
// ============================================================================

describe('IntensityCalculatorService', () => {
  describe('Cycling - calculateCyclingZones', () => {
    it('should calculate correct zones for FTP 200W', () => {
      const zones = IntensityCalculatorService.calculateCyclingZones(200);

      expect(zones.z1).toEqual([110, 150]); // 55%-75% of 200
      expect(zones.z2).toEqual([150, 180]); // 75%-90% of 200
      expect(zones.z3).toEqual([180, 210]); // 90%-105% of 200
      expect(zones.z4).toEqual([210, 240]); // 105%-120% of 200
      expect(zones.z5).toEqual([240, 300]); // 120%-150% of 200
    });

    it('should calculate correct zones for FTP 300W', () => {
      const zones = IntensityCalculatorService.calculateCyclingZones(300);

      expect(zones.z1).toEqual([165, 225]); // 55%-75% of 300
      expect(zones.z2).toEqual([225, 270]); // 75%-90% of 300
      expect(zones.z3).toEqual([270, 315]); // 90%-105% of 300
      expect(zones.z4).toEqual([315, 360]); // 105%-120% of 300
      expect(zones.z5).toEqual([360, 450]); // 120%-150% of 300
    });

    it('should handle low FTP value (100W)', () => {
      const zones = IntensityCalculatorService.calculateCyclingZones(100);

      expect(zones.z1).toEqual([55, 75]);
      expect(zones.z2).toEqual([75, 90]);
      expect(zones.z3).toEqual([90, 105]);
      expect(zones.z4).toEqual([105, 120]);
      expect(zones.z5).toEqual([120, 150]);
    });

    it('should round values correctly for odd FTP', () => {
      const zones = IntensityCalculatorService.calculateCyclingZones(253);

      // 253 * 0.55 = 139.15 -> 139
      expect(zones.z1[0]).toBe(Math.round(253 * 0.55));
      // 253 * 0.75 = 189.75 -> 190
      expect(zones.z1[1]).toBe(Math.round(253 * 0.75));
    });
  });

  describe('Cycling - getCyclingPowerTarget', () => {
    const ftp = 200;

    it('should return Z1 midpoint for zScore 21', () => {
      const target = IntensityCalculatorService.getCyclingPowerTarget(ftp, 21);
      // Z1: [110, 150] -> midpoint 130
      expect(target).toBe(130);
    });

    it('should return Z2 midpoint for zScore 22', () => {
      const target = IntensityCalculatorService.getCyclingPowerTarget(ftp, 22);
      // Z2: [150, 180] -> midpoint 165
      expect(target).toBe(165);
    });

    it('should return Z3 midpoint for zScore 23', () => {
      const target = IntensityCalculatorService.getCyclingPowerTarget(ftp, 23);
      // Z3: [180, 210] -> midpoint 195
      expect(target).toBe(195);
    });

    it('should return Z4 midpoint for zScore 24', () => {
      const target = IntensityCalculatorService.getCyclingPowerTarget(ftp, 24);
      // Z4: [210, 240] -> midpoint 225
      expect(target).toBe(225);
    });

    it('should return Z5 midpoint for zScore 25', () => {
      const target = IntensityCalculatorService.getCyclingPowerTarget(ftp, 25);
      // Z5: [240, 300] -> midpoint 270
      expect(target).toBe(270);
    });

    it('should default to Z2 (75% FTP) for invalid zScore', () => {
      const target = IntensityCalculatorService.getCyclingPowerTarget(ftp, 99);
      // Default: ftp * 0.75 = 150
      expect(target).toBe(150);
    });

    it('should default to Z2 for zScore 0', () => {
      const target = IntensityCalculatorService.getCyclingPowerTarget(ftp, 0);
      expect(target).toBe(150);
    });
  });

  // ============================================================================
  // RUNNING - Pace-based calculations
  // ============================================================================

  describe('Running - paceToSeconds', () => {
    it('should convert "4:30" to 270 seconds', () => {
      expect(IntensityCalculatorService.paceToSeconds('4:30/km')).toBe(270);
    });

    it('should convert "5:00" to 300 seconds', () => {
      expect(IntensityCalculatorService.paceToSeconds('5:00/km')).toBe(300);
    });

    it('should convert "3:45" to 225 seconds', () => {
      expect(IntensityCalculatorService.paceToSeconds('3:45/km')).toBe(225);
    });

    it('should return default 270s for invalid pace string', () => {
      expect(IntensityCalculatorService.paceToSeconds('invalid')).toBe(270);
    });

    it('should return default 270s for empty string', () => {
      expect(IntensityCalculatorService.paceToSeconds('')).toBe(270);
    });
  });

  describe('Running - secondsToPace', () => {
    it('should convert 270 seconds to "4:30/km"', () => {
      expect(IntensityCalculatorService.secondsToPace(270)).toBe('4:30/km');
    });

    it('should convert 300 seconds to "5:00/km"', () => {
      expect(IntensityCalculatorService.secondsToPace(300)).toBe('5:00/km');
    });

    it('should convert 225 seconds to "3:45/km"', () => {
      expect(IntensityCalculatorService.secondsToPace(225)).toBe('3:45/km');
    });

    it('should pad seconds with leading zero', () => {
      expect(IntensityCalculatorService.secondsToPace(305)).toBe('5:05/km');
    });
  });

  describe('Running - calculateRunningZones', () => {
    it('should calculate zones relative to threshold pace "5:00/km" (300s)', () => {
      const zones = IntensityCalculatorService.calculateRunningZones('5:00/km');

      // Z1 = 300 * 1.15 = 345s = 5:45/km (recovery, slower)
      expect(zones.z1).toBe('5:45/km');
      // Z2 = 300 * 1.10 = 330s = 5:30/km (aerobic)
      expect(zones.z2).toBe('5:30/km');
      // Z3 = 300 * 1.025 = 307.5 -> 308s = 5:08/km (tempo)
      expect(zones.z3).toBe('5:08/km');
      // Z4 = 300 * 0.975 = 292.5 -> 293s = 4:53/km (threshold)
      expect(zones.z4).toBe('4:53/km');
      // Z5 = 300 * 0.90 = 270s = 4:30/km (VO2max)
      expect(zones.z5).toBe('4:30/km');
    });
  });

  describe('Running - getRunningPaceTarget', () => {
    const pace = '5:00/km';

    it('should return Z1 pace for zScore 21', () => {
      const target = IntensityCalculatorService.getRunningPaceTarget(pace, 21);
      expect(target).toBe('5:45/km');
    });

    it('should return Z2 pace for zScore 22', () => {
      const target = IntensityCalculatorService.getRunningPaceTarget(pace, 22);
      expect(target).toBe('5:30/km');
    });

    it('should return Z3 pace for zScore 23', () => {
      const target = IntensityCalculatorService.getRunningPaceTarget(pace, 23);
      expect(target).toBe('5:08/km');
    });

    it('should return Z4 pace for zScore 24', () => {
      const target = IntensityCalculatorService.getRunningPaceTarget(pace, 24);
      expect(target).toBe('4:53/km');
    });

    it('should return Z5 pace for zScore 25', () => {
      const target = IntensityCalculatorService.getRunningPaceTarget(pace, 25);
      expect(target).toBe('4:30/km');
    });

    it('should default to Z2 for invalid zScore', () => {
      const target = IntensityCalculatorService.getRunningPaceTarget(pace, 99);
      expect(target).toBe('5:30/km');
    });
  });

  // ============================================================================
  // SWIMMING - CSS-based calculations
  // ============================================================================

  describe('Swimming - cssToSeconds', () => {
    it('should convert "1:30/100m" to 90 seconds', () => {
      expect(IntensityCalculatorService.cssToSeconds('1:30/100m')).toBe(90);
    });

    it('should convert "2:00/100m" to 120 seconds', () => {
      expect(IntensityCalculatorService.cssToSeconds('2:00/100m')).toBe(120);
    });

    it('should return default 90s for invalid string', () => {
      expect(IntensityCalculatorService.cssToSeconds('invalid')).toBe(90);
    });

    it('should return default 90s for empty string', () => {
      expect(IntensityCalculatorService.cssToSeconds('')).toBe(90);
    });
  });

  describe('Swimming - secondsToCSS', () => {
    it('should convert 90 seconds to "1:30/100m"', () => {
      expect(IntensityCalculatorService.secondsToCSS(90)).toBe('1:30/100m');
    });

    it('should convert 120 seconds to "2:00/100m"', () => {
      expect(IntensityCalculatorService.secondsToCSS(120)).toBe('2:00/100m');
    });

    it('should pad seconds with leading zero', () => {
      expect(IntensityCalculatorService.secondsToCSS(65)).toBe('1:05/100m');
    });
  });

  describe('Swimming - calculateSwimmingZones', () => {
    it('should calculate zones relative to CSS "2:00/100m" (120s)', () => {
      const zones = IntensityCalculatorService.calculateSwimmingZones('2:00/100m');

      // Z1 = 120 * 1.15 = 138s = 2:18/100m (recovery, slower)
      expect(zones.z1).toBe('2:18/100m');
      // Z2 = 120 * 1.10 = 132s = 2:12/100m (aerobic)
      expect(zones.z2).toBe('2:12/100m');
      // Z3 = 120 * 1.025 = 123s = 2:03/100m (endurance)
      expect(zones.z3).toBe('2:03/100m');
      // Z4 = 120 * 0.975 = 117s = 1:57/100m (threshold)
      expect(zones.z4).toBe('1:57/100m');
      // Z5 = 120 * 0.90 = 108s = 1:48/100m (sprint)
      expect(zones.z5).toBe('1:48/100m');
    });
  });

  describe('Swimming - getSwimmingCSSTarget', () => {
    const css = '2:00/100m';

    it('should return Z1 CSS for zScore 21', () => {
      expect(IntensityCalculatorService.getSwimmingCSSTarget(css, 21)).toBe('2:18/100m');
    });

    it('should return Z2 CSS for zScore 22', () => {
      expect(IntensityCalculatorService.getSwimmingCSSTarget(css, 22)).toBe('2:12/100m');
    });

    it('should return Z3 CSS for zScore 23', () => {
      expect(IntensityCalculatorService.getSwimmingCSSTarget(css, 23)).toBe('2:03/100m');
    });

    it('should return Z4 CSS for zScore 24', () => {
      expect(IntensityCalculatorService.getSwimmingCSSTarget(css, 24)).toBe('1:57/100m');
    });

    it('should return Z5 CSS for zScore 25', () => {
      expect(IntensityCalculatorService.getSwimmingCSSTarget(css, 25)).toBe('1:48/100m');
    });

    it('should default to Z2 for invalid zScore', () => {
      expect(IntensityCalculatorService.getSwimmingCSSTarget(css, 99)).toBe('2:12/100m');
    });
  });

  // ============================================================================
  // UNIFIED INTERFACE - calculateIntensity
  // ============================================================================

  describe('calculateIntensity', () => {
    it('should calculate cycling intensity with workout examples', () => {
      const profile = makeProfile({ modality: 'cycling', ftp: 200 });
      const result = IntensityCalculatorService.calculateIntensity(profile, 23);

      expect(result.modality).toBe('cycling');
      expect(result.base_threshold).toBe(200);
      expect(result.target_zone).toBe(23);
      expect(result.recommended_intensity).toBe('195W');
      expect(result.workout_examples).toHaveLength(3);
      expect(result.workout_examples[0]).toContain('195W');
    });

    it('should calculate running intensity with workout examples', () => {
      const profile = makeProfile({ modality: 'running', pace_threshold: '5:00/km' });
      const result = IntensityCalculatorService.calculateIntensity(profile, 22);

      expect(result.modality).toBe('running');
      expect(result.base_threshold).toBe('5:00/km');
      expect(result.target_zone).toBe(22);
      expect(result.recommended_intensity).toBe('5:30/km');
      expect(result.workout_examples).toHaveLength(3);
    });

    it('should calculate swimming intensity with workout examples', () => {
      const profile = makeProfile({ modality: 'swimming', swim_css: '2:00/100m' });
      const result = IntensityCalculatorService.calculateIntensity(profile, 24);

      expect(result.modality).toBe('swimming');
      expect(result.base_threshold).toBe('2:00/100m');
      expect(result.target_zone).toBe(24);
      expect(result.recommended_intensity).toBe('1:57/100m');
      expect(result.workout_examples).toHaveLength(3);
    });

    it('should calculate strength intensity using RPE', () => {
      const profile = makeProfile({ modality: 'strength' });
      const result = IntensityCalculatorService.calculateIntensity(profile, 23);

      expect(result.modality).toBe('strength');
      expect(result.base_threshold).toBe('RPE');
      expect(result.target_zone).toBe(23);
      expect(result.recommended_intensity).toBe('RPE 8');
      expect(result.workout_examples).toHaveLength(3);
    });

    it('should map all strength zScores to correct RPE', () => {
      const profile = makeProfile({ modality: 'strength' });

      expect(IntensityCalculatorService.calculateIntensity(profile, 21).recommended_intensity).toBe('RPE 6');
      expect(IntensityCalculatorService.calculateIntensity(profile, 22).recommended_intensity).toBe('RPE 7');
      expect(IntensityCalculatorService.calculateIntensity(profile, 23).recommended_intensity).toBe('RPE 8');
      expect(IntensityCalculatorService.calculateIntensity(profile, 24).recommended_intensity).toBe('RPE 9');
      expect(IntensityCalculatorService.calculateIntensity(profile, 25).recommended_intensity).toBe('RPE 10');
    });

    it('should default to RPE 7 for invalid strength zScore', () => {
      const profile = makeProfile({ modality: 'strength' });
      const result = IntensityCalculatorService.calculateIntensity(profile, 99);

      expect(result.recommended_intensity).toBe('RPE 7');
    });

    it('should throw error for cycling without FTP', () => {
      const profile = makeProfile({ modality: 'cycling' });

      expect(() => IntensityCalculatorService.calculateIntensity(profile, 23))
        .toThrow('FTP');
    });

    it('should throw error for running without pace_threshold', () => {
      const profile = makeProfile({ modality: 'running' });

      expect(() => IntensityCalculatorService.calculateIntensity(profile, 23))
        .toThrow('Pace limiar');
    });

    it('should throw error for swimming without swim_css', () => {
      const profile = makeProfile({ modality: 'swimming' });

      expect(() => IntensityCalculatorService.calculateIntensity(profile, 23))
        .toThrow('CSS');
    });

    it('should throw error for unsupported modality', () => {
      const profile = makeProfile({ modality: 'walking' as any });

      expect(() => IntensityCalculatorService.calculateIntensity(profile, 23))
        .toThrow('Modalidade');
    });
  });

  // ============================================================================
  // getAllZones
  // ============================================================================

  describe('getAllZones', () => {
    it('should return formatted cycling zones with W suffix', () => {
      const profile = makeProfile({ modality: 'cycling', ftp: 200 });
      const zones = IntensityCalculatorService.getAllZones(profile);

      expect(zones.z1).toBe('110-150W');
      expect(zones.z2).toBe('150-180W');
      expect(zones.z3).toBe('180-210W');
      expect(zones.z4).toBe('210-240W');
      expect(zones.z5).toBe('240+W');
    });

    it('should return running pace zones', () => {
      const profile = makeProfile({ modality: 'running', pace_threshold: '5:00/km' });
      const zones = IntensityCalculatorService.getAllZones(profile);

      expect(zones.z1).toContain('/km');
      expect(zones.z2).toContain('/km');
    });

    it('should return swimming CSS zones', () => {
      const profile = makeProfile({ modality: 'swimming', swim_css: '2:00/100m' });
      const zones = IntensityCalculatorService.getAllZones(profile);

      expect(zones.z1).toContain('/100m');
      expect(zones.z2).toContain('/100m');
    });

    it('should return strength RPE zones', () => {
      const profile = makeProfile({ modality: 'strength' });
      const zones = IntensityCalculatorService.getAllZones(profile);

      expect(zones.z1).toBe('RPE 6');
      expect(zones.z2).toBe('RPE 7');
      expect(zones.z3).toBe('RPE 8');
      expect(zones.z4).toBe('RPE 9');
      expect(zones.z5).toBe('RPE 10');
    });

    it('should throw for cycling without FTP', () => {
      const profile = makeProfile({ modality: 'cycling' });
      expect(() => IntensityCalculatorService.getAllZones(profile)).toThrow('FTP');
    });

    it('should throw for running without pace', () => {
      const profile = makeProfile({ modality: 'running' });
      expect(() => IntensityCalculatorService.getAllZones(profile)).toThrow('Pace limiar');
    });

    it('should throw for swimming without CSS', () => {
      const profile = makeProfile({ modality: 'swimming' });
      expect(() => IntensityCalculatorService.getAllZones(profile)).toThrow('CSS');
    });

    it('should throw for unsupported modality', () => {
      const profile = makeProfile({ modality: 'triathlon' as any });
      expect(() => IntensityCalculatorService.getAllZones(profile)).toThrow('Modalidade');
    });
  });
});

// ============================================================================
// ZONE HELPERS from types/zones.ts
// ============================================================================

describe('Zone Helper Functions', () => {
  // --------------------------------------------------------------------------
  // getFTPZoneByPercentage
  // --------------------------------------------------------------------------

  describe('getFTPZoneByPercentage', () => {
    it('should return Z1 for percentage 40 (lower bound)', () => {
      const zone = getFTPZoneByPercentage(40);
      expect(zone).not.toBeNull();
      expect(zone!.name).toBe('Z1 - Recupera\u00e7\u00e3o Ativa');
    });

    it('should return Z1 for percentage 55 (upper bound)', () => {
      const zone = getFTPZoneByPercentage(55);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z1');
    });

    it('should return Z2 for percentage 56 (lower bound)', () => {
      const zone = getFTPZoneByPercentage(56);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z2');
    });

    it('should return Z2 for percentage 75 (upper bound)', () => {
      const zone = getFTPZoneByPercentage(75);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z2');
    });

    it('should return Z3 for percentage 76 (lower bound)', () => {
      const zone = getFTPZoneByPercentage(76);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z3');
    });

    it('should return Z3 for percentage 90 (upper bound)', () => {
      const zone = getFTPZoneByPercentage(90);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z3');
    });

    it('should return Z4 for percentage 91 (lower bound)', () => {
      const zone = getFTPZoneByPercentage(91);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z4');
    });

    it('should return Z4 for percentage 105 (upper bound)', () => {
      const zone = getFTPZoneByPercentage(105);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z4');
    });

    it('should return Z5 for percentage 106 (lower bound)', () => {
      const zone = getFTPZoneByPercentage(106);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z5');
    });

    it('should return Z5 for percentage 120 (upper bound)', () => {
      const zone = getFTPZoneByPercentage(120);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z5');
    });

    it('should return null for percentage 0 (below all zones)', () => {
      expect(getFTPZoneByPercentage(0)).toBeNull();
    });

    it('should return null for percentage 39 (just below Z1)', () => {
      expect(getFTPZoneByPercentage(39)).toBeNull();
    });

    it('should return null for percentage 121 (above Z5 max)', () => {
      expect(getFTPZoneByPercentage(121)).toBeNull();
    });

    it('should return null for negative percentage', () => {
      expect(getFTPZoneByPercentage(-10)).toBeNull();
    });

    it('should return correct zone object properties', () => {
      const zone = getFTPZoneByPercentage(60);
      expect(zone).toMatchObject({
        name: expect.any(String),
        min: expect.any(Number),
        max: expect.any(Number),
        description: expect.any(String),
        color: expect.any(String),
      });
    });
  });

  // --------------------------------------------------------------------------
  // getCSSZoneByPercentage
  // --------------------------------------------------------------------------

  describe('getCSSZoneByPercentage', () => {
    it('should return Z1 for percentage 50 (lower bound)', () => {
      const zone = getCSSZoneByPercentage(50);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z1');
    });

    it('should return Z1 for percentage 65 (upper bound)', () => {
      const zone = getCSSZoneByPercentage(65);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z1');
    });

    it('should return Z2 for percentage 66 (lower bound)', () => {
      const zone = getCSSZoneByPercentage(66);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z2');
    });

    it('should return Z2 for percentage 80 (upper bound)', () => {
      const zone = getCSSZoneByPercentage(80);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z2');
    });

    it('should return Z3 for percentage 81 (lower bound)', () => {
      const zone = getCSSZoneByPercentage(81);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z3');
    });

    it('should return Z3 for percentage 95 (upper bound)', () => {
      const zone = getCSSZoneByPercentage(95);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z3');
    });

    it('should return Z4 for percentage 96 (lower bound)', () => {
      const zone = getCSSZoneByPercentage(96);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z4');
    });

    it('should return Z4 for percentage 110 (upper bound)', () => {
      const zone = getCSSZoneByPercentage(110);
      expect(zone).not.toBeNull();
      expect(zone!.name).toContain('Z4');
    });

    it('should return null for percentage 0 (below all zones)', () => {
      expect(getCSSZoneByPercentage(0)).toBeNull();
    });

    it('should return null for percentage 49 (just below Z1)', () => {
      expect(getCSSZoneByPercentage(49)).toBeNull();
    });

    it('should return null for percentage 111 (above Z4 max)', () => {
      expect(getCSSZoneByPercentage(111)).toBeNull();
    });

    it('should return null for negative percentage', () => {
      expect(getCSSZoneByPercentage(-5)).toBeNull();
    });

    it('should return correct zone object properties', () => {
      const zone = getCSSZoneByPercentage(70);
      expect(zone).toMatchObject({
        name: expect.any(String),
        min: expect.any(Number),
        max: expect.any(Number),
        description: expect.any(String),
        color: expect.any(String),
      });
    });

    it('CSS_ZONES should have exactly 4 zones (Z1-Z4)', () => {
      expect(Object.keys(CSS_ZONES)).toEqual(['Z1', 'Z2', 'Z3', 'Z4']);
    });
  });

  // --------------------------------------------------------------------------
  // getRPEColor
  // --------------------------------------------------------------------------

  describe('getRPEColor', () => {
    it('should return ceramic-info color for RPE 1', () => {
      expect(getRPEColor(1)).toBe('bg-ceramic-info/20 text-ceramic-info');
    });

    it('should return ceramic-info color for RPE 3 (boundary)', () => {
      expect(getRPEColor(3)).toBe('bg-ceramic-info/20 text-ceramic-info');
    });

    it('should return green color for RPE 4', () => {
      expect(getRPEColor(4)).toBe('bg-green-500/20 text-green-600');
    });

    it('should return green color for RPE 5 (boundary)', () => {
      expect(getRPEColor(5)).toBe('bg-green-500/20 text-green-600');
    });

    it('should return warning color for RPE 6', () => {
      expect(getRPEColor(6)).toBe('bg-ceramic-warning/20 text-ceramic-warning');
    });

    it('should return warning color for RPE 7 (boundary)', () => {
      expect(getRPEColor(7)).toBe('bg-ceramic-warning/20 text-ceramic-warning');
    });

    it('should return orange color for RPE 8', () => {
      expect(getRPEColor(8)).toBe('bg-orange-500/20 text-orange-600');
    });

    it('should return orange color for RPE 9 (boundary)', () => {
      expect(getRPEColor(9)).toBe('bg-orange-500/20 text-orange-600');
    });

    it('should return error color for RPE 10', () => {
      expect(getRPEColor(10)).toBe('bg-ceramic-error/20 text-ceramic-error');
    });

    it('should return error color for RPE above 10', () => {
      expect(getRPEColor(11)).toBe('bg-ceramic-error/20 text-ceramic-error');
    });

    it('should return ceramic-info color for RPE 0', () => {
      expect(getRPEColor(0)).toBe('bg-ceramic-info/20 text-ceramic-info');
    });

    it('should return ceramic-info color for negative RPE', () => {
      expect(getRPEColor(-1)).toBe('bg-ceramic-info/20 text-ceramic-info');
    });
  });

  // --------------------------------------------------------------------------
  // getRPELabel
  // --------------------------------------------------------------------------

  describe('getRPELabel', () => {
    it('should return "Muito Leve" for RPE 1', () => {
      expect(getRPELabel(1)).toBe('Muito Leve');
    });

    it('should return "Muito Leve" for RPE 2 (boundary)', () => {
      expect(getRPELabel(2)).toBe('Muito Leve');
    });

    it('should return "Leve" for RPE 3', () => {
      expect(getRPELabel(3)).toBe('Leve');
    });

    it('should return "Leve" for RPE 4 (boundary)', () => {
      expect(getRPELabel(4)).toBe('Leve');
    });

    it('should return "Moderado" for RPE 5', () => {
      expect(getRPELabel(5)).toBe('Moderado');
    });

    it('should return "Moderado" for RPE 6 (boundary)', () => {
      expect(getRPELabel(6)).toBe('Moderado');
    });

    it('should return "Dif\u00edcil" for RPE 7', () => {
      expect(getRPELabel(7)).toBe('Dif\u00edcil');
    });

    it('should return "Dif\u00edcil" for RPE 8 (boundary)', () => {
      expect(getRPELabel(8)).toBe('Dif\u00edcil');
    });

    it('should return "Muito Dif\u00edcil" for RPE 9', () => {
      expect(getRPELabel(9)).toBe('Muito Dif\u00edcil');
    });

    it('should return "M\u00e1ximo" for RPE 10', () => {
      expect(getRPELabel(10)).toBe('M\u00e1ximo');
    });

    it('should return "M\u00e1ximo" for RPE above 10', () => {
      expect(getRPELabel(11)).toBe('M\u00e1ximo');
    });

    it('should return "Muito Leve" for RPE 0', () => {
      expect(getRPELabel(0)).toBe('Muito Leve');
    });

    it('should return "Muito Leve" for negative RPE', () => {
      expect(getRPELabel(-1)).toBe('Muito Leve');
    });
  });

  // --------------------------------------------------------------------------
  // getZoneColor & getPaceZoneInfo
  // --------------------------------------------------------------------------

  describe('getZoneColor', () => {
    it('should return color for valid pace zone Z1', () => {
      const color = getZoneColor('Z1');
      expect(color).toBe(PACE_ZONES.Z1.color);
    });

    it('should return color for valid pace zone Z5', () => {
      const color = getZoneColor('Z5');
      expect(color).toBe(PACE_ZONES.Z5.color);
    });

    it('should return fallback for non-zone string', () => {
      const color = getZoneColor('notazone');
      expect(color).toBe('bg-ceramic-text-secondary/20');
    });

    it('should return fallback for invalid zone starting with Z', () => {
      const color = getZoneColor('Z9');
      expect(color).toBe('bg-ceramic-text-secondary/20');
    });
  });

  describe('getPaceZoneInfo', () => {
    it('should return zone info for Z1', () => {
      const info = getPaceZoneInfo('Z1');
      expect(info).toBeDefined();
      expect(info!.name).toBe('Z1');
      expect(info!.label).toContain('Recupera');
    });

    it('should return zone info for Z5', () => {
      const info = getPaceZoneInfo('Z5');
      expect(info).toBeDefined();
      expect(info!.name).toBe('Z5');
      expect(info!.label).toContain('VO2max');
    });

    it('should return undefined for invalid zone', () => {
      const info = getPaceZoneInfo('Z9' as any);
      expect(info).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Zone data constants validation
  // --------------------------------------------------------------------------

  describe('Zone Constants', () => {
    it('FTP_ZONES should have 5 zones (Z1-Z5)', () => {
      expect(Object.keys(FTP_ZONES)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5']);
    });

    it('PACE_ZONES should have 5 zones (Z1-Z5)', () => {
      expect(Object.keys(PACE_ZONES)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5']);
    });

    it('FTP zones should have non-overlapping consecutive ranges', () => {
      const keys = Object.keys(FTP_ZONES);
      for (let i = 1; i < keys.length; i++) {
        const prev = FTP_ZONES[keys[i - 1]];
        const curr = FTP_ZONES[keys[i]];
        expect(curr.min).toBe(prev.max + 1);
      }
    });

    it('CSS zones should have non-overlapping consecutive ranges', () => {
      const keys = Object.keys(CSS_ZONES);
      for (let i = 1; i < keys.length; i++) {
        const prev = CSS_ZONES[keys[i - 1]];
        const curr = CSS_ZONES[keys[i]];
        expect(curr.min).toBe(prev.max + 1);
      }
    });

    it('all FTP zones should have required properties', () => {
      Object.values(FTP_ZONES).forEach((zone) => {
        expect(zone.name).toBeTruthy();
        expect(zone.min).toBeLessThan(zone.max);
        expect(zone.description).toBeTruthy();
        expect(zone.color).toBeTruthy();
      });
    });

    it('all CSS zones should have required properties', () => {
      Object.values(CSS_ZONES).forEach((zone) => {
        expect(zone.name).toBeTruthy();
        expect(zone.min).toBeLessThan(zone.max);
        expect(zone.description).toBeTruthy();
        expect(zone.color).toBeTruthy();
      });
    });

    it('all PACE zones should have required properties', () => {
      Object.values(PACE_ZONES).forEach((zone) => {
        expect(zone.name).toBeTruthy();
        expect(zone.label).toBeTruthy();
        expect(zone.description).toBeTruthy();
        expect(zone.ftpRange).toBeTruthy();
        expect(zone.color).toBeTruthy();
      });
    });
  });
});
