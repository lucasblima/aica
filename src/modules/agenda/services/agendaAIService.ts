/**
 * Agenda AI Agent Service
 *
 * Pure utility functions for the Agenda module's AI layer:
 * - detectConflicts: finds overlapping calendar events
 * - suggestTimeBlocks: suggests time blocks for tasks in calendar gaps
 * - generatePrepContext: formats meeting preparation context
 *
 * All functions are pure (no Supabase calls, no GeminiClient calls).
 * They process data that's already been fetched, making them easily testable.
 *
 * Used by:
 * - Frontend for local conflict detection
 * - gemini-chat Edge Function for AI-enhanced scheduling
 * - morning-briefing Edge Function for calendar highlights
 */

// =============================================================================
// Types
// =============================================================================

export interface AgendaCalendarEvent {
  id: string
  title: string
  start_time: string // ISO datetime
  end_time: string   // ISO datetime
  attendees?: string[]
}

export interface ConflictPair {
  event1: AgendaCalendarEvent
  event2: AgendaCalendarEvent
  overlapMinutes: number
}

export interface AgendaWorkItem {
  id: string
  title: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
}

export interface TimeBlockSuggestion {
  taskTitle: string
  suggestedStart: string
  suggestedEnd: string
  reason: string
}

export interface ContactInfo {
  name: string
  email?: string
  relationship_health?: number
  last_interaction?: string
}

// =============================================================================
// Priority ordering for task scheduling
// =============================================================================

const PRIORITY_ORDER: Record<AgendaWorkItem['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

// Default block duration per priority (in minutes)
const BLOCK_DURATION: Record<AgendaWorkItem['priority'], number> = {
  urgent: 60,
  high: 60,
  medium: 45,
  low: 30,
}

// =============================================================================
// detectConflicts
// =============================================================================

/**
 * Finds time overlaps between calendar events.
 *
 * Two events conflict if their time ranges overlap:
 *   event1.end > event2.start AND event2.end > event1.start
 *
 * Events that share an exact boundary (e.g., one ends at 10:00 and another
 * starts at 10:00) are NOT considered conflicting.
 *
 * @param events - Array of calendar events to check
 * @returns Array of conflict pairs with overlap duration in minutes
 */
export function detectConflicts(events: AgendaCalendarEvent[]): ConflictPair[] {
  if (events.length < 2) return []

  const conflicts: ConflictPair[] = []

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]
      const b = events[j]

      const aStart = new Date(a.start_time).getTime()
      const aEnd = new Date(a.end_time).getTime()
      const bStart = new Date(b.start_time).getTime()
      const bEnd = new Date(b.end_time).getTime()

      // Overlap exists when: aEnd > bStart AND bEnd > aStart
      if (aEnd > bStart && bEnd > aStart) {
        const overlapStart = Math.max(aStart, bStart)
        const overlapEnd = Math.min(aEnd, bEnd)
        const overlapMinutes = Math.round((overlapEnd - overlapStart) / (1000 * 60))

        if (overlapMinutes > 0) {
          conflicts.push({ event1: a, event2: b, overlapMinutes })
        }
      }
    }
  }

  return conflicts
}

// =============================================================================
// suggestTimeBlocks
// =============================================================================

/**
 * Finds gaps between existing events and suggests time blocks for pending tasks.
 *
 * Tasks are sorted by priority (urgent first, low last). Each task is assigned
 * to the first available gap that fits its default block duration.
 *
 * If no events exist, a default working window (08:00-18:00 on the current day)
 * is used.
 *
 * @param pendingTasks - Tasks needing time blocks, sorted by priority
 * @param events - Existing calendar events defining occupied time
 * @returns Suggested time blocks for each task that fits in a gap
 */
export function suggestTimeBlocks(
  pendingTasks: AgendaWorkItem[],
  events: AgendaCalendarEvent[],
): TimeBlockSuggestion[] {
  if (pendingTasks.length === 0) return []

  // Sort tasks by priority (urgent first)
  const sortedTasks = [...pendingTasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  )

  // Determine the day boundary from events, or default to today 08:00-18:00
  let dayStart: Date
  let dayEnd: Date

  if (events.length > 0) {
    const firstEventDate = new Date(events[0].start_time)
    dayStart = new Date(firstEventDate)
    dayStart.setUTCHours(8, 0, 0, 0)
    dayEnd = new Date(firstEventDate)
    dayEnd.setUTCHours(18, 0, 0, 0)
  } else {
    dayStart = new Date()
    dayStart.setUTCHours(8, 0, 0, 0)
    dayEnd = new Date()
    dayEnd.setUTCHours(18, 0, 0, 0)
  }

  // Sort events by start time
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  // Find gaps between events
  interface Gap {
    start: Date
    end: Date
    durationMinutes: number
  }

  const gaps: Gap[] = []

  // Gap before first event
  if (sortedEvents.length === 0) {
    const durationMinutes = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60)
    gaps.push({ start: dayStart, end: dayEnd, durationMinutes })
  } else {
    const firstStart = new Date(sortedEvents[0].start_time)
    if (firstStart.getTime() > dayStart.getTime()) {
      const durationMinutes = (firstStart.getTime() - dayStart.getTime()) / (1000 * 60)
      if (durationMinutes >= 15) {
        gaps.push({ start: dayStart, end: firstStart, durationMinutes })
      }
    }

    // Gaps between events
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = new Date(sortedEvents[i].end_time)
      const nextStart = new Date(sortedEvents[i + 1].start_time)
      const durationMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)

      if (durationMinutes >= 15) {
        gaps.push({ start: currentEnd, end: nextStart, durationMinutes })
      }
    }

    // Gap after last event
    const lastEnd = new Date(sortedEvents[sortedEvents.length - 1].end_time)
    if (lastEnd.getTime() < dayEnd.getTime()) {
      const durationMinutes = (dayEnd.getTime() - lastEnd.getTime()) / (1000 * 60)
      if (durationMinutes >= 15) {
        gaps.push({ start: lastEnd, end: dayEnd, durationMinutes })
      }
    }
  }

  // Assign tasks to gaps
  const suggestions: TimeBlockSuggestion[] = []
  const usedGapTime: Map<number, number> = new Map() // gap index -> used ms offset

  for (const task of sortedTasks) {
    const blockDuration = BLOCK_DURATION[task.priority]

    for (let g = 0; g < gaps.length; g++) {
      const gap = gaps[g]
      const usedOffset = usedGapTime.get(g) ?? 0
      const availableStart = new Date(gap.start.getTime() + usedOffset)
      const availableMinutes = (gap.end.getTime() - availableStart.getTime()) / (1000 * 60)

      if (availableMinutes >= blockDuration) {
        const suggestedStart = availableStart.toISOString()
        const suggestedEnd = new Date(availableStart.getTime() + blockDuration * 60 * 1000).toISOString()

        suggestions.push({
          taskTitle: task.title,
          suggestedStart,
          suggestedEnd,
          reason: `${task.priority} priority — ${blockDuration}min block in ${Math.round(availableMinutes)}min gap`,
        })

        usedGapTime.set(g, usedOffset + blockDuration * 60 * 1000)
        break
      }
    }
  }

  return suggestions
}

// =============================================================================
// generatePrepContext
// =============================================================================

/**
 * Formats preparation context for a meeting.
 *
 * Looks up attendees in the contacts list and formats a human-readable string
 * with attendee info and relationship context.
 *
 * @param event - Calendar event to prepare for
 * @param contacts - Known contacts with relationship data
 * @returns Formatted preparation context string
 */
export function generatePrepContext(
  event: AgendaCalendarEvent,
  contacts: ContactInfo[],
): string {
  const lines: string[] = []

  lines.push(`Meeting: ${event.title}`)
  lines.push(`Time: ${event.start_time} — ${event.end_time}`)
  lines.push('')

  const attendees = event.attendees ?? []

  if (attendees.length === 0) {
    lines.push('No attendees listed.')
    return lines.join('\n')
  }

  lines.push(`Attendees (${attendees.length}):`)

  for (const attendeeEmail of attendees) {
    const contact = contacts.find(
      (c) => c.email?.toLowerCase() === attendeeEmail.toLowerCase(),
    )

    if (contact) {
      const parts: string[] = [`  - ${contact.name} (${attendeeEmail})`]

      if (contact.relationship_health !== undefined) {
        parts.push(`    Relationship health: ${contact.relationship_health}/100`)
      }

      if (contact.last_interaction) {
        parts.push(`    Last interaction: ${contact.last_interaction}`)
      }

      lines.push(parts.join('\n'))
    } else {
      lines.push(`  - ${attendeeEmail} (not in contacts)`)
    }
  }

  return lines.join('\n')
}
