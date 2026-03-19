/**
 * useAthleteActivity Hook
 *
 * Subscribes to workout_slots realtime changes to notify the coach
 * when athletes complete workouts. Shows toast notifications.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { RealtimeChannel } from '@/services/supabaseClient';

const log = createNamespacedLogger('useAthleteActivity');

export interface ActivityNotification {
  id: string;
  athleteName: string;
  workoutName: string;
  completedAt: string;
}

export function useAthleteActivity() {
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [recentCount, setRecentCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`athlete_activity_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'workout_slots',
            },
            (payload) => {
              const newRecord = payload.new as Record<string, unknown>;
              const oldRecord = payload.old as Record<string, unknown>;

              // Only care about is_completed changing from false to true
              if (newRecord.is_completed === true && oldRecord.is_completed === false) {
                const notification: ActivityNotification = {
                  id: `${newRecord.id}-${Date.now()}`,
                  athleteName: (newRecord.athlete_name as string) || 'Atleta',
                  workoutName: (newRecord.template_name as string) || 'Treino',
                  completedAt: (newRecord.completed_at as string) || new Date().toISOString(),
                };

                log.debug('Workout completed:', notification);

                setNotifications((prev) => [notification, ...prev].slice(0, 10));
                setRecentCount((prev) => prev + 1);

                // Auto-dismiss after 8 seconds
                setTimeout(() => {
                  setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                }, 8000);
              }
            }
          )
          .subscribe();

        channelRef.current = channel;

        if (cancelled) {
          supabase.removeChannel(channel);
          channelRef.current = null;
        }
      } catch (err) {
        log.error('Subscription error:', err);
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
  }, []);

  const clearRecentCount = useCallback(() => {
    setRecentCount(0);
  }, []);

  return {
    notifications,
    recentCount,
    dismissNotification,
    clearRecentCount,
  };
}
