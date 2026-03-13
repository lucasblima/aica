import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/flux/services/athleteCalendarSyncService', () => ({
  syncSlotsToAthleteCalendar: vi.fn().mockResolvedValue({ synced: 3, skipped: 0 }),
}));

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 's1', name: 'Run', day_of_week: 1, week_number: 1, start_time: '08:00', duration: 60, modality: 'corrida', intensity: 'moderate' },
            { id: 's2', name: 'Swim', day_of_week: 3, week_number: 1, start_time: '10:00', duration: 45, modality: 'natacao', intensity: 'light' },
          ],
          error: null,
        }),
      })),
    })),
    auth: { getUser: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../../services/calendarSyncTransforms', () => ({
  fluxSlotToGoogleEvent: vi.fn().mockReturnValue({
    summary: 'Treino',
    description: '',
    start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' },
    end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' },
  }),
}));

import { syncSlotsToAthleteCalendar } from '@/modules/flux/services/athleteCalendarSyncService';

describe('useCalendarSync - bulkSyncFlux', () => {
  beforeEach(() => vi.clearAllMocks());

  it('syncSlotsToAthleteCalendar is mockable and returns expected result', async () => {
    const result = await syncSlotsToAthleteCalendar('athlete-1', [
      { slotId: 's1', action: 'sync' as const, eventData: { summary: 'T', description: '', start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' }, end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' } } },
    ]);
    expect(result).toEqual({ synced: 3, skipped: 0 });
  });

  it('passes athleteId to syncSlotsToAthleteCalendar', async () => {
    await syncSlotsToAthleteCalendar('athlete-42', [{ slotId: 's1', action: 'delete' as const }]);
    expect(syncSlotsToAthleteCalendar).toHaveBeenCalledWith('athlete-42', expect.any(Array));
  });
});
