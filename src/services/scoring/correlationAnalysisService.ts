/**
 * Cross-Domain Correlation Analysis Service
 * Sprint 7 — Cross-Module Intelligence
 *
 * Discovers statistical correlations between AICA domain scores.
 * Goes beyond the 6 hardcoded pairs in spiralDetectionService by computing
 * Pearson correlation on actual user data over rolling windows.
 *
 * Reference: Pearson (1895)
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import type { AicaDomain } from './types';

const log = createNamespacedLogger('correlationAnalysis');

// All 7 AICA domains
const ALL_DOMAINS: AicaDomain[] = ['atlas', 'journey', 'connections', 'finance', 'grants', 'studio', 'flux'];

// ============================================================================
// TYPES
// ============================================================================

export interface CorrelationResult {
  domainA: AicaDomain;
  domainB: AicaDomain;
  coefficient: number;       // Pearson r (-1 to 1)
  sampleSize: number;
  pValue: number | null;
  isSignificant: boolean;    // p < 0.05
  strength: 'strong' | 'moderate' | 'weak' | 'negligible';
  direction: 'positive' | 'negative';
}

export interface CorrelationMatrix {
  pairs: CorrelationResult[];
  significantPairs: CorrelationResult[];
  strongestPositive: CorrelationResult | null;
  strongestNegative: CorrelationResult | null;
  computedAt: string;
  windowDays: number;
}

// ============================================================================
// PEARSON CORRELATION
// ============================================================================

/**
 * Compute Pearson correlation coefficient between two arrays.
 * r = cov(X,Y) / (sigma_X * sigma_Y)
 *
 * Requires at least 3 data points for meaningful results.
 */
export function pearsonCorrelation(x: number[], y: number[]): { r: number; n: number } {
  const n = Math.min(x.length, y.length);
  if (n < 3) return { r: 0, n };

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const meanX = xSlice.reduce((s, v) => s + v, 0) / n;
  const meanY = ySlice.reduce((s, v) => s + v, 0) / n;

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom === 0) return { r: 0, n };

  return { r: sumXY / denom, n };
}

// ============================================================================
// P-VALUE APPROXIMATION
// ============================================================================

/**
 * Approximate p-value for Pearson r using t-distribution.
 * t = r * sqrt((n-2) / (1-r^2))
 * Uses normal approximation for large df and lookup table for small df.
 */
export function approximatePValue(r: number, n: number): number {
  if (n <= 2) return 1;
  const absR = Math.abs(r);
  if (absR >= 1) return 0;

  const t = absR * Math.sqrt((n - 2) / (1 - absR * absR));
  const df = n - 2;

  // Normal approximation for df > 30
  if (df > 30) {
    return 2 * (1 - normalCDF(t));
  }

  // Critical t values for p=0.05 (two-tailed) — lookup-based approximation
  const criticalT05: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042,
  };

  const closestDf = Object.keys(criticalT05)
    .map(Number)
    .reduce((prev, curr) => Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev);

  const critical = criticalT05[closestDf] || 2.0;
  // Rough classification: significant or not
  return t >= critical ? 0.01 : 0.10;
}

/** Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989422804 * Math.exp(-absZ * absZ / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

// ============================================================================
// CORRELATION STRENGTH
// ============================================================================

/**
 * Get correlation strength label based on |r|.
 * Evans (1996) interpretation guidelines.
 */
export function getCorrelationStrength(r: number): CorrelationResult['strength'] {
  const absR = Math.abs(r);
  if (absR >= 0.7) return 'strong';
  if (absR >= 0.4) return 'moderate';
  if (absR >= 0.2) return 'weak';
  return 'negligible';
}

// ============================================================================
// CORRELATION MATRIX COMPUTATION
// ============================================================================

/**
 * Compute full correlation matrix from domain score time series.
 * Evaluates all 21 possible domain pairs (7 choose 2).
 *
 * @param domainHistories - Map of domain -> array of scores over time (newest first)
 * @param windowDays - Window size label (for metadata)
 */
export function computeCorrelationMatrix(
  domainHistories: Record<AicaDomain, number[]>,
  windowDays = 30
): CorrelationMatrix {
  const pairs: CorrelationResult[] = [];

  for (let i = 0; i < ALL_DOMAINS.length; i++) {
    for (let j = i + 1; j < ALL_DOMAINS.length; j++) {
      const domainA = ALL_DOMAINS[i];
      const domainB = ALL_DOMAINS[j];
      const xData = domainHistories[domainA] || [];
      const yData = domainHistories[domainB] || [];

      const { r, n } = pearsonCorrelation(xData, yData);
      const pValue = approximatePValue(r, n);
      const isSignificant = pValue < 0.05 && n >= 7;

      pairs.push({
        domainA,
        domainB,
        coefficient: Math.round(r * 1000) / 1000,
        sampleSize: n,
        pValue: Math.round(pValue * 1000) / 1000,
        isSignificant,
        strength: getCorrelationStrength(r),
        direction: r >= 0 ? 'positive' : 'negative',
      });
    }
  }

  const significantPairs = pairs.filter(p => p.isSignificant);
  const positivePairs = significantPairs.filter(p => p.direction === 'positive');
  const negativePairs = significantPairs.filter(p => p.direction === 'negative');

  return {
    pairs,
    significantPairs,
    strongestPositive: positivePairs.sort((a, b) => b.coefficient - a.coefficient)[0] || null,
    strongestNegative: negativePairs.sort((a, b) => a.coefficient - b.coefficient)[0] || null,
    computedAt: new Date().toISOString(),
    windowDays,
  };
}

// ============================================================================
// SUPABASE PERSISTENCE
// ============================================================================

/**
 * Store a full correlation matrix in the database.
 * Uses upsert on the unique (user_id, domain_a, domain_b, window_days) constraint.
 */
export async function storeCorrelationMatrix(matrix: CorrelationMatrix): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = matrix.pairs.map(p => ({
      user_id: user.id,
      domain_a: p.domainA,
      domain_b: p.domainB,
      correlation_coefficient: p.coefficient,
      sample_size: p.sampleSize,
      p_value: p.pValue,
      is_significant: p.isSignificant,
      window_days: matrix.windowDays,
    }));

    const { error } = await supabase
      .from('domain_correlations')
      .upsert(rows, { onConflict: 'user_id,domain_a,domain_b,window_days' });

    if (error) throw error;
    log.info('Matriz de correlacao armazenada', { pairs: rows.length, significant: matrix.significantPairs.length });
  } catch (err) {
    log.error('Erro ao armazenar matriz de correlacao:', err);
    throw err;
  }
}

/**
 * Fetch stored significant correlations for the current user.
 */
export async function getStoredCorrelations(): Promise<CorrelationResult[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('domain_correlations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_significant', true)
      .order('correlation_coefficient', { ascending: false });

    if (error) return [];

    return (data || []).map(d => ({
      domainA: d.domain_a as AicaDomain,
      domainB: d.domain_b as AicaDomain,
      coefficient: d.correlation_coefficient,
      sampleSize: d.sample_size,
      pValue: d.p_value,
      isSignificant: d.is_significant,
      strength: getCorrelationStrength(d.correlation_coefficient),
      direction: d.correlation_coefficient >= 0 ? 'positive' as const : 'negative' as const,
    }));
  } catch (err) {
    log.error('Erro ao buscar correlacoes:', err);
    return [];
  }
}
