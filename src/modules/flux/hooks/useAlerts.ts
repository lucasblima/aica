/**
 * useAlerts Hook
 *
 * Fetches real alerts from the `alerts` table and computes derived alerts
 * from athlete adherence and microcycle data.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { addXP, FLUX_XP_REWARDS } from '@/services/gamificationService';
import type { Alert } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const log = createNamespacedLogger('useAlerts');

/** DB row from alerts table */
interface AlertRow {
  id: string;
  user_id: string;
  athlete_id: string;
  alert_type: string;
  severity: string;
  message_preview: string;
  keywords_detected: string[];
  metadata: Record<string, unknown>;
  feedback_id: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

function rowToAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    user_id: row.user_id,
    athlete_id: row.athlete_id,
    feedback_id: row.feedback_id ?? '',
    alert_type: row.alert_type as Alert['alert_type'],
    severity: row.severity as Alert['severity'],
    keywords_detected: row.keywords_detected ?? [],
    message_preview: row.message_preview,
    acknowledged_at: row.acknowledged_at ?? undefined,
    resolved_at: row.resolved_at ?? undefined,
    resolution_notes: row.resolution_notes ?? undefined,
    created_at: row.created_at,
  };
}

export interface UseAlertsReturn {
  alerts: Alert[];
  isLoading: boolean;
  error: Error | null;
  acknowledge: (alertId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAlerts(): UseAlertsReturn {
  const [dbAlerts, setDbAlerts] = useState<Alert[]>([]);
  const [derivedAlerts, setDerivedAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitiallyLoaded = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      if (!hasInitiallyLoaded.current) setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Fetch real alerts from DB (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: alertRows, error: alertError } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (alertError) throw alertError;
      setDbAlerts((alertRows || []).map(rowToAlert));

      // 2. Compute derived alerts from athlete data
      const computed: Alert[] = [];

      // Low adherence alerts — use RPC with user param
      const { data: athletes } = await supabase
        .rpc('get_athletes_with_adherence', { p_user_id: user.id });

      if (athletes) {
        for (const athlete of athletes) {
          if (athlete.status !== 'active') continue;
          const rate = athlete.adherence_rate ?? 0;

          if (rate < 30 && rate > 0) {
            computed.push({
              id: `derived-adherence-${athlete.id}`,
              user_id: user.id,
              athlete_id: athlete.id,
              feedback_id: '',
              alert_type: 'absence',
              severity: 'high',
              keywords_detected: ['baixa adesao'],
              message_preview: `${athlete.name} com adesao de ${Math.round(rate)}% — acao recomendada`,
              created_at: new Date().toISOString(),
            });
          } else if (rate < 50 && rate > 0) {
            computed.push({
              id: `derived-adherence-${athlete.id}`,
              user_id: user.id,
              athlete_id: athlete.id,
              feedback_id: '',
              alert_type: 'motivation',
              severity: 'medium',
              keywords_detected: ['adesao moderada'],
              message_preview: `${athlete.name} com adesao de ${Math.round(rate)}% — monitorar`,
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      // Microcycles ending soon (within 3 days)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data: endingMicrocycles } = await supabase
        .from('microcycles')
        .select('id, athlete_id, name, end_date')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .lte('end_date', threeDaysFromNow.toISOString());

      if (endingMicrocycles) {
        // Need athlete names
        const athleteIds = endingMicrocycles.map(m => m.athlete_id);
        const { data: athleteNames } = await supabase
          .from('athletes')
          .select('id, name')
          .in('id', athleteIds.length > 0 ? athleteIds : ['__none__']);

        const nameMap = new Map((athleteNames || []).map(a => [a.id, a.name]));

        for (const mc of endingMicrocycles) {
          const athleteName = nameMap.get(mc.athlete_id) || 'Atleta';
          computed.push({
            id: `derived-ending-${mc.id}`,
            user_id: user.id,
            athlete_id: mc.athlete_id,
            feedback_id: '',
            alert_type: 'custom',
            severity: 'medium',
            keywords_detected: ['microciclo finalizando'],
            message_preview: `Microciclo "${mc.name}" de ${athleteName} termina em breve`,
            created_at: new Date().toISOString(),
          });
        }
      }

      setDerivedAlerts(computed);
      hasInitiallyLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      log.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time subscription for new alerts
  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`alerts_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'alerts',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              log.debug('Alert change detected:', payload.eventType);

              if (payload.eventType === 'INSERT') {
                const newAlert = rowToAlert(payload.new as AlertRow);
                setDbAlerts((prev) => [newAlert, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                const updated = rowToAlert(payload.new as AlertRow);
                setDbAlerts((prev) =>
                  prev.map((a) => (a.id === updated.id ? updated : a))
                );
              } else if (payload.eventType === 'DELETE') {
                setDbAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
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

  // Merge DB alerts + derived alerts (DB alerts first, then derived)
  const alerts = useMemo(() => {
    const dbIds = new Set(dbAlerts.map(a => a.id));
    const merged = [...dbAlerts];
    for (const d of derivedAlerts) {
      if (!dbIds.has(d.id)) merged.push(d);
    }
    return merged;
  }, [dbAlerts, derivedAlerts]);

  // Acknowledge an alert
  const acknowledge = useCallback(async (alertId: string) => {
    // Only DB alerts can be acknowledged (derived alerts are transient)
    if (alertId.startsWith('derived-')) return;

    const { error: updateError } = await supabase
      .from('alerts')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);

    if (updateError) {
      log.error('Acknowledge error:', updateError);
      return;
    }

    // Optimistic update
    setDbAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a
      )
    );

    // Award XP for resolving alert (non-blocking)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      addXP(user.id, FLUX_XP_REWARDS.alert_resolved).catch(() => {});
    }
  }, []);

  return {
    alerts,
    isLoading,
    error,
    acknowledge,
    refresh: fetchAlerts,
  };
}
