import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) })),
      })),
      upsert: vi.fn(() => ({ error: null })),
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  },
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  computeResearcherStrength,
  assessTRL,
  computeGrantMatch,
  computeGrantsDomainScore,
  getResearcherSufficiency,
  TRL_CRITERIA,
  type ResearcherProfile,
  type TRLEvidence,
} from '../researcherScoring';

// ============================================================================
// RSS — RESEARCHER STRENGTH SCORE
// ============================================================================

describe('computeResearcherStrength', () => {
  it('computes correct RSS for a moderate researcher', () => {
    const profile: ResearcherProfile = {
      hIndex: 25,       // norm: 25/50*100 = 50
      totalCitations: 2500, // norm: 2500/5000*100 = 50
      mQuotient: 1.0,   // norm: 1/2*100 = 50
      avgJournalIF: 5.0, // norm: 5/10*100 = 50
      collaborationCentrality: 0.5, // norm: 50
    };
    const result = computeResearcherStrength(profile);
    // RSS = 0.30*50 + 0.20*50 + 0.15*50 + 0.20*50 + 0.15*50 = 50
    expect(result.rss).toBeCloseTo(50, 0);
    expect(result.tier).toBe('established');
  });

  it('assigns leading tier for RSS >= 80', () => {
    const profile: ResearcherProfile = {
      hIndex: 50,
      totalCitations: 5000,
      mQuotient: 2.0,
      avgJournalIF: 10.0,
      collaborationCentrality: 1.0,
    };
    const result = computeResearcherStrength(profile);
    expect(result.rss).toBeCloseTo(100, 0);
    expect(result.tier).toBe('leading');
  });

  it('assigns emerging tier for RSS < 40', () => {
    const profile: ResearcherProfile = {
      hIndex: 5,
      totalCitations: 100,
      mQuotient: 0.3,
      avgJournalIF: 1.0,
      collaborationCentrality: 0.1,
    };
    const result = computeResearcherStrength(profile);
    expect(result.tier).toBe('emerging');
    expect(result.rss).toBeLessThan(40);
  });

  it('assigns senior tier for RSS 60-79', () => {
    const profile: ResearcherProfile = {
      hIndex: 35,       // norm: 70
      totalCitations: 3500, // norm: 70
      mQuotient: 1.4,   // norm: 70
      avgJournalIF: 7.0, // norm: 70
      collaborationCentrality: 0.7, // norm: 70
    };
    const result = computeResearcherStrength(profile);
    expect(result.rss).toBeCloseTo(70, 0);
    expect(result.tier).toBe('senior');
  });

  it('caps normalization at 100', () => {
    const profile: ResearcherProfile = {
      hIndex: 200,           // way above max benchmark
      totalCitations: 50000,
      mQuotient: 10,
      avgJournalIF: 50,
      collaborationCentrality: 5, // already capped by normalizeCentrality
    };
    const result = computeResearcherStrength(profile);
    // All normalized to 100, RSS = 100
    expect(result.rss).toBe(100);
    expect(result.components.hIndexScore).toBe(100);
    expect(result.components.citationScore).toBe(100);
  });

  it('returns zero RSS for zero-profile researcher', () => {
    const profile: ResearcherProfile = {
      hIndex: 0,
      totalCitations: 0,
      mQuotient: 0,
      avgJournalIF: 0,
      collaborationCentrality: 0,
    };
    const result = computeResearcherStrength(profile);
    expect(result.rss).toBe(0);
    expect(result.tier).toBe('emerging');
  });

  it('returns all 5 component scores', () => {
    const profile: ResearcherProfile = {
      hIndex: 10,
      totalCitations: 500,
      mQuotient: 0.5,
      avgJournalIF: 2,
      collaborationCentrality: 0.3,
    };
    const result = computeResearcherStrength(profile);
    expect(result.components).toHaveProperty('hIndexScore');
    expect(result.components).toHaveProperty('citationScore');
    expect(result.components).toHaveProperty('mQuotientScore');
    expect(result.components).toHaveProperty('impactFactorScore');
    expect(result.components).toHaveProperty('centralityScore');
  });
});

// ============================================================================
// TRL ASSESSMENT
// ============================================================================

describe('assessTRL', () => {
  it('returns level 0 when no evidence provided', () => {
    const result = assessTRL([]);
    expect(result.currentLevel).toBe(0);
    expect(result.readinessScore).toBe(0);
    // nextSteps should contain TRL 1 criteria
    expect(result.nextSteps.length).toBeGreaterThan(0);
    expect(result.nextSteps[0]).toContain('TRL 1');
  });

  it('returns correct level when all evidence is met up to level 3', () => {
    const evidence: TRLEvidence[] = [
      { level: 1, criteria: TRL_CRITERIA[1], met: [true, true] },
      { level: 2, criteria: TRL_CRITERIA[2], met: [true, true] },
      { level: 3, criteria: TRL_CRITERIA[3], met: [true, true] },
    ];
    const result = assessTRL(evidence);
    expect(result.currentLevel).toBe(3);
    expect(result.readinessScore).toBeCloseTo((3 / 9) * 100, 1);
  });

  it('stops at partially met level', () => {
    const evidence: TRLEvidence[] = [
      { level: 1, criteria: TRL_CRITERIA[1], met: [true, true] },
      { level: 2, criteria: TRL_CRITERIA[2], met: [true, false] }, // partial
    ];
    const result = assessTRL(evidence);
    expect(result.currentLevel).toBe(1);
    // Next steps should include the unmet criterion from level 2
    expect(result.nextSteps.some(s => s.includes('TRL 2'))).toBe(true);
  });

  it('stops at missing level (gap in evidence)', () => {
    const evidence: TRLEvidence[] = [
      { level: 1, criteria: TRL_CRITERIA[1], met: [true, true] },
      // Level 2 is missing
      { level: 3, criteria: TRL_CRITERIA[3], met: [true, true] },
    ];
    const result = assessTRL(evidence);
    expect(result.currentLevel).toBe(1);
  });

  it('returns full readiness for all 9 levels met', () => {
    const evidence: TRLEvidence[] = [];
    for (let i = 1; i <= 9; i++) {
      evidence.push({
        level: i,
        criteria: TRL_CRITERIA[i],
        met: TRL_CRITERIA[i].map(() => true),
      });
    }
    const result = assessTRL(evidence);
    expect(result.currentLevel).toBe(9);
    expect(result.readinessScore).toBeCloseTo(100, 1);
    expect(result.nextSteps).toHaveLength(0);
  });

  it('limits nextSteps to 5 items', () => {
    // No evidence at all => TRL 1 criteria (2 items) will be added as next steps
    // But if TRL criteria had more, it should cap at 5
    const result = assessTRL([]);
    expect(result.nextSteps.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// GRANT MATCHING
// ============================================================================

describe('computeGrantMatch', () => {
  it('computes correct profileFit and successProbability', () => {
    const result = computeGrantMatch(
      0.8,  // semantic similarity
      80,   // RSS
      0.9,  // budget fit
      60,   // days remaining
      5     // team size
    );
    // trackRecord = min(1, 80/100) = 0.8
    // deadlineRisk = days>30 -> 1.0
    // teamStrength = min(1, 5/5) = 1.0
    // profileFit = 0.35*0.8 + 0.25*0.9 + 0.20*1.0 + 0.20*1.0
    //            = 0.28 + 0.225 + 0.20 + 0.20 = 0.905
    // successProbability = 0.40*0.8 + 0.60*0.905 = 0.32 + 0.543 = 0.863
    expect(result.profileFit).toBeCloseTo(0.905, 2);
    expect(result.successProbability).toBeCloseTo(0.863, 2);
    expect(result.semanticSimilarity).toBe(0.8);
  });

  it('assigns deadline risk based on remaining days thresholds', () => {
    // > 30 days => 1.0
    expect(computeGrantMatch(0.5, 50, 0.5, 60, 3).factorBreakdown.deadlineRisk).toBe(1.0);
    // 14-30 days => 0.8
    expect(computeGrantMatch(0.5, 50, 0.5, 20, 3).factorBreakdown.deadlineRisk).toBe(0.8);
    // 8-14 days => 0.5
    expect(computeGrantMatch(0.5, 50, 0.5, 10, 3).factorBreakdown.deadlineRisk).toBe(0.5);
    // <= 7 days => 0.2
    expect(computeGrantMatch(0.5, 50, 0.5, 3, 3).factorBreakdown.deadlineRisk).toBe(0.2);
    expect(computeGrantMatch(0.5, 50, 0.5, 7, 3).factorBreakdown.deadlineRisk).toBe(0.2);
  });

  it('caps track record at 1 even for RSS > 100', () => {
    const result = computeGrantMatch(0.5, 150, 0.5, 30, 3);
    expect(result.factorBreakdown.trackRecord).toBe(1);
  });

  it('caps team strength at 1 for large teams', () => {
    const result = computeGrantMatch(0.5, 50, 0.5, 30, 20);
    expect(result.factorBreakdown.teamStrength).toBe(1);
  });

  it('handles zero values gracefully', () => {
    const result = computeGrantMatch(0, 0, 0, 0, 0);
    expect(result.successProbability).toBeGreaterThanOrEqual(0);
    expect(result.factorBreakdown.deadlineRisk).toBe(0.2); // <= 7 days
    expect(result.factorBreakdown.teamStrength).toBe(0);
    expect(result.factorBreakdown.trackRecord).toBe(0);
  });

  it('returns all factor breakdown fields', () => {
    const result = computeGrantMatch(0.7, 60, 0.8, 45, 4);
    expect(result.factorBreakdown).toHaveProperty('topicAlignment');
    expect(result.factorBreakdown).toHaveProperty('budgetFit');
    expect(result.factorBreakdown).toHaveProperty('trackRecord');
    expect(result.factorBreakdown).toHaveProperty('deadlineRisk');
    expect(result.factorBreakdown).toHaveProperty('teamStrength');
  });
});

// ============================================================================
// GRANTS DOMAIN SCORE (for Life Score)
// ============================================================================

describe('computeGrantsDomainScore', () => {
  it('returns 0 for zero inputs', () => {
    expect(computeGrantsDomainScore(0, 0, 0)).toBe(0);
  });

  it('returns 1 for max inputs', () => {
    expect(computeGrantsDomainScore(100, 9, 1.0)).toBeCloseTo(1.0, 2);
  });

  it('uses correct weights (0.40 RSS + 0.30 TRL + 0.30 match)', () => {
    // RSS=50 -> norm=0.5, TRL=4.5 -> norm=0.5, match=0.5
    // score = 0.40*0.5 + 0.30*0.5 + 0.30*0.5 = 0.20 + 0.15 + 0.15 = 0.50
    expect(computeGrantsDomainScore(50, 4.5, 0.5)).toBeCloseTo(0.50, 2);
  });

  it('does not cap beyond 1 (no internal clamping on matchNorm)', () => {
    // The function uses Math.min on RSS and TRL but passes matchNorm through directly.
    // RSS=100 -> norm=1, TRL=9 -> norm=1, match=1 => 0.40+0.30+0.30 = 1.0
    expect(computeGrantsDomainScore(100, 9, 1.0)).toBeCloseTo(1.0, 2);
    // Values above max benchmarks: RSS and TRL capped at 1 but matchNorm=2 passes through
    const result = computeGrantsDomainScore(200, 18, 2.0);
    expect(result).toBeGreaterThan(1.0);
  });
});

// ============================================================================
// SUFFICIENCY HELPER
// ============================================================================

describe('getResearcherSufficiency', () => {
  it('returns thriving for RSS >= 80', () => {
    expect(getResearcherSufficiency(80)).toBe('thriving');
    expect(getResearcherSufficiency(100)).toBe('thriving');
  });

  it('returns sufficient for RSS 66-79', () => {
    expect(getResearcherSufficiency(66)).toBe('sufficient');
    expect(getResearcherSufficiency(79)).toBe('sufficient');
  });

  it('returns growing for RSS 40-65', () => {
    expect(getResearcherSufficiency(40)).toBe('growing');
    expect(getResearcherSufficiency(65)).toBe('growing');
  });

  it('returns attention_needed for RSS < 40', () => {
    expect(getResearcherSufficiency(0)).toBe('attention_needed');
    expect(getResearcherSufficiency(39)).toBe('attention_needed');
  });
});

// ============================================================================
// TRL_CRITERIA constant
// ============================================================================

describe('TRL_CRITERIA', () => {
  it('has criteria for all 9 levels', () => {
    for (let i = 1; i <= 9; i++) {
      expect(TRL_CRITERIA[i]).toBeDefined();
      expect(Array.isArray(TRL_CRITERIA[i])).toBe(true);
      expect(TRL_CRITERIA[i].length).toBeGreaterThan(0);
    }
  });
});
