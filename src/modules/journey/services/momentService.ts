/**
 * Moment Service
 * Service layer for managing user moments (journal entries)
 */

import { supabase } from '@/services/supabaseClient'
import { GeminiClient } from '@/lib/gemini'
import { trackAIUsage } from '@/services/aiUsageTrackingService'
import { createNamespacedLogger } from '@/lib/logger'
import {
  Moment,
  CreateMomentInput,
  MomentWithCP,
  MomentFilter,
} from '../types/moment'
import { SentimentAnalysis } from '../types/sentiment'
import { mapAIMoodToValue } from '../types/emotionHelper'
import { transcribeAudio } from '@/services/audioService'
import { evaluateAndCalculateCP, updateAvgQualityScore } from './qualityEvaluationService'

const geminiClient = GeminiClient.getInstance()
const log = createNamespacedLogger('MomentService')

// P0-2: Shared singleton mutex for CP award serialization
import { serializedCPAward } from './cpAwardLock'

// P0-3: Client-side rate limit guard (same pattern as momentPersistenceService)
const recentCreations = new Map<string, number>()

function isClientRateLimited(userId: string): boolean {
  const lastCreation = recentCreations.get(userId) || 0
  const now = Date.now()
  if (now - lastCreation < 1000) return true
  recentCreations.set(userId, now)
  return false
}

/**
 * Create a new moment
 */
export async function createMoment(
  userId: string,
  input: CreateMomentInput
): Promise<MomentWithCP> {
  try {
    // P0-3: Client-side rate limit check
    if (isClientRateLimited(userId)) {
      log.warn('Client-side rate limit hit for user', { userId })
      throw new Error('Rate limited: please wait before creating another moment')
    }
    // Transcribe áudio if provided (must complete before insert)
    let finalContent = input.content
    let momentType: 'text' | 'audio' = input.type || 'text'
    if (input.audioBlob && input.audioBlob.size > 0) {
      const transcription = await transcribeAudio(input.audioBlob)
      finalContent = finalContent ? `${finalContent}\n\n${transcription}` : transcription
      momentType = 'audio'
    }

    // Insert moment WITHOUT waiting for sentiment analysis (faster UX)
    const { data: moment, error: insertError } = await supabase
      .from('moments')
      .insert({
        user_id: userId,
        type: momentType,
        content: finalContent,
        emotion: input.emotion,
        sentiment_data: null, // Will be updated asynchronously
        tags: input.tags,
        location: input.location,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Analyze moment in background: tags + mood + sentiment in 1 call (non-blocking)
    analyzeMomentFull(finalContent || '', moment.id, userId, input.emotion)
      .catch((error) => {
        log.warn('Background moment analysis failed (non-critical):', error)
      })

    // Evaluate quality and calculate CP
    const qualityResult = await evaluateAndCalculateCP(finalContent || '', 'moment')

    // Award CP (awaited ~50ms to get real leveled_up data)
    const momentId = moment.id

    const { data: cpResult, error: cpError } = await serializedCPAward(async () =>
      await supabase.rpc(
        'award_consciousness_points',
        {
          p_user_id: userId,
          p_points: qualityResult.cp_earned,
          p_reason: 'moment_registered',
          p_reference_id: momentId,
          p_reference_type: 'moment',
        }
      )
    )

    if (cpError) {
      log.error('Error awarding CP:', cpError)
    }

    // Update streak in background (fire-and-forget, no UX impact)
    supabase.rpc('update_consciousness_streak', {
      p_user_id: userId,
      p_interaction_type: 'moment',
    }).then(({ error: streakError }) => {
      if (streakError) {
        log.warn('update_consciousness_streak failed, trying legacy:', streakError)
        supabase.rpc('update_moment_streak', { p_user_id: userId })
          .then(({ error: legacyErr }) => {
            if (legacyErr) {
              // P1-12: Structured error telemetry for streak failures
              log.error('STREAK_LOST: Both streak RPCs failed', {
                userId,
                momentId: moment.id,
                primaryError: streakError.message,
                fallbackError: legacyErr.message,
                errorCode: 'STREAK_DOUBLE_FAILURE',
                timestamp: new Date().toISOString(),
              })
              // Track streak failure metric for monitoring
              trackStreakFailure(userId, moment.id, streakError.message, legacyErr.message)
            }
          })
      }
    })

    // Fire-and-forget: save quality_score to moment + update avg
    supabase
      .from('moments')
      .update({ quality_score: qualityResult.quality_score })
      .eq('id', momentId)
      .eq('user_id', userId)
      .then(({ error }) => { if (error) log.warn('Failed to save moment quality_score:', error) })
    updateAvgQualityScore(userId, qualityResult.quality_score)

    // Return with real values from RPC
    return {
      ...moment,
      cp_earned: qualityResult.cp_earned,
      leveled_up: cpResult?.leveled_up || false,
      new_level: cpResult?.level,
      level_name: cpResult?.level_name,
      quality_score: qualityResult.quality_score,
      quality_feedback: qualityResult.assessment.feedback_message,
      quality_tier: qualityResult.assessment.feedback_tier,
    }
  } catch (error) {
    log.error('Error creating moment:', error)
    throw error
  }
}

/**
 * Get moments with filters
 */
export async function getMoments(
  userId: string,
  filter?: MomentFilter,
  limit: number = 50,
  offset: number = 0
): Promise<Moment[]> {
  try {
    let query = supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (filter?.startDate) {
      query = query.gte('created_at', filter.startDate.toISOString())
    }
    if (filter?.endDate) {
      query = query.lte('created_at', filter.endDate.toISOString())
    }
    if (filter?.emotions && filter.emotions.length > 0) {
      query = query.in('emotion', filter.emotions)
    }
    if (filter?.tags && filter.tags.length > 0) {
      query = query.overlaps('tags', filter.tags)
    }
    if (filter?.sentiments && filter.sentiments.length > 0) {
      // Filter by sentiment_data->sentiment
      query = query.in('sentiment_data->>sentiment', filter.sentiments)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    log.error('Error fetching moments:', error)
    throw error
  }
}

/**
 * Get single moment by ID
 */
export async function getMoment(userId: string, momentId: string): Promise<Moment | null> {
  try {
    const { data, error } = await supabase
      .from('moments')
      .select('*')
      .eq('id', momentId)
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    log.error('Error fetching moment:', error)
    return null
  }
}

/**
 * Update moment
 */
export async function updateMoment(
  userId: string,
  momentId: string,
  updates: Partial<Omit<Moment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Moment> {
  try {
    const { data, error } = await supabase
      .from('moments')
      .update(updates)
      .eq('id', momentId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    log.error('Error updating moment:', error)
    throw error
  }
}

/**
 * Delete moment
 */
export async function deleteMoment(userId: string, momentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('moments')
      .delete()
      .eq('id', momentId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    log.error('Error deleting moment:', error)
    throw error
  }
}

/**
 * Get moments count
 */
export async function getMomentsCount(userId: string, filter?: MomentFilter): Promise<number> {
  try {
    let query = supabase
      .from('moments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Apply same filters as getMoments
    if (filter?.startDate) {
      query = query.gte('created_at', filter.startDate.toISOString())
    }
    if (filter?.endDate) {
      query = query.lte('created_at', filter.endDate.toISOString())
    }
    if (filter?.emotions && filter.emotions.length > 0) {
      query = query.in('emotion', filter.emotions)
    }
    if (filter?.tags && filter.tags.length > 0) {
      query = query.overlaps('tags', filter.tags)
    }

    const { count, error } = await query

    if (error) throw error

    return count || 0
  } catch (error) {
    log.error('Error counting moments:', error)
    return 0
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Analyze moment fully: tags + mood + sentiment in 1 Gemini call
 * Updates the moment in DB with results
 */
async function analyzeMomentFull(content: string, momentId: string, userId: string, userEmotion?: string): Promise<void> {
  const startTime = Date.now()

  try {
    const response = await geminiClient.call({
      action: 'analyze_moment',
      payload: { content, user_emotion: userEmotion },
      model: 'fast',
    })

    const result = response.result as {
      tags: string[]
      mood: { emoji: string; label: string; value?: string }
      sentiment: string
      sentimentScore: number
      emotions: string[]
      triggers: string[]
      energyLevel: number
    }

    // Build sentiment_data in the existing format
    const sentimentData: SentimentAnalysis = {
      timestamp: new Date(),
      sentiment: result.sentiment as SentimentAnalysis['sentiment'],
      sentimentScore: result.sentimentScore,
      emotions: result.emotions,
      triggers: result.triggers,
      energyLevel: result.energyLevel,
    }

    // Update moment with tags + sentiment in one DB call
    // Only overwrite emotion if the user didn't explicitly choose one
    const updateData: Record<string, unknown> = {
      tags: result.tags,
      sentiment_data: sentimentData,
    }
    if (!userEmotion) {
      // Prefer mood.value (new format from updated prompt), fallback to mapping
      updateData.emotion = result.mood.value || mapAIMoodToValue(result.mood)
    }

    await supabase
      .from('moments')
      .update(updateData)
      .eq('id', momentId)
      .eq('user_id', userId)

    log.debug('Full moment analysis completed:', momentId)

    // Track AI usage (non-blocking, fire-and-forget)
    const resp = response as unknown as Record<string, unknown>
    const usageMeta = resp.usageMetadata as Record<string, number> | undefined
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: (resp.model as string) || 'gemini-2.5-flash',
      input_tokens: usageMeta?.promptTokenCount || 0,
      output_tokens: usageMeta?.candidatesTokenCount || 0,
      module_type: 'journey',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'analyzeMomentFull',
        operation: 'analyze_moment',
        content_length: content.length,
      }
    }).catch(error => {
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message)
    })
  } catch (error) {
    log.error('Error in full moment analysis:', error)
  }
}

/**
 * Batch re-analyze moments that have neutral or null emotion.
 * Calls the reanalyze-moments Edge Function which uses AI to detect real emotions.
 *
 * @param limit Max moments to process (default 50, max 100)
 * @returns Results with old/new emotions
 */
export async function reanalyzeMoments(limit: number = 50): Promise<{
  success: boolean
  processed: number
  updated: number
  results: Array<{ id: string; oldEmotion: string | null; newEmotion: string; newMood: { emoji: string; label: string } }>
}> {
  try {
    const { data, error } = await supabase.functions.invoke('reanalyze-moments', {
      body: { limit },
    })

    if (error) {
      log.error('Error calling reanalyze-moments:', error)
      throw error
    }

    log.info(`Reanalysis complete: ${data.processed} processed, ${data.updated} updated`)
    return data
  } catch (error) {
    log.error('Error in reanalyzeMoments:', error)
    throw error
  }
}

// ============================================================================
// P1-12: Streak failure telemetry
// ============================================================================

/**
 * Track streak update failures for monitoring.
 * Persists to consciousness_points_log as a negative-zero entry so it's
 * visible in the existing CP audit trail without a new table.
 */
function trackStreakFailure(
  userId: string,
  momentId: string,
  primaryError: string,
  fallbackError: string,
): void {
  supabase
    .from('consciousness_points_log')
    .insert({
      user_id: userId,
      points: 0,
      reason: 'streak_update_failed',
      reference_id: momentId,
      reference_type: 'streak_failure',
      metadata: {
        primary_error: primaryError,
        fallback_error: fallbackError,
        timestamp: new Date().toISOString(),
      },
    })
    .then(({ error }) => {
      if (error) {
        log.warn('Failed to track streak failure telemetry:', error)
      }
    })
}
