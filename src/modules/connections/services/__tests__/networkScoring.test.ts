import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the module
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
          data: [],
          error: null,
          not: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        error: null,
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
  classifyDunbarLayer,
  getDunbarLayerLabel,
  getDunbarLayerDescription,
  computeTieStrength,
  computeDecayedCloseness,
  getDecayRate,
  computeGottmanRatio,
  computeNetworkConstraint,
  computeAggregateConstraint,
  computeEffectiveSize,
  computeDiversityIndex,
  computeCompositeRelationshipScore,
  scoreContact,
  computeNetworkMetrics,
  type DunbarLayer,
  type ContactScoreInput,
} from '../networkScoring';

// ============================================================================
// 1. DUNBAR LAYERS
// ============================================================================

describe('classifyDunbarLayer', () => {
  it('returns layer 5 for very high frequency and closeness', () => {
    // composite = 0.5 * min(30/30, 1) + 0.5 * 1.0 = 1.0 >= 0.80
    expect(classifyDunbarLayer(30, 1.0)).toBe(5);
  });

  it('returns layer 15 for high frequency and closeness', () => {
    // composite = 0.5 * min(15/30, 1) + 0.5 * 0.8 = 0.5*0.5 + 0.5*0.8 = 0.65
    // 0.65 >= 0.60 -> layer 15
    expect(classifyDunbarLayer(15, 0.8)).toBe(15);
  });

  it('returns layer 50 for moderate frequency and closeness', () => {
    // composite = 0.5 * min(5/30, 1) + 0.5 * 0.5 = 0.5*0.167 + 0.25 = 0.333 + 0.25 ≈ 0.333
    // Actually: 0.5 * (5/30) + 0.5 * 0.5 = 0.0833 + 0.25 = 0.3333
    // 0.333 is < 0.35, so it's layer 150
    // Let's pick values that give 0.35-0.59
    // composite = 0.5 * (10/30) + 0.5 * 0.4 = 0.167 + 0.2 = 0.367 >= 0.35 -> layer 50
    expect(classifyDunbarLayer(10, 0.4)).toBe(50);
  });

  it('returns layer 150 for low frequency and closeness', () => {
    // composite = 0.5 * min(3/30, 1) + 0.5 * 0.2 = 0.05 + 0.1 = 0.15
    // 0.15 >= 0.15 -> layer 150
    expect(classifyDunbarLayer(3, 0.2)).toBe(150);
  });

  it('returns layer 500 for very low frequency and closeness', () => {
    // composite = 0.5 * min(1/30, 1) + 0.5 * 0.1 = 0.017 + 0.05 = 0.067
    // 0.067 < 0.15 -> layer 500
    expect(classifyDunbarLayer(1, 0.1)).toBe(500);
  });

  it('returns layer 500 for zero frequency and zero closeness', () => {
    expect(classifyDunbarLayer(0, 0)).toBe(500);
  });

  it('caps frequency at 30 (daily interactions)', () => {
    // frequency = 60, but min(60/30, 1) = 1
    // composite = 0.5 * 1 + 0.5 * 0.8 = 0.9 -> layer 5
    expect(classifyDunbarLayer(60, 0.8)).toBe(5);
  });
});

describe('getDunbarLayerLabel', () => {
  it('returns correct label for each layer', () => {
    expect(getDunbarLayerLabel(5)).toBe('Circulo Intimo');
    expect(getDunbarLayerLabel(15)).toBe('Grupo de Simpatia');
    expect(getDunbarLayerLabel(50)).toBe('Grupo Próximo');
    expect(getDunbarLayerLabel(150)).toBe('Rede Ativa');
    expect(getDunbarLayerLabel(500)).toBe('Conhecidos');
  });
});

describe('getDunbarLayerDescription', () => {
  it('returns non-empty descriptions for all layers', () => {
    const layers: DunbarLayer[] = [5, 15, 50, 150, 500];
    for (const layer of layers) {
      const desc = getDunbarLayerDescription(layer);
      expect(desc).toBeTruthy();
      expect(desc.length).toBeGreaterThan(10);
    }
  });
});

// ============================================================================
// 2. TIE STRENGTH
// ============================================================================

describe('computeTieStrength', () => {
  it('returns weighted sum of all dimensions', () => {
    // 0.25*0.8 + 0.30*0.7 + 0.25*0.6 + 0.20*0.5
    // = 0.20 + 0.21 + 0.15 + 0.10 = 0.66
    const result = computeTieStrength(0.8, 0.7, 0.6, 0.5);
    expect(result).toBeCloseTo(0.66, 2);
  });

  it('returns 0 when all inputs are 0', () => {
    expect(computeTieStrength(0, 0, 0, 0)).toBe(0);
  });

  it('returns 1 when all inputs are 1', () => {
    // 0.25 + 0.30 + 0.25 + 0.20 = 1.0
    expect(computeTieStrength(1, 1, 1, 1)).toBeCloseTo(1.0, 2);
  });

  it('clamps values above 1 to 1', () => {
    // Even with inputs > 1, they get clamped to 1 internally
    const result = computeTieStrength(2.0, 2.0, 2.0, 2.0);
    expect(result).toBeCloseTo(1.0, 2);
  });

  it('clamps negative values to 0', () => {
    const result = computeTieStrength(-1, -1, -1, -1);
    expect(result).toBe(0);
  });
});

// ============================================================================
// 3. RELATIONSHIP DECAY
// ============================================================================

describe('computeDecayedCloseness', () => {
  it('returns original closeness with 0 days elapsed', () => {
    const result = computeDecayedCloseness(0.8, 0, 'family');
    expect(result).toBeCloseTo(0.8, 2);
  });

  it('decays slower for family than acquaintances', () => {
    const familyDecay = computeDecayedCloseness(0.8, 30, 'family');
    const acquaintanceDecay = computeDecayedCloseness(0.8, 30, 'acquaintances');
    expect(familyDecay).toBeGreaterThan(acquaintanceDecay);
  });

  it('decays over time (closeness decreases)', () => {
    const day0 = computeDecayedCloseness(0.8, 0, 'friends');
    const day30 = computeDecayedCloseness(0.8, 30, 'friends');
    const day90 = computeDecayedCloseness(0.8, 90, 'friends');
    expect(day0).toBeGreaterThan(day30);
    expect(day30).toBeGreaterThan(day90);
  });

  it('approaches 0 for very long time without interaction', () => {
    const result = computeDecayedCloseness(0.8, 1000, 'friends');
    expect(result).toBeLessThan(0.01);
  });

  it('adds interaction boost', () => {
    const withoutBoost = computeDecayedCloseness(0.5, 30, 'friends', 0);
    const withBoost = computeDecayedCloseness(0.5, 30, 'friends', 0.2);
    expect(withBoost).toBeGreaterThan(withoutBoost);
  });

  it('clamps result to [0, 1]', () => {
    // Large boost should still be capped at 1
    const result = computeDecayedCloseness(0.8, 0, 'family', 0.5);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('uses unknown decay rate for unrecognized relationship types', () => {
    const knownRate = getDecayRate('unknown');
    const customRate = getDecayRate('made_up_type');
    expect(customRate).toBe(knownRate);
  });
});

describe('getDecayRate', () => {
  it('returns correct rates for known types', () => {
    expect(getDecayRate('family')).toBe(0.002);
    expect(getDecayRate('friends')).toBe(0.007);
    expect(getDecayRate('professional')).toBe(0.005);
    expect(getDecayRate('acquaintances')).toBe(0.010);
  });

  it('returns unknown rate for unrecognized types', () => {
    expect(getDecayRate('xyz')).toBe(0.010);
  });
});

// ============================================================================
// 4. GOTTMAN RATIO
// ============================================================================

describe('computeGottmanRatio', () => {
  it('returns healthy when ratio >= 5:1', () => {
    const result = computeGottmanRatio(50, 10);
    expect(result.ratio).toBe(5.0);
    expect(result.healthy).toBe(true);
  });

  it('returns unhealthy when ratio < 5:1', () => {
    const result = computeGottmanRatio(10, 10);
    expect(result.ratio).toBe(1.0);
    expect(result.healthy).toBe(false);
  });

  it('returns null ratio when no negative interactions (all positive)', () => {
    const result = computeGottmanRatio(20, 0);
    expect(result.ratio).toBeNull();
    expect(result.healthy).toBe(true);
  });

  it('returns null ratio when both counts are zero', () => {
    const result = computeGottmanRatio(0, 0);
    expect(result.ratio).toBeNull();
    expect(result.healthy).toBe(true);
  });

  it('rounds ratio to 2 decimal places', () => {
    const result = computeGottmanRatio(7, 3);
    expect(result.ratio).toBe(2.33);
  });

  it('handles edge case at exactly 5:1', () => {
    const result = computeGottmanRatio(5, 1);
    expect(result.ratio).toBe(5);
    expect(result.healthy).toBe(true);
  });

  it('handles very low positive count', () => {
    const result = computeGottmanRatio(1, 5);
    expect(result.ratio).toBe(0.2);
    expect(result.healthy).toBe(false);
  });
});

// ============================================================================
// 5. NETWORK CONSTRAINT
// ============================================================================

describe('computeNetworkConstraint', () => {
  it('returns 0 when total interactions is 0', () => {
    expect(computeNetworkConstraint(10, 0)).toBe(0);
  });

  it('returns correct constraint for isolated contact', () => {
    // p_ij = 10/100 = 0.1, mutualFactor = 0
    // constraint = (0.1 + 0)^2 = 0.01
    expect(computeNetworkConstraint(10, 100, 0)).toBeCloseTo(0.01, 4);
  });

  it('increases with mutual contacts', () => {
    const withoutMutual = computeNetworkConstraint(20, 100, 0);
    const withMutual = computeNetworkConstraint(20, 100, 0.5);
    expect(withMutual).toBeGreaterThan(withoutMutual);
  });

  it('caps at 1', () => {
    // All interactions with one contact: p_ij = 1.0, mutualFactor = 1.0
    // constraint = (1 + 1)^2 = 4, but capped at 1
    const result = computeNetworkConstraint(100, 100, 1.0);
    expect(result).toBe(1);
  });
});

describe('computeAggregateConstraint', () => {
  it('returns 0 for empty contacts', () => {
    expect(computeAggregateConstraint([], 100)).toBe(0);
  });

  it('returns 0 when total interactions is 0', () => {
    const contacts = [{ interactions: 10, mutualFactor: 0 }];
    expect(computeAggregateConstraint(contacts, 0)).toBe(0);
  });

  it('sums individual constraints', () => {
    const contacts = [
      { interactions: 50, mutualFactor: 0 },
      { interactions: 50, mutualFactor: 0 },
    ];
    // Each: p_ij = 50/100 = 0.5, constraint = 0.25
    // Total = 0.50
    const result = computeAggregateConstraint(contacts, 100);
    expect(result).toBeCloseTo(0.50, 2);
  });

  it('higher constraint with concentrated network', () => {
    const concentrated = [
      { interactions: 90, mutualFactor: 0 },
      { interactions: 10, mutualFactor: 0 },
    ];
    const diversified = [
      { interactions: 50, mutualFactor: 0 },
      { interactions: 50, mutualFactor: 0 },
    ];
    const concResult = computeAggregateConstraint(concentrated, 100);
    const divResult = computeAggregateConstraint(diversified, 100);
    expect(concResult).toBeGreaterThan(divResult);
  });
});

// ============================================================================
// 6. EFFECTIVE SIZE
// ============================================================================

describe('computeEffectiveSize', () => {
  it('returns 0 for empty network', () => {
    expect(computeEffectiveSize(0, 0)).toBe(0);
  });

  it('returns contact count when no ties between contacts', () => {
    expect(computeEffectiveSize(10, 0)).toBe(10);
  });

  it('decreases with more ties between contacts (more redundancy)', () => {
    const noTies = computeEffectiveSize(10, 0);
    const someTies = computeEffectiveSize(10, 5);
    const manyTies = computeEffectiveSize(10, 20);
    expect(noTies).toBeGreaterThan(someTies);
    expect(someTies).toBeGreaterThan(manyTies);
  });

  it('never goes below 0', () => {
    // n=2, t=100 -> 2 - 200/2 = 2 - 100 = -98 -> clamped to 0
    expect(computeEffectiveSize(2, 100)).toBe(0);
  });

  it('formula: n - 2t/n', () => {
    // n=20, t=10 -> 20 - 20/20 = 20 - 1 = 19
    expect(computeEffectiveSize(20, 10)).toBe(19);
  });
});

// ============================================================================
// 7. DIVERSITY INDEX
// ============================================================================

describe('computeDiversityIndex', () => {
  it('returns 0 for empty distribution', () => {
    expect(computeDiversityIndex({})).toBe(0);
  });

  it('returns 0 when all contacts are in one category', () => {
    expect(computeDiversityIndex({ family: 10 })).toBe(0);
  });

  it('returns higher value for more balanced distribution', () => {
    const unbalanced = computeDiversityIndex({ family: 90, friends: 10 });
    const balanced = computeDiversityIndex({ family: 50, friends: 50 });
    expect(balanced).toBeGreaterThan(unbalanced);
  });

  it('returns higher value with more categories', () => {
    const twoCat = computeDiversityIndex({ family: 50, friends: 50 });
    const fourCat = computeDiversityIndex({
      family: 25, friends: 25, professional: 25, acquaintances: 25,
    });
    expect(fourCat).toBeGreaterThan(twoCat);
  });

  it('perfectly balanced 2 categories gives 0.5', () => {
    // HHI = 0.5^2 + 0.5^2 = 0.5, diversity = 1 - 0.5 = 0.5
    expect(computeDiversityIndex({ a: 10, b: 10 })).toBeCloseTo(0.5, 4);
  });

  it('perfectly balanced 4 categories gives 0.75', () => {
    // HHI = 4 * 0.25^2 = 4 * 0.0625 = 0.25, diversity = 1 - 0.25 = 0.75
    expect(computeDiversityIndex({ a: 5, b: 5, c: 5, d: 5 })).toBeCloseTo(0.75, 4);
  });
});

// ============================================================================
// COMPOSITE RELATIONSHIP SCORE
// ============================================================================

describe('computeCompositeRelationshipScore', () => {
  it('returns highest possible score for best inputs', () => {
    const result = computeCompositeRelationshipScore({
      dunbarLayer: 5,
      tieStrength: 1.0,
      gottmanHealthy: true,
      reciprocity: 1.0,
      freshness: 1.0,
      strategicValue: 1.0,
    });
    // 0.20*1.0 + 0.20*1.0 + 0.15*1.0 + 0.10*1.0 + 0.15*1.0 + 0.20*1.0 = 1.0
    expect(result).toBeCloseTo(1.0, 3);
  });

  it('returns lower score for weak connections', () => {
    const result = computeCompositeRelationshipScore({
      dunbarLayer: 500,
      tieStrength: 0.1,
      gottmanHealthy: false,
      reciprocity: 0.1,
      freshness: 0.1,
      strategicValue: 0.1,
    });
    // 0.20*0.2 + 0.20*0.1 + 0.15*0.3 + 0.10*0.1 + 0.15*0.1 + 0.20*0.1
    // = 0.04 + 0.02 + 0.045 + 0.01 + 0.015 + 0.02 = 0.15
    expect(result).toBeCloseTo(0.15, 3);
  });

  it('gottmanHealthy=false gives 0.3 weight instead of 1.0', () => {
    const healthy = computeCompositeRelationshipScore({
      dunbarLayer: 50,
      tieStrength: 0.5,
      gottmanHealthy: true,
      reciprocity: 0.5,
      freshness: 0.5,
      strategicValue: 0.5,
    });
    const unhealthy = computeCompositeRelationshipScore({
      dunbarLayer: 50,
      tieStrength: 0.5,
      gottmanHealthy: false,
      reciprocity: 0.5,
      freshness: 0.5,
      strategicValue: 0.5,
    });
    expect(healthy).toBeGreaterThan(unhealthy);
  });

  it('rounds to 3 decimal places', () => {
    const result = computeCompositeRelationshipScore({
      dunbarLayer: 150,
      tieStrength: 0.333,
      gottmanHealthy: true,
      reciprocity: 0.333,
      freshness: 0.333,
      strategicValue: 0.333,
    });
    // Check it's a 3-decimal number
    const decimalPlaces = (result.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// SCORE CONTACT (integration of all formulas)
// ============================================================================

describe('scoreContact', () => {
  const baseInput: ContactScoreInput = {
    contactId: 'contact-1',
    relationshipType: 'friends',
    interactionCount: 20,
    lastInteractionAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    healthScore: 70,
    sentimentTrend: 'improving',
  };

  it('returns all required fields', () => {
    const result = scoreContact(baseInput);
    expect(result.contactId).toBe('contact-1');
    expect(result.dunbarLayer).toBeDefined();
    expect(result.tieStrength).toBeGreaterThanOrEqual(0);
    expect(result.tieStrength).toBeLessThanOrEqual(1);
    expect(result.decayedCloseness).toBeGreaterThanOrEqual(0);
    expect(result.decayedCloseness).toBeLessThanOrEqual(1);
    expect(typeof result.gottmanHealthy).toBe('boolean');
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(1);
    expect(result.scores).toHaveLength(4);
  });

  it('produces 4 scientific scores', () => {
    const result = scoreContact(baseInput);
    const dimensions = result.scores.map(s => s.dimension);
    expect(dimensions).toContain('dunbar_layer');
    expect(dimensions).toContain('tie_strength');
    expect(dimensions).toContain('relationship_decay');
    expect(dimensions).toContain('gottman_ratio');
  });

  it('handles null lastInteractionAt (assumes 365 days ago)', () => {
    const input = { ...baseInput, lastInteractionAt: null };
    const result = scoreContact(input);
    // Should not throw and should produce a valid result
    expect(result.decayedCloseness).toBeGreaterThanOrEqual(0);
    expect(result.decayedCloseness).toBeLessThan(0.5); // Very decayed
  });

  it('uses explicit emotional closeness when provided', () => {
    const withExplicit = scoreContact({
      ...baseInput,
      emotionalCloseness: 0.9,
      intimacy: 0.9,
      reciprocity: 0.9,
    });
    const withDerived = scoreContact({
      ...baseInput,
      healthScore: 30, // Lower health means lower derived closeness
    });
    expect(withExplicit.tieStrength).toBeGreaterThan(withDerived.tieStrength);
  });

  it('uses explicit positive/negative interaction counts when provided', () => {
    const healthyInput = {
      ...baseInput,
      positiveInteractions: 50,
      negativeInteractions: 5,
    };
    const result = scoreContact(healthyInput);
    expect(result.gottmanRatio).toBe(10);
    expect(result.gottmanHealthy).toBe(true);
  });

  it('marks gottman score as contested', () => {
    const result = scoreContact(baseInput);
    const gottmanScore = result.scores.find(s => s.dimension === 'gottman_ratio');
    expect(gottmanScore?.isContested).toBe(true);
    expect(gottmanScore?.contestedNote).toBeTruthy();
  });

  it('confidence scales with interaction count', () => {
    const fewInteractions = scoreContact({ ...baseInput, interactionCount: 2 });
    const manyInteractions = scoreContact({ ...baseInput, interactionCount: 50 });

    const fewConf = fewInteractions.scores[0].confidence;
    const manyConf = manyInteractions.scores[0].confidence;
    expect(manyConf).toBeGreaterThan(fewConf);
  });
});

// ============================================================================
// NETWORK METRICS
// ============================================================================

describe('computeNetworkMetrics', () => {
  it('returns zero metrics for empty contacts', () => {
    const result = computeNetworkMetrics([]);
    expect(result.totalContacts).toBe(0);
    expect(result.effectiveSize).toBe(0);
    expect(result.networkConstraint).toBe(0);
    expect(result.diversityIndex).toBe(0);
  });

  it('computes correct layer distribution', () => {
    const contacts = [
      { id: '1', interactionCount: 10, relationshipType: 'family', dunbarLayer: 5 as DunbarLayer },
      { id: '2', interactionCount: 5, relationshipType: 'friends', dunbarLayer: 15 as DunbarLayer },
      { id: '3', interactionCount: 3, relationshipType: 'friends', dunbarLayer: 50 as DunbarLayer },
      { id: '4', interactionCount: 1, relationshipType: 'acquaintances', dunbarLayer: 500 as DunbarLayer },
    ];
    const result = computeNetworkMetrics(contacts);
    expect(result.layerDistribution[5]).toBe(1);
    expect(result.layerDistribution[15]).toBe(1);
    expect(result.layerDistribution[50]).toBe(1);
    expect(result.layerDistribution[150]).toBe(0);
    expect(result.layerDistribution[500]).toBe(1);
    expect(result.totalContacts).toBe(4);
  });

  it('defaults to layer 500 when dunbarLayer not provided', () => {
    const contacts = [
      { id: '1', interactionCount: 10, relationshipType: 'family' },
    ];
    const result = computeNetworkMetrics(contacts);
    expect(result.layerDistribution[500]).toBe(1);
  });

  it('computes diversity index from relationship types', () => {
    const contacts = [
      { id: '1', interactionCount: 10, relationshipType: 'family' },
      { id: '2', interactionCount: 10, relationshipType: 'friends' },
      { id: '3', interactionCount: 10, relationshipType: 'professional' },
      { id: '4', interactionCount: 10, relationshipType: 'acquaintances' },
    ];
    const result = computeNetworkMetrics(contacts);
    // 4 equal categories -> diversity = 0.75
    expect(result.diversityIndex).toBeCloseTo(0.75, 2);
  });

  it('returns lower diversity for homogeneous network', () => {
    const homogeneous = [
      { id: '1', interactionCount: 10, relationshipType: 'family' },
      { id: '2', interactionCount: 10, relationshipType: 'family' },
      { id: '3', interactionCount: 10, relationshipType: 'family' },
    ];
    const diverse = [
      { id: '1', interactionCount: 10, relationshipType: 'family' },
      { id: '2', interactionCount: 10, relationshipType: 'friends' },
      { id: '3', interactionCount: 10, relationshipType: 'professional' },
    ];
    const homoResult = computeNetworkMetrics(homogeneous);
    const divResult = computeNetworkMetrics(diverse);
    expect(divResult.diversityIndex).toBeGreaterThan(homoResult.diversityIndex);
  });
});
