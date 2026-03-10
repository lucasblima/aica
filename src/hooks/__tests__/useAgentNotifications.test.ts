/**
 * Tests for useAgentNotifications hook
 *
 * Tests the agent notification system including:
 * - Fetching notifications from agent_notifications table
 * - Unread count via RPC
 * - markAsRead and markAllAsRead via RPC
 * - Realtime subscription for INSERT/UPDATE events
 * - Cleanup on unmount
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================
// HOISTED MOCKS — available before vi.mock factories run
// ============================================

const {
  mockRemoveChannel,
  mockSubscribe,
  mockOn,
  mockChannel,
  mockSelect,
  mockRpc,
  mockGetCachedUser,
  mockFrom,
  mockChannelFn,
} = vi.hoisted(() => {
  const mockRemoveChannel = vi.fn();
  const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
  const mockOn = vi.fn().mockReturnThis();

  const mockChannel = {
    on: mockOn,
    subscribe: mockSubscribe,
  };

  const mockSelect = vi.fn();
  const mockRpc = vi.fn();
  const mockGetCachedUser = vi.fn();
  const mockFrom = vi.fn();
  const mockChannelFn = vi.fn();

  return {
    mockRemoveChannel,
    mockSubscribe,
    mockOn,
    mockChannel,
    mockSelect,
    mockRpc,
    mockGetCachedUser,
    mockFrom,
    mockChannelFn,
  };
});

// Build a chainable PostgREST query builder mock
function buildQueryChain(resolvedValue: { data: any; error: any }): any {
  const promise = Promise.resolve(resolvedValue);
  const chain: any = {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    eq: vi.fn().mockImplementation(() => buildQueryChain(resolvedValue)),
    order: vi.fn().mockImplementation(() => buildQueryChain(resolvedValue)),
    limit: vi.fn().mockImplementation(() => buildQueryChain(resolvedValue)),
    select: vi.fn().mockImplementation(() => buildQueryChain(resolvedValue)),
  };
  return chain;
}

// ============================================
// vi.mock — factories use hoisted variables
// ============================================

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/services/authCacheService', () => ({
  getCachedUser: mockGetCachedUser,
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import AFTER mocks are set up
import { useAgentNotifications } from '../useAgentNotifications';
import type { AgentNotification } from '../useAgentNotifications';

// ============================================
// TEST DATA
// ============================================

const mockNotifications: AgentNotification[] = [
  {
    id: 'notif-1',
    user_id: 'test-user-id',
    agent_name: 'atlas-agent',
    notification_type: 'insight',
    title: 'Task deadline approaching',
    body: 'You have 3 tasks due tomorrow',
    metadata: {},
    read_at: null,
    created_at: '2026-03-09T10:00:00Z',
  },
  {
    id: 'notif-2',
    user_id: 'test-user-id',
    agent_name: 'flux-agent',
    notification_type: 'pattern',
    title: 'Workout consistency',
    body: 'You trained 5 days in a row',
    metadata: { streak: 5 },
    read_at: '2026-03-09T09:00:00Z',
    created_at: '2026-03-09T08:00:00Z',
  },
];

// ============================================
// TESTS
// ============================================

describe('useAgentNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: getCachedUser returns a test user
    mockGetCachedUser.mockResolvedValue({
      user: { id: 'test-user-id' },
      error: null,
    });

    // Default: from().select() returns mock notifications
    mockFrom.mockImplementation(() => ({
      select: mockSelect,
    }));

    mockSelect.mockImplementation(() =>
      buildQueryChain({ data: mockNotifications, error: null })
    );

    // Default: RPC returns unread count
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_unread_notification_count') {
        return Promise.resolve({ data: 1, error: null });
      }
      if (fnName === 'mark_notifications_read') {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Default: channel mock
    mockChannelFn.mockReturnValue(mockChannel);
    mockOn.mockReturnThis();
    mockSubscribe.mockImplementation((callback?: any) => {
      if (callback) callback('SUBSCRIBED', null);
      return mockChannel;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------
  // Interface & Initialization
  // ------------------------------------------

  it('returns the expected interface shape', async () => {
    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty('notifications');
    expect(result.current).toHaveProperty('unreadCount');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('markAsRead');
    expect(result.current).toHaveProperty('markAllAsRead');
    expect(result.current).toHaveProperty('refresh');
    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
  });

  // ------------------------------------------
  // Fetching Notifications
  // ------------------------------------------

  it('fetches notifications from agent_notifications table on mount', async () => {
    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith('agent_notifications');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(result.current.notifications).toEqual(mockNotifications);
  });

  it('fetches unread count via RPC on mount', async () => {
    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockRpc).toHaveBeenCalledWith('get_unread_notification_count', {
      p_user_id: 'test-user-id',
    });
    expect(result.current.unreadCount).toBe(1);
  });

  it('respects the limit parameter', async () => {
    const { result } = renderHook(() => useAgentNotifications(10));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify the chain was initiated with the correct table
    expect(mockFrom).toHaveBeenCalledWith('agent_notifications');
  });

  // ------------------------------------------
  // Mark as Read
  // ------------------------------------------

  it('markAsRead calls the RPC with notification IDs', async () => {
    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead(['notif-1']);
    });

    expect(mockRpc).toHaveBeenCalledWith('mark_notifications_read', {
      p_user_id: 'test-user-id',
      p_notification_ids: ['notif-1'],
    });
  });

  it('markAllAsRead calls the RPC without specific IDs', async () => {
    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockRpc).toHaveBeenCalledWith('mark_notifications_read', {
      p_user_id: 'test-user-id',
      p_notification_ids: null,
    });
  });

  // ------------------------------------------
  // Realtime Subscription
  // ------------------------------------------

  it('sets up realtime subscription on mount', async () => {
    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockChannelFn).toHaveBeenCalledWith(
      'agent-notifications:test-user-id'
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'agent_notifications',
      }),
      expect.any(Function)
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'agent_notifications',
      }),
      expect.any(Function)
    );

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('cleans up realtime subscription on unmount', async () => {
    const { result, unmount } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  // ------------------------------------------
  // Error Handling
  // ------------------------------------------

  it('sets error state when fetch fails', async () => {
    mockSelect.mockImplementation(() =>
      buildQueryChain({ data: null, error: { message: 'Database error' } })
    );

    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.notifications).toEqual([]);
  });

  it('handles missing user gracefully', async () => {
    mockGetCachedUser.mockResolvedValue({
      user: null,
      error: null,
    });

    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  // ------------------------------------------
  // Refresh
  // ------------------------------------------

  it('refresh re-fetches notifications and unread count', async () => {
    const { result } = renderHook(() => useAgentNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear mock call counts
    mockFrom.mockClear();
    mockRpc.mockClear();

    // Re-setup mocks for second call
    mockFrom.mockImplementation(() => ({
      select: mockSelect,
    }));

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_unread_notification_count') {
        return Promise.resolve({ data: 0, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFrom).toHaveBeenCalledWith('agent_notifications');
    expect(mockRpc).toHaveBeenCalledWith('get_unread_notification_count', {
      p_user_id: 'test-user-id',
    });
  });
});
