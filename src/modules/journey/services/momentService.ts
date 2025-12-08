/**
 * Moment Service
 * Service layer for managing user moments (journal entries)
 */

import { supabase } from '@/lib/supabase'
import { GeminiClient } from '@/lib/gemini'
import {
  Moment,
  CreateMomentInput,
  MomentWithCP,
  MomentFilter,
} from '../types/moment'
import { SentimentAnalysis } from '../types/sentiment'

const geminiClient = GeminiClient.getInstance()

/**
 * Create a new moment
 */
export async function createMoment(
  userId: string,
  input: CreateMomentInput
): Promise<MomentWithCP> {
  try {
    let audioUrl: string | undefined
    let transcription: string | undefined

    // Upload audio if provided
    if (input.audio_blob) {
      audioUrl = await uploadAudio(userId, input.audio_blob)
    }

    // Transcribe audio if type is 'audio' or 'both'
    if (input.type === 'audio' || input.type === 'both') {
      if (input.audio_blob) {
        transcription = await transcribeAudio(input.audio_blob)
      }
    }

    // Determine final content
    const finalContent =
      input.type === 'audio'
        ? transcription
        : input.type === 'both'
        ? `${input.content}\n\n[Transcrição]: ${transcription}`
        : input.content

    // Analyze sentiment
    const sentimentData = await analyzeMomentSentiment(finalContent || '')

    // Insert moment
    const { data: moment, error: insertError } = await supabase
      .from('moments')
      .insert({
        user_id: userId,
        type: input.type,
        content: finalContent,
        audio_url: audioUrl,
        emotion: input.emotion,
        sentiment_data: sentimentData,
        tags: input.tags,
        location: input.location,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Award CP for registering moment
    const { data: cpResult, error: cpError } = await supabase.rpc(
      'award_consciousness_points',
      {
        p_user_id: userId,
        p_points: 5,
        p_reason: 'moment_registered',
        p_reference_id: moment.id,
        p_reference_type: 'moment',
      }
    )

    if (cpError) {
      console.error('Error awarding CP:', cpError)
    }

    // Update streak
    const { data: streakResult, error: streakError } = await supabase.rpc(
      'update_moment_streak',
      { p_user_id: userId }
    )

    if (streakError) {
      console.error('Error updating streak:', streakError)
    }

    return {
      ...moment,
      cp_earned: cpResult?.new_total || 5,
      leveled_up: cpResult?.leveled_up || false,
    }
  } catch (error) {
    console.error('Error creating moment:', error)
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
    console.error('Error fetching moments:', error)
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
    console.error('Error fetching moment:', error)
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
    console.error('Error updating moment:', error)
    throw error
  }
}

/**
 * Delete moment
 */
export async function deleteMoment(userId: string, momentId: string): Promise<void> {
  try {
    // Get moment to delete audio if exists
    const moment = await getMoment(userId, momentId)
    if (moment?.audio_url) {
      await deleteAudio(moment.audio_url)
    }

    const { error } = await supabase
      .from('moments')
      .delete()
      .eq('id', momentId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting moment:', error)
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
    console.error('Error counting moments:', error)
    return 0
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Upload audio to Supabase Storage
 */
async function uploadAudio(userId: string, audioBlob: Blob): Promise<string> {
  try {
    const fileName = `${userId}/${Date.now()}.webm`
    const { data, error } = await supabase.storage
      .from('moments-audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('moments-audio')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading audio:', error)
    throw error
  }
}

/**
 * Delete audio from Supabase Storage
 */
async function deleteAudio(audioUrl: string): Promise<void> {
  try {
    const path = audioUrl.split('/moments-audio/')[1]
    if (!path) return

    const { error } = await supabase.storage.from('moments-audio').remove([path])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting audio:', error)
  }
}

/**
 * Transcribe audio using Web Speech API or backend fallback
 */
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // For now, return placeholder
  // TODO: Implement with Web Speech API or backend action
  return '[Transcrição em processamento...]'
}

/**
 * Analyze moment sentiment using Gemini
 */
async function analyzeMomentSentiment(content: string): Promise<SentimentAnalysis> {
  try {
    const response = await geminiClient.call({
      action: 'analyze_moment_sentiment',
      payload: { content },
      model: 'fast',
    })

    return response.result as SentimentAnalysis
  } catch (error) {
    console.error('Error analyzing sentiment:', error)
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
