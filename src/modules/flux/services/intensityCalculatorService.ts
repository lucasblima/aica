/**
 * Intensity Calculator Service
 *
 * Calculate training zones and intensities based on performance thresholds (FTP, Pace, CSS)
 * Supports Z-Score zones (21-25) and modality-specific calculations
 */

import type {
  IntensityCalculation,
  TrainingModality,
  PaceZone,
  AthleteProfile,
} from '../types/flow';

export class IntensityCalculatorService {
  // ============================================================================
  // CYCLING - FTP-based calculations
  // ============================================================================

  /**
   * Calculate cycling zones from FTP
   * Zones: Z1 (55-75%), Z2 (75-90%), Z3 (90-105%), Z4 (105-120%), Z5 (120%+)
   */
  static calculateCyclingZones(ftp: number): {
    z1: [number, number];
    z2: [number, number];
    z3: [number, number];
    z4: [number, number];
    z5: [number, number];
  } {
    return {
      z1: [Math.round(ftp * 0.55), Math.round(ftp * 0.75)],
      z2: [Math.round(ftp * 0.75), Math.round(ftp * 0.9)],
      z3: [Math.round(ftp * 0.9), Math.round(ftp * 1.05)],
      z4: [Math.round(ftp * 1.05), Math.round(ftp * 1.2)],
      z5: [Math.round(ftp * 1.2), Math.round(ftp * 1.5)],
    };
  }

  /**
   * Get power target for a specific zone (21-25 mapping to Z1-Z5)
   */
  static getCyclingPowerTarget(ftp: number, zScore: number): number {
    const zones = this.calculateCyclingZones(ftp);

    switch (zScore) {
      case 21:
        return Math.round((zones.z1[0] + zones.z1[1]) / 2); // Z1 midpoint
      case 22:
        return Math.round((zones.z2[0] + zones.z2[1]) / 2); // Z2 midpoint
      case 23:
        return Math.round((zones.z3[0] + zones.z3[1]) / 2); // Z3 midpoint
      case 24:
        return Math.round((zones.z4[0] + zones.z4[1]) / 2); // Z4 midpoint
      case 25:
        return Math.round((zones.z5[0] + zones.z5[1]) / 2); // Z5 midpoint
      default:
        return Math.round(ftp * 0.75); // Default to Z2
    }
  }

  // ============================================================================
  // RUNNING - Pace-based calculations
  // ============================================================================

  /**
   * Convert pace string (e.g., "4:30/km") to seconds per km
   */
  static paceToSeconds(paceStr: string): number {
    const match = paceStr.match(/(\d+):(\d+)/);
    if (!match) return 270; // Default 4:30/km

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }

  /**
   * Convert seconds per km to pace string
   */
  static secondsToPace(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
  }

  /**
   * Calculate running zones from threshold pace
   * Zones based on % of threshold pace:
   * Z1 (slower than 115%), Z2 (105-115%), Z3 (100-105%), Z4 (95-100%), Z5 (faster than 95%)
   */
  static calculateRunningZones(thresholdPace: string): {
    z1: string;
    z2: string;
    z3: string;
    z4: string;
    z5: string;
  } {
    const thresholdSeconds = this.paceToSeconds(thresholdPace);

    return {
      z1: this.secondsToPace(thresholdSeconds * 1.15), // Recovery
      z2: this.secondsToPace(thresholdSeconds * 1.1), // Aerobic
      z3: this.secondsToPace(thresholdSeconds * 1.025), // Tempo
      z4: this.secondsToPace(thresholdSeconds * 0.975), // Threshold
      z5: this.secondsToPace(thresholdSeconds * 0.9), // VO2 Max
    };
  }

  /**
   * Get pace target for a specific zone
   */
  static getRunningPaceTarget(thresholdPace: string, zScore: number): string {
    const zones = this.calculateRunningZones(thresholdPace);

    switch (zScore) {
      case 21:
        return zones.z1;
      case 22:
        return zones.z2;
      case 23:
        return zones.z3;
      case 24:
        return zones.z4;
      case 25:
        return zones.z5;
      default:
        return zones.z2;
    }
  }

  // ============================================================================
  // SWIMMING - CSS-based calculations
  // ============================================================================

  /**
   * Convert CSS string (e.g., "1:30/100m") to seconds per 100m
   */
  static cssToSeconds(cssStr: string): number {
    const match = cssStr.match(/(\d+):(\d+)/);
    if (!match) return 90; // Default 1:30/100m

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }

  /**
   * Convert seconds per 100m to CSS string
   */
  static secondsToCSS(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}/100m`;
  }

  /**
   * Calculate swimming zones from CSS
   * Zones based on % of CSS:
   * Z1 (slower than 115%), Z2 (105-115%), Z3 (100-105%), Z4 (95-100%), Z5 (faster than 95%)
   */
  static calculateSwimmingZones(css: string): {
    z1: string;
    z2: string;
    z3: string;
    z4: string;
    z5: string;
  } {
    const cssSeconds = this.cssToSeconds(css);

    return {
      z1: this.secondsToCSS(cssSeconds * 1.15), // Recovery
      z2: this.secondsToCSS(cssSeconds * 1.1), // Aerobic
      z3: this.secondsToCSS(cssSeconds * 1.025), // Endurance
      z4: this.secondsToCSS(cssSeconds * 0.975), // Threshold
      z5: this.secondsToCSS(cssSeconds * 0.9), // Sprint
    };
  }

  /**
   * Get CSS target for a specific zone
   */
  static getSwimmingCSSTarget(css: string, zScore: number): string {
    const zones = this.calculateSwimmingZones(css);

    switch (zScore) {
      case 21:
        return zones.z1;
      case 22:
        return zones.z2;
      case 23:
        return zones.z3;
      case 24:
        return zones.z4;
      case 25:
        return zones.z5;
      default:
        return zones.z2;
    }
  }

  // ============================================================================
  // UNIFIED INTERFACE
  // ============================================================================

  /**
   * Calculate intensity for any modality based on athlete profile
   */
  static calculateIntensity(
    profile: AthleteProfile,
    targetZone: number
  ): IntensityCalculation {
    const modality = profile.modality;

    switch (modality) {
      case 'cycling': {
        if (!profile.ftp) {
          throw new Error('FTP não definido para atleta de ciclismo');
        }

        const powerTarget = this.getCyclingPowerTarget(profile.ftp, targetZone);
        const zones = this.calculateCyclingZones(profile.ftp);

        return {
          modality: 'cycling',
          base_threshold: profile.ftp,
          target_zone: targetZone,
          recommended_intensity: `${powerTarget}W`,
          workout_examples: [
            `4x8min @ ${powerTarget}W (rest 2min)`,
            `20min steady @ ${powerTarget}W`,
            `3x(5x1min @ ${powerTarget}W, rest 1min), rest 3min between sets`,
          ],
        };
      }

      case 'running': {
        if (!profile.pace_threshold) {
          throw new Error('Pace limiar não definido para atleta de corrida');
        }

        const paceTarget = this.getRunningPaceTarget(profile.pace_threshold, targetZone);

        return {
          modality: 'running',
          base_threshold: profile.pace_threshold,
          target_zone: targetZone,
          recommended_intensity: paceTarget,
          workout_examples: [
            `6x1km @ ${paceTarget} (rest 90s)`,
            `30min tempo @ ${paceTarget}`,
            `12x400m @ ${paceTarget} (rest 60s)`,
          ],
        };
      }

      case 'swimming': {
        if (!profile.swim_css) {
          throw new Error('CSS não definido para atleta de natação');
        }

        const cssTarget = this.getSwimmingCSSTarget(profile.swim_css, targetZone);

        return {
          modality: 'swimming',
          base_threshold: profile.swim_css,
          target_zone: targetZone,
          recommended_intensity: cssTarget,
          workout_examples: [
            `8x100m @ ${cssTarget} (rest 15s)`,
            `4x200m @ ${cssTarget} (rest 20s)`,
            `20x50m @ ${cssTarget} (rest 10s)`,
          ],
        };
      }

      case 'strength': {
        // Strength uses RPE (Rate of Perceived Exertion) instead of zones
        const rpeMap: Record<number, number> = {
          21: 6, // Light
          22: 7, // Moderate
          23: 8, // Hard
          24: 9, // Very Hard
          25: 10, // Max Effort
        };

        const rpeTarget = rpeMap[targetZone] || 7;

        return {
          modality: 'strength',
          base_threshold: 'RPE',
          target_zone: targetZone,
          recommended_intensity: `RPE ${rpeTarget}`,
          workout_examples: [
            `4x8 reps @ RPE ${rpeTarget}`,
            `3x12 reps @ RPE ${rpeTarget}`,
            `5x5 reps @ RPE ${rpeTarget}`,
          ],
        };
      }

      default:
        throw new Error(`Modalidade não suportada: ${modality}`);
    }
  }

  /**
   * Get all zones for athlete profile
   */
  static getAllZones(profile: AthleteProfile): {
    z1: string | number;
    z2: string | number;
    z3: string | number;
    z4: string | number;
    z5: string | number;
  } {
    switch (profile.modality) {
      case 'cycling':
        if (!profile.ftp) throw new Error('FTP não definido');
        const cyclingZones = this.calculateCyclingZones(profile.ftp);
        return {
          z1: `${cyclingZones.z1[0]}-${cyclingZones.z1[1]}W`,
          z2: `${cyclingZones.z2[0]}-${cyclingZones.z2[1]}W`,
          z3: `${cyclingZones.z3[0]}-${cyclingZones.z3[1]}W`,
          z4: `${cyclingZones.z4[0]}-${cyclingZones.z4[1]}W`,
          z5: `${cyclingZones.z5[0]}+W`,
        };

      case 'running':
        if (!profile.pace_threshold) throw new Error('Pace limiar não definido');
        return this.calculateRunningZones(profile.pace_threshold);

      case 'swimming':
        if (!profile.swim_css) throw new Error('CSS não definido');
        return this.calculateSwimmingZones(profile.swim_css);

      case 'strength':
        return {
          z1: 'RPE 6',
          z2: 'RPE 7',
          z3: 'RPE 8',
          z4: 'RPE 9',
          z5: 'RPE 10',
        };

      default:
        throw new Error(`Modalidade não suportada: ${profile.modality}`);
    }
  }
}
