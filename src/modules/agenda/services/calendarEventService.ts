import { supabase } from '@/services/supabaseClient';
import type { CalendarEvent, DateRange } from '../types';

export async function fetchCalendarEvents(
  userId: string,
  range: DateRange
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', range.start.toISOString())
    .lte('start_time', range.end.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCalendarEvent(
  event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCalendarEvent(
  id: string,
  userId: string,
  updates: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function upsertExternalEvent(
  userId: string,
  source: string,
  externalId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .upsert(
      { ...event, user_id: userId, source, external_id: externalId },
      { onConflict: 'user_id,source,external_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
