/**
 * useEMACheckin Hook
 * Experience Sampling Method: 3x daily micro check-ins.
 * Sprint 3: Journey Validated Psychometric Well-Being
 */

import { useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabaseClient';

const log = createNamespacedLogger('useEMACheckin');

export type CheckinType = 'morning_intention' | 'midday_energy' | 'evening_reflection';

export interface EMACheckin {
  id: string;
  checkin_type: CheckinType;
  valence: number | null;
  arousal: number | null;
  energy_level: number | null;
  focus_level: number | null;
  gratitude_items: string[] | null;
  intention: string | null;
  reflection: string | null;
  panas_positive: number | null;
  panas_negative: number | null;
  checked_in_at: string;
}

export interface CheckinInput {
  checkin_type: CheckinType;
  valence?: number;
  arousal?: number;
  energy_level?: number;
  focus_level?: number;
  gratitude_items?: string[];
  intention?: string;
  reflection?: string;
  panas_positive?: number;
  panas_negative?: number;
}

/**
 * Determine which check-in type is appropriate for the current time.
 */
export function getCurrentCheckinType(): CheckinType {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning_intention';
  if (hour < 18) return 'midday_energy';
  return 'evening_reflection';
}

/**
 * Get Portuguese label for a check-in type.
 */
export function getCheckinLabel(type: CheckinType): string {
  switch (type) {
    case 'morning_intention': return 'Intenção da Manhã';
    case 'midday_energy': return 'Energia do Meio-Dia';
    case 'evening_reflection': return 'Reflexão da Noite';
  }
}

export function useEMACheckin() {
  const { user } = useAuth();
  const [todayCheckins, setTodayCheckins] = useState<EMACheckin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch today's check-ins.
   */
  const fetchToday = useCallback(async () => {
    if (!user?.id) {
      setTodayCheckins([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_todays_ema_checkins');

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setTodayCheckins((data ?? []) as EMACheckin[]);
    } catch (err) {
      const e = err as Error;
      setError(e);
      setTodayCheckins([]);
      log.error('Failed to fetch today checkins:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Submit a new EMA check-in.
   */
  const submitCheckin = useCallback(
    async (input: CheckinInput): Promise<string> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setIsSubmitting(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('submit_ema_checkin', {
          p_checkin_type: input.checkin_type,
          p_valence: input.valence ?? null,
          p_arousal: input.arousal ?? null,
          p_energy_level: input.energy_level ?? null,
          p_focus_level: input.focus_level ?? null,
          p_gratitude_items: input.gratitude_items ?? null,
          p_intention: input.intention ?? null,
          p_reflection: input.reflection ?? null,
          p_panas_positive: input.panas_positive ?? null,
          p_panas_negative: input.panas_negative ?? null,
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        log.info('EMA check-in submitted:', input.checkin_type);

        // Refresh today's check-ins
        await fetchToday();

        return data as string;
      } catch (err) {
        const e = err as Error;
        setError(e);
        log.error('EMA check-in failed:', e);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user?.id, fetchToday]
  );

  /**
   * Check which check-in types have been completed today.
   */
  const completedTypes = todayCheckins.map(c => c.checkin_type);
  const hasMorning = completedTypes.includes('morning_intention');
  const hasMidday = completedTypes.includes('midday_energy');
  const hasEvening = completedTypes.includes('evening_reflection');
  const currentType = getCurrentCheckinType();
  const isCurrentDone = completedTypes.includes(currentType);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id) {
      fetchToday();
    }
  }, [user?.id, fetchToday]);

  return {
    todayCheckins,
    isLoading,
    isSubmitting,
    error,
    submitCheckin,
    refresh: fetchToday,
    // Convenience
    hasMorning,
    hasMidday,
    hasEvening,
    currentType,
    isCurrentDone,
    completedCount: completedTypes.length,
  };
}
