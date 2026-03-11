/**
 * AthleteService.unlinkSelf() Tests
 *
 * Run with:
 *   npx vitest run src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';

// Mock supabase
vi.mock('@/services/supabaseClient', () => {
  const mockEq = vi.fn();
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockGetUser = vi.fn();

  return {
    supabase: {
      from: vi.fn(() => ({
        update: mockUpdate,
      })),
      auth: {
        getUser: mockGetUser,
      },
    },
    __mocks: { mockUpdate, mockEq, mockGetUser },
  };
});

// Mock platformContactService (imported by athleteService)
vi.mock('@/services/platformContactService', () => ({
  findOrCreateContact: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = await vi.importMock<any>('@/services/supabaseClient');
const { mockUpdate, mockEq, mockGetUser } = __mocks;

// Must import AFTER mock setup
import { AthleteService } from '../athleteService';

describe('AthleteService.unlinkSelf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });

  it('updates athlete with auth_user_id=null, invitation_status=none, status=churned', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: null,
        invitation_status: 'none',
        status: 'churned',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'user-123');
  });

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns error from supabase on failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    const dbError = new Error('RLS policy violation');
    mockEq.mockResolvedValue({ error: dbError });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBe(dbError);
  });
});
