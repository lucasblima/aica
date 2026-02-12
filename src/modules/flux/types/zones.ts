/**
 * Training Zone Type Definitions
 *
 * Defines intensity zones for different modalities (swimming, running, cycling)
 * with color coding and helper functions.
 */

import type { PaceZone } from './flow';

// ============================================================================
// ZONE DEFINITIONS
// ============================================================================

export interface FTPZone {
  name: string;
  min: number; // percentage
  max: number; // percentage
  description: string;
  color: string;
}

export interface CSSZone {
  name: string;
  min: number; // percentage
  max: number; // percentage
  description: string;
  color: string;
}

export interface PaceZoneInfo {
  name: PaceZone;
  label: string;
  description: string;
  ftpRange: string; // equivalent FTP% range
  color: string;
}

// ============================================================================
// FTP ZONES (Cycling)
// ============================================================================

export const FTP_ZONES: Record<string, FTPZone> = {
  Z1: {
    name: 'Z1 - Recuperação Ativa',
    min: 40,
    max: 55,
    description: 'Recuperação ativa, conversação fácil',
    color: 'bg-ceramic-info/20 text-ceramic-info',
  },
  Z2: {
    name: 'Z2 - Endurance',
    min: 56,
    max: 75,
    description: 'Base aeróbica, conversação possível',
    color: 'bg-green-500/20 text-green-600',
  },
  Z3: {
    name: 'Z3 - Tempo',
    min: 76,
    max: 90,
    description: 'Ritmo sustentável, conversação difícil',
    color: 'bg-ceramic-warning/20 text-ceramic-warning',
  },
  Z4: {
    name: 'Z4 - Limiar',
    min: 91,
    max: 105,
    description: 'Limiar anaeróbico, máximo esforço sustentável',
    color: 'bg-orange-500/20 text-orange-600',
  },
  Z5: {
    name: 'Z5 - VO2max',
    min: 106,
    max: 120,
    description: 'VO2max, esforço máximo',
    color: 'bg-ceramic-error/20 text-ceramic-error',
  },
};

// ============================================================================
// CSS ZONES (Swimming)
// ============================================================================

export const CSS_ZONES: Record<string, CSSZone> = {
  Z1: {
    name: 'Z1 - Recuperação',
    min: 50,
    max: 65,
    description: 'Recuperação ativa, técnica',
    color: 'bg-ceramic-info/20 text-ceramic-info',
  },
  Z2: {
    name: 'Z2 - Aeróbico',
    min: 66,
    max: 80,
    description: 'Base aeróbica, nado contínuo',
    color: 'bg-green-500/20 text-green-600',
  },
  Z3: {
    name: 'Z3 - Limiar',
    min: 81,
    max: 95,
    description: 'Limiar anaeróbico',
    color: 'bg-ceramic-warning/20 text-ceramic-warning',
  },
  Z4: {
    name: 'Z4 - VO2max',
    min: 96,
    max: 110,
    description: 'VO2max, intervalos curtos',
    color: 'bg-ceramic-error/20 text-ceramic-error',
  },
};

// ============================================================================
// PACE ZONES (Running)
// ============================================================================

export const PACE_ZONES: Record<PaceZone, PaceZoneInfo> = {
  Z1: {
    name: 'Z1',
    label: 'Zona 1 - Recuperação',
    description: 'Recuperação ativa, conversação fácil',
    ftpRange: '50-60%',
    color: 'bg-ceramic-info/20 text-ceramic-info',
  },
  Z2: {
    name: 'Z2',
    label: 'Zona 2 - Base Aeróbica',
    description: 'Base aeróbica, conversação possível',
    ftpRange: '60-75%',
    color: 'bg-green-500/20 text-green-600',
  },
  Z3: {
    name: 'Z3',
    label: 'Zona 3 - Tempo',
    description: 'Ritmo sustentável, conversação difícil',
    ftpRange: '75-85%',
    color: 'bg-ceramic-warning/20 text-ceramic-warning',
  },
  Z4: {
    name: 'Z4',
    label: 'Zona 4 - Limiar',
    description: 'Limiar anaeróbico',
    ftpRange: '85-95%',
    color: 'bg-orange-500/20 text-orange-600',
  },
  Z5: {
    name: 'Z5',
    label: 'Zona 5 - VO2max',
    description: 'VO2max, esforço máximo',
    ftpRange: '95-105%',
    color: 'bg-ceramic-error/20 text-ceramic-error',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getZoneColor(zone: string): string {
  if (zone.startsWith('Z')) {
    return PACE_ZONES[zone as PaceZone]?.color || 'bg-ceramic-text-secondary/20';
  }
  return 'bg-ceramic-text-secondary/20';
}

export function getPaceZoneInfo(zone: PaceZone): PaceZoneInfo | undefined {
  return PACE_ZONES[zone];
}

export function getFTPZoneByPercentage(percentage: number): FTPZone | null {
  const zone = Object.values(FTP_ZONES).find((z) => percentage >= z.min && percentage <= z.max);
  return zone || null;
}

export function getCSSZoneByPercentage(percentage: number): CSSZone | null {
  const zone = Object.values(CSS_ZONES).find((z) => percentage >= z.min && percentage <= z.max);
  return zone || null;
}

export function getRPEColor(rpe: number): string {
  if (rpe <= 3) return 'bg-ceramic-info/20 text-ceramic-info';
  if (rpe <= 5) return 'bg-green-500/20 text-green-600';
  if (rpe <= 7) return 'bg-ceramic-warning/20 text-ceramic-warning';
  if (rpe <= 9) return 'bg-orange-500/20 text-orange-600';
  return 'bg-ceramic-error/20 text-ceramic-error';
}

export function getRPELabel(rpe: number): string {
  if (rpe <= 2) return 'Muito Leve';
  if (rpe <= 4) return 'Leve';
  if (rpe <= 6) return 'Moderado';
  if (rpe <= 8) return 'Difícil';
  if (rpe <= 9) return 'Muito Difícil';
  return 'Máximo';
}
