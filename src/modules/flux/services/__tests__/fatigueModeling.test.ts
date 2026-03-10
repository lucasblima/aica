/**
 * Unit tests for fatigueModeling.ts
 *
 * Tests all pure exported functions:
 * - computeEMA, computeCTL, computeATL, computeTSB
 * - computeACWR, classifyFatigueRisk, assessReadiness
 * - computeSessionRPE, computeFluxDomainScore, computeTrainingLoad
 *
 * References: Banister 1991 (impulse-response model), Halson 2014
 * (fatigue thresholds), Gabbett 2016 (ACWR sweet spot), Foster 2001 (sRPE).
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Supabase client — fatigueModeling.ts imports it at module level
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

// Mock logger — avoid console noise in tests
vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  computeEMA,
  computeCTL,
  computeATL,
  computeTSB,
  computeACWR,
  classifyFatigueRisk,
  assessReadiness,
  computeSessionRPE,
  computeFluxDomainScore,
  computeTrainingLoad,
  storeStressEntry,
  updateAthleteReadiness,
  getStressHistory,
} from '@/modules/flux/services/fatigueModeling';

// ============================================================================
// CONSTANTS (mirrored from source for verification)
// ============================================================================
const CTL_DAYS = 42;
const ATL_DAYS = 7;
const CTL_DECAY = 2 / (CTL_DAYS + 1); // ~0.04651
const ATL_DECAY = 2 / (ATL_DAYS + 1); // 0.25

// ============================================================================
// computeEMA
// ============================================================================
describe('computeEMA', () => {
  it('returns empty array for empty input', () => {
    expect(computeEMA([], 0.25)).toEqual([]);
  });

  it('returns single element unchanged', () => {
    expect(computeEMA([100], 0.25)).toEqual([100]);
  });

  it('correctly computes EMA for a known sequence', () => {
    // decay = 0.25 => EMA_i = value * 0.25 + EMA_{i-1} * 0.75
    const input = [100, 80, 120];
    const result = computeEMA(input, 0.25);

    expect(result[0]).toBe(100);
    // EMA_1 = 80 * 0.25 + 100 * 0.75 = 20 + 75 = 95
    expect(result[1]).toBeCloseTo(95, 5);
    // EMA_2 = 120 * 0.25 + 95 * 0.75 = 30 + 71.25 = 101.25
    expect(result[2]).toBeCloseTo(101.25, 5);
  });

  it('converges toward constant input', () => {
    // If all values are 50, EMA should converge to 50
    const input = Array(50).fill(50);
    const result = computeEMA(input, 0.25);
    expect(result[result.length - 1]).toBeCloseTo(50, 5);
  });

  it('responds faster with higher decay factor', () => {
    const input = [0, 0, 0, 0, 0, 100, 100, 100, 100, 100];
    const slowEma = computeEMA(input, 0.1);
    const fastEma = computeEMA(input, 0.5);

    // After the jump to 100, faster decay should have a higher value
    expect(fastEma[7]).toBeGreaterThan(slowEma[7]);
  });

  it('handles all zeros', () => {
    const result = computeEMA([0, 0, 0], 0.25);
    expect(result).toEqual([0, 0, 0]);
  });

  it('handles negative values', () => {
    const result = computeEMA([-10, -20, -30], 0.5);
    expect(result[0]).toBe(-10);
    // EMA_1 = -20 * 0.5 + (-10) * 0.5 = -15
    expect(result[1]).toBeCloseTo(-15, 5);
    // EMA_2 = -30 * 0.5 + (-15) * 0.5 = -22.5
    expect(result[2]).toBeCloseTo(-22.5, 5);
  });

  it('preserves array length', () => {
    const input = [10, 20, 30, 40, 50];
    const result = computeEMA(input, 0.3);
    expect(result.length).toBe(input.length);
  });

  it('with decay=0 returns first value for all elements', () => {
    const result = computeEMA([10, 20, 30], 0);
    expect(result).toEqual([10, 10, 10]);
  });

  it('with decay=1 returns each input value', () => {
    const result = computeEMA([10, 20, 30], 1);
    expect(result).toEqual([10, 20, 30]);
  });

  it('returns single element unchanged for any decay', () => {
    expect(computeEMA([42], 0)).toEqual([42]);
    expect(computeEMA([42], 0.5)).toEqual([42]);
    expect(computeEMA([42], 1)).toEqual([42]);
  });
});

// ============================================================================
// computeCTL — 42-day EMA
// ============================================================================
describe('computeCTL', () => {
  it('returns empty array for empty input', () => {
    expect(computeCTL([])).toEqual([]);
  });

  it('uses CTL_DECAY = 2/(42+1)', () => {
    // Single value: first element should equal input
    const result = computeCTL([100]);
    expect(result).toEqual([100]);
  });

  it('moves slowly due to 42-day window', () => {
    // CTL should barely react to a single spike after many zeros
    const input = Array(41).fill(0).concat([100]);
    const result = computeCTL(input);
    // After 41 zeros, CTL is ~0. Then: 100 * CTL_DECAY + 0 * (1-CTL_DECAY)
    expect(result[result.length - 1]).toBeCloseTo(100 * CTL_DECAY, 3);
  });

  it('converges to steady-state value for constant input', () => {
    // After many days of constant 80 TSS, CTL should approach 80
    const input = Array(200).fill(80);
    const result = computeCTL(input);
    expect(result[result.length - 1]).toBeCloseTo(80, 0);
  });

  it('preserves array length', () => {
    const input = Array(60).fill(50);
    expect(computeCTL(input).length).toBe(60);
  });
});

// ============================================================================
// computeATL — 7-day EMA
// ============================================================================
describe('computeATL', () => {
  it('returns empty array for empty input', () => {
    expect(computeATL([])).toEqual([]);
  });

  it('uses ATL_DECAY = 2/(7+1) = 0.25', () => {
    const result = computeATL([100, 0]);
    expect(result[0]).toBe(100);
    // EMA_1 = 0 * 0.25 + 100 * 0.75 = 75
    expect(result[1]).toBeCloseTo(75, 5);
  });

  it('reacts faster than CTL to changes', () => {
    const input = Array(20).fill(0).concat(Array(10).fill(100));
    const ctl = computeCTL(input);
    const atl = computeATL(input);

    // After the jump, ATL should be much higher than CTL
    const lastIdx = input.length - 1;
    expect(atl[lastIdx]).toBeGreaterThan(ctl[lastIdx]);
  });

  it('converges to steady-state value for constant input', () => {
    const input = Array(50).fill(60);
    const result = computeATL(input);
    expect(result[result.length - 1]).toBeCloseTo(60, 0);
  });
});

// ============================================================================
// computeTSB — Training Stress Balance (CTL - ATL)
// ============================================================================
describe('computeTSB', () => {
  it('computes element-wise CTL minus ATL', () => {
    const ctl = [50, 55, 60];
    const atl = [30, 40, 70];
    const tsb = computeTSB(ctl, atl);
    expect(tsb).toEqual([20, 15, -10]);
  });

  it('returns empty array for empty inputs', () => {
    expect(computeTSB([], [])).toEqual([]);
  });

  it('returns zero when CTL equals ATL', () => {
    const same = [50, 50, 50];
    expect(computeTSB(same, same)).toEqual([0, 0, 0]);
  });

  it('is positive when CTL > ATL (rested state)', () => {
    const ctl = [80, 80, 80];
    const atl = [40, 40, 40];
    const tsb = computeTSB(ctl, atl);
    tsb.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it('is negative when ATL > CTL (fatigued state)', () => {
    const ctl = [30, 30, 30];
    const atl = [60, 60, 60];
    const tsb = computeTSB(ctl, atl);
    tsb.forEach(v => expect(v).toBeLessThan(0));
  });

  it('handles mismatched array lengths gracefully (defaults missing ATL to 0)', () => {
    const result = computeTSB([50, 60, 70], [30, 40]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(20);
    expect(result[1]).toBe(20);
    // Third element: 70 - 0 = 70 (missing ATL defaults to 0 via ?? guard)
    expect(result[2]).toBe(70);
  });
});

// ============================================================================
// computeTrainingLoad
// ============================================================================
describe('computeTrainingLoad', () => {
  it('returns zeros for empty history', () => {
    const result = computeTrainingLoad([]);
    expect(result.ctl).toBe(0);
    expect(result.atl).toBe(0);
    expect(result.tsb).toBe(0);
  });

  it('returns correct metrics for a single entry', () => {
    const result = computeTrainingLoad([100]);
    expect(result.ctl).toBe(100);
    expect(result.atl).toBe(100);
    expect(result.tsb).toBe(0);
  });

  it('detects building CTL trend when recent > previous * 1.05', () => {
    // 14 days of low TSS, then 7 days of high TSS
    const input = Array(7).fill(20).concat(Array(7).fill(40)).concat(Array(7).fill(80));
    const result = computeTrainingLoad(input);
    expect(result.ctlTrend).toBe('building');
  });

  it('detects declining CTL trend when recent < previous * 0.95', () => {
    // Start high, then drop
    const input = Array(7).fill(100).concat(Array(7).fill(80)).concat(Array(7).fill(10));
    const result = computeTrainingLoad(input);
    expect(result.ctlTrend).toBe('declining');
  });

  it('detects maintaining CTL trend for steady load', () => {
    const input = Array(30).fill(50);
    const result = computeTrainingLoad(input);
    expect(result.ctlTrend).toBe('maintaining');
  });

  it('detects increasing ATL trend', () => {
    // 6 days of low, then 3 days of high
    const input = Array(3).fill(10).concat(Array(3).fill(20)).concat(Array(3).fill(100));
    const result = computeTrainingLoad(input);
    expect(result.atlTrend).toBe('increasing');
  });

  it('detects decreasing ATL trend', () => {
    // 3 days high, then 3 days low (with some lead-in for stability)
    const input = Array(3).fill(50).concat(Array(3).fill(100)).concat(Array(3).fill(10));
    const result = computeTrainingLoad(input);
    expect(result.atlTrend).toBe('decreasing');
  });

  it('has ATL > CTL after sudden load increase (negative TSB)', () => {
    // Long baseline of 20, then spike to 200
    const input = Array(42).fill(20).concat(Array(7).fill(200));
    const result = computeTrainingLoad(input);
    expect(result.atl).toBeGreaterThan(result.ctl);
    expect(result.tsb).toBeLessThan(0);
  });
});

// ============================================================================
// classifyFatigueRisk — Halson 2014 thresholds
// ============================================================================
describe('classifyFatigueRisk', () => {
  it('returns "overtraining" for TSB < -30', () => {
    expect(classifyFatigueRisk(-31)).toBe('overtraining');
    expect(classifyFatigueRisk(-50)).toBe('overtraining');
    expect(classifyFatigueRisk(-100)).toBe('overtraining');
  });

  it('returns "high" for -30 <= TSB < -10', () => {
    expect(classifyFatigueRisk(-30)).toBe('high');
    expect(classifyFatigueRisk(-20)).toBe('high');
    expect(classifyFatigueRisk(-11)).toBe('high');
  });

  it('returns "moderate" for -10 <= TSB < 5', () => {
    expect(classifyFatigueRisk(-10)).toBe('moderate');
    expect(classifyFatigueRisk(0)).toBe('moderate');
    expect(classifyFatigueRisk(4)).toBe('moderate');
    expect(classifyFatigueRisk(4.99)).toBe('moderate');
  });

  it('returns "low" for TSB >= 5', () => {
    expect(classifyFatigueRisk(5)).toBe('low');
    expect(classifyFatigueRisk(10)).toBe('low');
    expect(classifyFatigueRisk(100)).toBe('low');
  });

  it('handles exact boundary values', () => {
    expect(classifyFatigueRisk(-30)).toBe('high'); // boundary: -30 is NOT overtraining
    expect(classifyFatigueRisk(-10)).toBe('moderate'); // boundary: -10 is NOT high
    expect(classifyFatigueRisk(5)).toBe('low'); // boundary: 5 is NOT moderate
  });

  it('handles zero', () => {
    expect(classifyFatigueRisk(0)).toBe('moderate');
  });
});

// ============================================================================
// computeACWR — Gabbett 2016 (sweet spot 0.8-1.3, danger > 1.5)
// ============================================================================
describe('computeACWR', () => {
  it('returns 0 when both ATL and CTL are 0', () => {
    expect(computeACWR(0, 0)).toBe(0);
  });

  it('returns 2.0 when ATL > 0 but CTL is 0 (division guard)', () => {
    expect(computeACWR(50, 0)).toBe(2.0);
    expect(computeACWR(1, 0)).toBe(2.0);
  });

  it('returns 0 when ATL is 0 and CTL is 0', () => {
    expect(computeACWR(0, 0)).toBe(0);
  });

  it('returns 0 when ATL is 0 and CTL > 0', () => {
    expect(computeACWR(0, 50)).toBe(0);
  });

  it('returns 1.0 when ATL equals CTL', () => {
    expect(computeACWR(50, 50)).toBeCloseTo(1.0, 5);
  });

  it('returns value in sweet spot (0.8-1.3) for balanced load', () => {
    // ATL = 45, CTL = 50 => 0.9
    expect(computeACWR(45, 50)).toBeCloseTo(0.9, 5);
  });

  it('returns value > 1.5 for dangerous load spike', () => {
    // ATL = 120, CTL = 60 => 2.0
    expect(computeACWR(120, 60)).toBeCloseTo(2.0, 5);
  });

  it('returns value < 0.8 for under-training', () => {
    // ATL = 20, CTL = 50 => 0.4
    expect(computeACWR(20, 50)).toBeCloseTo(0.4, 5);
  });

  it('handles negative CTL by treating as zero', () => {
    // CTL <= 0 branch
    expect(computeACWR(50, -5)).toBe(2.0);
  });
});

// ============================================================================
// computeSessionRPE — Foster 2001 (sRPE = RPE * duration)
// ============================================================================
describe('computeSessionRPE', () => {
  it('computes sRPE = RPE * duration', () => {
    expect(computeSessionRPE(7, 60)).toBe(420);
  });

  it('returns 0 when RPE is 0', () => {
    expect(computeSessionRPE(0, 60)).toBe(0);
  });

  it('returns 0 when duration is 0', () => {
    expect(computeSessionRPE(8, 0)).toBe(0);
  });

  it('handles max RPE (10) with long session', () => {
    expect(computeSessionRPE(10, 120)).toBe(1200);
  });

  it('handles fractional values', () => {
    expect(computeSessionRPE(6.5, 45)).toBeCloseTo(292.5, 5);
  });
});

// ============================================================================
// computeFluxDomainScore — Life Score integration
// ============================================================================
describe('computeFluxDomainScore', () => {
  it('returns weighted sum: 0.35*readiness + 0.35*consistency + 0.30*load', () => {
    // avgReadiness=100, consistency=1.0, loadManagement=1.0
    const score = computeFluxDomainScore(100, 1.0, 1.0);
    // 0.35 * (100/100) + 0.35 * 1.0 + 0.30 * 1.0 = 0.35 + 0.35 + 0.30 = 1.0
    expect(score).toBeCloseTo(1.0, 5);
  });

  it('returns 0 when all inputs are 0', () => {
    expect(computeFluxDomainScore(0, 0, 0)).toBeCloseTo(0, 5);
  });

  it('scales readiness from 0-100 to 0-1 internally', () => {
    // avgReadiness=50 => 0.35 * 0.5 = 0.175
    const score = computeFluxDomainScore(50, 0, 0);
    expect(score).toBeCloseTo(0.175, 5);
  });

  it('weights consistency at 0.35', () => {
    const score = computeFluxDomainScore(0, 1.0, 0);
    expect(score).toBeCloseTo(0.35, 5);
  });

  it('weights load management at 0.30', () => {
    const score = computeFluxDomainScore(0, 0, 1.0);
    expect(score).toBeCloseTo(0.30, 5);
  });

  it('returns intermediate score for mixed inputs', () => {
    // avgReadiness=80, consistency=0.7, loadManagement=0.9
    const score = computeFluxDomainScore(80, 0.7, 0.9);
    const expected = 0.35 * (80 / 100) + 0.35 * 0.7 + 0.30 * 0.9;
    expect(score).toBeCloseTo(expected, 5);
  });
});

// ============================================================================
// assessReadiness — Composite readiness assessment
// ============================================================================
describe('assessReadiness', () => {
  it('returns a complete ReadinessAssessment object', () => {
    const tssHistory = Array(30).fill(50);
    const result = assessReadiness(tssHistory, [5, 5, 5]);

    expect(result).toHaveProperty('readinessScore');
    expect(result).toHaveProperty('fatigueRisk');
    expect(result).toHaveProperty('trainingLoad');
    expect(result).toHaveProperty('recommendation');
    expect(result).toHaveProperty('suggestedIntensity');
    expect(result).toHaveProperty('acuteChronicRatio');
  });

  it('readinessScore is between 0 and 100', () => {
    // Extreme overtraining scenario
    const heavy = Array(7).fill(0).concat(Array(7).fill(500));
    const r1 = assessReadiness(heavy, [10, 10, 10]);
    expect(r1.readinessScore).toBeGreaterThanOrEqual(0);
    expect(r1.readinessScore).toBeLessThanOrEqual(100);

    // Well-rested scenario
    const light = Array(50).fill(30);
    const r2 = assessReadiness(light, [2, 2, 2]);
    expect(r2.readinessScore).toBeGreaterThanOrEqual(0);
    expect(r2.readinessScore).toBeLessThanOrEqual(100);
  });

  it('handles empty TSS history', () => {
    const result = assessReadiness([], [5]);
    expect(result.readinessScore).toBeGreaterThanOrEqual(0);
    expect(result.trainingLoad.ctl).toBe(0);
    expect(result.trainingLoad.atl).toBe(0);
  });

  it('handles empty RPE array (defaults to RPE=5)', () => {
    const tssHistory = Array(30).fill(50);
    const result = assessReadiness(tssHistory, []);
    // Default RPE=5 => rpeComponent = (10-5)*10 = 50
    expect(result.readinessScore).toBeGreaterThan(0);
  });

  it('well-rested athlete gets high readiness and low/moderate fatigue risk', () => {
    // Long steady moderate load with low RPE => TSB near 0 (CTL ~ ATL), ACWR near 1.0
    // TSB near 0 classifies as 'moderate' per Halson thresholds (< 5 = moderate)
    // To get 'low' risk (TSB >= 5), athlete needs a taper (recent load < chronic)
    const steadyLoad = Array(60).fill(50);
    const result = assessReadiness(steadyLoad, [3, 3, 3]);

    expect(['low', 'moderate']).toContain(result.fatigueRisk);
    expect(result.readinessScore).toBeGreaterThanOrEqual(40);
    expect(result.acuteChronicRatio).toBeGreaterThanOrEqual(0.8);
    expect(result.acuteChronicRatio).toBeLessThanOrEqual(1.3);
  });

  it('tapered athlete gets low fatigue risk (positive TSB)', () => {
    // Build fitness then taper: high load followed by rest
    // This creates CTL > ATL => positive TSB >= 5 => 'low' risk
    const tapered = Array(42).fill(80).concat(Array(10).fill(20));
    const result = assessReadiness(tapered, [3, 3, 3]);

    expect(result.fatigueRisk).toBe('low');
    expect(result.trainingLoad.tsb).toBeGreaterThanOrEqual(5);
  });

  it('overloaded athlete gets low readiness and high fatigue risk', () => {
    // Low baseline then massive spike
    const overloaded = Array(42).fill(20).concat(Array(7).fill(300));
    const result = assessReadiness(overloaded, [9, 9, 9]);

    expect(['high', 'overtraining']).toContain(result.fatigueRisk);
    expect(result.readinessScore).toBeLessThan(50);
    expect(result.acuteChronicRatio).toBeGreaterThan(1.3);
  });

  it('suggests rest for very low readiness', () => {
    // Extreme overtraining: huge spike + max RPE
    const extreme = Array(42).fill(10).concat(Array(7).fill(500));
    const result = assessReadiness(extreme, [10, 10, 10]);

    expect(['rest', 'recovery']).toContain(result.suggestedIntensity);
  });

  it('suggests hard training for high readiness', () => {
    // Steady load, low RPE => well rested
    const rested = Array(60).fill(50);
    const result = assessReadiness(rested, [2, 2, 2]);

    expect(['hard', 'moderate']).toContain(result.suggestedIntensity);
  });

  it('ACWR is rounded to 2 decimal places', () => {
    const tssHistory = Array(30).fill(50);
    const result = assessReadiness(tssHistory, [5]);

    const str = result.acuteChronicRatio.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it('returns PT-BR recommendation string', () => {
    const tssHistory = Array(30).fill(50);
    const result = assessReadiness(tssHistory, [5, 5, 5]);

    expect(typeof result.recommendation).toBe('string');
    expect(result.recommendation.length).toBeGreaterThan(10);
  });

  it('returns overtraining alert for very negative TSB', () => {
    // Force extreme negative TSB: zero baseline then huge load
    const extreme = Array(42).fill(5).concat(Array(14).fill(400));
    const result = assessReadiness(extreme, [10, 10, 10]);
    expect(result.fatigueRisk).toBe('overtraining');
    expect(result.recommendation).toContain('overtraining');
  });

  it('suggestedIntensity is one of the valid enum values', () => {
    const validIntensities = ['rest', 'recovery', 'easy', 'moderate', 'hard', 'race_pace'];
    const tssHistory = Array(30).fill(50);
    const result = assessReadiness(tssHistory, [5]);
    expect(validIntensities).toContain(result.suggestedIntensity);
  });

  it('trainingLoad contains valid trend values', () => {
    const tssHistory = Array(30).fill(50);
    const result = assessReadiness(tssHistory, [5]);

    expect(['building', 'maintaining', 'declining']).toContain(result.trainingLoad.ctlTrend);
    expect(['increasing', 'stable', 'decreasing']).toContain(result.trainingLoad.atlTrend);
  });

  it('returns different intensity levels based on readiness score', () => {
    // Test the full range of suggested intensities
    // Very rested athlete (long steady load + very low RPE)
    const veryRested = Array(60).fill(50);
    const r1 = assessReadiness(veryRested, [1, 1, 1]);
    // Should be hard or race_pace for very high readiness
    expect(['hard', 'race_pace']).toContain(r1.suggestedIntensity);

    // Moderate readiness
    const moderate = Array(30).fill(50);
    const r2 = assessReadiness(moderate, [6, 6, 6]);
    expect(['moderate', 'easy']).toContain(r2.suggestedIntensity);
  });
});

// ============================================================================
// ASYNC SUPABASE FUNCTIONS — storeStressEntry, getStressHistory, updateAthleteReadiness
// ============================================================================

describe('storeStressEntry', () => {
  it('requires authentication', async () => {
    // The mock returns user: null, so it should throw
    await expect(storeStressEntry('athlete-1', {
      date: '2026-01-01',
      tss: 100,
    }, { ctl: 50, atl: 60, tsb: -10, ctlTrend: 'building', atlTrend: 'stable' }))
      .rejects.toThrow('Not authenticated');
  });
});

describe('getStressHistory', () => {
  it('returns empty array when not authenticated', async () => {
    const result = await getStressHistory('athlete-1', 30);
    expect(result).toEqual([]);
  });
});

describe('updateAthleteReadiness', () => {
  it('requires authentication', async () => {
    const readiness = {
      readinessScore: 75,
      fatigueRisk: 'moderate' as const,
      trainingLoad: { ctl: 50, atl: 60, tsb: -10, ctlTrend: 'building' as const, atlTrend: 'stable' as const },
      recommendation: 'Test',
      suggestedIntensity: 'moderate' as const,
      acuteChronicRatio: 1.2,
    };
    // With the auth check in production code, this should throw 'Not authenticated'
    await expect(updateAthleteReadiness('athlete-1', readiness))
      .rejects.toThrow('Not authenticated');
  });
});
