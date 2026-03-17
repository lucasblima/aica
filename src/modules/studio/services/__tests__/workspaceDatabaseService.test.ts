/**
 * Unit Tests for workspaceDatabaseService — Normalized Schema
 *
 * Tests cover:
 * - fetchEpisodeProduction: returns production data, returns null for missing, handles errors
 * - saveEpisodeProduction: upserts correctly, performs dual-write, handles errors
 * - fetchEpisodePublication: returns publication data, returns null for missing
 * - saveEpisodePublication: upserts correctly, performs dual-write, handles errors
 *
 * @see src/modules/studio/services/workspaceDatabaseService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// =============================================================================
// MOCKS
// =============================================================================

// Track table operations
const tableData: Record<string, { selectResult: any; upsertResult: any; updateError: any }> = {}

function getTableConfig(table: string) {
  if (!tableData[table]) {
    tableData[table] = {
      selectResult: { data: null, error: null },
      upsertResult: { data: null, error: null },
      updateError: null,
    }
  }
  return tableData[table]
}

function buildSelectChain(table: string): any {
  const config = getTableConfig(table)
  const promise = Promise.resolve(config.selectResult)
  const chain: any = {}
  chain.then = promise.then.bind(promise)
  chain.catch = promise.catch.bind(promise)
  chain.eq = vi.fn().mockImplementation(() => chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockImplementation(() => {
    const singlePromise = Promise.resolve(config.selectResult)
    return {
      then: singlePromise.then.bind(singlePromise),
      catch: singlePromise.catch.bind(singlePromise),
    }
  })
  chain.single = vi.fn().mockImplementation(() => {
    const singlePromise = Promise.resolve(config.selectResult)
    return {
      then: singlePromise.then.bind(singlePromise),
      catch: singlePromise.catch.bind(singlePromise),
    }
  })
  return chain
}

function buildUpsertChain(table: string): any {
  const config = getTableConfig(table)
  const chain: any = {}
  const promise = Promise.resolve(config.upsertResult)
  chain.then = promise.then.bind(promise)
  chain.catch = promise.catch.bind(promise)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockImplementation(() => {
    const singlePromise = Promise.resolve(config.upsertResult)
    return {
      then: singlePromise.then.bind(singlePromise),
      catch: singlePromise.catch.bind(singlePromise),
    }
  })
  return chain
}

function buildUpdateChain(table: string): any {
  const config = getTableConfig(table)
  const promise = Promise.resolve({ error: config.updateError })
  const chain: any = {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    eq: vi.fn().mockReturnValue({
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      select: vi.fn().mockReturnValue({
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        single: vi.fn().mockReturnValue({
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
        }),
      }),
    }),
  }
  return chain
}

const mockFrom = vi.fn().mockImplementation((table: string) => ({
  select: vi.fn().mockImplementation(() => buildSelectChain(table)),
  upsert: vi.fn().mockImplementation(() => buildUpsertChain(table)),
  update: vi.fn().mockImplementation(() => buildUpdateChain(table)),
  insert: vi.fn().mockImplementation(() => buildUpsertChain(table)),
  delete: vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })),
}))

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
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

vi.mock('@/services/calendarSyncService', () => ({
  syncEntityToGoogle: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/calendarSyncTransforms', () => ({
  studioEpisodeToGoogleEvent: vi.fn().mockReturnValue({}),
}))

vi.mock('@/services/googleAuthService', () => ({
  isGoogleCalendarConnected: vi.fn().mockResolvedValue(false),
}))

vi.mock('./crossModuleService', () => ({
  awardEpisodeCompletionCP: vi.fn().mockResolvedValue(null),
}))

// Import AFTER mocking
import {
  fetchEpisodeProduction,
  saveEpisodeProduction,
  fetchEpisodePublication,
  saveEpisodePublication,
} from '../workspaceDatabaseService'

// =============================================================================
// TESTS
// =============================================================================

describe('workspaceDatabaseService — Normalized Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset table data
    for (const key of Object.keys(tableData)) delete tableData[key]
  })

  // ===========================================================================
  // fetchEpisodeProduction
  // ===========================================================================

  describe('fetchEpisodeProduction', () => {
    it('should return production data mapped to camelCase', async () => {
      getTableConfig('podcast_episode_production').selectResult = {
        data: {
          id: 'prod-1',
          episode_id: 'ep-1',
          recording_status: 'recording',
          recording_started_at: '2026-03-09T10:00:00Z',
          recording_finished_at: null,
          recording_duration: 1200,
          recording_file_path: '/áudio/ep1.mp3',
          recording_file_size: 5000000,
          transcript: 'Hello world',
          transcript_generated_at: '2026-03-09T11:00:00Z',
          created_at: '2026-03-09T09:00:00Z',
          updated_at: '2026-03-09T10:00:00Z',
        },
        error: null,
      }

      const result = await fetchEpisodeProduction('ep-1')

      expect(mockFrom).toHaveBeenCalledWith('podcast_episode_production')
      expect(result).not.toBeNull()
      expect(result!.episodeId).toBe('ep-1')
      expect(result!.recordingStatus).toBe('recording')
      expect(result!.recordingDuration).toBe(1200)
      expect(result!.recordingFilePath).toBe('/áudio/ep1.mp3')
      expect(result!.transcript).toBe('Hello world')
    })

    it('should return null when no production row exists', async () => {
      getTableConfig('podcast_episode_production').selectResult = {
        data: null,
        error: null,
      }

      const result = await fetchEpisodeProduction('ep-nonexistent')

      expect(result).toBeNull()
    })

    it('should return null on query error', async () => {
      getTableConfig('podcast_episode_production').selectResult = {
        data: null,
        error: { message: 'table not found' },
      }

      const result = await fetchEpisodeProduction('ep-1')

      expect(result).toBeNull()
    })

    it('should default recordingStatus to idle when null', async () => {
      getTableConfig('podcast_episode_production').selectResult = {
        data: {
          id: 'prod-2',
          episode_id: 'ep-2',
          recording_status: null,
          recording_started_at: null,
          recording_finished_at: null,
          recording_duration: null,
          recording_file_path: null,
          recording_file_size: null,
          transcript: null,
          transcript_generated_at: null,
          created_at: '2026-03-09T09:00:00Z',
          updated_at: '2026-03-09T09:00:00Z',
        },
        error: null,
      }

      const result = await fetchEpisodeProduction('ep-2')

      expect(result).not.toBeNull()
      expect(result!.recordingStatus).toBe('idle')
    })
  })

  // ===========================================================================
  // saveEpisodeProduction
  // ===========================================================================

  describe('saveEpisodeProduction', () => {
    it('should upsert production data and return mapped result', async () => {
      getTableConfig('podcast_episode_production').upsertResult = {
        data: {
          id: 'prod-1',
          episode_id: 'ep-1',
          recording_status: 'finished',
          recording_started_at: '2026-03-09T10:00:00Z',
          recording_finished_at: '2026-03-09T11:30:00Z',
          recording_duration: 5400,
          recording_file_path: '/áudio/ep1.mp3',
          recording_file_size: 12000000,
          transcript: null,
          transcript_generated_at: null,
          created_at: '2026-03-09T09:00:00Z',
          updated_at: '2026-03-09T11:30:00Z',
        },
        error: null,
      }
      // Dual-write to podcast_episodes should not error
      getTableConfig('podcast_episodes').updateError = null

      const result = await saveEpisodeProduction('ep-1', {
        recordingStatus: 'finished',
        recordingDuration: 5400,
        recordingFinishedAt: '2026-03-09T11:30:00Z',
      })

      expect(mockFrom).toHaveBeenCalledWith('podcast_episode_production')
      expect(result).not.toBeNull()
      expect(result!.recordingStatus).toBe('finished')
      expect(result!.recordingDuration).toBe(5400)
    })

    it('should perform dual-write to podcast_episodes for backward compat', async () => {
      getTableConfig('podcast_episode_production').upsertResult = {
        data: {
          id: 'prod-1',
          episode_id: 'ep-1',
          recording_status: 'recording',
          recording_started_at: null,
          recording_finished_at: null,
          recording_duration: null,
          recording_file_path: null,
          recording_file_size: null,
          transcript: null,
          transcript_generated_at: null,
          created_at: '2026-03-09T09:00:00Z',
          updated_at: '2026-03-09T09:00:00Z',
        },
        error: null,
      }

      await saveEpisodeProduction('ep-1', { recordingStatus: 'recording' })

      // Should call from('podcast_episodes') for dual-write
      expect(mockFrom).toHaveBeenCalledWith('podcast_episodes')
    })

    it('should return null on upsert error', async () => {
      getTableConfig('podcast_episode_production').upsertResult = {
        data: null,
        error: { message: 'upsert failed' },
      }

      const result = await saveEpisodeProduction('ep-1', {
        recordingStatus: 'finished',
      })

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // fetchEpisodePublication
  // ===========================================================================

  describe('fetchEpisodePublication', () => {
    it('should return publication data mapped to camelCase', async () => {
      getTableConfig('podcast_episode_publication').selectResult = {
        data: {
          id: 'pub-1',
          episode_id: 'ep-1',
          cuts_generated: true,
          cuts_metadata: { cuts: ['cut1', 'cut2'] },
          blog_post_generated: true,
          blog_post_url: 'https://blog.example.com/ep1',
          published_to_social: ['twitter', 'linkedin'],
          narrative_tension_score: 0.85,
          peak_end_moments: [{ timestamp: 15, tension: 0.9 }],
          created_at: '2026-03-09T12:00:00Z',
          updated_at: '2026-03-09T12:00:00Z',
        },
        error: null,
      }

      const result = await fetchEpisodePublication('ep-1')

      expect(mockFrom).toHaveBeenCalledWith('podcast_episode_publication')
      expect(result).not.toBeNull()
      expect(result!.episodeId).toBe('ep-1')
      expect(result!.cutsGenerated).toBe(true)
      expect(result!.blogPostUrl).toBe('https://blog.example.com/ep1')
      expect(result!.narrativeTensionScore).toBe(0.85)
    })

    it('should return null when no publication row exists', async () => {
      getTableConfig('podcast_episode_publication').selectResult = {
        data: null,
        error: null,
      }

      const result = await fetchEpisodePublication('ep-nonexistent')

      expect(result).toBeNull()
    })

    it('should return null on query error', async () => {
      getTableConfig('podcast_episode_publication').selectResult = {
        data: null,
        error: { message: 'relation does not exist' },
      }

      const result = await fetchEpisodePublication('ep-1')

      expect(result).toBeNull()
    })

    it('should default cutsGenerated and blogPostGenerated to false when null', async () => {
      getTableConfig('podcast_episode_publication').selectResult = {
        data: {
          id: 'pub-2',
          episode_id: 'ep-2',
          cuts_generated: null,
          cuts_metadata: null,
          blog_post_generated: null,
          blog_post_url: null,
          published_to_social: null,
          narrative_tension_score: null,
          peak_end_moments: null,
          created_at: '2026-03-09T12:00:00Z',
          updated_at: '2026-03-09T12:00:00Z',
        },
        error: null,
      }

      const result = await fetchEpisodePublication('ep-2')

      expect(result).not.toBeNull()
      expect(result!.cutsGenerated).toBe(false)
      expect(result!.blogPostGenerated).toBe(false)
    })
  })

  // ===========================================================================
  // saveEpisodePublication
  // ===========================================================================

  describe('saveEpisodePublication', () => {
    it('should upsert publication data and return mapped result', async () => {
      getTableConfig('podcast_episode_publication').upsertResult = {
        data: {
          id: 'pub-1',
          episode_id: 'ep-1',
          cuts_generated: true,
          cuts_metadata: { cuts: ['intro', 'main'] },
          blog_post_generated: false,
          blog_post_url: null,
          published_to_social: null,
          narrative_tension_score: 0.72,
          peak_end_moments: null,
          created_at: '2026-03-09T12:00:00Z',
          updated_at: '2026-03-09T12:30:00Z',
        },
        error: null,
      }
      getTableConfig('podcast_episodes').updateError = null

      const result = await saveEpisodePublication('ep-1', {
        cutsGenerated: true,
        cutsMetadata: [{ start_time: 0, end_time: 30, title: 'intro', platform: 'youtube' }, { start_time: 30, end_time: 120, title: 'main', platform: 'spotify' }],
        narrativeTensionScore: 0.72,
      })

      expect(mockFrom).toHaveBeenCalledWith('podcast_episode_publication')
      expect(result).not.toBeNull()
      expect(result!.cutsGenerated).toBe(true)
      expect(result!.narrativeTensionScore).toBe(0.72)
    })

    it('should perform dual-write to podcast_episodes', async () => {
      getTableConfig('podcast_episode_publication').upsertResult = {
        data: {
          id: 'pub-1',
          episode_id: 'ep-1',
          cuts_generated: false,
          cuts_metadata: null,
          blog_post_generated: true,
          blog_post_url: 'https://blog.example.com/ep1',
          published_to_social: null,
          narrative_tension_score: null,
          peak_end_moments: null,
          created_at: '2026-03-09T12:00:00Z',
          updated_at: '2026-03-09T12:00:00Z',
        },
        error: null,
      }

      await saveEpisodePublication('ep-1', {
        blogPostGenerated: true,
        blogPostUrl: 'https://blog.example.com/ep1',
      })

      // Should call from('podcast_episodes') for backward compat write
      expect(mockFrom).toHaveBeenCalledWith('podcast_episodes')
    })

    it('should return null on upsert error', async () => {
      getTableConfig('podcast_episode_publication').upsertResult = {
        data: null,
        error: { message: 'upsert failed' },
      }

      const result = await saveEpisodePublication('ep-1', {
        cutsGenerated: true,
      })

      expect(result).toBeNull()
    })
  })
})
