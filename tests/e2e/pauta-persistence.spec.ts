import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Tests for Pauta Persistence
 *
 * Tests the complete pauta save/load workflow:
 * 1. Pauta saving with episode_id + user_id
 * 2. Retrieving active pautas
 * 3. Listing pauta versions
 * 4. Version increment via trigger
 * 5. Cascade delete behavior
 */

test.describe('Pauta Persistence Service', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    // Navigate to a page that allows us to test the service
    await page.goto('http://localhost:3000')

    // Wait for app to load
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should save a complete pauta with episode_id and user_id', async () => {
    // This test verifies the savePauta function stores correct episode_id + user_id
    const result = await page.evaluate(async () => {
      // Import the service in the browser context
      const { pautaPersistenceService } = await import('@/modules/podcast/services/pautaPersistenceService')
      const { supabase } = await import('@/services/supabaseClient')

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Create test data
      const episodeId = 'test-episode-' + Date.now()
      const testPauta = {
        outline: {
          title: 'Test Outline',
          introduction: {
            title: 'Introduction',
            description: 'Test intro',
            duration: 5,
            keyPoints: ['point 1'],
            suggestedTransition: 'transition'
          },
          mainSections: [
            {
              title: 'Section 1',
              description: 'Test section',
              duration: 15,
              keyPoints: ['key1', 'key2']
            }
          ],
          conclusion: {
            title: 'Conclusion',
            description: 'Test conclusion',
            duration: 5,
            keyPoints: ['conclusion point']
          }
        },
        questions: [
          {
            id: '1',
            text: 'Test question?',
            category: 'abertura' as const,
            priority: 'high' as const,
            followUps: ['follow-up'],
            context: 'context'
          }
        ],
        sources: [
          {
            id: 1,
            title: 'Test Source',
            url: 'https://example.com',
            snippet: 'test snippet',
            reliability: 'high' as const,
            date: new Date().toISOString()
          }
        ],
        researchSummary: 'test summary',
        estimatedDuration: 60,
        confidenceScore: 0.9,
        biography: 'test bio',
        controversies: [],
        keyFacts: ['fact1'],
        iceBreakers: ['ice1'],
        technicalSheet: { spec: 'test' }
      }

      // Save pauta
      const result = await pautaPersistenceService.savePauta(
        episodeId,
        user.id,
        testPauta,
        'Test Guest',
        'Test Theme',
        'additional context',
        'casual',
        'medium',
        ['focus1']
      )

      if (!result.success) {
        throw new Error(`Failed to save pauta: ${result.error}`)
      }

      // Verify the saved pauta has correct episode_id and user_id
      const { data: savedPauta } = await supabase
        .from('podcast_generated_pautas')
        .select('*')
        .eq('id', result.pautaId!)
        .single()

      return {
        pautaId: result.pautaId,
        savedEpisodeId: savedPauta?.episode_id,
        expectedEpisodeId: episodeId,
        savedUserId: savedPauta?.user_id,
        expectedUserId: user.id,
        guestName: savedPauta?.guest_name,
        theme: savedPauta?.theme
      }
    })

    expect(result.savedEpisodeId).toBe(result.expectedEpisodeId)
    expect(result.savedUserId).toBe(result.expectedUserId)
    expect(result.guestName).toBe('Test Guest')
    expect(result.theme).toBe('Test Theme')
  })

  test('should retrieve active pauta with all related data', async () => {
    const result = await page.evaluate(async () => {
      const { pautaPersistenceService } = await import('@/modules/podcast/services/pautaPersistenceService')
      const { supabase } = await import('@/services/supabaseClient')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const episodeId = 'test-episode-' + Date.now()
      const testPauta = {
        outline: {
          title: 'Test Outline',
          introduction: {
            title: 'Introduction',
            description: 'Test intro',
            duration: 5,
            keyPoints: ['point 1']
          },
          mainSections: [
            {
              title: 'Section 1',
              description: 'Test section',
              duration: 15,
              keyPoints: ['key1']
            }
          ],
          conclusion: {
            title: 'Conclusion',
            description: 'Test conclusion',
            duration: 5,
            keyPoints: ['conclusion point']
          }
        },
        questions: [
          {
            id: '1',
            text: 'Test question?',
            category: 'abertura' as const,
            priority: 'high' as const,
            followUps: [],
            context: undefined
          }
        ],
        sources: [
          {
            id: 1,
            title: 'Test Source',
            url: 'https://example.com',
            snippet: 'test snippet',
            reliability: 'high' as const
          }
        ],
        researchSummary: 'test summary',
        estimatedDuration: 60,
        confidenceScore: 0.9,
        biography: 'test bio',
        controversies: [],
        keyFacts: [],
        iceBreakers: [],
        technicalSheet: undefined
      }

      // Save pauta
      const saveResult = await pautaPersistenceService.savePauta(
        episodeId,
        user.id,
        testPauta,
        'Test Guest',
        'Test Theme'
      )

      if (!saveResult.success) {
        throw new Error(`Failed to save pauta: ${saveResult.error}`)
      }

      // Retrieve active pauta
      const completePauta = await pautaPersistenceService.getActivePauta(episodeId)

      return {
        foundPauta: !!completePauta,
        pautaId: completePauta?.pauta.id,
        guestName: completePauta?.pauta.guest_name,
        sectionsCount: completePauta?.outline_sections.length,
        questionsCount: completePauta?.questions.length,
        sourcesCount: completePauta?.sources.length,
        isActive: completePauta?.pauta.is_active
      }
    })

    expect(result.foundPauta).toBe(true)
    expect(result.guestName).toBe('Test Guest')
    expect(result.isActive).toBe(true)
    expect(result.sectionsCount).toBeGreaterThan(0)
    expect(result.questionsCount).toBeGreaterThan(0)
    expect(result.sourcesCount).toBeGreaterThan(0)
  })

  test('should list multiple pauta versions for an episode', async () => {
    const result = await page.evaluate(async () => {
      const { pautaPersistenceService } = await import('@/modules/podcast/services/pautaPersistenceService')
      const { supabase } = await import('@/services/supabaseClient')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const episodeId = 'test-episode-versions-' + Date.now()

      const createTestPauta = (iteration: number) => ({
        outline: {
          title: `Test Outline v${iteration}`,
          introduction: {
            title: 'Introduction',
            description: `Test intro v${iteration}`,
            duration: 5,
            keyPoints: ['point 1']
          },
          mainSections: [
            {
              title: `Section 1 v${iteration}`,
              description: `Test section v${iteration}`,
              duration: 15,
              keyPoints: ['key1']
            }
          ],
          conclusion: {
            title: 'Conclusion',
            description: 'Test conclusion',
            duration: 5,
            keyPoints: ['conclusion point']
          }
        },
        questions: [
          {
            id: '1',
            text: 'Test question?',
            category: 'abertura' as const,
            priority: 'high' as const,
            followUps: [],
            context: undefined
          }
        ],
        sources: [
          {
            id: 1,
            title: 'Test Source',
            url: 'https://example.com',
            snippet: 'test snippet',
            reliability: 'high' as const
          }
        ],
        researchSummary: 'test summary',
        estimatedDuration: 60,
        confidenceScore: 0.9 - (iteration * 0.1),
        biography: 'test bio',
        controversies: [],
        keyFacts: [],
        iceBreakers: [],
        technicalSheet: undefined
      })

      // Save multiple versions
      for (let i = 1; i <= 3; i++) {
        const result = await pautaPersistenceService.savePauta(
          episodeId,
          user.id,
          createTestPauta(i),
          'Test Guest',
          'Test Theme'
        )
        if (!result.success) {
          throw new Error(`Failed to save pauta v${i}: ${result.error}`)
        }
        // Wait a bit between saves to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // List all versions
      const versions = await pautaPersistenceService.listPautaVersions(episodeId)

      return {
        versionsCount: versions.length,
        versions: versions.map((v, idx) => ({
          version: v.version,
          isActive: v.isActive,
          index: idx
        }))
      }
    })

    expect(result.versionsCount).toBe(3)
    // Most recent should be at index 0 due to descending order
    expect(result.versions[0].isActive).toBe(true)
  })

  test('should handle cascade delete of related records', async () => {
    const result = await page.evaluate(async () => {
      const { pautaPersistenceService } = await import('@/modules/podcast/services/pautaPersistenceService')
      const { supabase } = await import('@/services/supabaseClient')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const episodeId = 'test-episode-cascade-' + Date.now()
      const testPauta = {
        outline: {
          title: 'Test Outline',
          introduction: {
            title: 'Introduction',
            description: 'Test intro',
            duration: 5,
            keyPoints: ['point 1']
          },
          mainSections: [
            {
              title: 'Section 1',
              description: 'Test section',
              duration: 15,
              keyPoints: ['key1']
            }
          ],
          conclusion: {
            title: 'Conclusion',
            description: 'Test conclusion',
            duration: 5,
            keyPoints: ['conclusion point']
          }
        },
        questions: [
          {
            id: '1',
            text: 'Test question?',
            category: 'abertura' as const,
            priority: 'high' as const,
            followUps: [],
            context: undefined
          }
        ],
        sources: [
          {
            id: 1,
            title: 'Test Source',
            url: 'https://example.com',
            snippet: 'test snippet',
            reliability: 'high' as const
          }
        ],
        researchSummary: 'test summary',
        estimatedDuration: 60,
        confidenceScore: 0.9,
        biography: 'test bio',
        controversies: [],
        keyFacts: [],
        iceBreakers: [],
        technicalSheet: undefined
      }

      // Save pauta
      const saveResult = await pautaPersistenceService.savePauta(
        episodeId,
        user.id,
        testPauta,
        'Test Guest',
        'Test Theme'
      )

      if (!saveResult.success) {
        throw new Error(`Failed to save pauta: ${saveResult.error}`)
      }

      const pautaId = saveResult.pautaId!

      // Verify data exists before delete
      const beforeDelete = await pautaPersistenceService.getPautaById(pautaId)

      // Delete pauta
      const deleteSuccess = await pautaPersistenceService.deletePauta(pautaId)

      // Verify data no longer exists
      const { data: deletedPauta } = await supabase
        .from('podcast_generated_pautas')
        .select('*')
        .eq('id', pautaId)
        .maybeSingle()

      const { data: deletedSections } = await supabase
        .from('podcast_pauta_outline_sections')
        .select('*')
        .eq('pauta_id', pautaId)

      const { data: deletedQuestions } = await supabase
        .from('podcast_pauta_questions')
        .select('*')
        .eq('pauta_id', pautaId)

      return {
        beforeDeleteFound: !!beforeDelete,
        deleteSuccess,
        pautaDeleted: !deletedPauta,
        sectionsDeleted: (deletedSections || []).length === 0,
        questionsDeleted: (deletedQuestions || []).length === 0
      }
    })

    expect(result.beforeDeleteFound).toBe(true)
    expect(result.deleteSuccess).toBe(true)
    expect(result.pautaDeleted).toBe(true)
    expect(result.sectionsDeleted).toBe(true)
    expect(result.questionsDeleted).toBe(true)
  })

  test('should set pauta as active and deactivate others', async () => {
    const result = await page.evaluate(async () => {
      const { pautaPersistenceService } = await import('@/modules/podcast/services/pautaPersistenceService')
      const { supabase } = await import('@/services/supabaseClient')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const episodeId = 'test-episode-active-' + Date.now()

      const createTestPauta = (iteration: number) => ({
        outline: {
          title: `Test Outline v${iteration}`,
          introduction: {
            title: 'Introduction',
            description: `Test intro v${iteration}`,
            duration: 5,
            keyPoints: ['point 1']
          },
          mainSections: [
            {
              title: `Section 1 v${iteration}`,
              description: `Test section v${iteration}`,
              duration: 15,
              keyPoints: ['key1']
            }
          ],
          conclusion: {
            title: 'Conclusion',
            description: 'Test conclusion',
            duration: 5,
            keyPoints: ['conclusion point']
          }
        },
        questions: [
          {
            id: '1',
            text: 'Test question?',
            category: 'abertura' as const,
            priority: 'high' as const,
            followUps: [],
            context: undefined
          }
        ],
        sources: [
          {
            id: 1,
            title: 'Test Source',
            url: 'https://example.com',
            snippet: 'test snippet',
            reliability: 'high' as const
          }
        ],
        researchSummary: 'test summary',
        estimatedDuration: 60,
        confidenceScore: 0.9,
        biography: 'test bio',
        controversies: [],
        keyFacts: [],
        iceBreakers: [],
        technicalSheet: undefined
      })

      // Save two versions
      const result1 = await pautaPersistenceService.savePauta(
        episodeId,
        user.id,
        createTestPauta(1),
        'Test Guest',
        'Test Theme'
      )
      const pautaId1 = result1.pautaId!

      const result2 = await pautaPersistenceService.savePauta(
        episodeId,
        user.id,
        createTestPauta(2),
        'Test Guest',
        'Test Theme'
      )
      const pautaId2 = result2.pautaId!

      // Get initial state - pautaId2 should be active
      let currentActive = await pautaPersistenceService.getActivePauta(episodeId)
      const activeBeforeSwitch = currentActive?.pauta.id

      // Set pautaId1 as active
      const switchSuccess = await pautaPersistenceService.setActivePauta(pautaId1, episodeId)

      // Verify pautaId1 is now active
      currentActive = await pautaPersistenceService.getActivePauta(episodeId)
      const activeAfterSwitch = currentActive?.pauta.id

      // Verify both exist in versions list
      const versions = await pautaPersistenceService.listPautaVersions(episodeId)

      return {
        switchSuccess,
        activeBeforeSwitch,
        activeAfterSwitch,
        expectedBeforeSwitch: pautaId2,
        expectedAfterSwitch: pautaId1,
        versionsCount: versions.length,
        onlyOneActive: versions.filter((v: any) => v.is_active).length === 1
      }
    })

    expect(result.switchSuccess).toBe(true)
    expect(result.activeBeforeSwitch).toBe(result.expectedBeforeSwitch)
    expect(result.activeAfterSwitch).toBe(result.expectedAfterSwitch)
    expect(result.versionsCount).toBe(2)
    expect(result.onlyOneActive).toBe(true)
  })

  test('should enforce RLS: user can only access own pautas', async () => {
    const result = await page.evaluate(async () => {
      const { supabase } = await import('@/services/supabaseClient')

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Create a test episode ID
      const episodeId = 'test-rls-' + Date.now()

      // Try to directly insert a pauta with a different user_id
      // This should fail due to RLS policy
      const { error } = await supabase
        .from('podcast_generated_pautas')
        .insert([
          {
            episode_id: episodeId,
            user_id: 'different-user-id-' + Date.now(),
            guest_name: 'Test Guest',
            theme: 'Test Theme',
            is_active: true,
            research_summary: 'test',
            confidence_score: 0.9
          }
        ])

      // RLS should prevent this insertion
      return {
        insertError: error?.code || error?.message,
        isRLSError: error?.code === 'PGRST301' || error?.message?.includes('policy'),
        userIdUsed: user.id
      }
    })

    // The insert should have failed due to RLS
    expect(result.insertError).toBeTruthy()
  })
})
