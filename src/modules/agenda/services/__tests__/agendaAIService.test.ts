/**
 * Unit Tests for agendaAIService
 *
 * Tests cover:
 * - detectConflicts: finds overlapping calendar events
 * - suggestTimeBlocks: suggests time blocks for tasks in calendar gaps
 * - generatePrepContext: formats meeting preparation context
 *
 * All functions are pure (no Supabase, no AI calls).
 *
 * @see src/modules/agenda/services/agendaAIService.ts
 */

import { describe, it, expect } from 'vitest'

import {
  detectConflicts,
  suggestTimeBlocks,
  generatePrepContext,
} from '../agendaAIService'

import type {
  AgendaCalendarEvent,
  ConflictPair,
  AgendaWorkItem,
  TimeBlockSuggestion,
  ContactInfo,
} from '../agendaAIService'

// =============================================================================
// Test Fixtures
// =============================================================================

function makeEvent(overrides: Partial<AgendaCalendarEvent> & { id: string; title: string; start_time: string; end_time: string }): AgendaCalendarEvent {
  return { ...overrides }
}

// =============================================================================
// detectConflicts
// =============================================================================

describe('detectConflicts', () => {
  it('returns empty array when no events overlap', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'Meeting A', start_time: '2026-03-14T09:00:00Z', end_time: '2026-03-14T10:00:00Z' }),
      makeEvent({ id: '2', title: 'Meeting B', start_time: '2026-03-14T10:00:00Z', end_time: '2026-03-14T11:00:00Z' }),
      makeEvent({ id: '3', title: 'Meeting C', start_time: '2026-03-14T12:00:00Z', end_time: '2026-03-14T13:00:00Z' }),
    ]

    const conflicts = detectConflicts(events)
    expect(conflicts).toEqual([])
  })

  it('finds a conflict when two events overlap', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'Meeting A', start_time: '2026-03-14T09:00:00Z', end_time: '2026-03-14T10:30:00Z' }),
      makeEvent({ id: '2', title: 'Meeting B', start_time: '2026-03-14T10:00:00Z', end_time: '2026-03-14T11:00:00Z' }),
    ]

    const conflicts = detectConflicts(events)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].event1.id).toBe('1')
    expect(conflicts[0].event2.id).toBe('2')
    expect(conflicts[0].overlapMinutes).toBe(30)
  })

  it('finds multiple conflicts when several events overlap', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'A', start_time: '2026-03-14T09:00:00Z', end_time: '2026-03-14T11:00:00Z' }),
      makeEvent({ id: '2', title: 'B', start_time: '2026-03-14T10:00:00Z', end_time: '2026-03-14T12:00:00Z' }),
      makeEvent({ id: '3', title: 'C', start_time: '2026-03-14T10:30:00Z', end_time: '2026-03-14T11:30:00Z' }),
    ]

    const conflicts = detectConflicts(events)
    // A overlaps B (60 min), A overlaps C (30 min), B overlaps C (60 min)
    expect(conflicts).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(detectConflicts([])).toEqual([])
  })

  it('returns empty array for single event', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'Solo', start_time: '2026-03-14T09:00:00Z', end_time: '2026-03-14T10:00:00Z' }),
    ]
    expect(detectConflicts(events)).toEqual([])
  })

  it('does not count events that share an exact boundary as conflicting', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'A', start_time: '2026-03-14T09:00:00Z', end_time: '2026-03-14T10:00:00Z' }),
      makeEvent({ id: '2', title: 'B', start_time: '2026-03-14T10:00:00Z', end_time: '2026-03-14T11:00:00Z' }),
    ]
    expect(detectConflicts(events)).toEqual([])
  })
})

// =============================================================================
// suggestTimeBlocks
// =============================================================================

describe('suggestTimeBlocks', () => {
  it('suggests blocks in gaps between events', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'Early Morning', start_time: '2026-03-14T08:00:00Z', end_time: '2026-03-14T10:00:00Z' }),
      makeEvent({ id: '2', title: 'Lunch', start_time: '2026-03-14T12:00:00Z', end_time: '2026-03-14T13:00:00Z' }),
    ]
    const tasks: AgendaWorkItem[] = [
      { id: 't1', title: 'Write report', priority: 'high' },
    ]

    const suggestions = suggestTimeBlocks(tasks, events)
    expect(suggestions.length).toBeGreaterThanOrEqual(1)
    expect(suggestions[0].taskTitle).toBe('Write report')
    // The suggested block should be in the gap between 10:00 and 12:00
    const start = new Date(suggestions[0].suggestedStart)
    expect(start.getTime()).toBeGreaterThanOrEqual(new Date('2026-03-14T10:00:00Z').getTime())
    const end = new Date(suggestions[0].suggestedEnd)
    expect(end.getTime()).toBeLessThanOrEqual(new Date('2026-03-14T12:00:00Z').getTime())
  })

  it('returns empty array when no tasks provided', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'Meeting', start_time: '2026-03-14T09:00:00Z', end_time: '2026-03-14T10:00:00Z' }),
    ]
    expect(suggestTimeBlocks([], events)).toEqual([])
  })

  it('prioritizes urgent/high tasks over low priority', () => {
    const events: AgendaCalendarEvent[] = [
      makeEvent({ id: '1', title: 'Morning', start_time: '2026-03-14T09:00:00Z', end_time: '2026-03-14T10:00:00Z' }),
      makeEvent({ id: '2', title: 'Afternoon', start_time: '2026-03-14T14:00:00Z', end_time: '2026-03-14T15:00:00Z' }),
    ]
    const tasks: AgendaWorkItem[] = [
      { id: 't1', title: 'Low task', priority: 'low' },
      { id: 't2', title: 'Urgent task', priority: 'urgent' },
      { id: 't3', title: 'High task', priority: 'high' },
    ]

    const suggestions = suggestTimeBlocks(tasks, events)
    // Urgent and high tasks should appear before low
    const titles = suggestions.map(s => s.taskTitle)
    const urgentIndex = titles.indexOf('Urgent task')
    const lowIndex = titles.indexOf('Low task')
    if (urgentIndex !== -1 && lowIndex !== -1) {
      expect(urgentIndex).toBeLessThan(lowIndex)
    }
  })

  it('handles empty events list (full day available)', () => {
    const tasks: AgendaWorkItem[] = [
      { id: 't1', title: 'Deep work', priority: 'medium' },
    ]

    const suggestions = suggestTimeBlocks(tasks, [])
    expect(suggestions.length).toBeGreaterThanOrEqual(1)
    expect(suggestions[0].taskTitle).toBe('Deep work')
  })
})

// =============================================================================
// generatePrepContext
// =============================================================================

describe('generatePrepContext', () => {
  it('formats preparation context with attendee info', () => {
    const event: AgendaCalendarEvent = makeEvent({
      id: '1',
      title: 'Project Review',
      start_time: '2026-03-14T14:00:00Z',
      end_time: '2026-03-14T15:00:00Z',
      attendees: ['alice@example.com', 'bob@example.com'],
    })

    const contacts: ContactInfo[] = [
      { name: 'Alice Silva', email: 'alice@example.com', relationship_health: 85, last_interaction: '2026-03-10' },
      { name: 'Bob Costa', email: 'bob@example.com', relationship_health: 60 },
    ]

    const context = generatePrepContext(event, contacts)
    expect(context).toContain('Project Review')
    expect(context).toContain('Alice Silva')
    expect(context).toContain('Bob Costa')
  })

  it('handles event with no attendees', () => {
    const event: AgendaCalendarEvent = makeEvent({
      id: '1',
      title: 'Solo Focus Time',
      start_time: '2026-03-14T14:00:00Z',
      end_time: '2026-03-14T15:00:00Z',
    })

    const context = generatePrepContext(event, [])
    expect(context).toContain('Solo Focus Time')
  })

  it('handles attendees not found in contacts', () => {
    const event: AgendaCalendarEvent = makeEvent({
      id: '1',
      title: 'External Meeting',
      start_time: '2026-03-14T14:00:00Z',
      end_time: '2026-03-14T15:00:00Z',
      attendees: ['unknown@external.com'],
    })

    const contacts: ContactInfo[] = [
      { name: 'Alice Silva', email: 'alice@example.com' },
    ]

    const context = generatePrepContext(event, contacts)
    expect(context).toContain('External Meeting')
    expect(context).toContain('unknown@external.com')
  })
})
