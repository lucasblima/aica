/**
 * useJourneyPatterns Hook
 * Fetches aggregated data for the Pattern Dashboard (Issue #208)
 * Includes automatic backfill of tags/mood/sentiment for historic moments
 */

import { useState, useCallback, useRef } from 'react'
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

export interface BackfillProgress {
  isRunning: boolean
  processed: number
  total: number
  failed: number
}

/** Max moments to backfill per session (rate-limit protection) */
const BACKFILL_MAX_PER_SESSION = 50
/** Delay between Gemini calls in ms */
const BACKFILL_DELAY_MS = 1200

export function useJourneyPatterns(userId?: string) {
  const [data, setData] = useState<JourneyPatternsData>({
    emotionTrends: [],
    activityData: [],
    topThemes: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress>({
    isRunning: false,
    processed: 0,
    total: 0,
    failed: 0,
  })
  const backfillTriggeredRef = useRef(false)
  const backfillAbortRef = useRef(false)

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

      // Debug: log query results to identify failures
      if (summariesResult.status === 'rejected') log.warn('weekly_summaries query failed:', summariesResult.reason)
      else if (summariesResult.value.error) log.warn('weekly_summaries error:', summariesResult.value.error)
      if (heatmapResult.status === 'rejected') log.warn('heatmap RPC failed:', heatmapResult.reason)
      else if (heatmapResult.value.error) log.warn('heatmap RPC error:', heatmapResult.value.error)
      if (momentsResult.status === 'rejected') log.warn('moments tags query failed:', momentsResult.reason)
      else if (momentsResult.value.error) log.warn('moments tags error:', momentsResult.value.error)

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
          if (tags && tags.length > 0) {
            for (const tag of tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            }
          }
        }
        topThemes = Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)
      }

      setData({ emotionTrends, activityData, topThemes })

      // Auto-trigger backfill once per session when insights tab loads
      if (!backfillTriggeredRef.current) {
        backfillTriggeredRef.current = true
        runBackfill(userId).catch(err => {
          log.warn('Backfill tags failed (non-critical):', err)
        })
      }
    } catch (err) {
      log.error('Error fetching journey patterns:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  /**
   * Run full backfill: finds all untagged moments and processes them sequentially.
   */
  const runBackfill = useCallback(async (uid: string) => {
    backfillAbortRef.current = false

    // Count total untagged moments
    const { count, error: countErr } = await supabase
      .from('moments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .is('tags', null)
      .not('content', 'is', null)

    if (countErr || !count || count === 0) {
      log.debug('No untagged moments to backfill')
      return
    }

    const totalToProcess = Math.min(count, BACKFILL_MAX_PER_SESSION)
    log.debug(`Backfill starting: ${totalToProcess} of ${count} untagged moments`)

    setBackfillProgress({ isRunning: true, processed: 0, total: totalToProcess, failed: 0 })

    // Fetch the batch
    const { data: untagged, error: fetchErr } = await supabase
      .from('moments')
      .select('id, content')
      .eq('user_id', uid)
      .is('tags', null)
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(totalToProcess)

    if (fetchErr || !untagged || untagged.length === 0) {
      setBackfillProgress(prev => ({ ...prev, isRunning: false }))
      return
    }

    let processed = 0
    let failed = 0

    for (const moment of untagged) {
      if (backfillAbortRef.current) {
        log.debug('Backfill aborted by user')
        break
      }

      if (!moment.content || moment.content.trim().length < 3) {
        processed++
        setBackfillProgress(prev => ({ ...prev, processed }))
        continue
      }

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

        const { error: updateErr } = await supabase
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
          .eq('user_id', uid)

        if (updateErr) {
          log.warn(`Backfill DB update failed for moment ${moment.id}:`, updateErr)
          failed++
          processed++
          setBackfillProgress(prev => ({ ...prev, processed, failed }))
          continue
        }

        processed++
        setBackfillProgress(prev => ({ ...prev, processed }))
      } catch (err) {
        processed++
        failed++
        setBackfillProgress(prev => ({ ...prev, processed, failed }))
        log.warn(`Backfill failed for moment ${moment.id}:`, err)
      }

      // Rate limit: wait between calls
      if (processed < untagged.length) {
        await new Promise(resolve => setTimeout(resolve, BACKFILL_DELAY_MS))
      }
    }

    setBackfillProgress(prev => ({ ...prev, isRunning: false }))
    log.debug(`Backfill complete: ${processed} processed, ${failed} failed`)

    // Refresh patterns to show newly tagged data
    if (processed > failed) {
      // Small delay to let DB settle
      await new Promise(resolve => setTimeout(resolve, 500))
      // Re-fetch without triggering another backfill
      fetchPatternsOnly(uid)
    }
  }, [])

  /**
   * Fetch patterns data only (no backfill trigger). Used after backfill completes.
   */
  const fetchPatternsOnly = useCallback(async (uid: string) => {
    try {
      const [summariesResult, heatmapResult, momentsResult] = await Promise.allSettled([
        supabase
          .from('weekly_summaries')
          .select('week_number, year, summary_data, period_start')
          .eq('user_id', uid)
          .order('period_start', { ascending: false })
          .limit(8),
        supabase.rpc('get_journey_activity_heatmap', { p_user_id: uid, p_days: 90 }),
        supabase
          .from('moments')
          .select('tags')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

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
          .reverse()
      }

      let activityData: ActivityDay[] = []
      if (heatmapResult.status === 'fulfilled' && heatmapResult.value.data) {
        activityData = heatmapResult.value.data.map((d: { activity_date: string; moment_count: number }) => ({
          date: d.activity_date,
          count: Number(d.moment_count),
        }))
      }

      let topThemes: ThemeEntry[] = []
      if (momentsResult.status === 'fulfilled' && momentsResult.value.data) {
        const tagCounts: Record<string, number> = {}
        for (const moment of momentsResult.value.data) {
          const tags = moment.tags as string[] | null
          if (tags && tags.length > 0) {
            for (const tag of tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            }
          }
        }
        topThemes = Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)
      }

      setData({ emotionTrends, activityData, topThemes })
    } catch (err) {
      log.warn('Post-backfill refresh failed:', err)
    }
  }, [])

  const stopBackfill = useCallback(() => {
    backfillAbortRef.current = true
  }, [])

  return {
    ...data,
    isLoading,
    error,
    backfillProgress,
    stopBackfill,
    refresh: fetchPatterns,
  }
}
