/**
 * useNotifications Hook
 * Issue #173: Notification Scheduler System
 *
 * React hook for managing in-app notifications with real-time updates
 *
 * Features:
 * - Real-time notification subscription
 * - Mark as read/unread
 * - Delete notifications
 * - Get notification statistics
 * - Manual trigger processing
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

const log = createNamespacedLogger('useNotifications');

// ============================================================================
// TYPES
// ============================================================================

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  notification_type: 'in_app' | 'email' | 'push';
  scheduled_at: string;
  sent_at: string | null;
  read_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'read';
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationStats {
  total_scheduled: number;
  total_queued: number;
  total_sending: number;
  total_sent: number;
  total_failed: number;
  total_cancelled: number;
  next_scheduled: string | null;
  last_sent: string | null;
  success_rate: number;
}

export interface UseNotificationsReturn {
  notifications: InAppNotification[];
  unreadCount: number;
  stats: NotificationStats | null;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  triggerProcessing: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // ============================================================================
  // FETCH NOTIFICATIONS
  // ============================================================================

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        return;
      }

      // Fetch in-app notifications for the current user
      const { data, error: fetchError } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('notification_type', 'custom') // Using 'custom' for in-app notifications
        .in('status', ['scheduled', 'sent', 'queued'])
        .is('deleted_at', null)
        .order('scheduled_for', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      // Map to InAppNotification format
      const mappedNotifications: InAppNotification[] = (data || []).map((n) => ({
        id: n.id,
        user_id: n.user_id,
        title: n.notification_type || 'Notification',
        body: n.message_template,
        notification_type: 'in_app',
        scheduled_at: n.scheduled_for,
        sent_at: n.sent_at,
        read_at: n.metadata?.read_at as string || null,
        status: n.status === 'sent' ? (n.metadata?.read_at ? 'read' : 'sent') : 'pending',
        metadata: n.metadata || null,
        created_at: n.created_at,
      }));

      setNotifications(mappedNotifications);
    } catch (err) {
      const error = err as Error;
      log.error('[useNotifications] fetchNotifications error:', { error: error.message });
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // FETCH STATS
  // ============================================================================

  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: rpcError } = await supabase.rpc('get_notification_stats', {
        user_uuid: user.id,
      });

      if (rpcError) {
        log.error('[useNotifications] fetchStats error:', { error: rpcError.message });
        return;
      }

      setStats(data as NotificationStats);
    } catch (err) {
      log.error('[useNotifications] fetchStats exception:', { error: (err as Error).message });
    }
  }, []);

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('scheduled_notifications')
        .update({
          metadata: { read_at: now },
          updated_at: now,
        })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_at: now, status: 'read' as const }
            : n
        )
      );

      log.info('[useNotifications] Marked notification as read:', { notificationId });
    } catch (err) {
      log.error('[useNotifications] markAsRead error:', { error: (err as Error).message });
      throw err;
    }
  }, []);

  // ============================================================================
  // MARK ALL AS READ
  // ============================================================================

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('scheduled_notifications')
        .update({
          metadata: { read_at: now },
          updated_at: now,
        })
        .eq('user_id', user.id)
        .eq('notification_type', 'custom')
        .is('metadata->read_at', null);

      if (updateError) throw updateError;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: now, status: 'read' as const }))
      );

      log.info('[useNotifications] Marked all notifications as read');
    } catch (err) {
      log.error('[useNotifications] markAllAsRead error:', { error: (err as Error).message });
      throw err;
    }
  }, []);

  // ============================================================================
  // DELETE NOTIFICATION
  // ============================================================================

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('scheduled_notifications')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (deleteError) throw deleteError;

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      log.info('[useNotifications] Deleted notification:', { notificationId });
    } catch (err) {
      log.error('[useNotifications] deleteNotification error:', { error: (err as Error).message });
      throw err;
    }
  }, []);

  // ============================================================================
  // TRIGGER PROCESSING
  // ============================================================================

  const triggerProcessing = useCallback(async () => {
    try {
      const { error: rpcError } = await supabase.rpc('trigger_notification_processing');

      if (rpcError) throw rpcError;

      log.info('[useNotifications] Triggered notification processing');

      // Refresh data after trigger
      await Promise.all([fetchNotifications(), fetchStats()]);
    } catch (err) {
      log.error('[useNotifications] triggerProcessing error:', { error: (err as Error).message });
      throw err;
    }
  }, [fetchNotifications, fetchStats]);

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to changes in scheduled_notifications
      const newChannel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scheduled_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            log.debug('[useNotifications] Real-time update:', { event: payload.eventType });

            // Refresh notifications on any change
            fetchNotifications();
            fetchStats();
          }
        )
        .subscribe();

      setChannel(newChannel);
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []); // Only setup once

  // ============================================================================
  // INITIAL FETCH
  // ============================================================================

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [fetchNotifications, fetchStats]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return {
    notifications,
    unreadCount,
    stats,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerProcessing,
    refreshStats: fetchStats,
    refresh: fetchNotifications,
  };
}

export default useNotifications;
