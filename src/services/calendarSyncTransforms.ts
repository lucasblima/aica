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

import type { GoogleCalendarEventInput } from './googleCalendarWriteService';

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

  const baseDate = new Date(microcycleStartDate + 'T00:00:00');
  const dayOffset = (slot.week_number - 1) * 7 + (slot.day_of_week - 1);
  const eventDate = new Date(baseDate);
  eventDate.setDate(eventDate.getDate() + dayOffset);

  const dateStr = eventDate.toISOString().split('T')[0];
  const timeParts = slot.start_time.split(':');
  const startHour = timeParts[0].padStart(2, '0');
  const startMin = (timeParts[1] || '00').padStart(2, '0');

  const durationMin = slot.duration || 60;
  const endDate = new Date(`${dateStr}T${startHour}:${startMin}:00`);
  endDate.setMinutes(endDate.getMinutes() + durationMin);
  const endHour = endDate.getHours().toString().padStart(2, '0');
  const endMin = endDate.getMinutes().toString().padStart(2, '0');

  const tz = getUserTimezone();
  const label = slot.modality
    ? `[Treino] ${slot.name} (${slot.modality})`
    : `[Treino] ${slot.name}`;

  const descParts: string[] = [];
  if (slot.intensity) descParts.push(`Intensidade: ${slot.intensity}`);
  if (slot.duration) descParts.push(`Duracao: ${slot.duration}min`);
  descParts.push('Sincronizado pelo AICA');

  return {
    summary: label,
    description: descParts.join('\n'),
    start: { dateTime: `${dateStr}T${startHour}:${startMin}:00`, timeZone: tz },
    end: { dateTime: `${dateStr}T${endHour}:${endMin}:00`, timeZone: tz },
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
}

export function atlasTaskToGoogleEvent(task: AtlasTaskData): GoogleCalendarEventInput | null {
  if (!task.scheduled_time || !task.due_date) return null;

  const timeParts = task.scheduled_time.split(':');
  const startHour = timeParts[0].padStart(2, '0');
  const startMin = (timeParts[1] || '00').padStart(2, '0');

  const endDate = new Date(`${task.due_date}T${startHour}:${startMin}:00`);
  endDate.setMinutes(endDate.getMinutes() + 60); // 1-hour default block
  const endHour = endDate.getHours().toString().padStart(2, '0');
  const endMin = endDate.getMinutes().toString().padStart(2, '0');

  const tz = getUserTimezone();

  return {
    summary: `[Tarefa] ${task.title}`,
    description: task.description
      ? `${task.description}\n\nSincronizado pelo AICA`
      : 'Sincronizado pelo AICA',
    start: { dateTime: `${task.due_date}T${startHour}:${startMin}:00`, timeZone: tz },
    end: { dateTime: `${task.due_date}T${endHour}:${endMin}:00`, timeZone: tz },
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

  const startTime = `${episode.scheduled_date}T10:00:00`;
  const endDate = new Date(startTime);
  endDate.setMinutes(endDate.getMinutes() + duration);
  const endHour = endDate.getHours().toString().padStart(2, '0');
  const endMin = endDate.getMinutes().toString().padStart(2, '0');

  const descParts: string[] = [];
  if (episode.guest_name) descParts.push(`Convidado: ${episode.guest_name}`);
  if (episode.location) descParts.push(`Local: ${episode.location}`);
  descParts.push('Sincronizado pelo AICA');

  return {
    summary: `[Podcast] ${episode.title}${guestLabel}`,
    description: descParts.join('\n'),
    start: { dateTime: startTime, timeZone: tz },
    end: { dateTime: `${episode.scheduled_date}T${endHour}:${endMin}:00`, timeZone: tz },
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
