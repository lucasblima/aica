import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the module under test
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: vi.fn(() => ({
      select: (...args: unknown[]) => mockSelect(...args),
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

describe('grantsScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } } });
    // Default: select().eq() chain returns no projects
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: [], error: null });
  });

  describe('computeGrantsDomainScore', () => {
    it('returns null when no projects found', async () => {
      mockEq.mockResolvedValue({ data: [], error: null });

      const { computeGrantsDomainScore } = await import('../grantsScoring');
      const result = await computeGrantsDomainScore();

      expect(result).toBeNull();
    });

    it('returns null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { computeGrantsDomainScore } = await import('../grantsScoring');
      const result = await computeGrantsDomainScore();

      expect(result).toBeNull();
    });

    it('returns valid DomainScore with mock projects', async () => {
      const now = new Date();
      const projects = [
        { id: '1', status: 'active', updated_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
        { id: '2', status: 'active', updated_at: new Date(now.getTime() - 15 * 86400000).toISOString() },
        { id: '3', status: 'submitted', updated_at: new Date(now.getTime() - 45 * 86400000).toISOString() },
      ];

      mockEq.mockResolvedValue({ data: projects, error: null });

      const { computeGrantsDomainScore } = await import('../grantsScoring');
      const result = await computeGrantsDomainScore();

      expect(result).not.toBeNull();
      expect(result!.module).toBe('grants');
      expect(result!.label).toBe('Captação');
      expect(result!.normalized).toBeGreaterThanOrEqual(0);
      expect(result!.normalized).toBeLessThanOrEqual(1);
      expect(result!.raw).toBeGreaterThanOrEqual(0);
      expect(result!.raw).toBeLessThanOrEqual(100);
      expect(result!.confidence).toBeGreaterThan(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'declining']).toContain(result!.trend);
    });

    it('returns null on supabase error', async () => {
      mockEq.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      const { computeGrantsDomainScore } = await import('../grantsScoring');
      const result = await computeGrantsDomainScore();

      expect(result).toBeNull();
    });
  });

  describe('registerGrantsDomainProvider', () => {
    it('registers provider with the scoring engine', async () => {
      const { registerDomainProvider } = await import('@/services/scoring/scoringEngine');
      const { registerGrantsDomainProvider } = await import('../grantsScoring');

      registerGrantsDomainProvider();

      expect(registerDomainProvider).toHaveBeenCalledWith('grants', expect.any(Function));
    });
  });
});
