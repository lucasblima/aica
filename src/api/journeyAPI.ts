/**
 * Journey API Endpoints
 * REST API for moment management and journey interactions
 *
 * Endpoints:
 * - POST /api/journey/moments - Create moment
 * - GET /api/journey/moments/:momentId - Get moment
 * - GET /api/journey/moments - List moments (paginated)
 * - PUT /api/journey/moments/:momentId - Update moment
 * - DELETE /api/journey/moments/:momentId - Delete moment
 * - GET /api/journey/stats - User stats
 * - GET /api/journey/stats/streak - Current streak
 * - POST /api/journey/moments/:momentId/insights - Generate insights
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import {
  CreateMomentEntryInput,
  MomentEntryResult,
} from '@/modules/journey/types/persistenceTypes'

const log = createNamespacedLogger('JourneyAPI')

import {
  createMomentEntry,
  getMomentById,
  getUserMoments,
  updateMomentEntry,
  deleteMomentEntry,
  getUserStats,
} from '@/modules/journey/services/momentPersistenceService'

/**
 * Create a new moment entry
 * POST /api/journey/moments
 */
export async function apiCreateMoment(input: CreateMomentEntryInput): Promise<MomentEntryResult> {
  return createMomentEntry(input)
}

/**
 * Get a specific moment by ID
 * GET /api/journey/moments/:momentId
 */
export async function apiGetMoment(momentId: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  return getMomentById(user.id, momentId)
}

/**
 * Get user's moments with filters and pagination
 * GET /api/journey/moments
 * Query params: limit, offset, startDate, endDate, emotions, tags, lifeAreas
 */
export async function apiGetMoments(options: {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  emotions?: string
  tags?: string
  lifeAreas?: string
} = {}) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  const parsedOptions = {
    limit: options.limit ? parseInt(String(options.limit)) : 50,
    offset: options.offset ? parseInt(String(options.offset)) : 0,
    startDate: options.startDate ? new Date(options.startDate) : undefined,
    endDate: options.endDate ? new Date(options.endDate) : undefined,
    emotions: options.emotions ? options.emotions.split(',') : undefined,
    tags: options.tags ? options.tags.split(',') : undefined,
    lifeAreas: options.lifeAreas ? options.lifeAreas.split(',') : undefined,
  }

  return getUserMoments(user.id, parsedOptions)
}

/**
 * Update a moment entry
 * PUT /api/journey/moments/:momentId
 */
export async function apiUpdateMoment(momentId: string, updates: Partial<CreateMomentEntryInput>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  // Validate userId matches
  if (updates.userId && updates.userId !== user.id) {
    throw new Error('Cannot update moment for another user')
  }

  return updateMomentEntry(user.id, momentId, updates as any)
}

/**
 * Delete a moment entry
 * DELETE /api/journey/moments/:momentId
 */
export async function apiDeleteMoment(momentId: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  return deleteMomentEntry(user.id, momentId)
}

/**
 * Get user consciousness stats
 * GET /api/journey/stats
 */
export async function apiGetUserStats() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  return getUserStats(user.id)
}

/**
 * Get current streak
 * GET /api/journey/stats/streak
 */
export async function apiGetCurrentStreak() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  const stats = await getUserStats(user.id)

  if (!stats) {
    return { currentStreak: 0, longestStreak: 0, lastMomentDate: null }
  }

  return {
    currentStreak: stats.current_streak,
    longestStreak: stats.longest_streak,
    lastMomentDate: stats.last_moment_date,
  }
}

/**
 * Get user's moments count
 * GET /api/journey/moments/count
 */
export async function apiGetMomentsCount() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  try {
    const { count, error } = await supabase
      .from('moment_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) throw error

    return { count: count || 0 }
  } catch (error) {
    log.error('[journeyAPI] Error counting moments:', error)
    return { count: 0 }
  }
}

/**
 * Get moments by emotion
 * GET /api/journey/moments/emotion/:emotion
 */
export async function apiGetMomentsByEmotion(emotion: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  return getUserMoments(user.id, {
    emotions: [emotion],
    limit: 50,
  })
}

/**
 * Get moments by life area
 * GET /api/journey/moments/area/:area
 */
export async function apiGetMomentsByLifeArea(area: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  return getUserMoments(user.id, {
    lifeAreas: [area],
    limit: 50,
  })
}

/**
 * Get moments with specific tag
 * GET /api/journey/moments/tag/:tag
 */
export async function apiGetMomentsByTag(tag: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  return getUserMoments(user.id, {
    tags: [tag],
    limit: 50,
  })
}

/**
 * Get recent moments (last 7 days)
 * GET /api/journey/moments/recent
 */
export async function apiGetRecentMoments(days: number = 7) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return getUserMoments(user.id, {
    startDate,
    limit: 50,
  })
}

/**
 * Search moments by text
 * GET /api/journey/moments/search
 */
export async function apiSearchMoments(query: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('moment_entries')
      .select('*')
      .eq('user_id', user.id)
      .textSearch('content', query, {
        type: 'websearch',
        config: 'portuguese',
      })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return {
      moments: data || [],
      total: data?.length || 0,
    }
  } catch (error) {
    log.error('[journeyAPI] Error searching moments:', error)
    return { moments: [], total: 0 }
  }
}

/**
 * Get emotional insights
 * GET /api/journey/insights/emotional
 */
export async function apiGetEmotionalInsights(days: number = 30) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { moments } = await getUserMoments(user.id, {
    startDate,
    limit: 100,
  })

  // Group by sentiment
  const sentimentGroups: Record<string, number> = {}
  moments.forEach(m => {
    const label = m.sentiment_label || 'neutral'
    sentimentGroups[label] = (sentimentGroups[label] || 0) + 1
  })

  // Calculate average emotion intensity
  const avgIntensity = moments.length > 0
    ? moments.reduce((sum: number, m: any) => sum + (m.emotion_intensity || 0), 0) / moments.length
    : 0

  // Get most common emotions
  const emotionCounts: Record<string, number> = {}
  moments.forEach(m => {
    const emotion = m.emotion_selected || 'unknown'
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
  })

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count }))

  return {
    period: `Last ${days} days`,
    sentimentDistribution: sentimentGroups,
    avgEmotionIntensity: Math.round(avgIntensity * 100) / 100,
    topEmotions,
    momentCount: moments.length,
  }
}

/**
 * Get life areas insights
 * GET /api/journey/insights/life-areas
 */
export async function apiGetLifeAreasInsights(days: number = 30) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { moments } = await getUserMoments(user.id, {
    startDate,
    limit: 100,
  })

  // Count by life area
  const areaCounts: Record<string, number> = {}
  moments.forEach(m => {
    (m.life_areas || []).forEach(area => {
      areaCounts[area] = (areaCounts[area] || 0) + 1
    })
  })

  // Calculate average sentiment by area
  const areaSenitment: Record<string, { count: number; avgScore: number }> = {}
  moments.forEach(m => {
    (m.life_areas || []).forEach(area => {
      if (!areaSenitment[area]) {
        areaSenitment[area] = { count: 0, avgScore: 0 }
      }
      areaSenitment[area].count += 1
      areaSenitment[area].avgScore += m.sentiment_score || 0
    })
  })

  Object.keys(areaSenitment).forEach(area => {
    areaSenitment[area].avgScore = areaSenitment[area].avgScore / areaSenitment[area].count
  })

  return {
    period: `Last ${days} days`,
    areaCounts,
    areaSentiments: areaSenitment,
    totalAreas: Object.keys(areaCounts).length,
  }
}

/**
 * Get tags summary
 * GET /api/journey/insights/tags
 */
export async function apiGetTagsSummary() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  const { moments } = await getUserMoments(user.id, {
    limit: 100,
  })

  const tagCounts: Record<string, number> = {}
  const tagSources: Record<string, 'user' | 'ai' | 'both'> = {}

  moments.forEach(m => {
    const userTags = m.tags || []
    const aiTags = m.ai_generated_tags || []

    userTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
      tagSources[tag] = tagSources[tag] === 'ai' ? 'both' : 'user'
    })

    aiTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
      tagSources[tag] = tagSources[tag] === 'user' ? 'both' : 'ai'
    })
  })

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({
      tag,
      count,
      source: tagSources[tag],
    }))

  return {
    totalUniqueTags: Object.keys(tagCounts).length,
    topTags,
    tagCounts,
  }
}

/**
 * Export moments as JSON
 * GET /api/journey/export
 */
export async function apiExportMoments() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  try {
    const { moments } = await getUserMoments(user.id, {
      limit: 10000, // Get all
    })

    const stats = await getUserStats(user.id)

    return {
      export: {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        stats,
        moments,
      },
    }
  } catch (error) {
    log.error('[journeyAPI] Error exporting moments:', error)
    throw error
  }
}

/**
 * Get journey timeline
 * GET /api/journey/timeline
 */
export async function apiGetJourneyTimeline(months: number = 6) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { moments } = await getUserMoments(user.id, {
    startDate,
    limit: 1000,
  })

  // Group by month
  const timeline: Record<string, { count: number; avgSentiment: number; topEmotion: string }> = {}

  moments.forEach(m => {
    const date = new Date(m.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!timeline[monthKey]) {
      timeline[monthKey] = { count: 0, avgSentiment: 0, topEmotion: '' }
    }

    timeline[monthKey].count += 1
    timeline[monthKey].avgSentiment += m.sentiment_score || 0
  })

  // Calculate averages
  Object.keys(timeline).forEach(month => {
    timeline[month].avgSentiment = timeline[month].avgSentiment / timeline[month].count
  })

  return {
    period: `Last ${months} months`,
    timeline: Object.entries(timeline)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ month, ...data })),
  }
}
