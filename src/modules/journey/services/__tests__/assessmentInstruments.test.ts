/**
 * Unit Tests for assessmentInstruments
 *
 * Tests cover:
 * - validateResponses: missing items, out-of-range, invalid types
 * - scoreAssessment: per-instrument scoring logic (PERMA, SWLS, PANAS, MAAS, Affect Grid, InCharge)
 * - normalizeScore: 0-1 normalization for Life Score composition
 * - computeJourneyDomainScore: weighted composite
 * - Edge cases: all-min, all-max, unknown instrument
 *
 * @see src/modules/journey/services/assessmentInstruments.ts
 */

import { describe, it, expect } from 'vitest'

import {
  validateResponses,
  scoreAssessment,
  normalizeScore,
  computeJourneyDomainScore,
  getInstrumentDefinition,
  getAllInstruments,
  getAllInstrumentIds,
} from '../assessmentInstruments'

// =============================================================================
// Helpers
// =============================================================================

/** Build responses with all items set to a single value */
function buildUniformResponses(instrumentId: string, value: number): Record<string, number> {
  const instrument = getInstrumentDefinition(instrumentId)
  if (!instrument) throw new Error(`Unknown instrument: ${instrumentId}`)
  const responses: Record<string, number> = {}
  for (const item of instrument.items) {
    responses[item.code] = value
  }
  return responses
}

/** Build mid-range responses for an instrument */
function buildMidResponses(instrumentId: string): Record<string, number> {
  const instrument = getInstrumentDefinition(instrumentId)
  if (!instrument) throw new Error(`Unknown instrument: ${instrumentId}`)
  const responses: Record<string, number> = {}
  for (const item of instrument.items) {
    const min = item.scaleMin ?? 0
    const max = item.scaleMax ?? 10
    responses[item.code] = Math.round((min + max) / 2)
  }
  return responses
}

// =============================================================================
// Instrument Registry
// =============================================================================

describe('Instrument Registry', () => {
  it('should have 6 instruments registered', () => {
    const ids = getAllInstrumentIds()
    expect(ids).toHaveLength(6)
    expect(ids).toEqual(
      expect.arrayContaining(['perma_profiler', 'swls', 'panas', 'maas', 'affect_grid', 'incharge'])
    )
  })

  it('should return all instruments via getAllInstruments', () => {
    const instruments = getAllInstruments()
    expect(instruments).toHaveLength(6)
    instruments.forEach((inst) => {
      expect(inst.id).toBeTruthy()
      expect(inst.items.length).toBeGreaterThan(0)
      expect(inst.scoringRules.length).toBeGreaterThan(0)
    })
  })

  it('should return undefined for unknown instrument', () => {
    expect(getInstrumentDefinition('nonexistent')).toBeUndefined()
  })
})

// =============================================================================
// validateResponses
// =============================================================================

describe('validateResponses', () => {
  it('should validate correct PERMA responses as valid', () => {
    const instrument = getInstrumentDefinition('perma_profiler')!
    const responses = buildMidResponses('perma_profiler')
    const result = validateResponses(instrument, responses)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should report missing items', () => {
    const instrument = getInstrumentDefinition('swls')!
    const result = validateResponses(instrument, { S1: 4, S2: 5 })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Missing response for item: S3'))).toBe(true)
    expect(result.errors.some((e) => e.includes('Missing response for item: S4'))).toBe(true)
    expect(result.errors.some((e) => e.includes('Missing response for item: S5'))).toBe(true)
  })

  it('should report out-of-range values', () => {
    const instrument = getInstrumentDefinition('swls')!
    const responses = { S1: 1, S2: 1, S3: 1, S4: 1, S5: 99 }
    const result = validateResponses(instrument, responses)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Out of range for S5'))).toBe(true)
  })

  it('should report non-number values', () => {
    const instrument = getInstrumentDefinition('swls')!
    const responses = { S1: 1, S2: 1, S3: NaN, S4: 1, S5: 1 }
    const result = validateResponses(instrument, responses)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Invalid value for S3'))).toBe(true)
  })

  it('should accept boundary values (min and max)', () => {
    const instrument = getInstrumentDefinition('affect_grid')!
    const responses = { AG_V: 1, AG_A: 9 }
    const result = validateResponses(instrument, responses)
    expect(result.valid).toBe(true)
  })
})

// =============================================================================
// scoreAssessment — PERMA-Profiler
// =============================================================================

describe('scoreAssessment — PERMA-Profiler', () => {
  it('should compute subscale means and composite as mean of 5 pillars', () => {
    const responses = buildMidResponses('perma_profiler')
    const result = scoreAssessment('perma_profiler', responses)

    // All mid-range (5), so each subscale mean should be 5
    expect(result.subscaleScores['positive_emotion']).toBe(5)
    expect(result.subscaleScores['engagement']).toBe(5)
    expect(result.subscaleScores['relationships']).toBe(5)
    expect(result.subscaleScores['meaning']).toBe(5)
    expect(result.subscaleScores['accomplishment']).toBe(5)

    // Composite = mean of 5 pillars = 5
    expect(result.compositeScore).toBe(5)
  })

  it('should handle all-max scores (10)', () => {
    const responses = buildUniformResponses('perma_profiler', 10)
    const result = scoreAssessment('perma_profiler', responses)

    expect(result.subscaleScores['positive_emotion']).toBe(10)
    expect(result.compositeScore).toBe(10)
  })

  it('should handle all-min scores (0)', () => {
    const responses = buildUniformResponses('perma_profiler', 0)
    const result = scoreAssessment('perma_profiler', responses)

    expect(result.subscaleScores['positive_emotion']).toBe(0)
    expect(result.compositeScore).toBe(0)
  })

  it('should include negative_emotion and health subscales separately from composite', () => {
    const responses = buildMidResponses('perma_profiler')
    const result = scoreAssessment('perma_profiler', responses)

    expect(result.subscaleScores['negative_emotion']).toBeDefined()
    expect(result.subscaleScores['health']).toBeDefined()
    // These are NOT included in composite (only P, E, R, M, A)
  })
})

// =============================================================================
// scoreAssessment — SWLS
// =============================================================================

describe('scoreAssessment — SWLS', () => {
  it('should compute sum-based scoring', () => {
    const responses = { S1: 7, S2: 7, S3: 7, S4: 7, S5: 7 }
    const result = scoreAssessment('swls', responses)

    expect(result.subscaleScores['life_satisfaction']).toBe(35)
    expect(result.compositeScore).toBe(35)
  })

  it('should handle minimum scores (all 1s)', () => {
    const responses = { S1: 1, S2: 1, S3: 1, S4: 1, S5: 1 }
    const result = scoreAssessment('swls', responses)

    expect(result.subscaleScores['life_satisfaction']).toBe(5)
    expect(result.compositeScore).toBe(5)
  })
})

// =============================================================================
// scoreAssessment — PANAS
// =============================================================================

describe('scoreAssessment — PANAS', () => {
  it('should compute PA and NA sums, composite = PA - NA', () => {
    // All positive at max (5), all negative at min (1)
    const responses: Record<string, number> = {}
    for (let i = 1; i <= 10; i++) {
      responses[`PA${i}`] = 5
      responses[`NA${i}`] = 1
    }

    const result = scoreAssessment('panas', responses)
    expect(result.subscaleScores['positive_affect']).toBe(50)
    expect(result.subscaleScores['negative_affect']).toBe(10)
    expect(result.compositeScore).toBe(40) // 50 - 10
  })

  it('should produce negative composite when NA > PA', () => {
    const responses: Record<string, number> = {}
    for (let i = 1; i <= 10; i++) {
      responses[`PA${i}`] = 1
      responses[`NA${i}`] = 5
    }

    const result = scoreAssessment('panas', responses)
    expect(result.compositeScore).toBe(-40) // 10 - 50
  })
})

// =============================================================================
// scoreAssessment — MAAS
// =============================================================================

describe('scoreAssessment — MAAS', () => {
  it('should compute mean of 15 items', () => {
    const responses = buildUniformResponses('maas', 6)
    const result = scoreAssessment('maas', responses)

    expect(result.subscaleScores['mindfulness']).toBe(6)
    expect(result.compositeScore).toBe(6)
  })

  it('should handle low mindfulness scores (value 1)', () => {
    const responses = buildUniformResponses('maas', 1)
    const result = scoreAssessment('maas', responses)

    expect(result.subscaleScores['mindfulness']).toBe(1)
    expect(result.compositeScore).toBe(1)
  })
})

// =============================================================================
// scoreAssessment — Affect Grid
// =============================================================================

describe('scoreAssessment — Affect Grid', () => {
  it('should return valence and arousal subscales', () => {
    const responses = { AG_V: 7, AG_A: 3 }
    const result = scoreAssessment('affect_grid', responses)

    expect(result.subscaleScores['valence']).toBe(7)
    expect(result.subscaleScores['arousal']).toBe(3)
    expect(result.compositeScore).toBe(7) // composite = valence
  })
})

// =============================================================================
// scoreAssessment — InCharge
// =============================================================================

describe('scoreAssessment — InCharge', () => {
  it('should compute mean of 8 items', () => {
    const responses = buildUniformResponses('incharge', 5)
    const result = scoreAssessment('incharge', responses)

    expect(result.subscaleScores['financial_wellbeing']).toBe(5)
    expect(result.compositeScore).toBe(5)
  })
})

// =============================================================================
// scoreAssessment — Error handling
// =============================================================================

describe('scoreAssessment — error handling', () => {
  it('should throw for unknown instrument', () => {
    expect(() => scoreAssessment('unknown', { x: 1 })).toThrow('Unknown instrument')
  })

  it('should throw for empty responses', () => {
    expect(() => scoreAssessment('swls', {})).toThrow('Empty responses')
  })

  it('should throw for null responses', () => {
    expect(() => scoreAssessment('swls', null as unknown as Record<string, number>)).toThrow('Empty responses')
  })

  it('should throw for invalid responses (missing items)', () => {
    expect(() => scoreAssessment('swls', { S1: 4 })).toThrow('Invalid assessment responses')
  })

  it('should throw for out-of-range values', () => {
    expect(() => scoreAssessment('swls', { S1: 99, S2: 1, S3: 1, S4: 1, S5: 1 })).toThrow(
      'Invalid assessment responses'
    )
  })
})

// =============================================================================
// normalizeScore
// =============================================================================

describe('normalizeScore', () => {
  it('should normalize PERMA max score to 1', () => {
    expect(normalizeScore('perma_profiler', 10)).toBe(1)
  })

  it('should normalize PERMA min score to 0', () => {
    expect(normalizeScore('perma_profiler', 0)).toBe(0)
  })

  it('should normalize PERMA mid score to 0.5', () => {
    expect(normalizeScore('perma_profiler', 5)).toBe(0.5)
  })

  it('should normalize SWLS max (35) to 1', () => {
    const result = normalizeScore('swls', 35)
    expect(result).toBeCloseTo(1, 5)
  })

  it('should normalize SWLS min (5) to 0', () => {
    expect(normalizeScore('swls', 5)).toBe(0)
  })

  it('should normalize PANAS using special -40 to +40 range', () => {
    // Max positive affect balance: +40
    expect(normalizeScore('panas', 40)).toBe(1)
    // Max negative affect balance: -40
    expect(normalizeScore('panas', -40)).toBe(0)
    // Neutral: 0
    expect(normalizeScore('panas', 0)).toBe(0.5)
  })

  it('should clamp values beyond range', () => {
    expect(normalizeScore('perma_profiler', 100)).toBe(1)
    expect(normalizeScore('perma_profiler', -100)).toBe(0)
  })

  it('should return 0 for unknown instrument', () => {
    expect(normalizeScore('nonexistent', 5)).toBe(0)
  })
})

// =============================================================================
// computeJourneyDomainScore
// =============================================================================

describe('computeJourneyDomainScore', () => {
  it('should compute weighted score: 40% PERMA + 30% SWLS + 30% EMA', () => {
    const score = computeJourneyDomainScore(1, 1, 1)
    expect(score).toBeCloseTo(1, 5) // 0.4 + 0.3 + 0.3 = 1
  })

  it('should return 0 when all inputs are 0', () => {
    expect(computeJourneyDomainScore(0, 0, 0)).toBe(0)
  })

  it('should apply correct weights', () => {
    // Only PERMA contributes
    const permaOnly = computeJourneyDomainScore(1, 0, 0)
    expect(permaOnly).toBeCloseTo(0.4, 5)

    // Only SWLS contributes
    const swlsOnly = computeJourneyDomainScore(0, 1, 0)
    expect(swlsOnly).toBeCloseTo(0.3, 5)

    // Only EMA contributes
    const emaOnly = computeJourneyDomainScore(0, 0, 1)
    expect(emaOnly).toBeCloseTo(0.3, 5)
  })

  it('should clamp input values to [0, 1]', () => {
    const clamped = computeJourneyDomainScore(2, -1, 1.5)
    // Clamped: (0.4 * 1) + (0.3 * 0) + (0.3 * 1) = 0.7
    expect(clamped).toBeCloseTo(0.7, 5)
  })
})
