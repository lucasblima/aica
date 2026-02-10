/**
 * useJourneyPatterns Hook
 * Fetches aggregated data for the Pattern Dashboard (Issue #208)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import { GeminiClient } from '@/lib/gemini'
import { createNamespacedLogger } from '@/lib/logger'
import { WeeklySummary } from '../types/weeklySummary'

const log = createNamespacedLogger('useJourneyPatterns')
const geminiClient = GeminiClient.getInstance()

export interface EmotionTrendPoint {
  weekNumber: number
  year: number
  trend: string
  dominantEmotions: string[]
  periodStart: string
}

export interface ActivityDay {
  date: string
  count: number
}

export interface ThemeEntry {
  tag: string
  count: number
}

export interface JourneyPatternsData {
  emotionTrends: EmotionTrendPoint[]
  activityData: ActivityDay[]
  topThemes: ThemeEntry[]
}

const BACKFILL_MAX_PER_SESSION = 5

export function useJourneyPatterns(userId?: string) {
  const [data, setData] = useState<JourneyPatternsData>({
    emotionTrends: [],
    activityData: [],
    topThemes: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const backfillTriggeredRef = useRef(false)

  const fetchPatterns = useCallback(async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch all three data sources in parallel
      const [summariesResult, heatmapResult, momentsResult] = await Promise.allSettled([
        // 1. Last 8 weekly summaries for emotion trends
        supabase
          .from('weekly_summaries')
          .select('week_number, year, summary_data, period_start')
          .eq('user_id', userId)
          .order('period_start', { ascending: false })
          .limit(8),

        // 2. Activity heatmap via RPC
        supabase.rpc('get_journey_activity_heatmap', {
          p_user_id: userId,
          p_days: 90,
        }),

        // 3. Recent moments for tag aggregation
        supabase
          .from('moments')
          .select('tags')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      // Process emotion trends
      let emotionTrends: EmotionTrendPoint[] = []
      if (summariesResult.status === 'fulfilled' && summariesResult.value.data) {
        emotionTrends = summariesResult.value.data
          .map((s: WeeklySummary) => ({
            weekNumber: s.week_number,
            year: s.year,
            trend: s.summary_data?.emotionalTrend || 'neutral',
            dominantEmotions: s.summary_data?.dominantEmotions || [],
            periodStart: s.period_start,
          }))
          .reverse() // Oldest first for chart
      }

      // Process activity heatmap
      let activityData: ActivityDay[] = []
      if (heatmapResult.status === 'fulfilled' && heatmapResult.value.data) {
        activityData = heatmapResult.value.data.map((d: { activity_date: string; moment_count: number }) => ({
          date: d.activity_date,
          count: Number(d.moment_count),
        }))
      }

      // Process theme clusters from tags
      let topThemes: ThemeEntry[] = []
      if (momentsResult.status === 'fulfilled' && momentsResult.value.data) {
        const tagCounts: Record<string, number> = {}
        for (const moment of momentsResult.value.data) {
          const tags = moment.tags as string[] | null
          if (tags) {
            for (const tag of tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            }
          }
        }
        topThemes = Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)

        // Backfill: if no themes found but moments exist, analyze untagged moments
        if (topThemes.length === 0 && momentsResult.value.data.length > 0 && !backfillTriggeredRef.current) {
          backfillTriggeredRef.current = true
          backfillUntaggedMoments(userId).catch(err => {
            log.warn('Backfill tags failed (non-critical):', err)
          })
        }
      }

      setData({ emotionTrends, activityData, topThemes })
    } catch (err) {
      log.error('Error fetching journey patterns:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  return {
    ...data,
    isLoading,
    error,
    refresh: fetchPatterns,
  }
}

/**
 * Backfill tags for moments that have content but no tags.
 * Processes up to BACKFILL_MAX_PER_SESSION moments per session to avoid Gemini overload.
 */
async function backfillUntaggedMoments(userId: string): Promise<void> {
  // Fetch moments with content but no tags
  const { data: untagged, error } = await supabase
    .from('moments')
    .select('id, content')
    .eq('user_id', userId)
    .or('tags.is.null,tags.eq.{}')
    .not('content', 'is', null)
    .gt('content', '')
    .order('created_at', { ascending: false })
    .limit(BACKFILL_MAX_PER_SESSION)

  if (error || !untagged || untagged.length === 0) return

  log.debug(`Backfilling tags for ${untagged.length} untagged moments`)

  // Process sequentially to respect rate limits
  for (const moment of untagged) {
    if (!moment.content || moment.content.trim().length < 3) continue

    try {
      const response = await geminiClient.call({
        action: 'analyze_moment',
        payload: { content: moment.content },
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

      await supabase
        .from('moments')
        .update({
          tags: result.tags,
          emotion: `${result.mood.emoji} ${result.mood.label}`,
          sentiment_data: {
            timestamp: new Date().toISOString(),
            sentiment: result.sentiment,
            sentimentScore: result.sentimentScore,
            emotions: result.emotions,
            triggers: result.triggers,
            energyLevel: result.energyLevel,
          },
        })
        .eq('id', moment.id)
        .eq('user_id', userId)

      log.debug(`Backfilled tags for moment ${moment.id}`)
    } catch (err) {
      log.warn(`Backfill failed for moment ${moment.id}:`, err)
    }
  }
}
