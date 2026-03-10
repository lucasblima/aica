/**
 * useAgentNotifications — Hook for autonomous agent notification system
 *
 * Provides real-time agent notifications with:
 * - Fetch from agent_notifications table (filtered by current user)
 * - Unread count via get_unread_notification_count RPC
 * - markAsRead/markAllAsRead via mark_notifications_read RPC
 * - Supabase Realtime subscription for INSERT/UPDATE events
 * - Automatic cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { getCachedUser } from '@/services/authCacheService';
import { createNamespacedLogger } from '@/lib/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

const log = createNamespacedLogger('useAgentNotifications');

// ============================================================================
// TYPES
// ============================================================================

export interface AgentNotification {
  id: string;
  user_id: string;
  agent_name: string;
  notification_type: 'insight' | 'deadline' | 'pattern' | 'action' | 'system';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface UseAgentNotificationsReturn {
  notifications: AgentNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAgentNotifications(limit: number = 20): UseAgentNotificationsReturn {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);

  // ============================================================================
  // GET CURRENT USER
  // ============================================================================

  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return null;
    }
    return user.id;
  }, []);

  // ============================================================================
  // FETCH NOTIFICATIONS
  // ============================================================================

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userId = await getCurrentUserId();
      if (!userId) {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      userIdRef.current = userId;

      // Fetch notifications
      const { data, error: fetchError } = await supabase
        .from('agent_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setNotifications((data as AgentNotification[]) || []);

      // Fetch unread count
      const { data: countData, error: countError } = await supabase.rpc(
        'get_unread_notification_count',
        { p_user_id: userId }
      );

      if (countError) {
        log.warn('Failed to fetch unread count:', { error: countError.message });
      } else {
        setUnreadCount(typeof countData === 'number' ? countData : 0);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('fetchNotifications error:', { error: message });
      setError(message);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentUserId, limit]);

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  const markAsRead = useCallback(
    async (ids: string[]) => {
      try {
        const userId = userIdRef.current || (await getCurrentUserId());
        if (!userId) return;

        const { error: rpcError } = await supabase.rpc('mark_notifications_read', {
          p_user_id: userId,
          p_notification_ids: ids,
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        // Optimistic update: mark notifications as read in local state
        const now = new Date().toISOString();
        setNotifications((prev) => {
          const actuallyUnread = prev.filter((n) => ids.includes(n.id) && !n.read_at).length;
          setUnreadCount((c) => Math.max(0, c - actuallyUnread));
          return prev.map((n) =>
            ids.includes(n.id) ? { ...n, read_at: n.read_at || now } : n
          );
        });

        log.info('Marked notifications as read:', { ids });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        log.error('markAsRead error:', { error: message });
        throw err;
      }
    },
    [getCurrentUserId]
  );

  // ============================================================================
  // MARK ALL AS READ
  // ============================================================================

  const markAllAsRead = useCallback(async () => {
    try {
      const userId = userIdRef.current || (await getCurrentUserId());
      if (!userId) return;

      const { error: rpcError } = await supabase.rpc('mark_notifications_read', {
        p_user_id: userId,
        p_notification_ids: null,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // Optimistic update: mark all as read in local state
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
      );
      setUnreadCount(0);

      log.info('Marked all notifications as read');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('markAllAsRead error:', { error: message });
      throw err;
    }
  }, [getCurrentUserId]);

  // ============================================================================
  // REALTIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;

      userIdRef.current = userId;

      // Clean up any previous channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const newChannel = supabase
        .channel(`agent-notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            log.debug('New agent notification:', { event: payload.eventType });
            // Prepend new notification to list
            const newNotification = payload.new as AgentNotification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            log.debug('Agent notification updated:', { event: payload.eventType });
            const updated = payload.new as AgentNotification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
            // Re-fetch unread count on update (could be mark-as-read from another device)
            supabase
              .rpc('get_unread_notification_count', { p_user_id: userId })
              .then(({ data }) => {
                if (typeof data === 'number') {
                  setUnreadCount(data);
                }
              })
              .catch((err) => {
                log.warn('Failed to refresh unread count:', { error: err?.message });
              });
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            log.error('Realtime subscription error', { status, err });
          }
        });

      if (!cancelled) {
        channelRef.current = newChannel;
      } else {
        supabase.removeChannel(newChannel);
      }
    };

    setupSubscription();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [getCurrentUserId]);

  // ============================================================================
  // INITIAL FETCH
  // ============================================================================

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}

export default useAgentNotifications;
