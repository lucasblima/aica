/**
 * useWorkoutTemplates Hook
 *
 * Real-time subscription to workout_templates table with filtering
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { WorkoutTemplate, TemplateFilters } from '../types/flow';
import type { RealtimeChannel } from '@/services/supabaseClient';
import { WorkoutTemplateService } from '../services/workoutTemplateService';

const log = createNamespacedLogger('useWorkoutTemplates');

export function useWorkoutTemplates(filters?: TemplateFilters) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitiallyLoaded = useRef(false);

  const fetchTemplates = useCallback(async () => {
    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await WorkoutTemplateService.getTemplates(filters);

      if (fetchError) throw fetchError;

      setTemplates(data || []);
      hasInitiallyLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      log.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Real-time subscription
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`workout_templates_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'workout_templates',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              log.debug('Template change detected:', payload.eventType);

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newTemplate = payload.new as WorkoutTemplate;

                setTemplates((prev) => {
                  const filtered = prev.filter((t) => t.id !== newTemplate.id);
                  return [...filtered, newTemplate].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                });
              } else if (payload.eventType === 'DELETE') {
                setTemplates((prev) => prev.filter((t) => t.id !== payload.old.id));
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

  return {
    templates,
    isLoading,
    error,
    refresh: fetchTemplates,
  };
}
