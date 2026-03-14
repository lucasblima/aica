import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the module under test
const mockGetUser = vi.fn();
const mockGte = vi.fn();

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: (...args: unknown[]) => mockGte(...args),
    })),
  },
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/services/scoring/scoringEngine', () => ({
  registerDomainProvider: vi.fn(),
}));

describe('journeyScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } } });
    // Default: no moments
    mockGte.mockResolvedValue({ data: [], error: null });
  });

  describe('computeJourneyDomainScore', () => {
    it('returns null when no moments found', async () => {
      mockGte.mockResolvedValue({ data: [], error: null });

      const { computeJourneyDomainScore } = await import('../journeyScoring');
      const result = await computeJourneyDomainScore();

      expect(result).toBeNull();
    });

    it('returns null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { computeJourneyDomainScore } = await import('../journeyScoring');
      const result = await computeJourneyDomainScore();

      expect(result).toBeNull();
    });

    it('returns valid DomainScore with mock moments', async () => {
      const now = new Date();
      const moments = [
        { id: '1', content: 'Today I reflected deeply on my goals and aspirations for the future and what matters most to me', emotion: 'happy', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
        { id: '2', content: 'Feeling grateful for the connections in my life', emotion: 'grateful', created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
        { id: '3', content: 'A challenging day but I learned something new about resilience and growth', emotion: 'reflective', created_at: new Date(now.getTime() - 7 * 86400000).toISOString() },
        { id: '4', content: 'Peaceful morning meditation brought clarity', emotion: 'calm', created_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
        { id: '5', content: 'Excited about the new project starting next week', emotion: 'excited', created_at: new Date(now.getTime() - 12 * 86400000).toISOString() },
        { id: '6', content: 'Simple day of rest', emotion: 'happy', created_at: new Date(now.getTime() - 20 * 86400000).toISOString() },
      ];

      mockGte.mockResolvedValue({ data: moments, error: null });

      const { computeJourneyDomainScore } = await import('../journeyScoring');
      const result = await computeJourneyDomainScore();

      expect(result).not.toBeNull();
      expect(result!.module).toBe('journey');
      expect(result!.label).toBe('Consciência');
      expect(result!.normalized).toBeGreaterThanOrEqual(0);
      expect(result!.normalized).toBeLessThanOrEqual(1);
      expect(result!.raw).toBeGreaterThanOrEqual(0);
      expect(result!.raw).toBeLessThanOrEqual(100);
      expect(result!.confidence).toBeGreaterThan(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'declining']).toContain(result!.trend);
    });

    it('returns correct trend when recent period has more moments', async () => {
      const now = new Date();
      // 4 moments in recent 15 days, 1 in older 15 days → improving
      const moments = [
        { id: '1', content: 'Recent reflection one', emotion: 'happy', created_at: new Date(now.getTime() - 1 * 86400000).toISOString() },
        { id: '2', content: 'Recent reflection two', emotion: 'grateful', created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
        { id: '3', content: 'Recent reflection three', emotion: 'calm', created_at: new Date(now.getTime() - 7 * 86400000).toISOString() },
        { id: '4', content: 'Recent reflection four', emotion: 'excited', created_at: new Date(now.getTime() - 12 * 86400000).toISOString() },
        { id: '5', content: 'Old reflection one', emotion: 'happy', created_at: new Date(now.getTime() - 20 * 86400000).toISOString() },
      ];

      mockGte.mockResolvedValue({ data: moments, error: null });

      const { computeJourneyDomainScore } = await import('../journeyScoring');
      const result = await computeJourneyDomainScore();

      expect(result).not.toBeNull();
      expect(result!.trend).toBe('improving');
    });
  });

  describe('registerJourneyDomainProvider', () => {
    it('registers provider with the scoring engine', async () => {
      const { registerDomainProvider } = await import('@/services/scoring/scoringEngine');
      const { registerJourneyDomainProvider } = await import('../journeyScoring');

      registerJourneyDomainProvider();

      expect(registerDomainProvider).toHaveBeenCalledWith('journey', expect.any(Function));
    });
  });
});
