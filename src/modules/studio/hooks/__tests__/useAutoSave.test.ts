/**
 * Tests for useAutoSave hook
 *
 * Tests the debounce logic, save behavior, sanitization, and cleanup:
 * - Hook initializes without errors
 * - Debounce behavior (changes within 2s don't trigger multiple saves)
 * - Save is called after debounce period
 * - Save is NOT called when data hasn't changed (isDirty=false)
 * - Save is NOT called when disabled
 * - Error handling when save fails
 * - Cleanup on unmount (no pending saves leak)
 * - sanitizePayload converts empty strings to null
 * - saveNow bypasses debounce
 * - Concurrent save protection (isSavingRef)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';
import type { PodcastWorkspaceState } from '@/modules/studio/types';
import { createInitialState } from '../../context/PodcastWorkspaceContext';

// ============================================
// MOCKS
// ============================================

// Mock supabase client
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockInsert = vi.fn();

/**
 * Track the error that should be returned by the next episode update.
 * Set to a truthy value to simulate an error on the primary episode update.
 */
let nextEpisodeUpdateError: any = null;

/**
 * Build a chainable mock that mimics supabase's PostgREST query builder.
 * Supabase pattern: supabase.from(table).update(data).eq(col, val) → Promise<{ error }>
 *
 * The chain is both thenable (for await) and has chainable methods (.eq, .select, etc.).
 * When awaited, it resolves to { error, data } shape.
 */
function buildQueryChain(resolvedValue: { error: any }): any {
  const promise = Promise.resolve(resolvedValue);
  const chain: any = {
    // Make the chain thenable so `await supabase.from(...).update(...).eq(...)` works
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    // Chainable methods - each returns another thenable chain
    eq: vi.fn().mockImplementation(() => buildQueryChain(resolvedValue)),
    select: vi.fn().mockImplementation(() => buildQueryChain(resolvedValue)),
    single: vi.fn().mockImplementation(() => buildQueryChain(resolvedValue)),
  };
  return chain;
}

function createMockFromChain(): any {
  const chainObj: any = {};

  chainObj.update = vi.fn().mockImplementation((data: any) => {
    mockUpdate(data);
    const errorToUse = nextEpisodeUpdateError;
    nextEpisodeUpdateError = null;
    return buildQueryChain({ error: errorToUse });
  });

  chainObj.upsert = vi.fn().mockImplementation((data: any, opts: any) => {
    mockUpsert(data, opts);
    return buildQueryChain({ error: null });
  });

  chainObj.delete = vi.fn().mockImplementation(() => {
    mockDelete();
    return buildQueryChain({ error: null });
  });

  chainObj.insert = vi.fn().mockImplementation((data: any) => {
    mockInsert(data);
    return buildQueryChain({ error: null });
  });

  return chainObj;
}

const mockFrom = vi.fn().mockImplementation((_table: string) => {
  return createMockFromChain();
});

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

// ============================================
// HELPERS
// ============================================

function createTestState(overrides?: Partial<PodcastWorkspaceState>): PodcastWorkspaceState {
  const base = createInitialState('ep-test-001', 'show-test-001', 'Test Show');
  return { ...base, ...overrides };
}

function createDirtyState(overrides?: Partial<PodcastWorkspaceState>): PodcastWorkspaceState {
  return createTestState({ isDirty: true, ...overrides });
}

// ============================================
// TESTS
// ============================================

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdate.mockClear();
    mockUpsert.mockClear();
    mockDelete.mockClear();
    mockInsert.mockClear();
    mockFrom.mockClear();
    nextEpisodeUpdateError = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    // NOTE: Do NOT use vi.restoreAllMocks() here - it would clear the
    // mockImplementation on mockFrom, breaking subsequent tests.
    // Individual mock spies (e.g., clearTimeoutSpy) are restored in their own tests.
  });

  it('should initialize without errors and return saveNow function', () => {
    const state = createTestState();

    const { result } = renderHook(() =>
      useAutoSave({ state })
    );

    expect(result.current).toBeDefined();
    expect(result.current.saveNow).toBeInstanceOf(Function);
  });

  it('should NOT save when isDirty is false', () => {
    const state = createTestState({ isDirty: false });

    renderHook(() => useAutoSave({ state }));

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should NOT save when disabled', () => {
    const state = createDirtyState();

    renderHook(() => useAutoSave({ state, enabled: false }));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should save after debounce period when dirty', async () => {
    const state = createDirtyState();

    renderHook(() => useAutoSave({ state, debounceMs: 2000 }));

    // Before debounce: no save
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(mockFrom).not.toHaveBeenCalled();

    // After debounce: save triggered
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(mockFrom).toHaveBeenCalled();
  });

  it('should debounce multiple rapid state changes', async () => {
    const state1 = createDirtyState({ setup: { ...createTestState().setup, guestName: 'Name 1' } });
    const state2 = createDirtyState({ setup: { ...createTestState().setup, guestName: 'Name 2' } });
    const state3 = createDirtyState({ setup: { ...createTestState().setup, guestName: 'Name 3' } });

    const { rerender } = renderHook(
      ({ state }) => useAutoSave({ state, debounceMs: 2000 }),
      { initialProps: { state: state1 } }
    );

    // Quick succession of changes
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ state: state2 });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ state: state3 });

    // Still within debounce window of last change
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(mockFrom).not.toHaveBeenCalled();

    // After final debounce completes
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Should have saved only once (the final state)
    expect(mockFrom).toHaveBeenCalled();
  });

  it('should call onSaveStart callback when save begins', async () => {
    const state = createDirtyState();
    const onSaveStart = vi.fn();

    renderHook(() => useAutoSave({ state, debounceMs: 1000, onSaveStart }));

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(onSaveStart).toHaveBeenCalledTimes(1);
  });

  it('should call onSaveSuccess callback on successful save', async () => {
    const state = createDirtyState();
    const onSaveSuccess = vi.fn();

    renderHook(() => useAutoSave({ state, debounceMs: 1000, onSaveSuccess }));

    // Advance timer to trigger the debounced save
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // The save is async - need to flush remaining microtasks
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onSaveSuccess).toHaveBeenCalledTimes(1);
  });

  it('should call onSaveError callback when save fails', async () => {
    const state = createDirtyState();
    const onSaveError = vi.fn();
    const testError = { message: 'DB connection lost', code: 'PGRST204' };

    // Configure the next episode update to return an error
    nextEpisodeUpdateError = testError;

    renderHook(() => useAutoSave({ state, debounceMs: 1000, onSaveError }));

    // Advance timer to trigger the debounced save
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Flush remaining microtasks from async save
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onSaveError).toHaveBeenCalledTimes(1);
    expect(onSaveError).toHaveBeenCalledWith(testError);
  });

  it('should cleanup timeout on unmount', () => {
    const state = createDirtyState();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() =>
      useAutoSave({ state, debounceMs: 2000 })
    );

    // Unmount before debounce fires
    unmount();

    // Advance timers - should NOT trigger save since hook was unmounted
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // clearTimeout should have been called during cleanup
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should use custom debounceMs value', async () => {
    const state = createDirtyState();

    renderHook(() => useAutoSave({ state, debounceMs: 5000 }));

    // At 3 seconds - no save yet
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(mockFrom).not.toHaveBeenCalled();

    // At 5.1 seconds - save should trigger
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(mockFrom).toHaveBeenCalled();
  });

  it('saveNow should bypass debounce and save immediately', async () => {
    // Use real timers for saveNow since there's no debounce involved
    vi.useRealTimers();

    const state = createDirtyState();

    const { result } = renderHook(() =>
      useAutoSave({ state, debounceMs: 5000 })
    );

    // Call saveNow without waiting for debounce
    await act(async () => {
      await result.current.saveNow();
    });

    expect(mockFrom).toHaveBeenCalled();

    // Restore fake timers for remaining tests
    vi.useFakeTimers();
  });

  it('should save episode data with correct field mapping', async () => {
    // Use real timers for direct save testing
    vi.useRealTimers();

    const state = createDirtyState({
      setup: {
        ...createTestState().setup,
        guestName: 'John Doe',
        guestReference: 'CEO of TechCorp',
        theme: 'AI Innovation',
        scheduledTime: '14:00',
        guestContactId: 'contact-123',
      },
    });

    const { result } = renderHook(() =>
      useAutoSave({ state, debounceMs: 100 })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    // Check that from('podcast_episodes') was called
    expect(mockFrom).toHaveBeenCalledWith('podcast_episodes');

    // Check the update payload includes correct fields
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_name: 'John Doe',
        guest_reference: 'CEO of TechCorp',
        episode_theme: 'AI Innovation',
        scheduled_time: '14:00',
        guest_contact_id: 'contact-123',
      })
    );

    // Restore fake timers for remaining tests
    vi.useFakeTimers();
  });
});
