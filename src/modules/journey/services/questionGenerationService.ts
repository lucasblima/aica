/**
 * Question Generation Service
 * Handles AI-powered question generation via Edge Function
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import { QuestionCategory } from '../types/dailyQuestion'

const log = createNamespacedLogger('QuestionGenerationService')

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationCheckResult {
  shouldGenerate: boolean
  unansweredCount: number
  totalAvailable: number
  hoursSinceLastGeneration: number
  dailyGenerationCount: number
}

export interface GenerationResult {
  success: boolean
  questionsGenerated: number
  questions: Array<{
    question_text: string
    category: QuestionCategory
    relevance_score: number
    context_factors: string[]
  }>
  contextUpdated: boolean
  processingTimeMs?: number
  error?: string
}

export interface UserContextBank {
  userId: string
  dominantEmotions: string[]
  recurringThemes: string[]
  mentionedAreas: string[]
  sentimentTrend: 'positive' | 'negative' | 'neutral' | 'volatile'
  totalResponses: number
  avgResponseLength: number
  engagementScore: number
  preferredCategories: QuestionCategory[]
  avoidedTopics: string[]
  lastGenerationAt: string | null
  generationCount: number
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  MIN_UNANSWERED_THRESHOLD: 3,
  EDGE_FUNCTION_URL: 'generate-questions',
}

// =============================================================================
// CHECK IF GENERATION NEEDED
// =============================================================================

/**
 * Check if the user needs new questions generated
 */
export async function checkShouldGenerateQuestions(
  userId: string
): Promise<GenerationCheckResult> {
  try {
    log.debug('Checking if generation needed for user', { userId })

    // Call the database function
    const { data, error } = await supabase
      .rpc('check_should_generate_questions', { p_user_id: userId })

    if (error) {
      log.error('Error checking generation status:', error)
      // Default to checking manually if RPC fails
      return await checkManually(userId)
    }

    if (data && data.length > 0) {
      const result = data[0]
      log.debug('Generation check result:', result)

      return {
        shouldGenerate: result.should_generate,
        unansweredCount: result.unanswered_count,
        totalAvailable: result.total_available,
        hoursSinceLastGeneration: result.hours_since_last_generation,
        dailyGenerationCount: result.daily_generation_count,
      }
    }

    return await checkManually(userId)
  } catch (error) {
    log.error('Error in checkShouldGenerateQuestions:', error)
    return {
      shouldGenerate: false,
      unansweredCount: 0,
      totalAvailable: 0,
      hoursSinceLastGeneration: 0,
      dailyGenerationCount: 0,
    }
  }
}

/**
 * Manual fallback check if RPC is not available
 */
async function checkManually(userId: string): Promise<GenerationCheckResult> {
  try {
    // Get all active questions (global + user-specific)
    const { data: questions, error: qError } = await supabase
      .from('daily_questions')
      .select('id')
      .eq('active', true)
      .or(`user_id.is.null,user_id.eq.${userId}`)

    if (qError) throw qError

    // Get user's answered question IDs
    const { data: responses, error: rError } = await supabase
      .from('question_responses')
      .select('question_id')
      .eq('user_id', userId)

    if (rError) throw rError

    const answeredIds = new Set(responses?.map(r => r.question_id) || [])
    const totalAvailable = questions?.length || 0
    const unansweredCount = questions?.filter(q => !answeredIds.has(q.id)).length || 0

    return {
      shouldGenerate: unansweredCount < CONFIG.MIN_UNANSWERED_THRESHOLD,
      unansweredCount,
      totalAvailable,
      hoursSinceLastGeneration: 999, // Unknown
      dailyGenerationCount: 0, // Unknown
    }
  } catch (error) {
    log.error('Error in manual check:', error)
    return {
      shouldGenerate: false,
      unansweredCount: 0,
      totalAvailable: 0,
      hoursSinceLastGeneration: 0,
      dailyGenerationCount: 0,
    }
  }
}

// =============================================================================
// TRIGGER GENERATION
// =============================================================================

/**
 * Trigger question generation via Edge Function
 */
export async function triggerQuestionGeneration(
  options?: {
    batchSize?: number
    categories?: QuestionCategory[]
    forceRegenerate?: boolean
  }
): Promise<GenerationResult> {
  try {
    log.info('Triggering question generation', options)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      throw new Error('No authentication token available')
    }

    const response = await supabase.functions.invoke(CONFIG.EDGE_FUNCTION_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        batch_size: options?.batchSize || 5,
        categories: options?.categories,
        force_regenerate: options?.forceRegenerate || false,
      },
    })

    if (response.error) {
      // Check if it's an auth error (expected during page load race conditions)
      const errorMsg = response.error.message || 'Generation failed'
      const isAuthError = errorMsg.includes('401') ||
                         errorMsg.includes('Unauthorized') ||
                         errorMsg.includes('non-2xx')
      if (isAuthError) {
        log.debug('Edge function auth error (session may still be initializing):', errorMsg)
      } else {
        log.error('Edge function error:', response.error)
      }
      throw new Error(errorMsg)
    }

    const result = response.data as GenerationResult

    log.info('Generation completed', {
      questionsGenerated: result.questionsGenerated,
      success: result.success,
    })

    return {
      success: result.success,
      questionsGenerated: result.questionsGenerated || result.questions_generated || 0,
      questions: result.questions || [],
      contextUpdated: result.contextUpdated || result.context_updated || false,
      processingTimeMs: result.processingTimeMs || result.processing_time_ms,
      error: result.error,
    }
  } catch (error) {
    const err = error as Error
    // Don't log auth errors as errors - they're expected during session initialization
    const isAuthError = err.message?.includes('401') ||
                       err.message?.includes('Unauthorized') ||
                       err.message?.includes('non-2xx') ||
                       err.message?.includes('authentication')
    if (isAuthError) {
      log.debug('Generation skipped due to auth state:', err.message)
    } else {
      log.error('Error triggering generation:', err)
    }

    return {
      success: false,
      questionsGenerated: 0,
      questions: [],
      contextUpdated: false,
      error: err.message,
    }
  }
}

// =============================================================================
// CONTEXT BANK
// =============================================================================

/**
 * Get user's context bank
 */
export async function getUserContextBank(userId: string): Promise<UserContextBank | null> {
  try {
    const { data, error } = await supabase
      .from('user_question_context_bank')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return {
      userId: data.user_id,
      dominantEmotions: data.dominant_emotions || [],
      recurringThemes: data.recurring_themes || [],
      mentionedAreas: data.mentioned_areas || [],
      sentimentTrend: data.sentiment_trend || 'neutral',
      totalResponses: data.total_responses || 0,
      avgResponseLength: data.avg_response_length || 0,
      engagementScore: data.engagement_score || 0.5,
      preferredCategories: data.preferred_categories || [],
      avoidedTopics: data.avoided_topics || [],
      lastGenerationAt: data.last_generation_at,
      generationCount: data.generation_count || 0,
    }
  } catch (error) {
    log.error('Error fetching context bank:', error)
    return null
  }
}

/**
 * Update user context bank with new themes/emotions
 */
export async function updateUserContext(
  userId: string,
  updates: Partial<{
    dominantEmotions: string[]
    recurringThemes: string[]
    avoidedTopics: string[]
  }>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_question_context_bank')
      .upsert({
        user_id: userId,
        ...(updates.dominantEmotions && { dominant_emotions: updates.dominantEmotions }),
        ...(updates.recurringThemes && { recurring_themes: updates.recurringThemes }),
        ...(updates.avoidedTopics && { avoided_topics: updates.avoidedTopics }),
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) throw error

    log.debug('Context bank updated', { userId })
    return true
  } catch (error) {
    log.error('Error updating context bank:', error)
    return false
  }
}

// =============================================================================
// AUTO-GENERATION HELPER
// =============================================================================

/**
 * Check and trigger generation if needed (non-blocking)
 * Returns true if generation was triggered
 */
export async function checkAndTriggerGenerationIfNeeded(
  userId: string
): Promise<boolean> {
  try {
    // First verify session is valid before attempting generation
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.access_token) {
      log.debug('Skipping generation check - no valid session yet')
      return false
    }

    const check = await checkShouldGenerateQuestions(userId)

    if (check.shouldGenerate) {
      log.info('Auto-triggering question generation', {
        userId,
        unansweredCount: check.unansweredCount,
      })

      // Trigger in background (don't await)
      triggerQuestionGeneration({ batchSize: 5 }).catch(err => {
        // Don't log auth errors as errors - they're expected during page load
        const isAuthError = err?.message?.includes('401') ||
                           err?.message?.includes('Unauthorized') ||
                           err?.message?.includes('authentication')
        if (isAuthError) {
          log.debug('Generation skipped due to auth state:', err.message)
        } else {
          log.warn('Background generation failed:', err)
        }
      })

      return true
    }

    return false
  } catch (error) {
    log.error('Error in checkAndTriggerGenerationIfNeeded:', error)
    return false
  }
}
