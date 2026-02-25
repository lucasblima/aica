/**
 * useHPHistory — Load HP history from entity_event_log for sparkline visualization.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useHPHistory');

export interface HPDataPoint {
  date: string; // ISO date
  hp: number;
}

export function useHPHistory(personaId: string | undefined, days: number = 30) {
  const [data, setData] = useState<HPDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(false);

  const load = useCallback(async () => {
    if (!personaId) return;
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: events, error } = await supabase
        .from('entity_event_log')
        .select('event_data, created_at')
        .eq('persona_id', personaId)
        .in('event_type', [
          'decay_applied',
          'quest_completed',
          'hp_changed',
          'recovery_applied',
          'item_added',
          'feedback_answered',
        ])
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Extract HP values from events
      const points: HPDataPoint[] = (events || [])
        .map((e) => {
          const ed = e.event_data as Record<string, unknown>;
          const hp = (ed.new_hp as number) ?? (ed.hp as number);
          if (typeof hp !== 'number') return null;
          return { date: e.created_at, hp };
        })
        .filter((p): p is HPDataPoint => p !== null);

      setData(points);
    } catch (err) {
      log.error('Failed to load HP history', { err });
      errorRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [personaId, days]);

  useEffect(() => {
    if (!errorRef.current) load();
  }, [load]);

  return { data, loading };
}
