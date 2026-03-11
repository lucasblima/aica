/**
 * useLeaveTraining Hook Tests
 *
 * Run with:
 *   npx vitest run src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeaveTraining } from '../useLeaveTraining';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUnlinkSelf = vi.fn();
vi.mock('../../services/athleteService', () => ({
  AthleteService: {
    unlinkSelf: () => mockUnlinkSelf(),
  },
}));

const mockDeleteCalendarEvent = vi.fn();
vi.mock('@/services/googleCalendarWriteService', () => ({
  deleteCalendarEvent: (...args: unknown[]) => mockDeleteCalendarEvent(...args),
}));

describe('useLeaveTraining', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with isLeaving=false, showConfirm=false, error=null', () => {
    const { result } = renderHook(() => useLeaveTraining());

    expect(result.current.isLeaving).toBe(false);
    expect(result.current.showConfirm).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('requestLeave opens confirmation', () => {
    const { result } = renderHook(() => useLeaveTraining());

    act(() => result.current.requestLeave());

    expect(result.current.showConfirm).toBe(true);
  });

  it('cancelLeave closes confirmation and clears error', () => {
    const { result } = renderHook(() => useLeaveTraining());

    act(() => result.current.requestLeave());
    act(() => result.current.cancelLeave());

    expect(result.current.showConfirm).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('confirmLeave calls unlinkSelf, deletes Google events, and navigates', async () => {
    mockUnlinkSelf.mockResolvedValue({ googleEventIds: ['evt_1', 'evt_2'], error: null });
    mockDeleteCalendarEvent.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLeaveTraining());

    await act(async () => {
      await result.current.confirmLeave();
    });

    expect(mockUnlinkSelf).toHaveBeenCalled();
    expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('evt_1');
    expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('evt_2');
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(result.current.isLeaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('confirmLeave navigates even if Google Calendar delete fails', async () => {
    mockUnlinkSelf.mockResolvedValue({ googleEventIds: ['evt_1'], error: null });
    mockDeleteCalendarEvent.mockRejectedValue(new Error('No access'));
    const { result } = renderHook(() => useLeaveTraining());

    await act(async () => {
      await result.current.confirmLeave();
    });

    expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('evt_1');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('confirmLeave sets error on failure and does NOT navigate', async () => {
    mockUnlinkSelf.mockResolvedValue({ googleEventIds: [], error: new Error('fail') });
    const { result } = renderHook(() => useLeaveTraining());

    await act(async () => {
      await result.current.confirmLeave();
    });

    expect(result.current.error).toBe('Erro ao sair do treino. Tente novamente.');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.current.isLeaving).toBe(false);
    expect(result.current.showConfirm).toBe(true);
  });
});
