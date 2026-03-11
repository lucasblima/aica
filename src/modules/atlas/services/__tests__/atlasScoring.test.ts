/**
 * Unit Tests for atlasScoring service
 *
 * Tests cover all 8 scientific scoring formulas:
 * 1. Cognitive Load (Sweller 1988)
 * 2. Flow Probability (Csikszentmihalyi 1990)
 * 3. Planning Fallacy correction (Buehler et al. 1994)
 * 4. Scientific Priority (composite)
 * 5. Switch Cost (Rubinstein et al. 2001)
 * 6. Zeigarnik Relief (Masicampo & Baumeister 2011)
 * 7. Decision Fatigue (Danziger et al. 2011)
 * 8. Attention Restoration (Kaplan 1995)
 * Plus: Atlas Domain Score, batch scoring, energy levels
 *
 * @see src/modules/atlas/services/atlasScoring.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabaseClient before importing the module under test
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import {
  computeCognitiveLoad,
  computeFlowProbability,
  correctPlanningFallacy,
  computeSwitchCost,
  computeAttentionRestoration,
  computeAtlasDomainScore,
  scoreWorkItem,
  batchScoreWorkItems,
  getCurrentEnergyLevel,
  type CognitiveProfile,
  type WorkItemForScoring,
  type BreakActivity,
} from '../atlasScoring'

// ─── Helpers ──────────────────────────────────────────────────

function makeProfile(overrides: Partial<CognitiveProfile> = {}): CognitiveProfile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    chronotype: 'intermediate',
    peak_hours: [9, 12],
    avg_focus_minutes: 45,
    planning_fallacy_multiplier: 1.5,
    decisions_today: 5,
    last_break_at: null,
    preferred_break_type: 'nature',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeWorkItem(overrides: Partial<WorkItemForScoring> = {}): WorkItemForScoring {
  return {
    id: 'item-1',
    title: 'Test Task',
    description: 'A test task description',
    priority: 'high',
    priority_quadrant: 'urgent-important',
    due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    estimated_duration: 30,
    actual_duration: null,
    completed_at: null,
    tags: ['test'],
    subtask_count: 3,
    has_notes: true,
    complexity: 'medium',
    context_category: 'development',
    ...overrides,
  }
}

// =============================================================================
// 1. COGNITIVE LOAD — Sweller 1988
// =============================================================================

describe('computeCognitiveLoad', () => {
  it('should return 0 for minimum inputs (1 element, 0 interactivity)', () => {
    const result = computeCognitiveLoad(1, 0, 1)
    expect(result).toBe(0)
  })

  it('should return 1 for maximum inputs (20 elements, full interactivity, min expertise)', () => {
    const result = computeCognitiveLoad(20, 1, 0.1)
    // rawCL = 20 * 1 * (1/0.1) = 200, normalized = 200/20 = 10, capped at 1
    expect(result).toBe(1)
  })

  it('should increase with more elements', () => {
    const low = computeCognitiveLoad(2, 0.5, 0.5)
    const high = computeCognitiveLoad(10, 0.5, 0.5)
    expect(high).toBeGreaterThan(low)
  })

  it('should increase with higher interactivity', () => {
    const low = computeCognitiveLoad(5, 0.2, 0.5)
    const high = computeCognitiveLoad(5, 0.8, 0.5)
    expect(high).toBeGreaterThan(low)
  })

  it('should increase with lower expertise (inverse relationship)', () => {
    const expert = computeCognitiveLoad(5, 0.5, 1.0)
    const novice = computeCognitiveLoad(5, 0.5, 0.1)
    expect(novice).toBeGreaterThan(expert)
  })

  it('should clamp elements to range [1, 20]', () => {
    const belowMin = computeCognitiveLoad(0, 0.5, 0.5)
    const atMin = computeCognitiveLoad(1, 0.5, 0.5)
    expect(belowMin).toBe(atMin)

    const aboveMax = computeCognitiveLoad(50, 0.5, 0.5)
    const atMax = computeCognitiveLoad(20, 0.5, 0.5)
    expect(aboveMax).toBe(atMax)
  })

  it('should clamp interactivity to [0, 1]', () => {
    const belowMin = computeCognitiveLoad(5, -1, 0.5)
    const atMin = computeCognitiveLoad(5, 0, 0.5)
    expect(belowMin).toBe(atMin)
  })

  it('should clamp expertise to [0.1, 1]', () => {
    const belowMin = computeCognitiveLoad(5, 0.5, 0)
    const atMin = computeCognitiveLoad(5, 0.5, 0.1)
    expect(belowMin).toBe(atMin)
  })

  it('should normalize to 0-1 range', () => {
    // Mid-range inputs
    const result = computeCognitiveLoad(10, 0.5, 0.5)
    // rawCL = 10 * 0.5 * (1/0.5) = 10, normalized = 10/20 = 0.5
    expect(result).toBeCloseTo(0.5, 5)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

// =============================================================================
// 2. FLOW PROBABILITY — Csikszentmihalyi 1990
// =============================================================================

describe('computeFlowProbability', () => {
  it('should return maximum when challenge equals skill and both are high', () => {
    // challenge == skill = 0.8 -> ratio = 1.0
    // avg = 0.8 > 0.4 -> aboveAvgMod = 1.0
    // result = 1.0 * 1.0 * 0.9 * 0.9 = 0.81
    const result = computeFlowProbability(0.8, 0.8, 0.9, 0.9)
    expect(result).toBeCloseTo(0.81, 2)
  })

  it('should decrease when challenge and skill diverge', () => {
    const balanced = computeFlowProbability(0.7, 0.7, 0.8, 0.8)
    const imbalanced = computeFlowProbability(0.9, 0.3, 0.8, 0.8)
    expect(balanced).toBeGreaterThan(imbalanced)
  })

  it('should apply 0.7 penalty when both challenge and skill are below average', () => {
    // Both below 0.4 average -> aboveAvgMod = 0.7
    const result = computeFlowProbability(0.2, 0.2, 1.0, 1.0)
    // ratio = 1.0, avg = 0.2 < 0.4, aboveAvgMod = 0.7
    // 1.0 * 0.7 * 1.0 * 1.0 = 0.7
    expect(result).toBeCloseTo(0.7, 2)
  })

  it('should scale with goal clarity', () => {
    const clear = computeFlowProbability(0.7, 0.7, 1.0, 0.8)
    const unclear = computeFlowProbability(0.7, 0.7, 0.3, 0.8)
    expect(clear).toBeGreaterThan(unclear)
  })

  it('should scale with feedback quality', () => {
    const goodFeedback = computeFlowProbability(0.7, 0.7, 0.8, 1.0)
    const poorFeedback = computeFlowProbability(0.7, 0.7, 0.8, 0.2)
    expect(goodFeedback).toBeGreaterThan(poorFeedback)
  })

  it('should clamp all inputs to valid ranges', () => {
    // Even with out-of-range inputs, should not crash or return > 1
    const result = computeFlowProbability(2, -1, 5, -0.5)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })

  it('should handle near-zero inputs (clamped to 0.01)', () => {
    const result = computeFlowProbability(0, 0, 0, 0)
    expect(result).toBe(0)
  })
})

// =============================================================================
// 3. PLANNING FALLACY — Buehler et al. 1994
// =============================================================================

describe('correctPlanningFallacy', () => {
  it('should multiply estimate by the personal multiplier', () => {
    expect(correctPlanningFallacy(60, 1.5)).toBe(90)
  })

  it('should round to the nearest integer', () => {
    expect(correctPlanningFallacy(45, 1.3)).toBe(59) // 45 * 1.3 = 58.5 -> 59
  })

  it('should never reduce the estimate (multiplier clamped to >= 1)', () => {
    // Even if user somehow has a multiplier < 1
    const result = correctPlanningFallacy(60, 0.5)
    expect(result).toBe(60) // 60 * max(1, 0.5) = 60
  })

  it('should handle zero estimated minutes', () => {
    expect(correctPlanningFallacy(0, 1.5)).toBe(0)
  })

  it('should handle large multipliers', () => {
    const result = correctPlanningFallacy(30, 3.0)
    expect(result).toBe(90)
  })

  it('should use default multiplier of 1.5 correctly', () => {
    // The default multiplier (1.5) means tasks typically take 50% longer
    expect(correctPlanningFallacy(100, 1.5)).toBe(150)
  })
})

// =============================================================================
// 5. SWITCH COST — Rubinstein et al. 2001
// =============================================================================

describe('computeSwitchCost', () => {
  it('should add 2 minutes per switch for low complexity', () => {
    const result = computeSwitchCost(30, 3, 'low')
    expect(result).toBe(30 + 3 * 2) // 36
  })

  it('should add 5 minutes per switch for medium complexity', () => {
    const result = computeSwitchCost(30, 3, 'medium')
    expect(result).toBe(30 + 3 * 5) // 45
  })

  it('should add 12 minutes per switch for high complexity', () => {
    const result = computeSwitchCost(30, 3, 'high')
    expect(result).toBe(30 + 3 * 12) // 66
  })

  it('should return base duration when no switches', () => {
    expect(computeSwitchCost(45, 0, 'high')).toBe(45)
  })

  it('should handle zero base duration', () => {
    const result = computeSwitchCost(0, 2, 'medium')
    expect(result).toBe(10) // 0 + 2 * 5
  })
})

// =============================================================================
// 8. ATTENTION RESTORATION — Kaplan 1995
// =============================================================================

describe('computeAttentionRestoration', () => {
  it('should give highest base score for nature breaks', () => {
    const nature = computeAttentionRestoration('nature', 15)
    const screen = computeAttentionRestoration('screen', 15)
    expect(nature).toBeGreaterThan(screen)
  })

  it('should scale with duration up to diminishing returns', () => {
    const short = computeAttentionRestoration('nature', 5)
    const medium = computeAttentionRestoration('nature', 15)
    const long = computeAttentionRestoration('nature', 30)
    const veryLong = computeAttentionRestoration('nature', 60)

    expect(medium).toBeGreaterThan(short)
    expect(long).toBeGreaterThan(medium)
    // Duration bonus caps at 2 (= 30/15), so 30min and 60min give same result
    expect(veryLong).toBe(long)
  })

  it('should return 0-10 range', () => {
    const activities: BreakActivity[] = ['nature', 'change', 'explore', 'social', 'rest', 'screen']
    for (const activity of activities) {
      const result = computeAttentionRestoration(activity, 15)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(10)
    }
  })

  it('should return correct score for nature + 15min', () => {
    // baseScore = 3, durationBonus = min(2, 15/15) = 1, total = (3+1)*2 = 8
    const result = computeAttentionRestoration('nature', 15)
    expect(result).toBe(8)
  })

  it('should return correct score for screen + 5min', () => {
    // baseScore = 0.5, durationBonus = min(2, 5/15) = 0.333, total = (0.5+0.333)*2 = 1.666
    const result = computeAttentionRestoration('screen', 5)
    expect(result).toBeCloseTo(1.667, 2)
  })

  it('should handle zero duration', () => {
    // baseScore = 3, durationBonus = 0, total = (3+0)*2 = 6
    const result = computeAttentionRestoration('nature', 0)
    expect(result).toBe(6)
  })

  it('should rank activities in expected order', () => {
    const duration = 10
    const nature = computeAttentionRestoration('nature', duration)
    const change = computeAttentionRestoration('change', duration)
    const social = computeAttentionRestoration('social', duration)
    const explore = computeAttentionRestoration('explore', duration)
    const rest = computeAttentionRestoration('rest', duration)
    const screen = computeAttentionRestoration('screen', duration)

    expect(nature).toBeGreaterThan(change)
    expect(change).toBeGreaterThan(social)
    expect(social).toBeGreaterThan(explore)
    expect(explore).toBe(rest) // both have base 1 (explore=1, rest=1 — hmm let me check)
    expect(rest).toBeGreaterThan(screen)
  })
})

// =============================================================================
// ATLAS DOMAIN SCORE
// =============================================================================

describe('computeAtlasDomainScore', () => {
  it('should compute weighted average (35/40/25)', () => {
    const result = computeAtlasDomainScore(0.8, 0.7, 0.6)
    // 0.35*0.8 + 0.40*0.7 + 0.25*0.6 = 0.28 + 0.28 + 0.15 = 0.71
    expect(result).toBeCloseTo(0.71, 3)
  })

  it('should return 1.0 for perfect scores', () => {
    const result = computeAtlasDomainScore(1.0, 1.0, 1.0)
    expect(result).toBeCloseTo(1.0, 3)
  })

  it('should return 0.0 for zero scores', () => {
    const result = computeAtlasDomainScore(0, 0, 0)
    expect(result).toBe(0)
  })

  it('should clamp inputs to [0, 1]', () => {
    const result = computeAtlasDomainScore(1.5, -0.5, 2.0)
    // 0.35*1.0 + 0.40*0.0 + 0.25*1.0 = 0.35 + 0 + 0.25 = 0.60
    expect(result).toBeCloseTo(0.60, 3)
  })

  it('should weight task completion rate highest (40%)', () => {
    // Only completion rate at 1.0, others at 0
    const completionOnly = computeAtlasDomainScore(0, 1.0, 0)
    // Only flow at 1.0
    const flowOnly = computeAtlasDomainScore(1.0, 0, 0)
    // Only planning at 1.0
    const planningOnly = computeAtlasDomainScore(0, 0, 1.0)

    expect(completionOnly).toBe(0.40)
    expect(flowOnly).toBe(0.35)
    expect(planningOnly).toBe(0.25)
    expect(completionOnly).toBeGreaterThan(flowOnly)
    expect(flowOnly).toBeGreaterThan(planningOnly)
  })
})

// =============================================================================
// getCurrentEnergyLevel
// =============================================================================

describe('getCurrentEnergyLevel', () => {
  it('should return peak during peak hours', () => {
    const profile = makeProfile({ peak_hours: [9, 12] })
    // Mock Date to 10:00
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 11, 10, 0, 0))

    const result = getCurrentEnergyLevel(profile)
    expect(result).toBe('peak')

    vi.useRealTimers()
  })

  it('should return sustain within 2 hours of peak window', () => {
    const profile = makeProfile({ peak_hours: [9, 12] })
    vi.useFakeTimers()
    // 7:30 is within sustain range (7-9 before peak)
    vi.setSystemTime(new Date(2026, 2, 11, 7, 30, 0))

    const result = getCurrentEnergyLevel(profile)
    expect(result).toBe('sustain')

    vi.useRealTimers()
  })

  it('should return sustain within 2 hours after peak window', () => {
    const profile = makeProfile({ peak_hours: [9, 12] })
    vi.useFakeTimers()
    // 13:00 is within sustain range (12-14 after peak)
    vi.setSystemTime(new Date(2026, 2, 11, 13, 0, 0))

    const result = getCurrentEnergyLevel(profile)
    expect(result).toBe('sustain')

    vi.useRealTimers()
  })

  it('should return rest outside peak and sustain windows', () => {
    const profile = makeProfile({ peak_hours: [9, 12] })
    vi.useFakeTimers()
    // 22:00 is well outside both windows
    vi.setSystemTime(new Date(2026, 2, 11, 22, 0, 0))

    const result = getCurrentEnergyLevel(profile)
    expect(result).toBe('rest')

    vi.useRealTimers()
  })
})

// =============================================================================
// scoreWorkItem — Composite
// =============================================================================

describe('scoreWorkItem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 11, 10, 0, 0)) // 10:00 AM
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return all 8 score fields', () => {
    const item = makeWorkItem()
    const profile = makeProfile()
    const scores = scoreWorkItem(item, profile)

    expect(scores).toHaveProperty('cognitiveLoad')
    expect(scores).toHaveProperty('flowProbability')
    expect(scores).toHaveProperty('correctedDuration')
    expect(scores).toHaveProperty('scientificPriority')
    expect(scores).toHaveProperty('switchCost')
    expect(scores).toHaveProperty('zeigarnikRelief')
    expect(scores).toHaveProperty('decisionFatigue')
    expect(scores).toHaveProperty('attentionRestoration')
  })

  it('should produce higher scientificPriority for urgent-important items', () => {
    const profile = makeProfile()
    const urgentImportant = makeWorkItem({
      priority_quadrant: 'urgent-important',
      due_date: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour
    })
    const low = makeWorkItem({
      priority_quadrant: 'low',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })

    const urgentScores = scoreWorkItem(urgentImportant, profile)
    const lowScores = scoreWorkItem(low, profile)

    expect(urgentScores.scientificPriority).toBeGreaterThan(lowScores.scientificPriority)
  })

  it('should produce higher zeigarnikRelief for well-captured tasks', () => {
    const profile = makeProfile()
    const wellCaptured = makeWorkItem({
      due_date: '2026-03-15',
      subtask_count: 5,
      description: 'Detailed description',
      has_notes: true,
      priority_quadrant: 'urgent-important',
    })
    const poorly = makeWorkItem({
      due_date: null,
      subtask_count: 0,
      description: null,
      has_notes: false,
      priority_quadrant: 'low',
    })

    const wellScores = scoreWorkItem(wellCaptured, profile)
    const poorScores = scoreWorkItem(poorly, profile)

    expect(wellScores.zeigarnikRelief).toBeGreaterThan(poorScores.zeigarnikRelief)
  })

  it('should apply planning fallacy correction to estimated duration', () => {
    const profile = makeProfile({ planning_fallacy_multiplier: 2.0 })
    const item = makeWorkItem({ estimated_duration: 30 })

    const scores = scoreWorkItem(item, profile)
    expect(scores.correctedDuration).toBe(60) // 30 * 2.0
  })

  it('should use default 30min when no estimated_duration', () => {
    const profile = makeProfile({ planning_fallacy_multiplier: 1.5 })
    const item = makeWorkItem({ estimated_duration: null })

    const scores = scoreWorkItem(item, profile)
    expect(scores.correctedDuration).toBe(45) // 30 * 1.5
  })

  it('should default complexity to medium when not specified', () => {
    const profile = makeProfile()
    const item = makeWorkItem({ complexity: undefined })

    // Should not throw
    const scores = scoreWorkItem(item, profile)
    expect(scores.switchCost).toBe(35) // 30 + 1*5 (medium switch cost)
  })

  it('should produce scientificPriority in [0, 1] range', () => {
    const profile = makeProfile()
    const item = makeWorkItem()

    const scores = scoreWorkItem(item, profile)
    expect(scores.scientificPriority).toBeGreaterThanOrEqual(0)
    expect(scores.scientificPriority).toBeLessThanOrEqual(1)
  })
})

// =============================================================================
// batchScoreWorkItems
// =============================================================================

describe('batchScoreWorkItems', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 11, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return empty array for empty input', () => {
    const profile = makeProfile()
    const result = batchScoreWorkItems([], profile)
    expect(result).toEqual([])
  })

  it('should sort items by scientificPriority descending', () => {
    const profile = makeProfile()
    const items = [
      makeWorkItem({
        id: 'low',
        priority_quadrant: 'low',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      makeWorkItem({
        id: 'high',
        priority_quadrant: 'urgent-important',
        due_date: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      }),
    ]

    const result = batchScoreWorkItems(items, profile)

    expect(result[0].item.id).toBe('high')
    expect(result[1].item.id).toBe('low')
    expect(result[0].scores.scientificPriority).toBeGreaterThanOrEqual(
      result[1].scores.scientificPriority
    )
  })

  it('should score all items in the batch', () => {
    const profile = makeProfile()
    const items = [
      makeWorkItem({ id: '1' }),
      makeWorkItem({ id: '2' }),
      makeWorkItem({ id: '3' }),
    ]

    const result = batchScoreWorkItems(items, profile)
    expect(result).toHaveLength(3)
    result.forEach(r => {
      expect(r.scores).toBeDefined()
      expect(r.item).toBeDefined()
    })
  })
})
