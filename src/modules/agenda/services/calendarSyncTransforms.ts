/**
 * Calendar Sync Transforms
 *
 * Pure functions that convert AICA module entities into Google Calendar event format.
 * No database calls — only data transformation.
 *
 * Color mapping (Google Calendar color IDs):
 * - Flux (workouts) = 7 (Peacock / teal)
 * - Atlas (tasks)    = 6 (Tangerine / orange)
 * - Studio (podcast) = 3 (Grape / purple)
 * - Grants (deadlines)= 10 (Basil / green)
 */

import type { GoogleCalendarEventInput } from '@/services/googleCalendarWriteService';

const CALENDAR_COLORS = {
  flux: '7',
  atlas: '6',
  studio: '3',
  grants: '10',
} as const;

export type SyncModule = keyof typeof CALENDAR_COLORS;

function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function makeExtendedProperties(module: SyncModule, entityId: string) {
  return {
    private: {
      aica_module: module,
      aica_entity_id: entityId,
    },
  };
}

/**
 * Add minutes to a HH:MM time string arithmetically (no Date objects).
 * Returns { dateStr, hour, min } where dateStr may advance if crossing midnight.
 */
function addMinutesToTime(
  baseDateStr: string,
  startHour: number,
  startMin: number,
  durationMin: number
): { dateStr: string; hour: string; min: string } {
  const totalMin = startHour * 60 + startMin + durationMin;
  const dayOverflow = Math.floor(totalMin / (24 * 60));
  const remaining = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const endH = Math.floor(remaining / 60);
  const endM = remaining % 60;

  let dateStr = baseDateStr;
  if (dayOverflow > 0) {
    const d = new Date(baseDateStr + 'T12:00:00');
    d.setDate(d.getDate() + dayOverflow);
    dateStr = d.toISOString().split('T')[0];
  }

  return {
    dateStr,
    hour: endH.toString().padStart(2, '0'),
    min: endM.toString().padStart(2, '0'),
  };
}

/**
 * Extract HH:MM from a scheduled_time value.
 *
 * The DB column is TIMESTAMPTZ. The app saves local time as a naive ISO string
 * (e.g. "2026-02-28T14:00:00") which PostgreSQL interprets as UTC. When read back
 * it returns "2026-02-28T14:00:00+00:00". The digits before the timezone suffix
 * represent the user's intended local time, so we extract them directly from the
 * string to avoid a UTC→local conversion that would shift the time.
 */
function extractLocalHHMM(scheduledTime: string): { hour: string; min: string } {
  if (scheduledTime.includes('T')) {
    const timePart = scheduledTime.split('T')[1];
    const parts = timePart.split(':');
    return {
      hour: parts[0].padStart(2, '0'),
      min: (parts[1] || '00').padStart(2, '0'),
    };
  }
  const parts = scheduledTime.split(':');
  return {
    hour: parts[0].padStart(2, '0'),
    min: (parts[1] || '00').padStart(2, '0'),
  };
}

// ─── Flux: Workout Slots ──────────────────────────────────────

export interface FluxSlotData {
  id: string;
  name: string;
  day_of_week: number; // 1=Mon, 7=Sun
  week_number: number;
  start_time?: string; // "HH:MM" or "HH:MM:SS"
  duration?: number;   // minutes
  modality?: string;
  intensity?: string;
}

export function fluxSlotToGoogleEvent(
  slot: FluxSlotData,
  microcycleStartDate: string // "YYYY-MM-DD" (Monday of microcycle)
): GoogleCalendarEventInput | null {
  if (!slot.start_time) return null;

  const baseDate = new Date(microcycleStartDate + 'T12:00:00');
  const dayOffset = (slot.week_number - 1) * 7 + (slot.day_of_week - 1);
  const eventDate = new Date(baseDate);
  eventDate.setDate(eventDate.getDate() + dayOffset);

  const dateStr = eventDate.toISOString().split('T')[0];
  const timeParts = slot.start_time.split(':');
  const startHour = timeParts[0].padStart(2, '0');
  const startMin = (timeParts[1] || '00').padStart(2, '0');

  const durationMin = slot.duration || 60;
  const end = addMinutesToTime(dateStr, parseInt(startHour), parseInt(startMin), durationMin);

  const tz = getUserTimezone();
  const label = slot.modality
    ? `[Treino] ${slot.name} (${slot.modality})`
    : `[Treino] ${slot.name}`;

  const descParts: string[] = [];
  if (slot.intensity) descParts.push(`Intensidade: ${slot.intensity}`);
  if (slot.duration) descParts.push(`Duração: ${slot.duration}min`);
  descParts.push('Sincronizado pelo AICA');

  return {
    summary: label,
    description: descParts.join('\n'),
    start: { dateTime: `${dateStr}T${startHour}:${startMin}:00`, timeZone: tz },
    end: { dateTime: `${end.dateStr}T${end.hour}:${end.min}:00`, timeZone: tz },
    colorId: CALENDAR_COLORS.flux,
    extendedProperties: makeExtendedProperties('flux', slot.id),
  };
}

// ─── Atlas: Tasks ─────────────────────────────────────────────

export interface AtlasTaskData {
  id: string;
  title: string;
  description?: string;
  scheduled_time?: string; // "HH:MM"
  due_date?: string;       // "YYYY-MM-DD"
  estimated_duration?: number; // minutes
}

export function atlasTaskToGoogleEvent(task: AtlasTaskData): GoogleCalendarEventInput | null {
  if (!task.due_date) return null;

  const description = task.description
    ? `${task.description}\n\nSincronizado pelo AICA`
    : 'Sincronizado pelo AICA';

  // If scheduled_time is set, create a timed event; otherwise create an all-day event
  if (task.scheduled_time) {
    // Extract HH:MM from the string directly — avoids UTC→local shift from Date constructor.
    // The DB stores TIMESTAMPTZ but the app saves naive local time as UTC, so the digits
    // in the ISO string represent the user's intended local time.
    const { hour: startHour, min: startMin } = extractLocalHHMM(task.scheduled_time);

    const durationMin = task.estimated_duration || 60;
    const end = addMinutesToTime(task.due_date!, parseInt(startHour), parseInt(startMin), durationMin);

    const tz = getUserTimezone();

    return {
      summary: `[Tarefa] ${task.title}`,
      description,
      start: { dateTime: `${task.due_date}T${startHour}:${startMin}:00`, timeZone: tz },
      end: { dateTime: `${end.dateStr}T${end.hour}:${end.min}:00`, timeZone: tz },
      colorId: CALENDAR_COLORS.atlas,
      extendedProperties: makeExtendedProperties('atlas', task.id),
    };
  }

  // All-day event (only due_date, no scheduled_time)
  return {
    summary: `[Tarefa] ${task.title}`,
    description,
    start: { date: task.due_date },
    end: { date: task.due_date },
    colorId: CALENDAR_COLORS.atlas,
    extendedProperties: makeExtendedProperties('atlas', task.id),
  };
}

// ─── Studio: Podcast Episodes ─────────────────────────────────

export interface StudioEpisodeData {
  id: string;
  title: string;
  guest_name?: string;
  scheduled_date?: string;   // "YYYY-MM-DD"
  duration_minutes?: number;
  location?: string;
}

export function studioEpisodeToGoogleEvent(episode: StudioEpisodeData): GoogleCalendarEventInput | null {
  if (!episode.scheduled_date) return null;

  const tz = getUserTimezone();
  const duration = episode.duration_minutes || 90;
  const guestLabel = episode.guest_name ? ` c/ ${episode.guest_name}` : '';

  const end = addMinutesToTime(episode.scheduled_date!, 10, 0, duration);

  const descParts: string[] = [];
  if (episode.guest_name) descParts.push(`Convidado: ${episode.guest_name}`);
  if (episode.location) descParts.push(`Local: ${episode.location}`);
  descParts.push('Sincronizado pelo AICA');

  return {
    summary: `[Podcast] ${episode.title}${guestLabel}`,
    description: descParts.join('\n'),
    start: { dateTime: `${episode.scheduled_date}T10:00:00`, timeZone: tz },
    end: { dateTime: `${end.dateStr}T${end.hour}:${end.min}:00`, timeZone: tz },
    colorId: CALENDAR_COLORS.studio,
    extendedProperties: makeExtendedProperties('studio', episode.id),
  };
}

// ─── Grants: Deadlines ────────────────────────────────────────

export interface GrantDeadlineData {
  id: string;
  title: string;
  funding_agency?: string;
  submission_deadline: string; // ISO 8601 or "YYYY-MM-DD"
}

export function grantDeadlineToGoogleEvent(opportunity: GrantDeadlineData): GoogleCalendarEventInput | null {
  if (!opportunity.submission_deadline) return null;

  const deadlineDate = opportunity.submission_deadline.split('T')[0];
  const agencyLabel = opportunity.funding_agency ? ` (${opportunity.funding_agency})` : '';

  return {
    summary: `[Prazo] ${opportunity.title}${agencyLabel}`,
    description: 'Prazo de submissao do edital\n\nSincronizado pelo AICA',
    start: { date: deadlineDate },
    end: { date: deadlineDate },
    colorId: CALENDAR_COLORS.grants,
    extendedProperties: makeExtendedProperties('grants', opportunity.id),
  };
}
