/**
 * Unit Tests for guestScoring service
 *
 * Tests cover:
 * - scoreGuest: composite score calculation with weights (30/25/30/15)
 * - Tier classification (ideal/strong/good/consider)
 * - normalizeReach: log-scale normalization
 * - computeDiversity: diversity based on previous guests
 * - analyzeNarrativeArc: Peak-End Rule, hook strength, tension analysis
 * - computeDurationOptimality: Gaussian around 22 min
 * - computeStudioDomainScore: weighted combination
 * - Edge cases: perfect scores, zero scores, empty data
 *
 * @see src/modules/studio/services/guestScoring.ts
 */

import { describe, it, expect, vi } from 'vitest'

// Mock supabaseClient (imported by guestScoring for persistence functions)
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import {
  scoreGuest,
  normalizeReach,
  computeDiversity,
  analyzeNarrativeArc,
  computeDurationOptimality,
  computeStudioDomainScore,
  type GuestProfile,
  type NarrativeMoment,
} from '../guestScoring'

describe('guestScoring', () => {
  // ==========================================================================
  // scoreGuest — Composite Score
  // ==========================================================================

  describe('scoreGuest', () => {
    it('should compute composite score with correct weights (30/25/30/15)', () => {
      const profile: GuestProfile = {
        name: 'Test Guest',
        expertise: 0.8,
        reach: 0.6,
        relevance: 0.9,
        diversity: 0.7,
      }

      const result = scoreGuest(profile)

      // 0.30*0.8 + 0.25*0.6 + 0.30*0.9 + 0.15*0.7 = 0.24 + 0.15 + 0.27 + 0.105 = 0.765
      expect(result.composite).toBeCloseTo(0.765, 3)
      expect(result.components.expertise).toBe(0.8)
      expect(result.components.reach).toBe(0.6)
      expect(result.components.relevance).toBe(0.9)
      expect(result.components.diversity).toBe(0.7)
    })

    it('should classify as "ideal" when composite >= 0.85', () => {
      const profile: GuestProfile = {
        name: 'Ideal Guest',
        expertise: 1.0,
        reach: 0.8,
        relevance: 0.9,
        diversity: 0.7,
      }

      const result = scoreGuest(profile)

      // 0.30*1.0 + 0.25*0.8 + 0.30*0.9 + 0.15*0.7 = 0.30 + 0.20 + 0.27 + 0.105 = 0.875
      expect(result.composite).toBeCloseTo(0.875, 3)
      expect(result.tier).toBe('ideal')
      expect(result.recommendation).toContain('ideal')
    })

    it('should classify as "strong" when composite >= 0.70 and < 0.85', () => {
      const profile: GuestProfile = {
        name: 'Strong Guest',
        expertise: 0.8,
        reach: 0.6,
        relevance: 0.9,
        diversity: 0.5,
      }

      const result = scoreGuest(profile)

      // 0.30*0.8 + 0.25*0.6 + 0.30*0.9 + 0.15*0.5 = 0.24 + 0.15 + 0.27 + 0.075 = 0.735
      expect(result.composite).toBeCloseTo(0.735, 3)
      expect(result.tier).toBe('strong')
      expect(result.recommendation).toContain('forte')
    })

    it('should classify as "good" when composite >= 0.50 and < 0.70', () => {
      const profile: GuestProfile = {
        name: 'Good Guest',
        expertise: 0.5,
        reach: 0.5,
        relevance: 0.6,
        diversity: 0.5,
      }

      const result = scoreGuest(profile)

      // 0.30*0.5 + 0.25*0.5 + 0.30*0.6 + 0.15*0.5 = 0.15 + 0.125 + 0.18 + 0.075 = 0.53
      expect(result.composite).toBeCloseTo(0.53, 3)
      expect(result.tier).toBe('good')
      expect(result.recommendation).toContain('adequado')
    })

    it('should classify as "consider" when composite < 0.50', () => {
      const profile: GuestProfile = {
        name: 'Weak Guest',
        expertise: 0.2,
        reach: 0.1,
        relevance: 0.3,
        diversity: 0.2,
      }

      const result = scoreGuest(profile)

      // 0.30*0.2 + 0.25*0.1 + 0.30*0.3 + 0.15*0.2 = 0.06 + 0.025 + 0.09 + 0.03 = 0.205
      expect(result.composite).toBeCloseTo(0.205, 3)
      expect(result.tier).toBe('consider')
      expect(result.recommendation).toContain('Avalie')
    })

    it('should handle perfect scores (all 1.0)', () => {
      const profile: GuestProfile = {
        name: 'Perfect Guest',
        expertise: 1.0,
        reach: 1.0,
        relevance: 1.0,
        diversity: 1.0,
      }

      const result = scoreGuest(profile)

      // 0.30 + 0.25 + 0.30 + 0.15 = 1.0
      expect(result.composite).toBeCloseTo(1.0, 3)
      expect(result.tier).toBe('ideal')
    })

    it('should handle zero scores (all 0.0)', () => {
      const profile: GuestProfile = {
        name: 'Zero Guest',
        expertise: 0.0,
        reach: 0.0,
        relevance: 0.0,
        diversity: 0.0,
      }

      const result = scoreGuest(profile)

      expect(result.composite).toBe(0)
      expect(result.tier).toBe('consider')
    })
  })

  // ==========================================================================
  // normalizeReach
  // ==========================================================================

  describe('normalizeReach', () => {
    it('should return 0 for zero followers', () => {
      expect(normalizeReach(0)).toBe(0)
    })

    it('should return 0 for negative followers', () => {
      expect(normalizeReach(-100)).toBe(0)
    })

    it('should normalize 1K followers to ~0.43', () => {
      // log10(1000) = 3, 3/7 ≈ 0.4286
      expect(normalizeReach(1000)).toBeCloseTo(3 / 7, 2)
    })

    it('should normalize 10K followers to ~0.57', () => {
      // log10(10000) = 4, 4/7 ≈ 0.5714
      expect(normalizeReach(10_000)).toBeCloseTo(4 / 7, 2)
    })

    it('should normalize 1M followers to ~0.86', () => {
      // log10(1000000) = 6, 6/7 ≈ 0.8571
      expect(normalizeReach(1_000_000)).toBeCloseTo(6 / 7, 2)
    })

    it('should cap at 1.0 for 10M+ followers', () => {
      // log10(10000000) = 7, 7/7 = 1.0
      expect(normalizeReach(10_000_000)).toBe(1.0)
      expect(normalizeReach(100_000_000)).toBe(1.0)
    })

    it('should handle 1 follower correctly', () => {
      // log10(1) = 0, 0/7 = 0
      expect(normalizeReach(1)).toBe(0)
    })
  })

  // ==========================================================================
  // computeDiversity
  // ==========================================================================

  describe('computeDiversity', () => {
    it('should return 0.8 for first guest (no previous guests)', () => {
      expect(computeDiversity('Engineering', [])).toBe(0.8)
    })

    it('should return high diversity when field is unique', () => {
      const previous = ['Engineering', 'Medicine', 'Law']
      const diversity = computeDiversity('Art', previous)

      // 0 same field out of 3, ratio = 1.0
      expect(diversity).toBe(1.0)
    })

    it('should return lower diversity when field is common', () => {
      const previous = ['Engineering', 'Engineering', 'Medicine']
      const diversity = computeDiversity('Engineering', previous)

      // 2 same out of 3, ratio = 1 - 2/3 = 0.3333
      expect(diversity).toBeCloseTo(0.333, 2)
    })

    it('should return minimum 0.1 when all previous guests are same field', () => {
      const previous = ['Engineering', 'Engineering', 'Engineering']
      const diversity = computeDiversity('Engineering', previous)

      // 3 same out of 3, ratio = 0 -> clamped to 0.1
      expect(diversity).toBe(0.1)
    })

    it('should be case-insensitive', () => {
      const previous = ['engineering', 'ENGINEERING']
      const diversity = computeDiversity('Engineering', previous)

      // 2 same out of 2, ratio = 0 -> clamped to 0.1
      expect(diversity).toBe(0.1)
    })
  })

  // ==========================================================================
  // analyzeNarrativeArc
  // ==========================================================================

  describe('analyzeNarrativeArc', () => {
    it('should return default analysis for empty moments array', () => {
      const result = analyzeNarrativeArc([], 30)

      expect(result.tensionScore).toBe(0)
      expect(result.peakMoment).toBeNull()
      expect(result.endMoment).toBeNull()
      expect(result.arc).toEqual([])
      expect(result.peakEndScore).toBe(0)
      expect(result.hookStrength).toBe(0)
      expect(result.suggestions).toHaveLength(1)
      expect(result.suggestions[0]).toContain('marcadores')
    })

    it('should compute Peak-End score as average of peak and end tension', () => {
      const moments: NarrativeMoment[] = [
        { timestamp: 5, label: 'Hook', tension: 0.6, type: 'hook' },
        { timestamp: 15, label: 'Build', tension: 0.5, type: 'build' },
        { timestamp: 25, label: 'Peak', tension: 0.9, type: 'peak' },
        { timestamp: 30, label: 'End', tension: 0.7, type: 'end' },
      ]

      const result = analyzeNarrativeArc(moments, 30)

      // peakEndScore = 0.5 * peak(0.9) + 0.5 * end(0.7) = 0.45 + 0.35 = 0.80
      expect(result.peakEndScore).toBeCloseTo(0.8, 2)
      expect(result.peakMoment?.tension).toBe(0.9)
      expect(result.endMoment?.tension).toBe(0.7)
    })

    it('should measure hook strength from first 5 minutes', () => {
      const moments: NarrativeMoment[] = [
        { timestamp: 2, label: 'Strong Hook', tension: 0.8, type: 'hook' },
        { timestamp: 4, label: 'Still Hook', tension: 0.6, type: 'hook' },
        { timestamp: 10, label: 'Main', tension: 0.5, type: 'build' },
        { timestamp: 20, label: 'Peak', tension: 0.9, type: 'peak' },
      ]

      const result = analyzeNarrativeArc(moments, 25)

      // hookStrength = max tension in first 5 min = 0.8
      expect(result.hookStrength).toBe(0.8)
    })

    it('should report zero hook strength when no moments in first 5 minutes', () => {
      const moments: NarrativeMoment[] = [
        { timestamp: 10, label: 'Late start', tension: 0.7, type: 'build' },
        { timestamp: 20, label: 'Peak', tension: 0.9, type: 'peak' },
      ]

      const result = analyzeNarrativeArc(moments, 25)

      expect(result.hookStrength).toBe(0)
    })

    it('should suggest improvements for weak hook', () => {
      const moments: NarrativeMoment[] = [
        { timestamp: 3, label: 'Weak hook', tension: 0.3, type: 'hook' },
        { timestamp: 15, label: 'Peak', tension: 0.8, type: 'peak' },
        { timestamp: 25, label: 'End', tension: 0.6, type: 'end' },
      ]

      const result = analyzeNarrativeArc(moments, 30)

      expect(result.suggestions.some(s => s.includes('gancho inicial'))).toBe(true)
    })

    it('should suggest improvements for weak ending', () => {
      const moments: NarrativeMoment[] = [
        { timestamp: 3, label: 'Hook', tension: 0.7, type: 'hook' },
        { timestamp: 15, label: 'Peak', tension: 0.9, type: 'peak' },
        { timestamp: 25, label: 'Weak End', tension: 0.2, type: 'end' },
      ]

      const result = analyzeNarrativeArc(moments, 30)

      expect(result.suggestions.some(s => s.includes('Peak-End Rule'))).toBe(true)
    })

    it('should sort moments by timestamp', () => {
      const moments: NarrativeMoment[] = [
        { timestamp: 20, label: 'Late', tension: 0.5, type: 'resolution' },
        { timestamp: 5, label: 'Early', tension: 0.7, type: 'hook' },
        { timestamp: 10, label: 'Mid', tension: 0.9, type: 'peak' },
      ]

      const result = analyzeNarrativeArc(moments, 25)

      expect(result.arc[0].timestamp).toBe(5)
      expect(result.arc[1].timestamp).toBe(10)
      expect(result.arc[2].timestamp).toBe(20)
    })

    it('should warn about long episodes (>45 min)', () => {
      const moments: NarrativeMoment[] = [
        { timestamp: 5, label: 'Hook', tension: 0.7, type: 'hook' },
        { timestamp: 40, label: 'Peak', tension: 0.9, type: 'peak' },
        { timestamp: 50, label: 'End', tension: 0.6, type: 'end' },
      ]

      const result = analyzeNarrativeArc(moments, 50)

      expect(result.suggestions.some(s => s.includes('>45 min'))).toBe(true)
    })
  })

  // ==========================================================================
  // computeDurationOptimality
  // ==========================================================================

  describe('computeDurationOptimality', () => {
    it('should return peak optimality at 22 minutes (optimal duration)', () => {
      const result = computeDurationOptimality(22)
      // Gaussian peak at mean = 1.0
      expect(result).toBeCloseTo(1.0, 3)
    })

    it('should return 0 for zero duration', () => {
      expect(computeDurationOptimality(0)).toBe(0)
    })

    it('should return 0 for negative duration', () => {
      expect(computeDurationOptimality(-10)).toBe(0)
    })

    it('should decrease for durations far from 22 minutes', () => {
      const at22 = computeDurationOptimality(22)
      const at60 = computeDurationOptimality(60)
      const at120 = computeDurationOptimality(120)

      expect(at22).toBeGreaterThan(at60)
      expect(at60).toBeGreaterThan(at120)
    })

    it('should be symmetric around 22 minutes', () => {
      // 22 - 10 = 12, 22 + 10 = 32
      const below = computeDurationOptimality(12)
      const above = computeDurationOptimality(32)

      expect(below).toBeCloseTo(above, 3)
    })
  })

  // ==========================================================================
  // computeStudioDomainScore
  // ==========================================================================

  describe('computeStudioDomainScore', () => {
    it('should compute weighted average (35/35/30)', () => {
      const result = computeStudioDomainScore(0.8, 0.7, 0.6)

      // 0.35*0.8 + 0.35*0.7 + 0.30*0.6 = 0.28 + 0.245 + 0.18 = 0.705
      expect(result).toBeCloseTo(0.705, 3)
    })

    it('should return 1.0 for perfect scores', () => {
      const result = computeStudioDomainScore(1.0, 1.0, 1.0)

      // 0.35 + 0.35 + 0.30 = 1.0
      expect(result).toBeCloseTo(1.0, 3)
    })

    it('should return 0 for zero scores', () => {
      const result = computeStudioDomainScore(0, 0, 0)

      expect(result).toBe(0)
    })
  })
})
