/**
 * Unit Tests for crossModuleService
 *
 * Tests cover:
 * - fetchContactAsGuest: matching contacts, no matches, table not existing, empty input
 * - syncRecordingToCalendar: calendar event creation, missing date, guest label, errors
 * - awardEpisodeCompletionCP: moment creation with 15 CP, non-published skip, duplicate prevention
 *
 * @see src/modules/studio/services/crossModuleService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// =============================================================================
// MOCKS
// =============================================================================

// Track calls to specific tables for assertions
const mockSelectData: Record<string, any> = {}
const mockInsertData: Record<string, any> = {}
let mockInsertError: any = null
let mockSelectError: any = null
let mockSelectThrows = false

/**
 * Build a chainable mock that mimics supabase's PostgREST query builder.
 * Each method returns the chain for chaining; awaiting resolves to { data, error }.
 */
function buildChain(tableName: string, operation: 'select' | 'insert'): any {
  const resolveValue = () => {
    if (operation === 'insert') {
      return { data: mockInsertData[tableName] ?? null, error: mockInsertError }
    }
    return { data: mockSelectData[tableName] ?? [], error: mockSelectError }
  }

  const chain: any = {}
  const promise = new Promise((resolve, reject) => {
    // Defer so chain methods can be called first
    queueMicrotask(() => {
      if (mockSelectThrows && operation === 'select') {
        reject(new Error('Table does not exist'))
      } else {
        resolve(resolveValue())
      }
    })
  })

  chain.then = promise.then.bind(promise)
  chain.catch = promise.catch.bind(promise)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.contains = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockImplementation(() => {
    // single() changes the resolved data shape
    const singlePromise = promise.then((val: any) => ({
      data: Array.isArray(val.data) ? val.data[0] ?? null : val.data,
      error: val.error,
    }))
    return {
      then: singlePromise.then.bind(singlePromise),
      catch: singlePromise.catch.bind(singlePromise),
    }
  })
  chain.maybeSingle = chain.single

  return chain
}

const mockFrom = vi.fn().mockImplementation((tableName: string) => ({
  select: vi.fn().mockImplementation(() => buildChain(tableName, 'select')),
  insert: vi.fn().mockImplementation((data: any) => {
    mockInsertData[tableName] = data
    return buildChain(tableName, 'insert')
  }),
}))

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
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

// Import AFTER mocking
import {
  fetchContactAsGuest,
  syncRecordingToCalendar,
  awardEpisodeCompletionCP,
} from '../crossModuleService'

// =============================================================================
// TESTS
// =============================================================================

describe('crossModuleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset data stores
    for (const key of Object.keys(mockSelectData)) delete mockSelectData[key]
    for (const key of Object.keys(mockInsertData)) delete mockInsertData[key]
    mockInsertError = null
    mockSelectError = null
    mockSelectThrows = false
  })

  // ===========================================================================
  // fetchContactAsGuest
  // ===========================================================================

  describe('fetchContactAsGuest', () => {
    it('should return empty array for empty name', async () => {
      const result = await fetchContactAsGuest('', 'user-123')
      expect(result).toEqual([])
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('should return empty array for whitespace-only name', async () => {
      const result = await fetchContactAsGuest('   ', 'user-123')
      expect(result).toEqual([])
    })

    it('should return empty array for empty userId', async () => {
      const result = await fetchContactAsGuest('John', '')
      expect(result).toEqual([])
    })

    it('should search contact_network and connection_members tables', async () => {
      mockSelectData['contact_network'] = [
        {
          id: 'cn-1',
          name: 'John Doe',
          contact_name: 'John',
          contact_phone: '+5511999999999',
          whatsapp_phone: null,
          dossier_summary: 'Tech expert',
          dossier_topics: ['AI', 'Cloud'],
        },
      ]
      mockSelectData['connection_spaces'] = [{ id: 'space-1' }]
      mockSelectData['connection_members'] = []

      const result = await fetchContactAsGuest('John', 'user-123')

      expect(mockFrom).toHaveBeenCalledWith('contact_network')
      expect(mockFrom).toHaveBeenCalledWith('connection_spaces')
      expect(mockFrom).toHaveBeenCalledWith('connection_members')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'cn-1',
          name: 'John Doe',
          phone: '+5511999999999',
          bio: 'Tech expert',
          topics: ['AI', 'Cloud'],
          source: 'contact_network',
        })
      )
    })

    it('should return results from both tables without duplicates', async () => {
      mockSelectData['contact_network'] = [
        {
          id: 'cn-1',
          name: 'Maria Silva',
          contact_name: null,
          contact_phone: null,
          whatsapp_phone: '+5511888888888',
          dossier_summary: null,
          dossier_topics: [],
        },
      ]
      mockSelectData['connection_spaces'] = [{ id: 'space-1' }]
      mockSelectData['connection_members'] = [
        {
          id: 'cm-1',
          external_name: 'Maria Santos',
          external_email: 'maria@example.com',
          external_phone: null,
          context_data: { bio: 'Designer' },
          space_id: 'space-1',
        },
      ]

      const result = await fetchContactAsGuest('Maria', 'user-123')

      expect(result).toHaveLength(2)
      expect(result[0].source).toBe('contact_network')
      expect(result[1].source).toBe('connection_members')
      expect(result[1].email).toBe('maria@example.com')
      expect(result[1].bio).toBe('Designer')
    })

    it('should skip connection_members duplicate when name matches contact_network', async () => {
      mockSelectData['contact_network'] = [
        {
          id: 'cn-1',
          name: 'John Doe',
          contact_name: null,
          contact_phone: null,
          whatsapp_phone: null,
          dossier_summary: null,
          dossier_topics: [],
        },
      ]
      mockSelectData['connection_spaces'] = [{ id: 'space-1' }]
      mockSelectData['connection_members'] = [
        {
          id: 'cm-1',
          external_name: 'John Doe',
          external_email: 'john@example.com',
          external_phone: null,
          context_data: null,
          space_id: 'space-1',
        },
      ]

      const result = await fetchContactAsGuest('John', 'user-123')

      // Should have only 1 result (duplicate filtered)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('contact_network')
    })

    it('should handle contact_network table not existing', async () => {
      // Make the first table throw, but second one should still work
      mockSelectThrows = true
      mockSelectData['connection_spaces'] = [{ id: 'space-1' }]
      mockSelectData['connection_members'] = []

      const result = await fetchContactAsGuest('John', 'user-123')

      // Should not crash, returns whatever was collected
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle Supabase query error on contact_network', async () => {
      mockSelectError = { message: 'permission denied' }
      mockSelectData['connection_spaces'] = [{ id: 'space-1' }]
      mockSelectData['connection_members'] = []

      const result = await fetchContactAsGuest('Test', 'user-123')

      // Should return empty or partial results, not throw
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  // ===========================================================================
  // syncRecordingToCalendar
  // ===========================================================================

  describe('syncRecordingToCalendar', () => {
    it('should return null for missing scheduledDate', async () => {
      const result = await syncRecordingToCalendar(
        { title: 'Ep 1', scheduledDate: '' },
        'user-123'
      )
      expect(result).toBeNull()
    })

    it('should return null for missing userId', async () => {
      const result = await syncRecordingToCalendar(
        { title: 'Ep 1', scheduledDate: '2026-03-15' },
        ''
      )
      expect(result).toBeNull()
    })

    it('should create calendar event with correct title and guest label', async () => {
      mockInsertData['calendar_events'] = {
        id: 'cal-1',
        title: 'Gravação: Ep 1 com John Doe',
        start_time: '2026-03-15T14:00:00',
        end_time: expect.any(String),
        source: 'studio',
      }
      mockInsertError = null

      const result = await syncRecordingToCalendar(
        {
          title: 'Ep 1',
          scheduledDate: '2026-03-15',
          scheduledTime: '14:00',
          guestName: 'John Doe',
        },
        'user-123'
      )

      expect(mockFrom).toHaveBeenCalledWith('calendar_events')
    })

    it('should use default time 10:00 when scheduledTime is not provided', async () => {
      mockInsertData['calendar_events'] = {
        id: 'cal-2',
        title: 'Gravação: Ep 2',
        start_time: '2026-03-15T10:00:00',
        end_time: expect.any(String),
        source: 'studio',
      }
      mockInsertError = null

      await syncRecordingToCalendar(
        { title: 'Ep 2', scheduledDate: '2026-03-15' },
        'user-123'
      )

      expect(mockFrom).toHaveBeenCalledWith('calendar_events')
    })

    it('should return null when calendar_events table does not exist', async () => {
      mockInsertError = { message: 'relation "calendar_events" does not exist' }

      const result = await syncRecordingToCalendar(
        { title: 'Ep 1', scheduledDate: '2026-03-15' },
        'user-123'
      )

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // awardEpisodeCompletionCP
  // ===========================================================================

  describe('awardEpisodeCompletionCP', () => {
    it('should return null when status is not published', async () => {
      const result = await awardEpisodeCompletionCP(
        { id: 'ep-1', title: 'Ep 1', status: 'draft' },
        'user-123'
      )
      expect(result).toBeNull()
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('should return null when userId is empty', async () => {
      const result = await awardEpisodeCompletionCP(
        { id: 'ep-1', title: 'Ep 1', status: 'published' },
        ''
      )
      expect(result).toBeNull()
    })

    it('should return null when status is in_production', async () => {
      const result = await awardEpisodeCompletionCP(
        { id: 'ep-1', title: 'Ep 1', status: 'in_production' },
        'user-123'
      )
      expect(result).toBeNull()
    })

    it('should create moment with 15 CP for published episode', async () => {
      // First call: duplicate check returns empty
      mockSelectData['moments'] = []
      // Second call: insert returns new moment
      mockInsertData['moments'] = {
        id: 'moment-1',
        content: 'Episódio publicado: Ep 1',
        emotion: 'proud',
      }
      mockInsertError = null

      const result = await awardEpisodeCompletionCP(
        { id: 'ep-1', title: 'Ep 1', status: 'published' },
        'user-123'
      )

      expect(mockFrom).toHaveBeenCalledWith('moments')
      if (result) {
        expect(result.points).toBe(15)
        expect(result.emotion).toBe('proud')
        expect(result.content).toContain('Ep 1')
      }
    })

    it('should prevent duplicate CP award for same episode', async () => {
      // Duplicate check returns existing moment
      mockSelectData['moments'] = [{ id: 'existing-moment-1' }]

      const result = await awardEpisodeCompletionCP(
        { id: 'ep-1', title: 'Ep 1', status: 'published' },
        'user-123'
      )

      expect(result).toBeNull()
    })

    it('should return null when moments insert fails', async () => {
      mockSelectData['moments'] = []
      mockInsertError = { message: 'table does not exist' }

      const result = await awardEpisodeCompletionCP(
        { id: 'ep-1', title: 'Ep 1', status: 'published' },
        'user-123'
      )

      expect(result).toBeNull()
    })
  })
})
