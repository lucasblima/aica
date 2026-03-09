/**
 * Unit Tests for pautaGeneratorService
 *
 * Tests cover:
 * - generateCompletePauta: full flow, progress callbacks, validation
 * - compilePauta: confidence score calculation
 * - pautaToDossier: conversion to Dossier format
 * - questionsToTopics: conversion to Topic/Category format
 * - Error handling: fallbacks when AI steps fail
 * - Edge cases: empty guest name, missing fields
 *
 * @see src/modules/studio/services/pautaGeneratorService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted runs BEFORE vi.mock hoisting
const { mockGeminiCall } = vi.hoisted(() => ({
  mockGeminiCall: vi.fn(),
}))

// Mock GeminiClient singleton
vi.mock('@/lib/gemini/client', () => ({
  GeminiClient: {
    getInstance: () => ({
      call: mockGeminiCall,
    }),
  },
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
import { pautaGeneratorService } from '../pautaGeneratorService'
import type { GeneratedPauta, PautaGenerationRequest } from '../pautaGeneratorService'

describe('pautaGeneratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper: mock all 4 AI steps to return valid data
  function mockAllStepsSuccess() {
    // Step 1: Deep Research
    // Biography must be > 200 chars for confidence check (hasGoodBio)
    const longBio = 'A detailed biography that provides comprehensive context about the guest. ' +
      'This person has achieved significant milestones in their career spanning over two decades. ' +
      'Their contributions to the field of technology and innovation have been widely recognized by peers and industry experts alike.';
    mockGeminiCall.mockResolvedValueOnce({
      result: {
        biography: longBio,
        controversies: [
          { title: 'Controversy A', summary: 'Summary A', sentiment: 'negative' },
        ],
        keyFacts: ['Fact 1', 'Fact 2', 'Fact 3', 'Fact 4'],
        technicalSheet: { fullName: 'Test Guest Full Name', occupation: 'Engineer' },
        sourceCitations: [{ id: 1, title: 'Source 1', snippet: 'Excerpt', reliability: 'high' }],
        suggestedTheme: 'Innovation and Technology',
      },
    })

    // Step 2: Generate Outline
    mockGeminiCall.mockResolvedValueOnce({
      result: {
        title: 'Episode: Innovation with Test Guest',
        introduction: {
          title: 'Opening',
          description: 'Introduce guest',
          duration: 5,
          keyPoints: ['Welcome', 'Context'],
        },
        mainSections: [
          {
            title: 'Trajectory',
            description: 'Career path',
            duration: 20,
            keyPoints: ['Early career', 'Key milestones'],
          },
        ],
        conclusion: {
          title: 'Closing',
          description: 'Wrap up',
          duration: 5,
          keyPoints: ['Thanks', 'Future outlook'],
        },
      },
    })

    // Step 3: Generate Questions
    mockGeminiCall.mockResolvedValueOnce({
      result: {
        questions: [
          {
            id: 'q1',
            text: 'How did you start your career?',
            category: 'abertura',
            followUps: ['What motivated you?'],
            priority: 'high',
          },
          {
            id: 'q2',
            text: 'What was the biggest challenge?',
            category: 'desenvolvimento',
            followUps: ['How did you overcome it?'],
            priority: 'high',
          },
        ],
      },
    })

    // Step 4: Generate Ice Breakers
    mockGeminiCall.mockResolvedValueOnce({
      result: {
        iceBreakers: [
          'What was the last thing that made you laugh?',
          'What is your guilty pleasure?',
        ],
      },
    })
  }

  // ==========================================================================
  // generateCompletePauta
  // ==========================================================================

  describe('generateCompletePauta', () => {
    it('should generate a complete pauta with all sections', async () => {
      mockAllStepsSuccess()

      const request: PautaGenerationRequest = {
        guestName: 'Test Guest',
        theme: 'Innovation',
        duration: 60,
      }

      const pauta = await pautaGeneratorService.generateCompletePauta(request)

      expect(pauta.outline.title).toBe('Episode: Innovation with Test Guest')
      expect(pauta.questions).toHaveLength(2)
      expect(pauta.iceBreakers).toHaveLength(2)
      expect(pauta.biography).toContain('detailed biography that provides')
      expect(pauta.controversies).toHaveLength(1)
      expect(pauta.keyFacts).toHaveLength(4)
      expect(pauta.estimatedDuration).toBe(60)
    })

    it('should call onProgress callback at each step', async () => {
      mockAllStepsSuccess()

      const onProgress = vi.fn()
      const request: PautaGenerationRequest = {
        guestName: 'Test Guest',
        theme: 'Tech',
      }

      await pautaGeneratorService.generateCompletePauta(request, onProgress)

      // Progress should be called multiple times across all 5 steps
      expect(onProgress).toHaveBeenCalled()
      const calls = onProgress.mock.calls
      // Verify progress goes from low to 100
      const lastCall = calls[calls.length - 1]
      expect(lastCall[1]).toBe(100)
      // First call should start at a low percentage
      expect(calls[0][1]).toBeLessThan(25)
    })

    it('should throw error for empty guest name', async () => {
      const request: PautaGenerationRequest = {
        guestName: '',
        theme: 'Test',
      }

      await expect(
        pautaGeneratorService.generateCompletePauta(request)
      ).rejects.toThrow('Guest name is required')
    })

    it('should throw error for whitespace-only guest name', async () => {
      const request: PautaGenerationRequest = {
        guestName: '   ',
        theme: 'Test',
      }

      await expect(
        pautaGeneratorService.generateCompletePauta(request)
      ).rejects.toThrow('Guest name is required')
    })

    it('should produce valid pauta with fallback data when all AI steps fail', async () => {
      // All 4 AI calls fail — each private method handles errors with internal fallbacks
      mockGeminiCall.mockRejectedValueOnce(new Error('Research API down'))
      mockGeminiCall.mockRejectedValueOnce(new Error('Outline API down'))
      mockGeminiCall.mockRejectedValueOnce(new Error('Questions API down'))
      mockGeminiCall.mockRejectedValueOnce(new Error('IceBreakers API down'))

      const request: PautaGenerationRequest = {
        guestName: 'Test Guest',
        theme: 'Theme',
      }

      const pauta = await pautaGeneratorService.generateCompletePauta(request)

      // Each internal method (performDeepResearch, generateOutline, etc.)
      // handles errors gracefully by returning fallback data, so the pauta
      // is always returned — just with default/placeholder content
      expect(pauta.outline).toBeDefined()
      expect(pauta.outline.introduction).toBeDefined()
      expect(pauta.outline.conclusion).toBeDefined()
      expect(pauta.questions.length).toBeGreaterThan(0)
      expect(pauta.iceBreakers.length).toBeGreaterThan(0)
      expect(pauta.estimatedDuration).toBe(60) // default duration
      // With all fallback data, confidence should be 0 (no good bio, no controversies, etc.)
      expect(pauta.confidenceScore).toBe(0)
    })

    it('should handle string responses from Gemini (JSON serialized)', async () => {
      // Return JSON strings instead of objects
      mockGeminiCall.mockResolvedValueOnce({
        result: JSON.stringify({
          biography: 'String bio content that is long enough for a good confidence score.',
          controversies: [],
          keyFacts: ['Fact'],
          sourceCitations: [],
          suggestedTheme: 'String Theme',
        }),
      })
      mockGeminiCall.mockResolvedValueOnce({
        result: JSON.stringify({
          title: 'String Outline',
          introduction: { title: 'Intro', description: 'Intro', duration: 5, keyPoints: [] },
          mainSections: [],
          conclusion: { title: 'End', description: 'End', duration: 5, keyPoints: [] },
        }),
      })
      mockGeminiCall.mockResolvedValueOnce({
        result: JSON.stringify({ questions: [] }),
      })
      mockGeminiCall.mockResolvedValueOnce({
        result: JSON.stringify({ iceBreakers: [] }),
      })

      const request: PautaGenerationRequest = { guestName: 'Guest', theme: 'Theme' }
      const pauta = await pautaGeneratorService.generateCompletePauta(request)

      expect(pauta.outline.title).toBe('String Outline')
    })
  })

  // ==========================================================================
  // Confidence Score (via compilePauta)
  // ==========================================================================

  describe('confidence score calculation', () => {
    it('should compute 100% confidence when all criteria are met', async () => {
      mockAllStepsSuccess()

      const request: PautaGenerationRequest = { guestName: 'Guest', theme: 'Theme' }
      const pauta = await pautaGeneratorService.generateCompletePauta(request)

      // hasGoodBio (bio > 200 chars) = 25
      // hasControversies (1 controversy) = 25
      // hasFacts (4 facts > 3) = 25
      // hasSources (1 source) = 25
      expect(pauta.confidenceScore).toBe(100)
    })

    it('should compute partial confidence when some data is missing', async () => {
      // Research returns minimal data
      mockGeminiCall.mockResolvedValueOnce({
        result: {
          biography: 'Short bio.',  // < 200 chars -> no confidence
          controversies: [],          // empty -> no confidence
          keyFacts: ['One fact'],     // < 3 -> no confidence
          sourceCitations: [],        // empty -> no confidence
          suggestedTheme: 'Theme',
        },
      })
      // Remaining steps succeed
      mockGeminiCall.mockResolvedValueOnce({
        result: {
          title: 'Title',
          introduction: { title: 'Intro', description: '', duration: 5, keyPoints: [] },
          mainSections: [],
          conclusion: { title: 'End', description: '', duration: 5, keyPoints: [] },
        },
      })
      mockGeminiCall.mockResolvedValueOnce({ result: { questions: [] } })
      mockGeminiCall.mockResolvedValueOnce({ result: { iceBreakers: [] } })

      const pauta = await pautaGeneratorService.generateCompletePauta({
        guestName: 'Guest',
        theme: 'Theme',
      })

      expect(pauta.confidenceScore).toBe(0)
    })
  })

  // ==========================================================================
  // pautaToDossier
  // ==========================================================================

  describe('pautaToDossier', () => {
    it('should convert pauta to Dossier format', () => {
      const pauta: GeneratedPauta = {
        outline: {
          title: 'Test Episode',
          introduction: { title: 'Intro', description: '', duration: 5, keyPoints: [] },
          mainSections: [],
          conclusion: { title: 'End', description: '', duration: 5, keyPoints: [] },
        },
        questions: [
          { id: 'q1', text: 'Development Q?', category: 'desenvolvimento', followUps: [], priority: 'high' },
          { id: 'q2', text: 'Deep dive Q?', category: 'aprofundamento', followUps: [], priority: 'medium' },
          { id: 'q3', text: 'Opening Q?', category: 'abertura', followUps: [], priority: 'low' },
        ],
        iceBreakers: ['Ice breaker 1', 'Ice breaker 2'],
        sources: [],
        researchSummary: 'Summary',
        estimatedDuration: 60,
        confidenceScore: 75,
        biography: 'Full biography text.',
        controversies: [
          { title: 'C1', summary: 'Summary C1', sentiment: 'negative' },
        ],
        keyFacts: ['Fact 1'],
        technicalSheet: {
          fullName: 'John Doe',
          birthDate: '1990-01-15',
          birthPlace: 'Sao Paulo, SP',
          education: ['Computer Science'],
          achievements: ['Built product X'],
        },
        stepsFailed: [],
      }

      const dossier = pautaGeneratorService.pautaToDossier(pauta, 'John Doe', 'Innovation')

      expect(dossier.guestName).toBe('John Doe')
      expect(dossier.episodeTheme).toBe('Innovation')
      expect(dossier.biography).toBe('Full biography text.')
      expect(dossier.controversies).toEqual(['Summary C1'])
      // Only desenvolvimento and aprofundamento questions become suggestedTopics
      expect(dossier.suggestedTopics).toEqual(['Development Q?', 'Deep dive Q?'])
      expect(dossier.iceBreakers).toEqual(['Ice breaker 1', 'Ice breaker 2'])
      // Technical sheet conversion
      expect(dossier.technicalSheet?.fullName).toBe('John Doe')
      expect(dossier.technicalSheet?.birthInfo?.date).toBe('1990-01-15')
      expect(dossier.technicalSheet?.birthInfo?.city).toBe('Sao Paulo')
    })
  })

  // ==========================================================================
  // questionsToTopics
  // ==========================================================================

  describe('questionsToTopics', () => {
    it('should convert PautaQuestions to Topics with categories', () => {
      const questions = [
        { id: 'q1', text: 'Opening Q?', category: 'abertura' as const, followUps: [], priority: 'high' as const },
        { id: 'q2', text: 'Main Q?', category: 'desenvolvimento' as const, followUps: [], priority: 'medium' as const },
        { id: 'q3', text: 'Deep Q?', category: 'aprofundamento' as const, followUps: [], priority: 'low' as const },
        { id: 'q4', text: 'Close Q?', category: 'fechamento' as const, followUps: [], priority: 'medium' as const },
      ]

      const { topics, categories } = pautaGeneratorService.questionsToTopics(questions, 'ep-123')

      expect(topics).toHaveLength(4)
      expect(topics[0]).toEqual(expect.objectContaining({
        id: 'q1',
        text: 'Opening Q?',
        completed: false,
        order: 0,
        archived: false,
        categoryId: 'abertura',
      }))

      // Should have 4 unique categories
      expect(categories).toHaveLength(4)
      const catIds = categories.map(c => c.id)
      expect(catIds).toContain('abertura')
      expect(catIds).toContain('geral') // desenvolvimento maps to 'geral'
      expect(catIds).toContain('aprofundamento')
      expect(catIds).toContain('fechamento')

      // Each category should have the correct episode_id
      categories.forEach(c => expect(c.episode_id).toBe('ep-123'))
    })

    it('should deduplicate categories for repeated question types', () => {
      const questions = [
        { id: 'q1', text: 'Q1?', category: 'abertura' as const, followUps: [], priority: 'high' as const },
        { id: 'q2', text: 'Q2?', category: 'abertura' as const, followUps: [], priority: 'medium' as const },
      ]

      const { categories } = pautaGeneratorService.questionsToTopics(questions, 'ep-456')

      expect(categories).toHaveLength(1)
      expect(categories[0].id).toBe('abertura')
    })
  })
})
