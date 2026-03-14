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

describe('studioScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } } });
    // Default: no episodes
    mockGte.mockResolvedValue({ data: [], error: null });
  });

  describe('computeStudioDomainScore', () => {
    it('returns null when no published episodes found', async () => {
      mockGte.mockResolvedValue({ data: [], error: null });

      const { computeStudioDomainScore } = await import('../studioScoring');
      const result = await computeStudioDomainScore();

      expect(result).toBeNull();
    });

    it('returns null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { computeStudioDomainScore } = await import('../studioScoring');
      const result = await computeStudioDomainScore();

      expect(result).toBeNull();
    });

    it('returns valid DomainScore with mock published episodes', async () => {
      const now = new Date();
      const episodes = [
        { id: '1', status: 'published', created_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
        { id: '2', status: 'published', created_at: new Date(now.getTime() - 40 * 86400000).toISOString() },
        { id: '3', status: 'published', created_at: new Date(now.getTime() - 70 * 86400000).toISOString() },
      ];

      mockGte.mockResolvedValue({ data: episodes, error: null });

      const { computeStudioDomainScore } = await import('../studioScoring');
      const result = await computeStudioDomainScore();

      expect(result).not.toBeNull();
      expect(result!.module).toBe('studio');
      expect(result!.label).toBe('Criatividade');
      expect(result!.normalized).toBeGreaterThanOrEqual(0);
      expect(result!.normalized).toBeLessThanOrEqual(1);
      expect(result!.raw).toBeGreaterThanOrEqual(0);
      expect(result!.raw).toBeLessThanOrEqual(100);
      expect(result!.confidence).toBeGreaterThan(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'declining']).toContain(result!.trend);
    });

    it('returns null on supabase error', async () => {
      mockGte.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      const { computeStudioDomainScore } = await import('../studioScoring');
      const result = await computeStudioDomainScore();

      expect(result).toBeNull();
    });
  });

  describe('registerStudioDomainProvider', () => {
    it('registers provider with the scoring engine', async () => {
      const { registerDomainProvider } = await import('@/services/scoring/scoringEngine');
      const { registerStudioDomainProvider } = await import('../studioScoring');

      registerStudioDomainProvider();

      expect(registerDomainProvider).toHaveBeenCalledWith('studio', expect.any(Function));
    });
  });
});
