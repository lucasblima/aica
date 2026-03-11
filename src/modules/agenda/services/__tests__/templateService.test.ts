/**
 * Unit Tests for templateService
 *
 * Tests cover:
 * - getSystemTemplates: returns built-in routine templates
 * - getTemplateById: retrieves templates by ID
 * - applyTemplate: creates work_items from template (Supabase mocked)
 * - Template data integrity: valid RRULE, valid times, correct structure
 *
 * @see src/modules/agenda/services/templateService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────

const mockInsert = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: (...args: unknown[]) => {
        mockInsert(...args)
        return { select: mockSelect }
      },
    })),
  },
}))

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import {
  getSystemTemplates,
  getTemplateById,
  applyTemplate,
  type RoutineTemplate,
  type RoutineTemplateItem,
} from '../templateService'

// =============================================================================
// getSystemTemplates
// =============================================================================

describe('getSystemTemplates', () => {
  it('should return at least 3 built-in templates', () => {
    const templates = getSystemTemplates()
    expect(templates.length).toBeGreaterThanOrEqual(3)
  })

  it('should mark all system templates as isSystem: true', () => {
    const templates = getSystemTemplates()
    templates.forEach(t => {
      expect(t.isSystem).toBe(true)
    })
  })

  it('should include morning routine template', () => {
    const templates = getSystemTemplates()
    const morning = templates.find(t => t.id === 'morning-routine')
    expect(morning).toBeDefined()
    expect(morning!.name).toContain('Matinal')
  })

  it('should include work day template', () => {
    const templates = getSystemTemplates()
    const workDay = templates.find(t => t.id === 'work-day')
    expect(workDay).toBeDefined()
    expect(workDay!.name).toContain('Trabalho')
  })

  it('should include health basics template', () => {
    const templates = getSystemTemplates()
    const health = templates.find(t => t.id === 'health-basics')
    expect(health).toBeDefined()
  })

  it('all templates should have valid structure', () => {
    const templates = getSystemTemplates()
    templates.forEach(t => {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.icon).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(t.items.length).toBeGreaterThan(0)
    })
  })

  it('all template items should have valid RRULE strings', () => {
    const templates = getSystemTemplates()
    templates.forEach(t => {
      t.items.forEach(item => {
        expect(item.recurrenceRule).toContain('FREQ=')
      })
    })
  })

  it('all template items should have valid HH:mm scheduled times', () => {
    const timeRegex = /^\d{2}:\d{2}$/
    const templates = getSystemTemplates()
    templates.forEach(t => {
      t.items.forEach(item => {
        expect(item.scheduledTime).toMatch(timeRegex)
      })
    })
  })

  it('all template items should have positive estimated durations', () => {
    const templates = getSystemTemplates()
    templates.forEach(t => {
      t.items.forEach(item => {
        expect(item.estimatedDuration).toBeGreaterThan(0)
      })
    })
  })
})

// =============================================================================
// getTemplateById
// =============================================================================

describe('getTemplateById', () => {
  it('should return the morning routine template by id', () => {
    const template = getTemplateById('morning-routine')
    expect(template).toBeDefined()
    expect(template!.id).toBe('morning-routine')
  })

  it('should return the work day template by id', () => {
    const template = getTemplateById('work-day')
    expect(template).toBeDefined()
    expect(template!.id).toBe('work-day')
  })

  it('should return undefined for non-existent template', () => {
    const template = getTemplateById('nonexistent')
    expect(template).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    const template = getTemplateById('')
    expect(template).toBeUndefined()
  })
})

// =============================================================================
// applyTemplate
// =============================================================================

describe('applyTemplate', () => {
  beforeEach(() => {
    mockInsert.mockClear()
    mockSelect.mockClear()
  })

  it('should create work_items for each template item', async () => {
    const mockData = [{ id: '1' }, { id: '2' }, { id: '3' }]
    mockSelect.mockResolvedValue({ data: mockData, error: null })

    const template = getTemplateById('morning-routine')!
    const count = await applyTemplate('user-123', template)

    expect(count).toBe(3)
    expect(mockInsert).toHaveBeenCalledTimes(1)

    // Verify the rows passed to insert
    const rows = mockInsert.mock.calls[0][0]
    expect(rows).toHaveLength(3)
    rows.forEach((row: Record<string, unknown>) => {
      expect(row.user_id).toBe('user-123')
      expect(row.status).toBe('pending')
      expect(row.is_completed).toBe(false)
      expect(row.archived).toBe(false)
    })
  })

  it('should set scheduled_time using today date + template time', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: '1' }], error: null })

    const template: RoutineTemplate = {
      id: 'test-template',
      name: 'Test',
      icon: 'T',
      description: 'Test template',
      isSystem: true,
      items: [
        { title: 'Task', scheduledTime: '09:30', estimatedDuration: 30, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
      ],
    }

    await applyTemplate('user-1', template)

    const rows = mockInsert.mock.calls[0][0]
    const todayStr = new Date().toISOString().split('T')[0]
    expect(rows[0].scheduled_time).toBe(`${todayStr}T09:30:00`)
  })

  it('should include recurrence_rule from template items', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: '1' }], error: null })

    const template: RoutineTemplate = {
      id: 'test-template',
      name: 'Test',
      icon: 'T',
      description: 'Test template',
      isSystem: true,
      items: [
        { title: 'Weekday task', scheduledTime: '08:00', estimatedDuration: 15, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
      ],
    }

    await applyTemplate('user-1', template)

    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].recurrence_rule).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
  })

  it('should include estimated_duration from template items', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: '1' }], error: null })

    const template: RoutineTemplate = {
      id: 'test-template',
      name: 'Test',
      icon: 'T',
      description: 'Test template',
      isSystem: true,
      items: [
        { title: 'Quick task', scheduledTime: '12:00', estimatedDuration: 10, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
      ],
    }

    await applyTemplate('user-1', template)

    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].estimated_duration).toBe(10)
  })

  it('should throw when Supabase insert fails', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'Insert failed', code: '23505' } })

    const template = getTemplateById('morning-routine')!

    await expect(applyTemplate('user-1', template)).rejects.toThrow()
  })

  it('should return 0 when insert returns empty data', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null })

    const template: RoutineTemplate = {
      id: 'empty-test',
      name: 'Empty',
      icon: 'E',
      description: 'Empty',
      isSystem: true,
      items: [
        { title: 'Task', scheduledTime: '08:00', estimatedDuration: 30, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
      ],
    }

    const count = await applyTemplate('user-1', template)
    expect(count).toBe(0)
  })
})
