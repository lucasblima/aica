/**
 * Studio Timeline Provider
 *
 * Queries podcast_episodes with a scheduled_date within the given range
 * and transforms them into recording session events for the timeline.
 *
 * Table: podcast_episodes
 * Temporal field: scheduled_date (DATE, nullable)
 * Duration: duration_minutes (integer, nullable — defaults to 60)
 */

import type { TimelineProvider } from './types';
import type { TimelineEvent, DateRange } from '../types';
import { supabase } from '@/services/supabaseClient';

const COLOR_STUDIO = '#A855F7'; // purple

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatDatePart(n: number): string {
  return n.toString().padStart(2, '0');
}

function computeEndTime(startISO: string, durationMinutes: number): string {
  const endMs = new Date(startISO).getTime() + durationMinutes * 60000;
  const ed = new Date(endMs);
  return `${ed.getFullYear()}-${formatDatePart(ed.getMonth() + 1)}-${formatDatePart(ed.getDate())}T${formatDatePart(ed.getHours())}:${formatDatePart(ed.getMinutes())}:${formatDatePart(ed.getSeconds())}`;
}

export const studioProvider: TimelineProvider = {
  source: 'studio',

  async getEvents(userId: string, range: DateRange): Promise<TimelineEvent[]> {
    const startStr = formatDate(range.start);
    const endStr = formatDate(range.end);

    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('id, title, guest_name, episode_theme, status, scheduled_date, duration_minutes, show_id')
      .eq('user_id', userId)
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', startStr)
      .lte('scheduled_date', endStr)
      .order('scheduled_date', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((ep) => {
      const duration = ep.duration_minutes || 60;
      // Default recording start time: 10:00 (since scheduled_date is DATE only)
      const startISO = `${ep.scheduled_date}T10:00:00`;
      const endISO = computeEndTime(startISO, duration);

      const subtitle = ep.guest_name
        ? `com ${ep.guest_name}`
        : ep.episode_theme || '';

      return {
        id: `studio-${ep.id}`,
        title: `Gravação: ${ep.title}`,
        start: startISO,
        end: endISO,
        allDay: false,
        source: 'studio',
        sourceId: ep.id,
        color: COLOR_STUDIO,
        icon: 'mic',
        isReadOnly: true,
        metadata: {
          guestName: ep.guest_name,
          episodeTheme: ep.episode_theme,
          status: ep.status,
          durationMinutes: duration,
          subtitle,
          showId: ep.show_id,
        },
      };
    });
  },
};
