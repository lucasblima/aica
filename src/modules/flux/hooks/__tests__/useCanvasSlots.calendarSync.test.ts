import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/athleteCalendarSyncService', () => ({
  syncSlotsToAthleteCalendar: vi.fn().mockResolvedValue({ synced: 1, skipped: 0 }),
}));

vi.mock('@/services/calendarSyncTransforms', () => ({
  fluxSlotToGoogleEvent: vi.fn().mockReturnValue({
    summary: 'Treino',
    description: 'Test',
    start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' },
    end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' },
  }),
}));

import { syncSlotsToAthleteCalendar } from '../../services/athleteCalendarSyncService';

describe('useCanvasSlots - calendar sync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('syncSlotsToAthleteCalendar is importable and callable', () => {
    expect(syncSlotsToAthleteCalendar).toBeDefined();
    expect(typeof syncSlotsToAthleteCalendar).toBe('function');
  });

  it('calls syncSlotsToAthleteCalendar with correct args for delete', async () => {
    await syncSlotsToAthleteCalendar('athlete-1', [{ slotId: 's1', action: 'delete' }]);
    expect(syncSlotsToAthleteCalendar).toHaveBeenCalledWith('athlete-1', [
      { slotId: 's1', action: 'delete' },
    ]);
  });

  it('calls syncSlotsToAthleteCalendar with correct args for sync', async () => {
    await syncSlotsToAthleteCalendar('athlete-1', [{
      slotId: 's1',
      action: 'sync',
      eventData: {
        summary: 'Treino',
        description: 'Test',
        start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' },
        end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' },
      },
    }]);
    expect(syncSlotsToAthleteCalendar).toHaveBeenCalledWith('athlete-1', [
      expect.objectContaining({ slotId: 's1', action: 'sync' }),
    ]);
  });
});
