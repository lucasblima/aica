/**
 * Weekly Summary Service
 * Service layer for generating and managing weekly summaries (Feature 7)
 */

import { supabase } from '@/services/supabaseClient'
import { GeminiClient } from '@/lib/gemini'
import { createNamespacedLogger } from '@/lib/logger'
import { trackAIUsage } from '@/services/aiUsageTrackingService'
import {
  WeeklySummary,
  WeeklySummaryData,
  WeeklySummaryWithReflection,
  getCurrentWeekNumber,
  getWeekDateRange,
} from '../types/weeklySummary'
import { Moment } from '../types/moment'
import { getMoments } from './momentService'
import { evaluateAndCalculateCP, updateAvgQualityScore } from './qualityEvaluationService'

const geminiClient = GeminiClient.getInstance()
const log = createNamespacedLogger('WeeklySummary')

/**
 * Generate weekly summary for current week
 */
export async function generateCurrentWeeklySummary(userId: string): Promise<WeeklySummary> {
  const { week, year } = getCurrentWeekNumber()
  return generateWeeklySummary(userId, year, week)
}

/**
 * Generate weekly summary for specific week
 */
export async function generateWeeklySummary(
  userId: string,
  year: number,
  weekNumber: number
): Promise<WeeklySummary> {
  try {
    // Check if summary already exists — return cached to avoid unnecessary Gemini call
    const existing = await getWeeklySummary(userId, year, weekNumber)
    if (existing) {
      log.debug('Weekly summary already exists, returning cached')
      return existing
    }

    // Get week date range
    const { start, end } = getWeekDateRange(year, weekNumber)

    // Fetch moments for this week
    const moments = await getMoments(userId, {
      startDate: start,
      endDate: end,
    })

    // Generate summary using Gemini (handles empty case gracefully)
    const summaryData = moments.length === 0
      ? generateEmptyWeekSummary()
      : await generateSummaryWithAI(moments)

    // Insert or update summary
    const { data, error } = await supabase
      .from('weekly_summaries')
      .upsert(
        {
          user_id: userId,
          week_number: weekNumber,
          year: year,
          period_start: start.toISOString().split('T')[0],
          period_end: end.toISOString().split('T')[0],
          summary_data: summaryData,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,year,week_number',
        }
      )
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    log.error('Error generating weekly summary:', error)
    throw error
  }
}

/**
 * Get weekly summary
 */
export async function getWeeklySummary(
  userId: string,
  year: number,
  weekNumber: number
): Promise<WeeklySummary | null> {
  try {
    const { data, error } = await supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('week_number', weekNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data
  } catch (error) {
    log.error('Error fetching weekly summary:', error)
    return null
  }
}

/**
 * Get current week summary (or generate if not exists)
 */
export async function getCurrentWeeklySummary(userId: string): Promise<WeeklySummary | null> {
  const { week, year } = getCurrentWeekNumber()
  let summary = await getWeeklySummary(userId, year, week)

  if (!summary) {
    // Auto-generate if not exists
    try {
      summary = await generateWeeklySummary(userId, year, week)
    } catch (error) {
      log.error('Could not auto-generate summary:', error)
      return null
    }
  }

  return summary
}

/**
 * Get all summaries for user
 */
export async function getAllWeeklySummaries(
  userId: string,
  limit: number = 20
): Promise<WeeklySummary[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    log.error('Error fetching weekly summaries:', error)
    return []
  }
}

/**
 * Add user reflection to summary
 */
export async function addReflectionToSummary(
  userId: string,
  summaryId: string,
  reflection: string
): Promise<WeeklySummaryWithReflection> {
  try {
    // Update summary with reflection
    const { data: summary, error: updateError } = await supabase
      .from('weekly_summaries')
      .update({ user_reflection: reflection })
      .eq('id', summaryId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) throw updateError

    // Build summary context for quality evaluation
    const summaryData = summary.summary_data as any
    const summaryContext = summaryData?.insights?.slice(0, 2)?.join('; ') || ''

    // Evaluate quality and calculate CP
    const qualityResult = await evaluateAndCalculateCP(
      reflection,
      'reflection',
      { summary_context: summaryContext }
    )

    // Award CP for reflection
    const { data: cpResult, error: cpError } = await supabase.rpc(
      'award_consciousness_points',
      {
        p_user_id: userId,
        p_points: qualityResult.cp_earned,
        p_reason: 'weekly_reflection',
        p_reference_id: summaryId,
        p_reference_type: 'summary',
      }
    )

    if (cpError) {
      log.error('Error awarding CP:', cpError)
    }

    // Update stats via RPC (supabase.sql doesn't work client-side)
    const { error: statsError } = await supabase.rpc('increment_summaries_reflected', {
      p_user_id: userId,
    })

    if (statsError) {
      log.warn('Error incrementing summaries counter:', statsError)
    }

    // Fire-and-forget: save quality score + update avg
    supabase
      .from('weekly_summaries')
      .update({ reflection_quality_score: qualityResult.quality_score })
      .eq('id', summaryId)
      .eq('user_id', userId)
      .then(({ error }) => { if (error) log.warn('Failed to save reflection quality_score:', error) })
    updateAvgQualityScore(userId, qualityResult.quality_score)

    return {
      ...summary,
      reflection_added: true,
      cp_earned: qualityResult.cp_earned,
      quality_score: qualityResult.quality_score,
      quality_feedback: qualityResult.assessment.feedback_message,
      quality_tier: qualityResult.assessment.feedback_tier,
    }
  } catch (error) {
    log.error('Error adding reflection:', error)
    throw error
  }
}

/**
 * Mark summary as viewed
 */
export async function markSummaryAsViewed(
  userId: string,
  summaryId: string
): Promise<void> {
  try {
    await supabase
      .from('weekly_summaries')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', summaryId)
      .eq('user_id', userId)
  } catch (error) {
    log.error('Error marking summary as viewed:', error)
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate summary data using AI
 */
async function generateSummaryWithAI(moments: Moment[]): Promise<WeeklySummaryData> {
  const startTime = Date.now()

  try {
    const response = await geminiClient.call({
      action: 'generate_weekly_summary',
      payload: {
        moments: moments.map(m => ({
          id: m.id,
          content: m.content,
          emotion: m.emotion,
          sentiment_data: m.sentiment_data,
          tags: m.tags,
          created_at: m.created_at,
        })),
      },
      model: 'smart', // Use smart model for deep analysis
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
        function_name: 'generateSummaryWithAI',
        operation: 'weekly_summary',
        moments_count: moments.length,
      }
    }).catch(error => {
      // Non-blocking: log error but don't throw
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message);
    });

    return response.result as WeeklySummaryData
  } catch (error) {
    log.error('Error generating summary with AI:', error)
    // Return fallback summary
    return generateFallbackSummary(moments)
  }
}

/**
 * Generate fallback summary (when AI fails)
 */
function generateFallbackSummary(moments: Moment[]): WeeklySummaryData {
  const emotions = moments.map(m => m.emotion).filter(Boolean) as string[]
  const emotionCounts = emotions.reduce((acc, emotion) => {
    acc[emotion] = (acc[emotion] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const dominantEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emotion]) => emotion)

  const keyMoments = moments.slice(0, 3).map(m => ({
    id: m.id,
    preview: m.content?.substring(0, 100) || '',
    sentiment: m.sentiment_data?.sentiment || 'neutral',
    created_at: m.created_at,
  }))

  return {
    emotionalTrend: 'stable',
    dominantEmotions,
    keyMoments,
    insights: ['Você registrou ' + moments.length + ' momentos esta semana.'],
    suggestedFocus: 'Continue registrando seus momentos para insights mais profundos.',
  }
}

/**
 * Generate empty week summary (when no moments captured)
 */
function generateEmptyWeekSummary(): WeeklySummaryData {
  return {
    emotionalTrend: 'neutral',
    dominantEmotions: [],
    keyMoments: [],
    insights: [
      'Nenhum momento foi capturado esta semana.',
      'Comece a registrar suas experiências para receber insights personalizados.',
    ],
    suggestedFocus: 'Capture pelo menos um momento por dia para construir autoconsciência.',
  }
}
