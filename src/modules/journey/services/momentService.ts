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

    // Analyze sentiment in background (non-blocking)
    analyzeMomentSentiment(finalContent || '')
      .then(async (sentimentData) => {
        // Update moment with sentiment data
        await supabase
          .from('moments')
          .update({ sentiment_data: sentimentData })
          .eq('id', moment.id)
          .eq('user_id', userId)

        log.debug('Sentiment analysis completed for moment:', moment.id)
      })
      .catch((error) => {
        log.warn('Background sentiment analysis failed (non-critical):', error)
      })

    // Award CP and update streak in BACKGROUND (non-blocking, fire-and-forget)
    // Return moment immediately to show modal faster
    const momentId = moment.id

    // Fire-and-forget: Process gamification in background
    Promise.allSettled([
      supabase.rpc('award_consciousness_points', {
        p_user_id: userId,
        p_points: 5,
        p_reason: 'moment_registered',
        p_reference_id: momentId,
        p_reference_type: 'moment',
      }),
      supabase.rpc('update_moment_streak', {
        p_user_id: userId
      })
    ]).then(([cpResult, streakResult]) => {
      if (cpResult.status === 'rejected') {
        log.error('Error awarding CP:', cpResult.reason)
      }
      if (streakResult.status === 'rejected') {
        log.error('Error updating streak:', streakResult.reason)
      }
      log.debug('Background gamification completed for moment:', momentId)
    }).catch((error) => {
      log.warn('Background gamification failed (non-critical):', error)
    })

    // Return immediately with estimated values (actual CP processed in background)
    return {
      ...moment,
      cp_earned: 5, // Fixed value, actual total calculated in background
      leveled_up: false, // Conservative default, level up animation may appear later
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
 * Analyze moment sentiment using Gemini
 */
async function analyzeMomentSentiment(content: string): Promise<SentimentAnalysis> {
  const startTime = Date.now()

  try {
    const response = await geminiClient.call({
      action: 'analyze_moment_sentiment',
      payload: { content },
      model: 'fast',
    })

    // Track AI usage (non-blocking, fire-and-forget)
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: response.model || 'gemini-2.0-flash',
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      module_type: 'journey',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'analyzeMomentSentiment',
        operation: 'sentiment_analysis',
        content_length: content.length,
      }
    }).catch(error => {
      // Non-blocking: log error but don't throw
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message);
    });

    return response.result as SentimentAnalysis
  } catch (error) {
    log.error('Error analyzing sentiment:', error)
    // Return neutral sentiment as fallback
    return {
      timestamp: new Date(),
      sentiment: 'neutral',
      sentimentScore: 0,
      emotions: [],
      triggers: [],
      energyLevel: 50,
    }
  }
}
