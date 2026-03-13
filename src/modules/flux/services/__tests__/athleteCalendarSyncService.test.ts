import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => {
  const mockInvoke = vi.fn();
  return {
    supabase: {
      functions: { invoke: mockInvoke },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn() })) })),
      auth: { getUser: vi.fn() },
    },
    __mocks: { mockInvoke },
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = await vi.importMock<any>('@/services/supabaseClient');
const { mockInvoke } = __mocks;

import { syncSlotsToAthleteCalendar } from '../athleteCalendarSyncService';

describe('syncSlotsToAthleteCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invokes Edge Function with correct payload', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, synced: 1, skipped: 0 },
      error: null,
    });

    const result = await syncSlotsToAthleteCalendar('athlete-123', [
      {
        slotId: 'slot-1',
        action: 'sync' as const,
        eventData: {
          summary: 'Treino',
          description: 'Test',
          start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' },
          end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' },
        },
      },
    ]);

    expect(mockInvoke).toHaveBeenCalledWith('sync-slot-to-athlete-calendar', {
      body: {
        athleteId: 'athlete-123',
        slots: [expect.objectContaining({ slotId: 'slot-1', action: 'sync' })],
      },
    });
    expect(result).toEqual({ synced: 1, skipped: 0 });
  });

  it('returns zero counts when Edge Function returns no_token', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, synced: 0, reason: 'no_token' },
      error: null,
    });

    const result = await syncSlotsToAthleteCalendar('athlete-123', [
      { slotId: 'slot-1', action: 'delete' as const },
    ]);

    expect(result).toEqual({ synced: 0, skipped: 0 });
  });

  it('throws on Edge Function error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    });

    await expect(
      syncSlotsToAthleteCalendar('athlete-123', [{ slotId: 's1', action: 'sync' as const }])
    ).rejects.toThrow();
  });
});
