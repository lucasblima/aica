/**
 * Moment Persistence Service
 * Complete service for capturing, validating, processing and persisting moment entries
 *
 * PHASE 3 Part 2 Implementation
 *
 * Features:
 * - Input validation with XSS prevention
 * - Audio transcription (Whisper API)
 * - Sentiment analysis (Gemini API)
 * - Auto-tagging with confidence scores
 * - CP awards and streak updates
 * - Comprehensive error handling
 * - Event logging for analytics
 */

import { supabase } from '@/services/supabaseClient'
import { GeminiClient } from '@/lib/gemini'
import { createNamespacedLogger } from '@/lib/logger'
import { trackAIUsage } from '@/services/aiUsageTrackingService'

import {
  CreateMomentEntryInput,
  ProcessedMomentData,
  MomentEntryResult,
  AutoTaggingResult,
  CPAwardDetails,
} from '../types/persistenceTypes'

import { validateMomentInput, sanitizeText, checkRateLimit, estimateBaseCP } from '@/utils/momentValidation'

import { analyzeSentimentWithGemini, generateSentimentInsights } from '@/integrations/geminiSentimentAnalysis'

const geminiClient = GeminiClient.getInstance()
const log = createNamespacedLogger('MomentPersistence')

// =====================================================
// CLIENT-SIDE RATE LIMIT GUARD (P0-3 race condition fix)
// The DB-level rate limit check (query + insert) is not
// atomic, so two concurrent requests can both pass.
// This in-memory guard provides an immediate check
// before hitting the database.
// =====================================================
const recentCreations = new Map<string, number>() // userId -> timestamp

function isClientRateLimited(userId: string): boolean {
  const lastCreation = recentCreations.get(userId) || 0
  const now = Date.now()
  if (now - lastCreation < 1000) return true // 1-second minimum gap
  recentCreations.set(userId, now)
  return false
}

// =====================================================
// CP AWARD SERIALIZATION (P0-2 race condition fix)
// Same pattern as momentService.ts — prevents concurrent
// award_consciousness_points RPCs from this code path too.
// =====================================================
let cpAwardInProgress = false
const cpAwardQueue: Array<() => void> = []

async function serializedCPAward<T>(fn: () => Promise<T>): Promise<T> {
  if (cpAwardInProgress) {
    return new Promise<T>((resolve, reject) => {
      cpAwardQueue.push(async () => {
        try {
          resolve(await fn())
        } catch (e) {
          reject(e)
        }
      })
    })
  }
  cpAwardInProgress = true
  try {
    return await fn()
  } finally {
    cpAwardInProgress = false
    const next = cpAwardQueue.shift()
    if (next) next()
  }
}

/**
 * Create a new moment entry with full processing
 *
 * @param input - User moment input with content, áudio, emotion, etc
 * @returns Moment creation result with CP awards and streak info
 * @throws Error if validation fails or critical operations fail
 */
export async function createMomentEntry(input: CreateMomentEntryInput): Promise<MomentEntryResult> {
  const startTime = Date.now()

  try {
    // 1. VALIDATE INPUT
    const validationResult = validateMomentInput(input)
    if (!validationResult.valid) {
      const errorMsg = validationResult.errors.join('; ')
      throw new Error(`Validation failed: ${errorMsg}`)
    }

    const validatedInput = validationResult.validatedInput!
    log.debug('[momentPersistenceService] Input validated successfully')

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      log.warn('[momentPersistenceService] Validation warnings:', validationResult.warnings)
    }

    // 2. CHECK RATE LIMITING (client-side guard first, then DB check)
    if (isClientRateLimited(validatedInput.userId)) {
      throw new Error('You are creating moments too quickly. Please wait before creating another.')
    }
    const rateLimitOk = await checkUserRateLimit(validatedInput.userId)
    if (!rateLimitOk) {
      throw new Error('You are creating moments too quickly. Please wait before creating another.')
    }

    // 3. TRANSCRIBE AUDIO IF PROVIDED
    let textFromAudio: string | undefined
    if (input.audioBlob && input.audioBlob.size > 0) {
      log.debug('[momentPersistenceService] Transcribing áudio input...')
      textFromAudio = await transcribeAudio(input.audioBlob)
    }

    // 4. VALIDATE CONTENT (text input or áudio transcription)
    const finalContent = (validatedInput.content?.trim() || textFromAudio?.trim())

    if (!finalContent) {
      throw new Error('No content provided')
    }

    log.debug('[momentPersistenceService] Content validated, length:', finalContent.length)

    // 5. ANALYZE SENTIMENT (Parallel with tagging) - renumbered after áudio step
    const [sentimentResult, taggingResult] = await Promise.all([
      analyzeSentimentWithGemini(finalContent),
      generateAutoTags(finalContent, validatedInput.lifeAreas),
    ])

    log.debug('[momentPersistenceService] Sentiment analyzed:', sentimentResult.label)
    log.debug('[momentPersistenceService] Auto-tags generated:', taggingResult.tags.length)

    // 6. COMBINE TAGS
    const allTags = Array.from(new Set([...(validatedInput.tags || []), ...taggingResult.tags]))
    const tagsConfidence = {
      ...taggingResult.confidences,
      ...(validatedInput.tags || []).reduce((acc: any, tag: string) => ({ ...acc, [tag]: 1 }), {}),
    }

    // 7. PREPARE MOMENT DATA
    const processedData: ProcessedMomentData = {
      user_id: validatedInput.userId,
      type: textFromAudio ? 'audio' : 'text',
      content: finalContent,
      emotion_selected: validatedInput.emotionSelected,
      emotion_intensity: validatedInput.emotionIntensity,
      sentiment_score: sentimentResult.score,
      sentiment_label: sentimentResult.label,
      sentiment_generated_at: sentimentResult.generatedAt.toISOString(),
      life_areas: validatedInput.lifeAreas,
      moment_category: validatedInput.momentType,
      tags: allTags,
      ai_generated_tags: taggingResult.tags,
      tags_confidence: tagsConfidence,
      ai_insights: taggingResult.insights,
      location: validatedInput.location,
      happened_at: validatedInput.happened_at?.toISOString(),
    }

    // 8. INSERT INTO DATABASE
    const momentId = await insertMomentEntry(processedData)
    log.debug('[momentPersistenceService] Moment inserted:', momentId)

    // 9. AWARD CONSCIOUSNESS POINTS (Parallel with streak update)
    const [cpResult, streakResult] = await Promise.all([
      awardConsciousnessPoints(validatedInput.userId, momentId, processedData),
      updateUserStreak(validatedInput.userId, momentId),
    ])

    log.debug('[momentPersistenceService] CP awarded:', cpResult.totalPoints, 'Level up:', cpResult.leveledUp)
    log.debug('[momentPersistenceService] Streak updated:', streakResult.current_streak)

    // 10. RECORD ANALYTICS EVENT
    await recordMomentCreatedEvent(validatedInput.userId, momentId, processedData)

    const processingTime = Date.now() - startTime
    log.debug(`[momentPersistenceService] Moment created successfully in ${processingTime}ms`)

    // 11. RETURN RESULT
    return {
      momentId,
      pointsAwarded: cpResult.totalPoints,
      leveledUp: cpResult.leveledUp,
      newLevel: cpResult.leveledUp ? cpResult.newLevel : undefined,
      streakUpdated: true,
      currentStreak: streakResult.current_streak,
      createdAt: new Date(),
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    log.error(`[momentPersistenceService] Error creating moment (${processingTime}ms):`, error)

    // Log detailed error context
    await logError({
      operation: 'create_moment_entry',
      userId: input.userId,
      error: error as Error,
      context: {
        input: {
          emotionSelected: input.emotionSelected,
          lifeAreas: input.lifeAreas,
          hasContent: !!input.content,
        },
        processingTime,
      },
    })

    throw error
  }
}

/**
 * Get moment by ID
 */
export async function getMomentById(userId: string, momentId: string) {
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
    log.error('[momentPersistenceService] Error fetching moment:', error)
    return null
  }
}

/**
 * Get user moments with pagination and filters
 */
export async function getUserMoments(
  userId: string,
  options: {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
    emotions?: string[]
    tags?: string[]
    lifeAreas?: string[]
  } = {}
) {
  try {
    const { limit = 50, offset = 0, startDate, endDate, emotions, tags, lifeAreas } = options

    let query = supabase
      .from('moments')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    if (emotions && emotions.length > 0) {
      query = query.in('emotion_selected', emotions)
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    if (lifeAreas && lifeAreas.length > 0) {
      query = query.overlaps('life_areas', lifeAreas)
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      moments: data || [],
      total: count || 0,
      hasMore: offset + (data?.length || 0) < (count || 0),
    }
  } catch (error) {
    log.error('[momentPersistenceService] Error fetching moments:', error)
    return { moments: [], total: 0, hasMore: false }
  }
}

/**
 * Update moment entry
 */
export async function updateMomentEntry(userId: string, momentId: string, updates: Partial<ProcessedMomentData>) {
  try {
    const { data, error } = await supabase
      .from('moments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', momentId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    log.debug('[momentPersistenceService] Moment updated:', momentId)

    return data
  } catch (error) {
    log.error('[momentPersistenceService] Error updating moment:', error)
    throw error
  }
}

/**
 * Delete moment entry
 */
export async function deleteMomentEntry(userId: string, momentId: string) {
  try {
    const { error } = await supabase
      .from('moments')
      .delete()
      .eq('id', momentId)
      .eq('user_id', userId)

    if (error) throw error

    log.debug('[momentPersistenceService] Moment deleted:', momentId)
  } catch (error) {
    log.error('[momentPersistenceService] Error deleting moment:', error)
    throw error
  }
}

/**
 * Get user stats
 */
export async function getUserStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_consciousness_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Not found, initialize
      return await initializeUserStats(userId)
    }

    if (error) throw error

    return data
  } catch (error) {
    log.error('[momentPersistenceService] Error fetching user stats:', error)
    return null
  }
}

// =====================================================
// BASE64 HELPER
// =====================================================

/**
 * Convert a Blob/File to base64 string using FileReader (efficient, no byte-by-byte loop)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}


/**
 * Describe an image using Gemini vision (OCR + description)
 * Used by the Universal Input Funnel for photo moments
 *
 * @param imageFile - Image File from camera/gallery input
 * @returns Description text in Portuguese
 */
export async function describeImage(imageFile: File): Promise<string> {
  const startTime = Date.now()

  try {
    const imageBase64 = await blobToBase64(imageFile)

    const mimeType = imageFile.type || 'image/jpeg'

    log.debug('[momentPersistenceService] Describing image', {
      mimeType,
      sizeBytes: imageFile.size,
    })

    const response = await geminiClient.call({
      action: 'analyze_moment',
      payload: {
        imageBase64,
        mimeType,
        prompt: 'Descreva esta imagem em portugues brasileiro de forma concisa (max 200 caracteres). Foque no conteúdo principal e no contexto emocional se houver.',
      },
    })

    const description = response.result?.description || response.result?.text || response.result || ''

    // Track AI usage (non-blocking)
    trackAIUsage({
      operation_type: 'image_description',
      ai_model: 'gemini-2.5-flash',
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      module_type: 'journey',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'describeImage',
        operation: 'image_description',
        image_size_bytes: imageFile.size,
        image_mime_type: mimeType,
      },
    }).catch(error => {
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message)
    })

    log.debug('[momentPersistenceService] Image described', {
      descriptionLength: String(description).length,
      durationMs: Date.now() - startTime,
    })

    return String(description)
  } catch (error) {
    log.error('[momentPersistenceService] Error describing image:', error)
    throw new Error('Falha ao descrever a imagem. Tente novamente.')
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate auto-tags using Gemini
 */
async function generateAutoTags(content: string, lifeAreas: string[]): Promise<AutoTaggingResult> {
  const startTime = Date.now()

  try {
    const prompt = `Análise este momento pessoal e gere tags relevantes.

Momento: "${content.substring(0, 500)}"
Áreas de vida selecionadas: ${lifeAreas.join(', ')}

Retorne um JSON:
{
  "tags": ["tag1", "tag2", ...],
  "insights": "Uma frase de insight útil",
  "confidence": {"tag1": 0.9, "tag2": 0.7, ...}
}

Máximo 5 tags. Siga o padrão de tags em minúsculas com hífen.`

    const response = await geminiClient.call({
      action: 'generate_tags',
      payload: {
        content: content.substring(0, 500),
        lifeAreas: lifeAreas.join(', '),
        prompt,
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    })

    // Track AI usage (non-blocking, fire-and-forget)
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: response.model || 'gemini-2.5-flash',
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      module_type: 'journey',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'generateAutoTags',
        operation: 'auto_tagging',
        content_length: content.length,
      }
    }).catch(error => {
      // Non-blocking: log error but don't throw
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message);
    });

    const responseText = response.result?.text || JSON.stringify(response.result)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return getDefaultAutoTags()
    }

    const parsed = JSON.parse(jsonMatch[0])

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: any) => typeof t === 'string').slice(0, 10)
      : []

    return {
      tags: tags,
      insights: parsed.insights || 'Momento registrado com sucesso.',
      confidences: parsed.confidence || tags.reduce((acc: any, t: string) => ({ ...acc, [t]: 0.8 }), {}),
      relatedTags: [],
      generatedAt: new Date(),
    }
  } catch (error) {
    log.error('[momentPersistenceService] Error generating tags:', error)
    return getDefaultAutoTags()
  }
}

/**
 * Insert moment entry into database
 */
async function insertMomentEntry(data: ProcessedMomentData): Promise<string> {
  try {
    const { data: result, error } = await supabase
      .from('moments')
      .insert(data)
      .select('id')
      .single()

    if (error) throw error

    return result.id
  } catch (error) {
    log.error('[momentPersistenceService] Error inserting moment:', error)
    throw error
  }
}

/**
 * Award consciousness points
 */
async function awardConsciousnessPoints(
  userId: string,
  momentId: string,
  data: ProcessedMomentData
): Promise<CPAwardDetails> {
  try {
    // Calculate base points
    const basePoints = estimateBaseCP({
      userId,
      emotionSelected: data.emotion_selected,
      emotionIntensity: data.emotion_intensity,
      lifeAreas: data.life_areas,
      tags: data.tags,
    })

    // Call database function to award points (serialized to prevent race conditions)
    const { data: result, error } = await serializedCPAward(async () =>
      await supabase.rpc('award_consciousness_points', {
        p_user_id: userId,
        p_points: basePoints,
        p_reason: 'moment_registered',
        p_reference_id: momentId,
        p_reference_type: 'moment',
      })
    )

    if (error) {
      log.error('[momentPersistenceService] Error awarding CP:', error)
      // Continue with estimated result
      return {
        basePoints,
        totalPoints: basePoints,
        reason: 'moment_registered',
        levelUpBonus: 0,
      }
    }

    return {
      basePoints,
      totalPoints: result?.new_total || basePoints,
      levelUpBonus: result?.leveled_up ? 10 : 0,
      reason: 'moment_registered',
    }
  } catch (error) {
    log.error('[momentPersistenceService] Error awarding CP:', error)
    throw error
  }
}

/**
 * Update user streak
 */
async function updateUserStreak(userId: string, momentId: string) {
  try {
    const { data, error } = await supabase.rpc('update_consciousness_streak', {
      p_user_id: userId,
      p_interaction_type: 'moment',
    })

    if (error) {
      // Fallback to legacy function if new one not deployed yet
      log.warn('[momentPersistenceService] update_consciousness_streak failed, trying legacy:', error)
      const { data: legacyData, error: legacyErr } = await supabase.rpc('update_moment_streak', { p_user_id: userId })
      if (legacyErr) {
        log.error('[momentPersistenceService] Legacy streak update also failed:', legacyErr)
        return { current_streak: 0, longest_streak: 0, streak_bonus_awarded: false }
      }
      return legacyData || { current_streak: 0, longest_streak: 0, streak_bonus_awarded: false }
    }

    return data || { current_streak: 0, longest_streak: 0, streak_bonus_awarded: false }
  } catch (error) {
    log.error('[momentPersistenceService] Error updating streak:', error)
    return { current_streak: 0, longest_streak: 0, streak_bonus_awarded: false }
  }
}

/**
 * Record moment created event for analytics
 */
async function recordMomentCreatedEvent(userId: string, momentId: string, data: ProcessedMomentData) {
  try {
    // Could be sent to analytics service here
    log.debug('[momentPersistenceService] Moment created event:', {
      userId,
      momentId,
      type: data.type,
      sentiment: data.sentiment_label,
      lifeAreas: data.life_areas,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    log.error('[momentPersistenceService] Error recording event:', error)
    // Non-critical, continue
  }
}

/**
 * Check user rate limit
 */
async function checkUserRateLimit(userId: string): Promise<boolean> {
  try {
    // Get last moment creation time
    const { data, error } = await supabase
      .from('moments')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return true // No previous moments

    const lastMomentTime = new Date(data.created_at)
    const now = new Date()
    const timeSinceLastMoment = now.getTime() - lastMomentTime.getTime()

    // Minimum 1 second between moments
    return timeSinceLastMoment >= 1000
  } catch (error) {
    log.error('[momentPersistenceService] Error checking rate limit:', error)
    return true // Allow if check fails
  }
}

/**
 * Initialize user stats
 */
async function initializeUserStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_consciousness_stats')
      .insert({
        user_id: userId,
        total_points: 0,
        level: 1,
        level_name: 'Observador',
        current_streak: 0,
        longest_streak: 0,
        total_moments: 0,
        total_questions_answered: 0,
        total_summaries_reflected: 0,
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    log.error('[momentPersistenceService] Error initializing stats:', error)
    return null
  }
}

/**
 * Log error with context
 */
async function logError(context: {
  operation: string
  userId: string
  error: Error
  context?: any
}) {
  try {
    log.error('[momentPersistenceService] Error Log:', {
      timestamp: new Date().toISOString(),
      ...context,
    })

    // Could log to external service here
  } catch (error) {
    log.error('[momentPersistenceService] Error logging error:', error)
  }
}

/**
 * Get default auto tags
 */
function getDefaultAutoTags(): AutoTaggingResult {
  return {
    tags: [],
    insights: 'Seu momento foi registrado com sucesso.',
    confidences: {},
    relatedTags: [],
    generatedAt: new Date(),
  }
}
