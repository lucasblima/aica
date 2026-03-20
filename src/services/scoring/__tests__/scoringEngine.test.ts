/**
 * Scoring Engine Tests
 * Tests for core scoring computation functions (pure logic, no DB calls).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeWeightedGeometricMean,
  computeLifeScore,
  computeTrend,
  computeAHPWeights,
} from '../lifeScoreService';
import {
  registerDomainProvider,
  unregisterDomainProvider,
  computeAllDomainScores,
  getPlaceholderDomainScore,
} from '../scoringEngine';
import { detectSpiral, getSpiralRecommendations, CORRELATED_PAIRS } from '../spiralDetectionService';
import { getSufficiencyLevel } from '../types';
import type { AicaDomain, DomainScore } from '../types';

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeDomainScore(
  module: AicaDomain,
  normalized: number,
  trend: 'improving' | 'stable' | 'declining' = 'stable'
): DomainScore {
  return {
    module,
    normalized,
    raw: normalized * 100,
    label: module,
    confidence: 0.8,
    trend,
  };
}

function makeHistory(composites: number[]): { composite: number; computedAt: string }[] {
  return composites.map((c, i) => ({
    composite: c,
    computedAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

// ============================================================================
// computeWeightedGeometricMean
// ============================================================================

describe('computeWeightedGeometricMean', () => {
  const equalWeights: Record<string, number> = {
    atlas: 1, journey: 1, connections: 1, finance: 1, flux: 1,
  };

  it('returns 0 for empty domains', () => {
    expect(computeWeightedGeometricMean([], equalWeights)).toBe(0);
  });

  it('returns the score itself for a single domain', () => {
    const domains = [makeDomainScore('atlas', 0.8)];
    const result = computeWeightedGeometricMean(domains, equalWeights);
    expect(result).toBeCloseTo(0.8, 2);
  });

  it('computes geometric mean for equal weights', () => {
    const domains = [
      makeDomainScore('atlas', 0.9),
      makeDomainScore('journey', 0.1),
    ];
    // Geometric mean of 0.9 and 0.1 = sqrt(0.09) ≈ 0.3
    const result = computeWeightedGeometricMean(domains, equalWeights);
    expect(result).toBeCloseTo(Math.sqrt(0.9 * 0.1), 2);
  });

  it('returns the score when all domains are equal', () => {
    const domains = [
      makeDomainScore('atlas', 0.7),
      makeDomainScore('journey', 0.7),
      makeDomainScore('finance', 0.7),
    ];
    const result = computeWeightedGeometricMean(domains, equalWeights);
    expect(result).toBeCloseTo(0.7, 2);
  });

  it('handles very low scores (clamped to MIN_SCORE=0.01)', () => {
    const domains = [
      makeDomainScore('atlas', 0),
      makeDomainScore('journey', 1),
    ];
    const result = computeWeightedGeometricMean(domains, equalWeights);
    // 0 is clamped to 0.01, geometric mean of 0.01 and 1 = sqrt(0.01) = 0.1
    expect(result).toBeCloseTo(Math.sqrt(0.01), 2);
  });

  it('respects different weights', () => {
    const domains = [
      makeDomainScore('atlas', 0.9),
      makeDomainScore('journey', 0.3),
    ];
    const heavyAtlasWeights = { atlas: 3, journey: 1 };
    const heavyJourneyWeights = { atlas: 1, journey: 3 };

    const atlasHeavy = computeWeightedGeometricMean(domains, heavyAtlasWeights);
    const journeyHeavy = computeWeightedGeometricMean(domains, heavyJourneyWeights);

    // Heavier atlas weight → closer to 0.9
    expect(atlasHeavy).toBeGreaterThan(journeyHeavy);
  });

  it('returns 0 when total weight is 0', () => {
    const domains = [makeDomainScore('atlas', 0.5)];
    const zeroWeights = { atlas: 0 };
    expect(computeWeightedGeometricMean(domains, zeroWeights)).toBe(0);
  });
});

// ============================================================================
// computeAllDomainScores
// ============================================================================

describe('computeAllDomainScores', () => {
  beforeEach(() => {
    // Clean up providers between tests
    const domains: AicaDomain[] = ['atlas', 'journey', 'connections', 'finance', 'grants', 'studio', 'flux'];
    domains.forEach(d => unregisterDomainProvider(d));
  });

  it('returns empty array when no providers registered', async () => {
    const results = await computeAllDomainScores();
    expect(results).toEqual([]);
  });

  it('calls registered providers and returns scores', async () => {
    registerDomainProvider('atlas', async () => makeDomainScore('atlas', 0.8));
    registerDomainProvider('journey', async () => makeDomainScore('journey', 0.6));

    const results = await computeAllDomainScores();
    expect(results).toHaveLength(2);
    expect(results.map(r => r.module)).toContain('atlas');
    expect(results.map(r => r.module)).toContain('journey');
  });

  it('skips providers that return null (insufficient data)', async () => {
    registerDomainProvider('atlas', async () => makeDomainScore('atlas', 0.8));
    registerDomainProvider('journey', async () => null);

    const results = await computeAllDomainScores();
    expect(results).toHaveLength(1);
    expect(results[0].module).toBe('atlas');
  });

  it('filters by activeDomains when provided', async () => {
    registerDomainProvider('atlas', async () => makeDomainScore('atlas', 0.8));
    registerDomainProvider('journey', async () => makeDomainScore('journey', 0.6));
    registerDomainProvider('finance', async () => makeDomainScore('finance', 0.5));

    const results = await computeAllDomainScores(['atlas', 'finance']);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.module)).not.toContain('journey');
  });

  it('continues when a provider throws (resilience)', async () => {
    registerDomainProvider('atlas', async () => { throw new Error('Provider failed'); });
    registerDomainProvider('journey', async () => makeDomainScore('journey', 0.6));

    const results = await computeAllDomainScores();
    expect(results).toHaveLength(1);
    expect(results[0].module).toBe('journey');
  });
});

// ============================================================================
// computeLifeScore
// ============================================================================

describe('computeLifeScore', () => {
  const defaultWeights: Record<AicaDomain, number> = {
    atlas: 1, journey: 1, connections: 1, finance: 1, grants: 1, studio: 1, flux: 1,
  };

  it('returns composite > 0 for valid domain scores', () => {
    const domains = [
      makeDomainScore('atlas', 0.8),
      makeDomainScore('journey', 0.7),
    ];
    const result = computeLifeScore(domains, defaultWeights);
    expect(result.composite).toBeGreaterThan(0);
    expect(result.composite).toBeLessThanOrEqual(1);
  });

  it('includes activeDomains in the output', () => {
    const domains = [makeDomainScore('atlas', 0.8)];
    const activeDomains: AicaDomain[] = ['atlas', 'journey'];
    const result = computeLifeScore(domains, defaultWeights, [], activeDomains);
    expect(result.activeDomains).toEqual(activeDomains);
  });

  it('populates domainScores record from input', () => {
    const domains = [
      makeDomainScore('atlas', 0.8),
      makeDomainScore('finance', 0.5),
    ];
    const result = computeLifeScore(domains, defaultWeights);
    expect(result.domainScores.atlas).toBe(0.8);
    expect(result.domainScores.finance).toBe(0.5);
  });

  it('returns correct sufficiency level', () => {
    const highDomains = [makeDomainScore('atlas', 0.9)];
    const lowDomains = [makeDomainScore('atlas', 0.2)];

    const highResult = computeLifeScore(highDomains, defaultWeights);
    const lowResult = computeLifeScore(lowDomains, defaultWeights);

    expect(highResult.sufficiency).toBe('thriving');
    expect(lowResult.sufficiency).toBe('attention_needed');
  });

  it('computes trend from history', () => {
    const domains = [makeDomainScore('atlas', 0.8)];
    // Array index = time axis; values increasing = improving
    const improvingHistory = makeHistory([0.3, 0.35, 0.4, 0.45, 0.5]);
    const result = computeLifeScore(domains, defaultWeights, improvingHistory);
    expect(result.trend).toBe('improving');
  });

  it('detects spiral when correlated domains decline', () => {
    const domains = [
      makeDomainScore('journey', 0.3, 'declining'),
      makeDomainScore('atlas', 0.4, 'declining'),
    ];
    const result = computeLifeScore(domains, defaultWeights);
    expect(result.spiralAlert).toBe(true);
    expect(result.spiralDomains).toContain('journey');
    expect(result.spiralDomains).toContain('atlas');
  });
});

// ============================================================================
// computeTrend
// ============================================================================

describe('computeTrend', () => {
  it('returns stable for < 3 history entries', () => {
    expect(computeTrend([])).toBe('stable');
    expect(computeTrend(makeHistory([0.5, 0.6]))).toBe('stable');
  });

  it('detects improving trend (positive slope across array indices)', () => {
    // computeTrend uses array index as time axis (index 0 = earliest)
    const history = makeHistory([0.4, 0.5, 0.6, 0.7, 0.8]);
    expect(computeTrend(history)).toBe('improving');
  });

  it('detects declining trend (negative slope across array indices)', () => {
    const history = makeHistory([0.8, 0.7, 0.6, 0.5, 0.4]);
    expect(computeTrend(history)).toBe('declining');
  });

  it('returns stable for flat scores', () => {
    const history = makeHistory([0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(computeTrend(history)).toBe('stable');
  });

  it('returns stable for minor fluctuations within threshold', () => {
    const history = makeHistory([0.51, 0.50, 0.49, 0.50, 0.51]);
    expect(computeTrend(history)).toBe('stable');
  });
});

// ============================================================================
// detectSpiral
// ============================================================================

describe('detectSpiral', () => {
  it('returns no spiral when all domains are stable', () => {
    const domains = [
      makeDomainScore('atlas', 0.8, 'stable'),
      makeDomainScore('journey', 0.7, 'stable'),
    ];
    const result = detectSpiral([], domains);
    expect(result.detected).toBe(false);
    expect(result.decliningDomains).toHaveLength(0);
  });

  it('detects spiral when a correlated pair declines', () => {
    const domains = [
      makeDomainScore('journey', 0.3, 'declining'),
      makeDomainScore('atlas', 0.4, 'declining'),
    ];
    const result = detectSpiral([], domains);
    expect(result.detected).toBe(true);
    expect(result.correlatedDeclines.length).toBeGreaterThanOrEqual(1);
  });

  it('detects spiral when 3+ domains decline (even without correlated pairs)', () => {
    const domains = [
      makeDomainScore('atlas', 0.3, 'declining'),
      makeDomainScore('grants', 0.3, 'declining'),
      makeDomainScore('studio', 0.3, 'declining'),
    ];
    const result = detectSpiral([], domains);
    expect(result.detected).toBe(true);
    expect(result.decliningDomains).toHaveLength(3);
  });

  it('returns critical severity for 4+ declining domains', () => {
    const domains = [
      makeDomainScore('atlas', 0.2, 'declining'),
      makeDomainScore('journey', 0.2, 'declining'),
      makeDomainScore('finance', 0.2, 'declining'),
      makeDomainScore('connections', 0.2, 'declining'),
    ];
    const result = detectSpiral([], domains);
    expect(result.severity).toBe('critical');
  });

  it('returns warning severity for exactly 3 declining or 1 correlated pair', () => {
    const domains = [
      makeDomainScore('journey', 0.3, 'declining'),
      makeDomainScore('atlas', 0.4, 'declining'),
    ];
    const result = detectSpiral([], domains);
    expect(result.severity).toBe('warning');
  });

  it('includes a message when spiral is detected', () => {
    const domains = [
      makeDomainScore('journey', 0.3, 'declining'),
      makeDomainScore('atlas', 0.4, 'declining'),
    ];
    const result = detectSpiral([], domains);
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(10);
  });
});

// ============================================================================
// getSpiralRecommendations
// ============================================================================

describe('getSpiralRecommendations', () => {
  it('returns empty array when no spiral detected', () => {
    const result = getSpiralRecommendations({
      detected: false,
      decliningDomains: [],
      correlatedDeclines: [],
      severity: 'warning',
      message: '',
    });
    expect(result).toEqual([]);
  });

  it('returns actionable recommendations for correlated decline', () => {
    const result = getSpiralRecommendations({
      detected: true,
      decliningDomains: ['journey', 'atlas'],
      correlatedDeclines: [CORRELATED_PAIRS[0]], // journey-atlas
      severity: 'warning',
      message: 'test',
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('descanso');
  });

  it('adds support recommendation for critical severity', () => {
    const result = getSpiralRecommendations({
      detected: true,
      decliningDomains: ['journey', 'atlas', 'finance', 'connections'],
      correlatedDeclines: CORRELATED_PAIRS.slice(0, 2),
      severity: 'critical',
      message: 'test',
    });
    const hasSupport = result.some(r => r.includes('confiança') || r.includes('apoio'));
    expect(hasSupport).toBe(true);
  });
});

// ============================================================================
// getSufficiencyLevel
// ============================================================================

describe('getSufficiencyLevel', () => {
  it('returns thriving for >= 0.80', () => {
    expect(getSufficiencyLevel(0.80)).toBe('thriving');
    expect(getSufficiencyLevel(0.95)).toBe('thriving');
    expect(getSufficiencyLevel(1.0)).toBe('thriving');
  });

  it('returns sufficient for >= 0.66 and < 0.80', () => {
    expect(getSufficiencyLevel(0.66)).toBe('sufficient');
    expect(getSufficiencyLevel(0.75)).toBe('sufficient');
  });

  it('returns growing for >= 0.40 and < 0.66', () => {
    expect(getSufficiencyLevel(0.40)).toBe('growing');
    expect(getSufficiencyLevel(0.55)).toBe('growing');
  });

  it('returns attention_needed for < 0.40', () => {
    expect(getSufficiencyLevel(0.39)).toBe('attention_needed');
    expect(getSufficiencyLevel(0)).toBe('attention_needed');
  });
});

// ============================================================================
// getPlaceholderDomainScore
// ============================================================================

describe('getPlaceholderDomainScore', () => {
  it('returns a score for any domain', () => {
    const score = getPlaceholderDomainScore('atlas');
    expect(score.module).toBe('atlas');
    expect(score.normalized).toBeGreaterThan(0);
    expect(score.confidence).toBe(0.3);
    expect(score.trend).toBe('stable');
  });

  it('clamps activity level to valid range', () => {
    const tooLow = getPlaceholderDomainScore('atlas', -1);
    const tooHigh = getPlaceholderDomainScore('atlas', 5);
    expect(tooLow.normalized).toBeGreaterThanOrEqual(0.01);
    expect(tooHigh.normalized).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// computeAHPWeights
// ============================================================================

describe('computeAHPWeights', () => {
  it('returns consistent result for simple equal comparisons', () => {
    const comparisons = [
      { domainA: 'atlas' as AicaDomain, domainB: 'journey' as AicaDomain, value: 1 },
    ];
    const result = computeAHPWeights(comparisons);
    expect(result.isConsistent).toBe(true);
    expect(result.consistencyRatio).toBeLessThanOrEqual(0.1);
    // Equal comparison → equal weights
    expect(result.weights.atlas).toBeCloseTo(result.weights.journey, 2);
  });

  it('gives higher weight to the preferred domain', () => {
    const comparisons = [
      { domainA: 'atlas' as AicaDomain, domainB: 'journey' as AicaDomain, value: 5 },
    ];
    const result = computeAHPWeights(comparisons);
    expect(result.weights.atlas).toBeGreaterThan(result.weights.journey);
  });

  it('detects inconsistent comparisons', () => {
    // Inconsistent: A >> B, B >> C, but C >> A (circular preference)
    const comparisons = [
      { domainA: 'atlas' as AicaDomain, domainB: 'journey' as AicaDomain, value: 9 },
      { domainA: 'journey' as AicaDomain, domainB: 'finance' as AicaDomain, value: 9 },
      { domainA: 'finance' as AicaDomain, domainB: 'atlas' as AicaDomain, value: 9 },
    ];
    const result = computeAHPWeights(comparisons);
    expect(result.isConsistent).toBe(false);
  });
});
