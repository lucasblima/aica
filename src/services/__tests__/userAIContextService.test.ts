import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: 'Test User' }, error: null }),
    })),
  },
}));

vi.mock('@/services/googleCalendarService', () => ({
  fetchCalendarEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/scoring/scoringEngine', () => ({
  computeAndStoreLifeScore: vi.fn().mockResolvedValue({
    composite: 0.72,
    domainScores: { atlas: 0.8, journey: 0.65, flux: 0.7 },
    trend: 'improving',
    spiralAlert: false,
    spiralDomains: [],
  }),
}));

describe('UserAIContext lifeScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include lifeScore field in context', async () => {
    const { getUserAIContext, invalidateAIContext } = await import('../userAIContextService');
    invalidateAIContext();
    const context = await getUserAIContext(true);
    expect(context).toHaveProperty('lifeScore');
  });

  it('should have correct lifeScore shape with scores as 0-100', async () => {
    const { getUserAIContext, invalidateAIContext } = await import('../userAIContextService');
    invalidateAIContext();
    const context = await getUserAIContext(true);
    expect(context).not.toBeNull();
    expect(context!.lifeScore).toEqual({
      overall: 72,
      domains: { atlas: 80, journey: 65, flux: 70 },
      trend: 'improving',
      spiralAlert: false,
    });
  });

  it('should set lifeScore to null when computeAndStoreLifeScore returns null', async () => {
    const { computeAndStoreLifeScore } = await import('@/services/scoring/scoringEngine');
    vi.mocked(computeAndStoreLifeScore).mockResolvedValueOnce(null);

    const { getUserAIContext, invalidateAIContext } = await import('../userAIContextService');
    invalidateAIContext();
    const context = await getUserAIContext(true);
    expect(context).not.toBeNull();
    expect(context!.lifeScore).toBeNull();
  });

  it('should set lifeScore to null when computeAndStoreLifeScore throws', async () => {
    const { computeAndStoreLifeScore } = await import('@/services/scoring/scoringEngine');
    vi.mocked(computeAndStoreLifeScore).mockRejectedValueOnce(new Error('Network error'));

    const { getUserAIContext, invalidateAIContext } = await import('../userAIContextService');
    invalidateAIContext();
    const context = await getUserAIContext(true);
    expect(context).not.toBeNull();
    expect(context!.lifeScore).toBeNull();
  });
});
