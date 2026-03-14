/**
 * User AI Context Service
 *
 * Aggregates user context across all AICA modules for richer AI responses.
 * Used by ChatContext to provide cross-module awareness to the coordinator agent.
 *
 * Implements a 5-minute cache to avoid repeated DB queries within the same session.
 *
 * @example
 * ```ts
 * const context = await getUserAIContext()
 * // { userName: 'Lucas', pendingTasks: 5, activeGrants: 2, ... }
 * ```
 */

import { supabase } from './supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import { fetchCalendarEvents } from './googleCalendarService'
import { computeAndStoreLifeScore } from '@/services/scoring/scoringEngine'
import type { ScoreTrend } from '@/services/scoring/types'

const log = createNamespacedLogger('userAIContextService')

export interface UserPattern {
  patternType: string
  description: string
  confidence: number
}

export type ActionItem = string | { action: string; module: string; priority: string }

export interface LifeCouncilInsight {
  overallStatus: string
  headline: string
  synthesis: string
  actionItems: ActionItem[]
  createdAt: string
}

export interface UserAIContext {
  userName: string
  pendingTasks: number
  completedTasksToday: number
  recentMoments: string[]
  activeGrants: number
  upcomingEpisodes: number
  financeSummary: {
    monthlyIncome: number
    monthlyExpenses: number
    balance: number
  } | null
  upcomingEvents: Array<{ title: string; startTime: string }> | null
  patterns: UserPattern[]
  latestInsight: LifeCouncilInsight | null
  lifeScore: {
    overall: number
    domains: Record<string, number>
    trend: ScoreTrend
    spiralAlert: boolean
  } | null
}

// Cache with 5-minute TTL
let cachedContext: UserAIContext | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Get aggregated user context across all modules.
 * Results are cached for 5 minutes to reduce DB load.
 */
export async function getUserAIContext(forceRefresh = false): Promise<UserAIContext | null> {
  // Return cached if still valid
  if (!forceRefresh && cachedContext && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedContext
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const userId = user.id
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0]

    // Run all queries in parallel
    const [profileRes, pendingTasksRes, completedTasksRes, momentsRes, grantsRes, episodesRes, financeRes, patternsRes, insightRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('work_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('work_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', today),
      supabase
        .from('moments')
        .select('content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('grant_projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['active', 'draft']),
      supabase
        .from('podcast_episodes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['planned', 'scheduled']),
      supabase
        .from('finance_transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('transaction_date', monthStart),
      supabase
        .from('user_patterns')
        .select('pattern_type, description, confidence_score')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('confidence_score', 0.5)
        .order('confidence_score', { ascending: false })
        .limit(5),
      supabase
        .from('daily_council_insights')
        .select('overall_status, headline, synthesis, actions, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    // Fetch upcoming events from Google Calendar (best-effort)
    let eventsRes: { data: any; error: any } = { data: null, error: null }
    try {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const events = await fetchCalendarEvents('primary', {
        timeMin: now.toISOString(),
        timeMax: weekFromNow.toISOString(),
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime',
      })
      eventsRes = {
        data: events.map(e => ({
          title: e.summary || 'Sem titulo',
          start_time: e.start.dateTime || e.start.date || '',
        })),
        error: null,
      }
    } catch {
      // Google Calendar not connected or token expired — graceful fallback
      eventsRes = { data: null, error: null }
    }

    // Calculate finance summary
    let financeSummary: UserAIContext['financeSummary'] = null
    if (financeRes.data?.length) {
      const monthlyIncome = financeRes.data
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
      const monthlyExpenses = financeRes.data
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
      financeSummary = {
        monthlyIncome,
        monthlyExpenses,
        balance: monthlyIncome - monthlyExpenses,
      }
    }

    // Map patterns
    const patterns: UserPattern[] = (patternsRes.data || []).map((p: any) => ({
      patternType: p.pattern_type,
      description: p.description,
      confidence: p.confidence_score,
    }))

    // Map latest insight
    let latestInsight: LifeCouncilInsight | null = null
    if (insightRes.data?.length) {
      const ins = insightRes.data[0] as any
      latestInsight = {
        overallStatus: ins.overall_status || 'unknown',
        headline: ins.headline || '',
        synthesis: ins.synthesis || '',
        actionItems: Array.isArray(ins.actions) ? ins.actions : [],
        createdAt: ins.created_at,
      }
    }

    // Compute Life Score (non-critical — graceful fallback to null)
    let lifeScoreData: UserAIContext['lifeScore'] = null
    try {
      const ls = await computeAndStoreLifeScore()
      if (ls) {
        lifeScoreData = {
          overall: Math.round(ls.composite * 100),
          domains: Object.fromEntries(
            Object.entries(ls.domainScores).map(([k, v]) => [k, Math.round(v * 100)])
          ),
          trend: ls.trend,
          spiralAlert: ls.spiralAlert,
        }
      }
    } catch {
      log.debug('Life Score computation skipped (non-critical)')
    }

    const context: UserAIContext = {
      userName: profileRes.data?.full_name?.split(' ')[0] || 'usuario',
      pendingTasks: pendingTasksRes.count || 0,
      completedTasksToday: completedTasksRes.count || 0,
      recentMoments: (momentsRes.data || [])
        .map((m: any) => (m.content || '').substring(0, 80))
        .filter(Boolean),
      activeGrants: grantsRes.count || 0,
      upcomingEpisodes: episodesRes.count || 0,
      financeSummary,
      upcomingEvents: (eventsRes.data || []).map((e: any) => ({
        title: e.title || 'Sem titulo',
        startTime: e.start_time,
      })),
      patterns,
      latestInsight,
      lifeScore: lifeScoreData,
    }

    // Update cache
    cachedContext = context
    cacheTimestamp = Date.now()

    return context
  } catch (err) {
    log.error('[userAIContextService] Error aggregating context:', err)
    return cachedContext // Return stale cache if available
  }
}

/**
 * Invalidate the cached context (call after significant user actions)
 */
export function invalidateAIContext(): void {
  cachedContext = null
  cacheTimestamp = 0
}
