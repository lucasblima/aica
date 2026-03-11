/**
 * Unit Tests for calendarSyncTransforms
 *
 * Tests cover all pure transformation functions:
 * - atlasTaskToGoogleEvent: task → Google Calendar event (timed + all-day)
 * - fluxSlotToGoogleEvent: workout slot → Google Calendar event
 * - studioEpisodeToGoogleEvent: podcast episode → Google Calendar event
 * - grantDeadlineToGoogleEvent: grant deadline → Google Calendar event
 * - Edge cases: missing fields, midnight crossings, duration defaults
 *
 * These are pure functions with no database calls — ideal for unit testing.
 *
 * @see src/modules/agenda/services/calendarSyncTransforms.ts
 */

import { describe, it, expect } from 'vitest'

import {
  atlasTaskToGoogleEvent,
  fluxSlotToGoogleEvent,
  studioEpisodeToGoogleEvent,
  grantDeadlineToGoogleEvent,
  type AtlasTaskData,
  type FluxSlotData,
  type StudioEpisodeData,
  type GrantDeadlineData,
} from '../calendarSyncTransforms'

// =============================================================================
// atlasTaskToGoogleEvent
// =============================================================================

describe('atlasTaskToGoogleEvent', () => {
  it('should return null when task has no due_date', () => {
    const task: AtlasTaskData = {
      id: 'task-1',
      title: 'No deadline task',
    }

    expect(atlasTaskToGoogleEvent(task)).toBeNull()
  })

  it('should create an all-day event when task has due_date but no scheduled_time', () => {
    const task: AtlasTaskData = {
      id: 'task-1',
      title: 'All day task',
      due_date: '2026-03-15',
    }

    const result = atlasTaskToGoogleEvent(task)

    expect(result).not.toBeNull()
    expect(result!.summary).toBe('[Tarefa] All day task')
    expect(result!.start.date).toBe('2026-03-15')
    expect(result!.end.date).toBe('2026-03-15')
    expect(result!.start.dateTime).toBeUndefined()
    expect(result!.colorId).toBe('6') // Atlas orange
    expect(result!.description).toContain('Sincronizado pelo AICA')
  })

  it('should create a timed event when task has both due_date and scheduled_time', () => {
    const task: AtlasTaskData = {
      id: 'task-2',
      title: 'Timed task',
      due_date: '2026-03-15',
      scheduled_time: '14:30',
      estimated_duration: 60,
    }

    const result = atlasTaskToGoogleEvent(task)

    expect(result).not.toBeNull()
    expect(result!.summary).toBe('[Tarefa] Timed task')
    expect(result!.start.dateTime).toBe('2026-03-15T14:30:00')
    expect(result!.end.dateTime).toBe('2026-03-15T15:30:00')
    expect(result!.start.timeZone).toBeDefined()
  })

  it('should handle ISO timestamp format for scheduled_time', () => {
    const task: AtlasTaskData = {
      id: 'task-3',
      title: 'ISO timestamp task',
      due_date: '2026-03-15',
      scheduled_time: '2026-03-15T09:00:00+00:00',
      estimated_duration: 45,
    }

    const result = atlasTaskToGoogleEvent(task)

    expect(result).not.toBeNull()
    // extractLocalHHMM should pull 09:00 from the ISO string
    expect(result!.start.dateTime).toBe('2026-03-15T09:00:00')
    expect(result!.end.dateTime).toBe('2026-03-15T09:45:00')
  })

  it('should default to 60 minutes duration when not specified', () => {
    const task: AtlasTaskData = {
      id: 'task-4',
      title: 'Default duration task',
      due_date: '2026-03-15',
      scheduled_time: '10:00',
    }

    const result = atlasTaskToGoogleEvent(task)

    expect(result).not.toBeNull()
    expect(result!.start.dateTime).toBe('2026-03-15T10:00:00')
    expect(result!.end.dateTime).toBe('2026-03-15T11:00:00')
  })

  it('should include description when provided', () => {
    const task: AtlasTaskData = {
      id: 'task-5',
      title: 'With description',
      description: 'Important meeting notes',
      due_date: '2026-03-15',
    }

    const result = atlasTaskToGoogleEvent(task)

    expect(result!.description).toContain('Important meeting notes')
    expect(result!.description).toContain('Sincronizado pelo AICA')
  })

  it('should set AICA extended properties for atlas module', () => {
    const task: AtlasTaskData = {
      id: 'task-6',
      title: 'Extended props task',
      due_date: '2026-03-15',
    }

    const result = atlasTaskToGoogleEvent(task)

    expect(result!.extendedProperties).toEqual({
      private: {
        aica_module: 'atlas',
        aica_entity_id: 'task-6',
      },
    })
  })

  it('should handle midnight crossing for long tasks', () => {
    const task: AtlasTaskData = {
      id: 'task-7',
      title: 'Late night task',
      due_date: '2026-03-15',
      scheduled_time: '23:00',
      estimated_duration: 120, // 2 hours
    }

    const result = atlasTaskToGoogleEvent(task)

    expect(result).not.toBeNull()
    expect(result!.start.dateTime).toBe('2026-03-15T23:00:00')
    // Should cross midnight to 2026-03-16T01:00:00
    expect(result!.end.dateTime).toBe('2026-03-16T01:00:00')
  })
})

// =============================================================================
// fluxSlotToGoogleEvent
// =============================================================================

describe('fluxSlotToGoogleEvent', () => {
  it('should return null when slot has no start_time', () => {
    const slot: FluxSlotData = {
      id: 'slot-1',
      name: 'No time slot',
      day_of_week: 1,
      week_number: 1,
    }

    expect(fluxSlotToGoogleEvent(slot, '2026-03-09')).toBeNull()
  })

  it('should create an event on the correct day based on day_of_week and week_number', () => {
    const slot: FluxSlotData = {
      id: 'slot-1',
      name: 'Monday Workout',
      day_of_week: 1, // Monday
      week_number: 1,
      start_time: '07:00',
      duration: 60,
    }

    // microcycleStartDate is Monday
    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result).not.toBeNull()
    expect(result!.summary).toBe('[Treino] Monday Workout')
    expect(result!.start.dateTime).toContain('2026-03-09T07:00:00')
    expect(result!.end.dateTime).toContain('2026-03-09T08:00:00')
  })

  it('should calculate correct date for Wednesday (day 3) in week 1', () => {
    const slot: FluxSlotData = {
      id: 'slot-2',
      name: 'Wednesday Session',
      day_of_week: 3, // Wednesday
      week_number: 1,
      start_time: '18:00',
      duration: 90,
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result).not.toBeNull()
    // Monday + 2 days offset for Wednesday
    expect(result!.start.dateTime).toContain('2026-03-11T18:00:00')
    expect(result!.end.dateTime).toContain('2026-03-11T19:30:00')
  })

  it('should calculate correct date for week 2', () => {
    const slot: FluxSlotData = {
      id: 'slot-3',
      name: 'Week 2 Workout',
      day_of_week: 1, // Monday
      week_number: 2,
      start_time: '08:00',
      duration: 60,
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result).not.toBeNull()
    // Week 2 Monday = start + 7 days
    expect(result!.start.dateTime).toContain('2026-03-16T08:00:00')
  })

  it('should include modality in summary when provided', () => {
    const slot: FluxSlotData = {
      id: 'slot-4',
      name: 'Strength Session',
      day_of_week: 1,
      week_number: 1,
      start_time: '09:00',
      modality: 'Musculacao',
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result!.summary).toBe('[Treino] Strength Session (Musculacao)')
  })

  it('should include intensity and duration in description', () => {
    const slot: FluxSlotData = {
      id: 'slot-5',
      name: 'HIIT',
      day_of_week: 1,
      week_number: 1,
      start_time: '06:00',
      duration: 45,
      intensity: 'Alta',
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result!.description).toContain('Intensidade: Alta')
    expect(result!.description).toContain('Duracao: 45min')
    expect(result!.description).toContain('Sincronizado pelo AICA')
  })

  it('should default to 60 minutes duration when not provided', () => {
    const slot: FluxSlotData = {
      id: 'slot-6',
      name: 'Default Duration',
      day_of_week: 1,
      week_number: 1,
      start_time: '10:00',
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result!.start.dateTime).toContain('10:00:00')
    expect(result!.end.dateTime).toContain('11:00:00')
  })

  it('should use Flux color ID (7 = Peacock/teal)', () => {
    const slot: FluxSlotData = {
      id: 'slot-7',
      name: 'Color check',
      day_of_week: 1,
      week_number: 1,
      start_time: '09:00',
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result!.colorId).toBe('7')
  })

  it('should set flux module extended properties', () => {
    const slot: FluxSlotData = {
      id: 'slot-unique',
      name: 'Props check',
      day_of_week: 1,
      week_number: 1,
      start_time: '09:00',
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result!.extendedProperties).toEqual({
      private: {
        aica_module: 'flux',
        aica_entity_id: 'slot-unique',
      },
    })
  })

  it('should handle time with seconds format (HH:MM:SS)', () => {
    const slot: FluxSlotData = {
      id: 'slot-8',
      name: 'Seconds format',
      day_of_week: 1,
      week_number: 1,
      start_time: '14:30:00',
      duration: 60,
    }

    const result = fluxSlotToGoogleEvent(slot, '2026-03-09')

    expect(result!.start.dateTime).toContain('14:30:00')
    expect(result!.end.dateTime).toContain('15:30:00')
  })
})

// =============================================================================
// studioEpisodeToGoogleEvent
// =============================================================================

describe('studioEpisodeToGoogleEvent', () => {
  it('should return null when episode has no scheduled_date', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-1',
      title: 'Unscheduled Episode',
    }

    expect(studioEpisodeToGoogleEvent(episode)).toBeNull()
  })

  it('should create event at 10:00 by default', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-2',
      title: 'Morning Episode',
      scheduled_date: '2026-03-20',
    }

    const result = studioEpisodeToGoogleEvent(episode)

    expect(result).not.toBeNull()
    expect(result!.start.dateTime).toBe('2026-03-20T10:00:00')
  })

  it('should include guest name in summary and description', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-3',
      title: 'AI Talk',
      guest_name: 'Dr. Silva',
      scheduled_date: '2026-03-20',
    }

    const result = studioEpisodeToGoogleEvent(episode)

    expect(result!.summary).toBe('[Podcast] AI Talk c/ Dr. Silva')
    expect(result!.description).toContain('Convidado: Dr. Silva')
  })

  it('should include location in description when provided', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-4',
      title: 'Studio Session',
      scheduled_date: '2026-03-20',
      location: 'Studio A',
    }

    const result = studioEpisodeToGoogleEvent(episode)

    expect(result!.description).toContain('Local: Studio A')
  })

  it('should default to 90 minutes duration', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-5',
      title: 'Default Duration',
      scheduled_date: '2026-03-20',
    }

    const result = studioEpisodeToGoogleEvent(episode)

    // Start at 10:00, end at 11:30 (90 min)
    expect(result!.start.dateTime).toBe('2026-03-20T10:00:00')
    expect(result!.end.dateTime).toBe('2026-03-20T11:30:00')
  })

  it('should use custom duration when provided', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-6',
      title: 'Short Episode',
      scheduled_date: '2026-03-20',
      duration_minutes: 30,
    }

    const result = studioEpisodeToGoogleEvent(episode)

    expect(result!.start.dateTime).toBe('2026-03-20T10:00:00')
    expect(result!.end.dateTime).toBe('2026-03-20T10:30:00')
  })

  it('should use Studio color ID (3 = Grape/purple)', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-7',
      title: 'Color Check',
      scheduled_date: '2026-03-20',
    }

    const result = studioEpisodeToGoogleEvent(episode)

    expect(result!.colorId).toBe('3')
  })

  it('should set studio module extended properties', () => {
    const episode: StudioEpisodeData = {
      id: 'ep-unique',
      title: 'Props Check',
      scheduled_date: '2026-03-20',
    }

    const result = studioEpisodeToGoogleEvent(episode)

    expect(result!.extendedProperties).toEqual({
      private: {
        aica_module: 'studio',
        aica_entity_id: 'ep-unique',
      },
    })
  })
})

// =============================================================================
// grantDeadlineToGoogleEvent
// =============================================================================

describe('grantDeadlineToGoogleEvent', () => {
  it('should return null when deadline is missing', () => {
    const opportunity: GrantDeadlineData = {
      id: 'grant-1',
      title: 'FAPESP',
      submission_deadline: '',
    }

    expect(grantDeadlineToGoogleEvent(opportunity)).toBeNull()
  })

  it('should create all-day event from ISO deadline', () => {
    const opportunity: GrantDeadlineData = {
      id: 'grant-2',
      title: 'CNPq Universal',
      submission_deadline: '2026-04-30T23:59:00Z',
    }

    const result = grantDeadlineToGoogleEvent(opportunity)

    expect(result).not.toBeNull()
    expect(result!.summary).toBe('[Prazo] CNPq Universal')
    expect(result!.start.date).toBe('2026-04-30')
    expect(result!.end.date).toBe('2026-04-30')
  })

  it('should include funding agency in summary when provided', () => {
    const opportunity: GrantDeadlineData = {
      id: 'grant-3',
      title: 'Research Grant',
      funding_agency: 'CAPES',
      submission_deadline: '2026-05-15',
    }

    const result = grantDeadlineToGoogleEvent(opportunity)

    expect(result!.summary).toBe('[Prazo] Research Grant (CAPES)')
  })

  it('should not include agency in summary when not provided', () => {
    const opportunity: GrantDeadlineData = {
      id: 'grant-4',
      title: 'Internal Grant',
      submission_deadline: '2026-06-01',
    }

    const result = grantDeadlineToGoogleEvent(opportunity)

    expect(result!.summary).toBe('[Prazo] Internal Grant')
  })

  it('should use Grants color ID (10 = Basil/green)', () => {
    const opportunity: GrantDeadlineData = {
      id: 'grant-5',
      title: 'Color Check',
      submission_deadline: '2026-06-01',
    }

    const result = grantDeadlineToGoogleEvent(opportunity)

    expect(result!.colorId).toBe('10')
  })

  it('should handle plain date string (YYYY-MM-DD) for deadline', () => {
    const opportunity: GrantDeadlineData = {
      id: 'grant-6',
      title: 'Plain date',
      submission_deadline: '2026-07-15',
    }

    const result = grantDeadlineToGoogleEvent(opportunity)

    expect(result!.start.date).toBe('2026-07-15')
  })

  it('should set grants module extended properties', () => {
    const opportunity: GrantDeadlineData = {
      id: 'grant-unique',
      title: 'Props Check',
      submission_deadline: '2026-08-01',
    }

    const result = grantDeadlineToGoogleEvent(opportunity)

    expect(result!.extendedProperties).toEqual({
      private: {
        aica_module: 'grants',
        aica_entity_id: 'grant-unique',
      },
    })
  })
})
