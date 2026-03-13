import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AthleteCalendarSync');

interface SlotSyncInput {
  slotId: string;
  action: 'sync' | 'delete';
  eventData?: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  };
}

/**
 * Sync workout slots to the athlete's Google Calendar via Edge Function.
 * The Edge Function uses the athlete's stored OAuth token (service_role).
 *
 * Returns { synced, skipped }. Throws on network/auth errors.
 * Silent when athlete has no Google Calendar connected.
 */
export async function syncSlotsToAthleteCalendar(
  athleteId: string,
  slots: SlotSyncInput[]
): Promise<{ synced: number; skipped: number }> {
  const { data, error } = await supabase.functions.invoke(
    'sync-slot-to-athlete-calendar',
    { body: { athleteId, slots } }
  );

  if (error) {
    log.error('[syncSlotsToAthleteCalendar] Edge Function error:', error);
    throw error;
  }

  return { synced: data?.synced ?? 0, skipped: data?.skipped ?? 0 };
}
