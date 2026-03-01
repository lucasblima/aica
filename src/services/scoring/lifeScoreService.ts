/**
 * Life Score Service
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Computes the composite Life Score using a weighted geometric mean (HDI-inspired).
 * Supports three weighting methods: equal, slider, and AHP (Saaty, 1980).
 *
 * Formula: LifeScore = (Π score_i^w_i)^(1/Σw_i)
 * Reference: UNDP Human Development Index geometric mean methodology
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  AicaDomain,
  DomainScore,
  LifeScore,
  AHPComparison,
  AHPResult,
  ScoreTrend,
} from './types';
import { DEFAULT_DOMAIN_WEIGHTS, getSufficiencyLevel } from './types';
import { detectSpiral } from './spiralDetectionService';

const log = createNamespacedLogger('LifeScoreService');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum score to avoid log(0) in geometric mean */
const MIN_SCORE = 0.01;

/** Random Index for AHP consistency check (Saaty, 1980) */
const RANDOM_INDEX: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45,
};

/** AHP consistency threshold */
const AHP_CONSISTENCY_THRESHOLD = 0.10;

/** Domain labels in Portuguese */
export const DOMAIN_LABELS: Record<AicaDomain, string> = {
  atlas: 'Produtividade',
  journey: 'Bem-estar',
  connections: 'Relacionamentos',
  finance: 'Finanças',
  grants: 'Captação',
  studio: 'Produção',
  flux: 'Treinamento',
};

// ============================================================================
// WEIGHTED GEOMETRIC MEAN
// ============================================================================

/**
 * Compute weighted geometric mean (HDI methodology).
 * LifeScore = (Π score_i^w_i)^(1/Σw_i)
 */
export function computeWeightedGeometricMean(
  domains: DomainScore[],
  weights: Record<string, number>
): number {
  if (domains.length === 0) return 0;

  const totalWeight = domains.reduce((sum, d) => sum + (weights[d.module] ?? 1), 0);
  if (totalWeight === 0) return 0;

  const logSum = domains.reduce((acc, d) => {
    const w = weights[d.module] ?? 1;
    const score = Math.max(d.normalized, MIN_SCORE);
    return acc + w * Math.log(score);
  }, 0);

  return Math.exp(logSum / totalWeight);
}

// ============================================================================
// AHP — ANALYTIC HIERARCHY PROCESS (Saaty, 1980)
// ============================================================================

/**
 * Build pairwise comparison matrix from user comparisons.
 * Saaty 9-point scale: 1=equal, 3=moderate, 5=strong, 7=very strong, 9=extreme.
 */
function buildComparisonMatrix(
  comparisons: AHPComparison[],
  domains: AicaDomain[]
): number[][] {
  const n = domains.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
  const indexMap = new Map(domains.map((d, i) => [d, i]));

  for (const comp of comparisons) {
    const i = indexMap.get(comp.domainA);
    const j = indexMap.get(comp.domainB);
    if (i !== undefined && j !== undefined) {
      matrix[i][j] = comp.value;
      matrix[j][i] = 1 / comp.value;
    }
  }
  return matrix;
}

/**
 * Compute principal eigenvector of comparison matrix (power iteration).
 * Returns normalized weights.
 */
function computePrincipalEigenvector(matrix: number[][]): number[] {
  const n = matrix.length;
  let vector = Array(n).fill(1 / n);

  // Power iteration (10 iterations is sufficient for convergence)
  for (let iter = 0; iter < 10; iter++) {
    const newVector = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newVector[i] += matrix[i][j] * vector[j];
      }
    }
    const sum = newVector.reduce((a, b) => a + b, 0);
    vector = newVector.map(v => v / sum);
  }

  return vector;
}

/**
 * Compute AHP consistency ratio.
 * CR < 0.10 means consistent judgments (Saaty, 1980).
 */
function computeConsistencyRatio(matrix: number[][], weights: number[]): number {
  const n = matrix.length;
  if (n <= 2) return 0;

  // Compute λ_max (principal eigenvalue)
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let rowProduct = 0;
    for (let j = 0; j < n; j++) {
      rowProduct += matrix[i][j] * weights[j];
    }
    lambdaMax += rowProduct / weights[i];
  }
  lambdaMax /= n;

  const consistencyIndex = (lambdaMax - n) / (n - 1);
  const randomIndex = RANDOM_INDEX[n] ?? 1.45;

  return randomIndex === 0 ? 0 : consistencyIndex / randomIndex;
}

/**
 * Compute domain weights using AHP pairwise comparisons.
 */
export function computeAHPWeights(comparisons: AHPComparison[]): AHPResult {
  const domains = [...new Set(comparisons.flatMap(c => [c.domainA, c.domainB]))] as AicaDomain[];
  const matrix = buildComparisonMatrix(comparisons, domains);
  const eigenvector = computePrincipalEigenvector(matrix);
  const cr = computeConsistencyRatio(matrix, eigenvector);

  const weights: Record<string, number> = {};
  domains.forEach((d, i) => {
    weights[d] = eigenvector[i];
  });

  return {
    weights: weights as Record<AicaDomain, number>,
    consistencyRatio: cr,
    isConsistent: cr < AHP_CONSISTENCY_THRESHOLD,
  };
}

// ============================================================================
// TREND COMPUTATION
// ============================================================================

/**
 * Compute trend from recent Life Score history.
 * Uses linear regression slope over last N entries.
 */
export function computeTrend(history: { composite: number; computedAt: string }[]): ScoreTrend {
  if (history.length < 3) return 'stable';

  const recent = history.slice(0, 7); // Last 7 entries
  const n = recent.length;

  // Simple linear regression on indices
  const meanX = (n - 1) / 2;
  const meanY = recent.reduce((s, h) => s + h.composite, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * (recent[i].composite - meanY);
    denominator += (i - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Threshold: ±0.02 change per entry = meaningful trend
  if (slope > 0.02) return 'improving';
  if (slope < -0.02) return 'declining';
  return 'stable';
}

// ============================================================================
// LIFE SCORE COMPUTATION
// ============================================================================

/**
 * Compute the full Life Score from domain scores and weights.
 */
export function computeLifeScore(
  domains: DomainScore[],
  weights: Record<AicaDomain, number>,
  history: { composite: number; computedAt: string }[] = []
): LifeScore {
  const composite = computeWeightedGeometricMean(domains, weights);
  const trend = computeTrend(history);

  // Build domain scores record
  const domainScores: Record<string, number> = {};
  for (const d of domains) {
    domainScores[d.module] = d.normalized;
  }

  // Detect spiral
  const spiralResult = detectSpiral(history, domains);

  return {
    composite,
    domainScores: domainScores as Record<AicaDomain, number>,
    domainWeights: weights,
    weightMethod: 'slider',
    trend,
    sufficiency: getSufficiencyLevel(composite),
    spiralAlert: spiralResult.detected,
    spiralDomains: spiralResult.decliningDomains as AicaDomain[],
    computedAt: new Date().toISOString(),
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get current user's domain weights from the database.
 * Returns default equal weights if none set.
 */
export async function getUserDomainWeights(): Promise<{
  weights: Record<AicaDomain, number>;
  method: string;
  ahpComparisons: AHPComparison[] | null;
}> {
  try {
    const { data, error } = await supabase.rpc('get_user_domain_weights');

    if (error) {
      log.warn('Failed to fetch domain weights, using defaults:', error.message);
      return { weights: { ...DEFAULT_DOMAIN_WEIGHTS }, method: 'equal', ahpComparisons: null };
    }

    if (!data || data.length === 0) {
      return { weights: { ...DEFAULT_DOMAIN_WEIGHTS }, method: 'equal', ahpComparisons: null };
    }

    const row = data[0];
    return {
      weights: row.weights as Record<AicaDomain, number>,
      method: row.method,
      ahpComparisons: row.ahp_comparisons as AHPComparison[] | null,
    };
  } catch (err) {
    log.error('getUserDomainWeights failed:', err);
    return { weights: { ...DEFAULT_DOMAIN_WEIGHTS }, method: 'equal', ahpComparisons: null };
  }
}

/**
 * Save user's domain weights to the database.
 */
export async function saveUserDomainWeights(
  weights: Record<AicaDomain, number>,
  method: 'equal' | 'slider' | 'ahp' = 'slider',
  ahpComparisons?: AHPComparison[]
): Promise<void> {
  try {
    const { error } = await supabase.rpc('upsert_user_domain_weights', {
      p_weights: weights,
      p_method: method,
      p_ahp_comparisons: ahpComparisons ?? null,
    });

    if (error) {
      log.error('Failed to save domain weights:', error.message);
      throw error;
    }

    log.info('Domain weights saved:', { method, weights });
  } catch (err) {
    log.error('saveUserDomainWeights failed:', err);
    throw err;
  }
}

/**
 * Get latest Life Score for current user from database.
 */
export async function getLatestLifeScore(): Promise<LifeScore | null> {
  try {
    const { data, error } = await supabase.rpc('get_latest_life_score');

    if (error) {
      log.error('Failed to fetch latest Life Score:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    const row = data[0];
    return {
      composite: row.composite_score,
      domainScores: row.domain_scores as Record<AicaDomain, number>,
      domainWeights: row.domain_weights as Record<AicaDomain, number>,
      weightMethod: 'slider',
      trend: (row.trend as ScoreTrend) ?? 'stable',
      sufficiency: getSufficiencyLevel(row.composite_score),
      spiralAlert: row.spiral_detected ?? false,
      spiralDomains: (row.spiral_domains as AicaDomain[]) ?? [],
      computedAt: row.computed_at,
    };
  } catch (err) {
    log.error('getLatestLifeScore failed:', err);
    return null;
  }
}

/**
 * Get Life Score history (last N entries).
 */
export async function getLifeScoreHistory(
  limit = 30
): Promise<{ composite: number; domainScores: Record<string, number>; trend: string; spiralDetected: boolean; computedAt: string }[]> {
  try {
    const { data, error } = await supabase.rpc('get_life_score_history', {
      p_limit: limit,
    });

    if (error) {
      log.error('Failed to fetch Life Score history:', error.message);
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      composite: row.composite_score as number,
      domainScores: row.domain_scores as Record<string, number>,
      trend: (row.trend as string) ?? 'stable',
      spiralDetected: (row.spiral_detected as boolean) ?? false,
      computedAt: row.computed_at as string,
    }));
  } catch (err) {
    log.error('getLifeScoreHistory failed:', err);
    return [];
  }
}

/**
 * Store a computed Life Score in the database.
 */
export async function storeLifeScore(score: LifeScore): Promise<void> {
  try {
    const { error } = await supabase.from('life_scores').insert({
      domain_scores: score.domainScores,
      domain_weights: score.domainWeights,
      composite_score: score.composite,
      trend: score.trend,
      spiral_detected: score.spiralAlert,
      spiral_domains: score.spiralDomains,
    });

    if (error) {
      log.error('Failed to store Life Score:', error.message);
      throw error;
    }

    log.info('Life Score stored:', { composite: score.composite, trend: score.trend });
  } catch (err) {
    log.error('storeLifeScore failed:', err);
    throw err;
  }
}
