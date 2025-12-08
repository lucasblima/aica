/**
 * Weekly Summary Service
 * Service layer for generating and managing weekly summaries (Feature 7)
 */

import { supabase } from '@/lib/supabase'
import { GeminiClient } from '@/lib/gemini'
import {
  WeeklySummary,
  WeeklySummaryData,
  WeeklySummaryWithReflection,
  getCurrentWeekNumber,
  getWeekDateRange,
} from '../types/weeklySummary'
import { Moment } from '../types/moment'
import { getMoments } from './momentService'

const geminiClient = GeminiClient.getInstance()

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
    // Check if summary already exists
    const existing = await getWeeklySummary(userId, year, weekNumber)
    if (existing) {
      console.log('Weekly summary already exists, regenerating...')
    }

    // Get week date range
    const { start, end } = getWeekDateRange(year, weekNumber)

    // Fetch moments for this week
    const moments = await getMoments(userId, {
      startDate: start,
      endDate: end,
    })

    if (moments.length === 0) {
      throw new Error('No moments found for this week')
    }

    // Generate summary using Gemini
    const summaryData = await generateSummaryWithAI(moments)

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
    console.error('Error generating weekly summary:', error)
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
    console.error('Error fetching weekly summary:', error)
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
      console.error('Could not auto-generate summary:', error)
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
    console.error('Error fetching weekly summaries:', error)
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

    // Award CP for reflection
    const { data: cpResult, error: cpError } = await supabase.rpc(
      'award_consciousness_points',
      {
        p_user_id: userId,
        p_points: 20,
        p_reason: 'weekly_reflection',
        p_reference_id: summaryId,
        p_reference_type: 'summary',
      }
    )

    if (cpError) {
      console.error('Error awarding CP:', cpError)
    }

    // Update stats
    await supabase
      .from('user_consciousness_stats')
      .update({ total_summaries_reflected: supabase.sql`total_summaries_reflected + 1` })
      .eq('user_id', userId)

    return {
      ...summary,
      reflection_added: true,
      cp_earned: cpResult?.new_total || 20,
    }
  } catch (error) {
    console.error('Error adding reflection:', error)
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
    console.error('Error marking summary as viewed:', error)
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate summary data using AI
 */
async function generateSummaryWithAI(moments: Moment[]): Promise<WeeklySummaryData> {
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

    return response.result as WeeklySummaryData
  } catch (error) {
    console.error('Error generating summary with AI:', error)
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
