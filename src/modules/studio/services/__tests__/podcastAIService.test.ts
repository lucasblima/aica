/**
 * Unit Tests for podcastAIService
 *
 * Tests cover:
 * - searchGuestProfile: correct GeminiClient call, formatted results, error fallback
 * - generateDossier: API call, response parsing, existingResearch path, error fallback
 * - generateMoreIceBreakers: payload construction, response handling, error fallback
 * - deepResearchGuest: Edge Function invocation, auth, error handling
 *
 * @see src/modules/studio/services/podcastAIService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted runs BEFORE vi.mock hoisting — lets us reference mocks inside vi.mock factories
const {
  mockGeminiCall,
  mockSupabaseInvoke,
  mockGetCachedSession,
} = vi.hoisted(() => ({
  mockGeminiCall: vi.fn(),
  mockSupabaseInvoke: vi.fn(),
  mockGetCachedSession: vi.fn(),
}))

// Mock GeminiClient singleton
vi.mock('@/lib/gemini', () => ({
  GeminiClient: {
    getInstance: () => ({
      call: mockGeminiCall,
    }),
  },
}))

// Mock supabaseClient
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: mockSupabaseInvoke,
    },
  },
}))

// Mock authCacheService
vi.mock('@/services/authCacheService', () => ({
  getCachedSession: mockGetCachedSession,
}))

// Mock logger
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
  searchGuestProfile,
  generateDossier,
  generateMoreIceBreakers,
  deepResearchGuest,
  suggestTrendingGuest,
  suggestTrendingTheme,
} from '../podcastAIService'
import type { DeepResearchResult } from '../../types'

describe('podcastAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // searchGuestProfile
  // ==========================================================================

  describe('searchGuestProfile', () => {
    it('should call GeminiClient with correct action and payload', async () => {
      mockGeminiCall.mockResolvedValue({
        result: {
          name: 'Bill Gates',
          reference: 'Microsoft Founder',
          bio: 'Co-founder of Microsoft Corporation.',
          socialMedia: { twitter: '@BillGates' },
          recentActivity: ['Released new book'],
          relevance: 0.9,
        },
      })

      await searchGuestProfile('Bill Gates', 'Microsoft Founder')

      expect(mockGeminiCall).toHaveBeenCalledWith({
        action: 'intelligent_search',
        payload: { query: 'Bill Gates', context: 'Microsoft Founder' },
        model: 'smart',
      })
    })

    it('should return formatted search result with all fields', async () => {
      mockGeminiCall.mockResolvedValue({
        result: {
          name: 'Elon Musk',
          reference: 'Tesla CEO',
          bio: 'CEO of Tesla and SpaceX.',
          socialMedia: { twitter: '@elonmusk', instagram: '@elonmusk' },
          recentActivity: ['Launched Starship', 'Acquired Twitter'],
          relevance: 0.95,
        },
      })

      const result = await searchGuestProfile('Elon Musk', 'Tesla CEO')

      expect(result.name).toBe('Elon Musk')
      expect(result.reference).toBe('Tesla CEO')
      expect(result.bio).toBe('CEO of Tesla and SpaceX.')
      expect(result.socialMedia?.twitter).toBe('@elonmusk')
      expect(result.recentActivity).toHaveLength(2)
      expect(result.relevance).toBe(0.95)
    })

    it('should parse string response (JSON stringified result)', async () => {
      mockGeminiCall.mockResolvedValue({
        result: JSON.stringify({
          name: 'Ada Lovelace',
          bio: 'First computer programmer.',
          relevance: 0.8,
        }),
      })

      const result = await searchGuestProfile('Ada Lovelace', 'Computing pioneer')

      expect(result.name).toBe('Ada Lovelace')
      expect(result.bio).toBe('First computer programmer.')
      expect(result.relevance).toBe(0.8)
    })

    it('should return fallback result on API error', async () => {
      mockGeminiCall.mockRejectedValue(new Error('Network error'))

      const result = await searchGuestProfile('Unknown Person', 'Test')

      expect(result.name).toBe('Unknown Person')
      expect(result.reference).toBe('Test')
      expect(result.bio).toContain('poss')
      expect(result.relevance).toBe(0)
    })
  })

  // ==========================================================================
  // generateDossier
  // ==========================================================================

  describe('generateDossier', () => {
    it('should call GeminiClient with correct payload', async () => {
      mockGeminiCall.mockResolvedValue({
        result: {
          biography: 'A famous entrepreneur.',
          controversies: ['Labor practices'],
          suggestedTopics: ['Innovation', 'Leadership'],
          iceBreakers: ['What inspires you?'],
        },
      })

      await generateDossier('Elon Musk', 'Inovacao')

      expect(mockGeminiCall).toHaveBeenCalledWith({
        action: 'generate_dossier',
        payload: {
          guestName: 'Elon Musk',
          theme: 'Inovacao',
          customSources: undefined,
        },
        model: 'smart',
      })
    })

    it('should return structured dossier from API response', async () => {
      mockGeminiCall.mockResolvedValue({
        result: {
          biography: 'Detailed biography of the guest.',
          controversies: ['Controversy A', 'Controversy B'],
          suggestedTopics: ['Topic 1', 'Topic 2'],
          iceBreakers: ['Question 1', 'Question 2'],
          technicalSheet: { fullName: 'Full Name Here' },
        },
      })

      const dossier = await generateDossier('Test Guest', 'Test Theme')

      expect(dossier.guestName).toBe('Test Guest')
      expect(dossier.episodeTheme).toBe('Test Theme')
      expect(dossier.biography).toBe('Detailed biography of the guest.')
      expect(dossier.controversies).toEqual(['Controversy A', 'Controversy B'])
      expect(dossier.suggestedTopics).toEqual(['Topic 1', 'Topic 2'])
      expect(dossier.iceBreakers).toEqual(['Question 1', 'Question 2'])
      expect(dossier.technicalSheet?.fullName).toBe('Full Name Here')
    })

    it('should derive theme when not provided', async () => {
      mockGeminiCall.mockResolvedValue({
        result: {
          biography: 'Bio text.',
          derivedTheme: 'AI and Machine Learning',
          controversies: [],
          suggestedTopics: [],
          iceBreakers: [],
        },
      })

      const dossier = await generateDossier('Guest Name')

      expect(dossier.episodeTheme).toBe('AI and Machine Learning')
    })

    it('should convert existingResearch to dossier without API call', async () => {
      const existingResearch: DeepResearchResult = {
        dossier: {
          biography: 'Pre-researched biography.',
          controversies: [{ title: 'Controversy X', description: 'Details', severity: 'medium' }],
          iceBreakers: ['Pre-existing question'],
          technicalSheet: { fullName: 'John Doe' },
        },
        sources: [],
        suggestedThemes: ['Existing Theme'],
        researchDepth: 'standard',
        completedAt: new Date().toISOString(),
      }

      const dossier = await generateDossier('John Doe', 'Custom Theme', undefined, existingResearch)

      expect(mockGeminiCall).not.toHaveBeenCalled()
      expect(dossier.guestName).toBe('John Doe')
      expect(dossier.episodeTheme).toBe('Custom Theme')
      expect(dossier.biography).toBe('Pre-researched biography.')
      expect(dossier.iceBreakers).toEqual(['Pre-existing question'])
    })

    it('should return fallback dossier on API error', async () => {
      mockGeminiCall.mockRejectedValue(new Error('API timeout'))

      const dossier = await generateDossier('Guest Name', 'Theme')

      expect(dossier.guestName).toBe('Guest Name')
      expect(dossier.episodeTheme).toBe('Theme')
      expect(dossier.biography).toContain('poss')
      expect(dossier.controversies).toEqual([])
      expect(dossier.suggestedTopics).toEqual([])
      expect(dossier.iceBreakers).toEqual([])
    })
  })

  // ==========================================================================
  // generateMoreIceBreakers
  // ==========================================================================

  describe('generateMoreIceBreakers', () => {
    it('should call GeminiClient with guest context and existing breakers', async () => {
      mockGeminiCall.mockResolvedValue({
        result: ['New question 1?', 'New question 2?', 'New question 3?'],
      })

      const existing = ['Existing question 1?']
      await generateMoreIceBreakers('Guest Name', 'Theme', existing, 3)

      expect(mockGeminiCall).toHaveBeenCalledWith({
        action: 'generate_ice_breakers',
        payload: {
          guestName: 'Guest Name',
          theme: 'Theme',
          existing: ['Existing question 1?'],
          count: 3,
        },
        model: 'smart',
      })
    })

    it('should return array of ice breaker questions', async () => {
      const mockBreakers = ['Q1?', 'Q2?', 'Q3?']
      mockGeminiCall.mockResolvedValue({ result: mockBreakers })

      const result = await generateMoreIceBreakers('Guest', 'Theme', [], 3)

      expect(result).toEqual(mockBreakers)
      expect(result).toHaveLength(3)
    })

    it('should return empty array on API error', async () => {
      mockGeminiCall.mockRejectedValue(new Error('Service unavailable'))

      const result = await generateMoreIceBreakers('Guest', 'Theme', [])

      expect(result).toEqual([])
    })
  })

  // ==========================================================================
  // deepResearchGuest
  // ==========================================================================

  describe('deepResearchGuest', () => {
    const mockSession = {
      session: { access_token: 'test-token-abc123' },
      error: null,
    }

    it('should call Edge Function with auth header', async () => {
      mockGetCachedSession.mockResolvedValue(mockSession)
      mockSupabaseInvoke.mockResolvedValue({
        data: {
          success: true,
          data: {
            dossier: { biography: 'Bio', controversies: [], iceBreakers: [] },
            sources: [{ title: 'Source 1' }],
            suggestedThemes: ['Theme 1'],
            researchDepth: 'standard',
          },
        },
        error: null,
      })

      const result = await deepResearchGuest('Guest', 'Context', 'standard')

      expect(mockSupabaseInvoke).toHaveBeenCalledWith('studio-deep-research', {
        body: { guestName: 'Guest', guestContext: 'Context', researchDepth: 'standard' },
        headers: { Authorization: 'Bearer test-token-abc123' },
      })
      expect(result.sources).toHaveLength(1)
    })

    it('should throw on authentication failure', async () => {
      mockGetCachedSession.mockResolvedValue({
        session: null,
        error: new Error('Not authenticated'),
      })

      await expect(deepResearchGuest('Guest', 'Context')).rejects.toThrow(
        'Authentication required'
      )
    })

    it('should throw on Edge Function error', async () => {
      mockGetCachedSession.mockResolvedValue(mockSession)
      mockSupabaseInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Internal Server Error' },
      })

      await expect(deepResearchGuest('Guest', 'Context')).rejects.toThrow(
        'Internal Server Error'
      )
    })
  })

  // ==========================================================================
  // suggestTrendingGuest / suggestTrendingTheme
  // ==========================================================================

  describe('suggestTrendingGuest', () => {
    it('should return suggested guest name', async () => {
      mockGeminiCall.mockResolvedValue({ result: 'Yuval Noah Harari' })

      const result = await suggestTrendingGuest()

      expect(result).toBe('Yuval Noah Harari')
      expect(mockGeminiCall).toHaveBeenCalledWith({
        action: 'suggest_guest',
        payload: {},
        model: 'smart',
      })
    })

    it('should return empty string on error', async () => {
      mockGeminiCall.mockRejectedValue(new Error('fail'))

      const result = await suggestTrendingGuest()

      expect(result).toBe('')
    })
  })

  describe('suggestTrendingTheme', () => {
    it('should return suggested theme for guest', async () => {
      mockGeminiCall.mockResolvedValue({ result: 'Inteligencia Artificial' })

      const result = await suggestTrendingTheme('Elon Musk')

      expect(result).toBe('Inteligencia Artificial')
      expect(mockGeminiCall).toHaveBeenCalledWith({
        action: 'suggest_topic',
        payload: { guestName: 'Elon Musk' },
        model: 'smart',
      })
    })
  })
})
