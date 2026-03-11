/**
 * AthleteService.unlinkSelf() Tests
 *
 * Run with:
 *   npx vitest run src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/services/supabaseClient', () => {
  const mockRpc = vi.fn();

  return {
    supabase: {
      rpc: mockRpc,
      // Stubs required by athleteService module-level imports
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn() })) })),
      auth: { getUser: vi.fn() },
    },
    __mocks: { mockRpc },
  };
});

// Mock platformContactService (imported by athleteService)
vi.mock('@/services/platformContactService', () => ({
  findOrCreateContact: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = await vi.importMock<any>('@/services/supabaseClient');
const { mockRpc } = __mocks;

// Must import AFTER mock setup
import { AthleteService } from '../athleteService';

describe('AthleteService.unlinkSelf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls athlete_unlink_self RPC and returns google event IDs on success', async () => {
    mockRpc.mockResolvedValue({
      data: [{ google_event_id: 'evt_1' }, { google_event_id: 'evt_2' }],
      error: null,
    });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBeNull();
    expect(result.googleEventIds).toEqual(['evt_1', 'evt_2']);
    expect(mockRpc).toHaveBeenCalledWith('athlete_unlink_self');
  });

  it('returns empty googleEventIds when RPC returns no data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBeNull();
    expect(result.googleEventIds).toEqual([]);
  });

  it('returns error from RPC on failure', async () => {
    const rpcError = { message: 'No athlete record found', code: 'P0001' };
    mockRpc.mockResolvedValue({ data: null, error: rpcError });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBe(rpcError);
    expect(result.googleEventIds).toEqual([]);
  });

  it('catches thrown exceptions and returns error', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'));

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('Network error');
    expect(result.googleEventIds).toEqual([]);
  });
});
