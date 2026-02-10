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
import { transcribeAudio } from './momentPersistenceService'

const geminiClient = GeminiClient.getInstance()
const log = createNamespacedLogger('MomentService')

/**
 * Create a new moment
 */
export async function createMoment(
  userId: string,
  input: CreateMomentInput
): Promise<MomentWithCP> {
  try {
    // Transcribe audio if provided (must complete before insert)
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
    analyzeMomentFull(finalContent || '', moment.id, userId)
      .catch((error) => {
        log.warn('Background moment analysis failed (non-critical):', error)
      })

    // Award CP (awaited ~50ms to get real leveled_up data)
    const momentId = moment.id

    const { data: cpResult, error: cpError } = await supabase.rpc(
      'award_consciousness_points',
      {
        p_user_id: userId,
        p_points: 5,
        p_reason: 'moment_registered',
        p_reference_id: momentId,
        p_reference_type: 'moment',
      }
    )

    if (cpError) {
      log.error('Error awarding CP:', cpError)
    }

    // Update streak in background (fire-and-forget, no UX impact)
    supabase.rpc('update_moment_streak', {
      p_user_id: userId
    }).then(({ error: streakError }) => {
      if (streakError) {
        log.error('Error updating streak:', streakError)
      }
    })

    // Return with real values from RPC
    return {
      ...moment,
      cp_earned: 5,
      leveled_up: cpResult?.leveled_up || false,
      new_level: cpResult?.level,
      level_name: cpResult?.level_name,
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
async function analyzeMomentFull(content: string, momentId: string, userId: string): Promise<void> {
  const startTime = Date.now()

  try {
    const response = await geminiClient.call({
      action: 'analyze_moment',
      payload: { content },
      model: 'fast',
    })

    const result = response.result as {
      tags: string[]
      mood: { emoji: string; label: string }
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

    // Update moment with tags + mood + sentiment in one DB call
    await supabase
      .from('moments')
      .update({
        tags: result.tags,
        emotion: `${result.mood.emoji} ${result.mood.label}`,
        sentiment_data: sentimentData,
      })
      .eq('id', momentId)
      .eq('user_id', userId)

    log.debug('Full moment analysis completed:', momentId)

    // Track AI usage (non-blocking, fire-and-forget)
    const resp = response as any
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: resp.model || 'gemini-2.5-flash',
      input_tokens: resp.usageMetadata?.promptTokenCount || 0,
      output_tokens: resp.usageMetadata?.candidatesTokenCount || 0,
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
