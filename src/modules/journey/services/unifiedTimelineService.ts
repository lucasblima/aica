/**
 * Unified Timeline Service
 * Aggregates events from multiple sources into a single timeline
 * Sources: WhatsApp messages, moments, tasks, approvals, activities, questions, summaries
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import { getEmotionDisplay } from '../types/emotionHelper'
import {
  UnifiedEvent,
  EventSource,
  TimelineFilters,
  TimelineStats,
  WhatsAppEvent,
  MomentEvent,
  TaskEvent,
  QuestionEvent,
  SummaryEvent,
  ActivityEvent,
  IntentCategory,
  DEFAULT_TIMELINE_FILTERS,
} from '../types/unifiedEvent'

/**
 * Icon mapping for intent categories (Issue #91, #185)
 */
const INTENT_CATEGORY_ICONS: Record<IntentCategory, string> = {
  question: '❓',
  response: '💬',
  scheduling: '📅',
  document: '📄',
  audio: '🎤',
  social: '👋',
  request: '📋',
  update: '🔄',
  media: '🖼️',
}

/**
 * Color mapping for intent categories
 */
const INTENT_CATEGORY_COLORS: Record<IntentCategory, string> = {
  question: '#8b5cf6',    // Purple
  response: '#3b82f6',    // Blue
  scheduling: '#f59e0b',  // Amber
  document: '#6366f1',    // Indigo
  audio: '#ec4899',       // Pink
  social: '#10b981',      // Green
  request: '#ef4444',     // Red
  update: '#06b6d4',      // Cyan
  media: '#84cc16',       // Lime
}

const log = createNamespacedLogger('UnifiedTimeline')

/**
 * Date range to SQL date filter
 */
function getDateFilter(dateRange: TimelineFilters['dateRange']): string | null {
  switch (dateRange) {
    case 'today': {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.toISOString()
    }
    case 'last7': {
      const date = new Date()
      date.setDate(date.getDate() - 7)
      return date.toISOString()
    }
    case 'last30': {
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString()
    }
    case 'last90': {
      const date = new Date()
      date.setDate(date.getDate() - 90)
      return date.toISOString()
    }
    case 'all':
    default:
      return null
  }
}

/**
 * Generate display data for UI rendering based on event type
 */
function enrichEventWithDisplayData(event: UnifiedEvent): UnifiedEvent {
  let displayData: UnifiedEvent['displayData']

  switch (event.source) {
    case 'whatsapp': {
      const whatsapp = event as WhatsAppEvent
      // Use intent data for display (Issue #91, #185)
      const category = whatsapp.intent_category
      const isUrgent = (whatsapp.intent_urgency || 1) >= 4
      const hasAction = whatsapp.intent_action_required

      // Determine icon based on intent category or fallback to direction
      let icon = whatsapp.direction === 'incoming' ? '💬' : '📤'
      let color = whatsapp.direction === 'incoming' ? '#25D366' : '#128C7E'

      if (category && INTENT_CATEGORY_ICONS[category]) {
        icon = INTENT_CATEGORY_ICONS[category]
        color = INTENT_CATEGORY_COLORS[category]
      }

      // Build label with intent info
      let label = whatsapp.direction === 'incoming' ? 'Mensagem recebida' : 'Mensagem enviada'
      if (isUrgent) {
        label = '🔴 ' + label + ' (Urgente)'
      } else if (hasAction) {
        label = '📌 ' + label + ' (Ação necessária)'
      }

      displayData = {
        icon,
        title: whatsapp.contact_name || whatsapp.contact_number || 'WhatsApp',
        label,
        color,
        preview: whatsapp.content.slice(0, 120) + (whatsapp.content.length > 120 ? '...' : ''),
      }
      break
    }

    case 'moment': {
      const moment = event as MomentEvent
      const { emoji, label } = getEmotionDisplay(moment.emotion)
      displayData = {
        icon: emoji,
        title: moment.title || 'Momento',
        label: label || 'Momento',
        color: '#C4A574',
        preview: moment.content.slice(0, 120) + (moment.content.length > 120 ? '...' : ''),
      }
      break
    }

    case 'task': {
      const task = event as TaskEvent
      const statusIcons = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        cancelled: '❌',
      }
      displayData = {
        icon: statusIcons[task.status] || '📋',
        title: task.title,
        label: `Tarefa - ${task.status}`,
        color: task.status === 'completed' ? '#10b981' : '#f59e0b',
        preview: task.description?.slice(0, 120) + (task.description && task.description.length > 120 ? '...' : '') || task.title,
      }
      break
    }

    case 'approval': {
      const approval = event as never // ApprovalEvent not fully implemented
      displayData = {
        icon: '✓',
        title: 'Aprovação',
        label: 'Decisão',
        color: '#8b5cf6',
        preview: 'Aprovação pendente',
      }
      break
    }

    case 'activity': {
      const activity = event as ActivityEvent
      displayData = {
        icon: '🎯',
        title: activity.activity_type,
        label: 'Atividade',
        color: '#3b82f6',
        preview: activity.description.slice(0, 120) + (activity.description.length > 120 ? '...' : ''),
      }
      break
    }

    case 'question': {
      const question = event as QuestionEvent
      displayData = {
        icon: '❓',
        title: 'Pergunta do Dia',
        label: question.answered_at ? 'Respondida' : 'Pendente',
        color: question.answered_at ? '#10b981' : '#f59e0b',
        preview: question.question_text.slice(0, 120) + (question.question_text.length > 120 ? '...' : ''),
      }
      break
    }

    case 'summary': {
      const summary = event as SummaryEvent
      displayData = {
        icon: '📊',
        title: 'Resumo Semanal',
        label: `Semana de ${new Date(summary.week_start).toLocaleDateString('pt-BR')}`,
        color: '#8b5cf6',
        preview: summary.reflection?.slice(0, 120) + (summary.reflection && summary.reflection.length > 120 ? '...' : '') || 'Resumo da semana',
      }
      break
    }

    default:
      displayData = {
        icon: '📌',
        title: 'Evento',
        label: 'Evento desconhecido',
        color: '#94a3b8',
        preview: 'Sem detalhes',
      }
  }

  return { ...event, displayData }
}

/**
 * Fetch WhatsApp messages for timeline
 * Updated for Issue #91, #185: Privacy-first intent-based display
 */
async function fetchWhatsAppEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number,
  filters?: TimelineFilters
): Promise<WhatsAppEvent[]> {
  try {
    // JOIN with contact_network to get contact name and number
    // Include intent fields for privacy-first display
    let query = supabase
      .from('whatsapp_messages')
      .select(`
        id,
        user_id,
        contact_id,
        message_direction,
        message_timestamp,
        intent_media_type,
        processing_status,
        intent_summary,
        intent_category,
        intent_sentiment,
        intent_urgency,
        intent_topic,
        intent_action_required,
        intent_mentioned_date,
        intent_mentioned_time,
        intent_confidence,
        created_at,
        contact_network!contact_id (
          name,
          phone_number,
          whatsapp_name
        )
      `)
      .eq('user_id', userId)
      // Only show messages that have been processed (have intent_summary)
      .in('processing_status', ['completed', 'skipped'])
      .order('message_timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('message_timestamp', dateFilter)
    }

    // Apply intent-based filters (Issue #91, #185)
    if (filters?.intentCategories && filters.intentCategories.length > 0) {
      query = query.in('intent_category', filters.intentCategories)
    }
    if (filters?.intentSentiments && filters.intentSentiments.length > 0) {
      query = query.in('intent_sentiment', filters.intentSentiments)
    }
    if (filters?.minUrgency && filters.minUrgency > 1) {
      query = query.gte('intent_urgency', filters.minUrgency)
    }
    if (filters?.actionRequired) {
      query = query.eq('intent_action_required', true)
    }

    const { data, error } = await query

    if (error) {
      log.warn('[UnifiedTimeline] WhatsApp fetch error:', error.message)
      return []
    }

    const events = (data || []).map((msg): WhatsAppEvent => ({
      id: `whatsapp-${msg.id}`,
      source: 'whatsapp' as const,
      created_at: msg.message_timestamp || msg.created_at,
      user_id: msg.user_id,
      // Privacy-first: Use intent_summary instead of raw text (Issue #91)
      content: msg.intent_summary || '',
      contact_name: msg.contact_network?.name || msg.contact_network?.whatsapp_name || 'Contato Desconhecido',
      contact_number: msg.contact_network?.phone_number || '',
      contact_id: msg.contact_id,
      message_type: msg.intent_media_type || 'text',
      direction: msg.message_direction || 'incoming',
      // Intent fields (Issue #91, #185)
      intent_category: msg.intent_category,
      intent_sentiment: msg.intent_sentiment,
      intent_urgency: msg.intent_urgency,
      intent_topic: msg.intent_topic,
      intent_action_required: msg.intent_action_required,
      intent_mentioned_date: msg.intent_mentioned_date,
      intent_mentioned_time: msg.intent_mentioned_time,
      intent_confidence: msg.intent_confidence,
      processing_status: msg.processing_status,
      // Map intent_sentiment to event sentiment
      sentiment: msg.intent_sentiment === 'positive' ? 'positive' :
                 msg.intent_sentiment === 'negative' ? 'negative' :
                 msg.intent_sentiment === 'urgent' ? 'negative' : 'neutral',
      tags: msg.intent_topic ? [msg.intent_topic] : [],
      displayData: { icon: '', title: '', label: '', color: '', preview: '' },
    }))

    return events.map(enrichEventWithDisplayData) as WhatsAppEvent[]
  } catch (err) {
    log.error('[UnifiedTimeline] WhatsApp fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Fetch moments for timeline
 */
async function fetchMomentEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number
): Promise<MomentEvent[]> {
  try {
    let query = supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      log.warn('[UnifiedTimeline] Moments fetch error:', error.message)
      return []
    }

    const events = (data || []).map((moment): MomentEvent => ({
      id: `moment-${moment.id}`,
      source: 'moment' as const,
      created_at: moment.created_at,
      user_id: moment.user_id,
      content: moment.content || '',
      // Issue #199: Map from actual Moment fields, not nonexistent columns
      title: moment.content?.split('\n')[0]?.slice(0, 80),
      emotion: moment.emotion,
      energy_level: moment.sentiment_data?.energyLevel,
      tags: moment.tags || [],
      sentiment: moment.sentiment_data?.sentiment === 'very_positive' || moment.sentiment_data?.sentiment === 'positive'
        ? 'positive'
        : moment.sentiment_data?.sentiment === 'very_negative' || moment.sentiment_data?.sentiment === 'negative'
        ? 'negative'
        : moment.sentiment_data ? 'neutral' : undefined,
      emotions_detected: moment.sentiment_data?.emotions,
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as MomentEvent[]
  } catch (err) {
    log.error('[UnifiedTimeline] Moments fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Fetch tasks for timeline
 */
async function fetchTaskEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number
): Promise<TaskEvent[]> {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      log.warn('[UnifiedTimeline] Tasks fetch error:', error.message)
      return []
    }

    const events = (data || []).map((task): TaskEvent => ({
      id: `task-${task.id}`,
      source: 'task' as const,
      created_at: task.created_at,
      user_id: task.user_id,
      title: task.title || task.name || '',
      description: task.description,
      status: task.status || 'pending',
      priority: task.quadrant || task.priority || 'not_urgent_not_important',
      completed_at: task.completed_at,
      due_date: task.due_date,
      xp_earned: task.xp_earned,
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as TaskEvent[]
  } catch (err) {
    log.error('[UnifiedTimeline] Tasks fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Fetch question responses for timeline
 * Note: Queries question_responses (user answers), not daily_questions (global question pool)
 */
async function fetchQuestionEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number
): Promise<QuestionEvent[]> {
  try {
    // Query question_responses with join to daily_questions for the question text
    // Note: Using responded_at for ordering and filtering (created_at may not exist)
    let query = supabase
      .from('question_responses')
      .select(`
        id,
        user_id,
        question_id,
        response_text,
        responded_at,
        daily_questions!inner(id, question_text, category)
      `)
      .eq('user_id', userId)
      .order('responded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('responded_at', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      log.warn('[UnifiedTimeline] Questions fetch error:', error.message)
      return []
    }

    const events = (data || []).map((q: any): QuestionEvent => ({
      id: `question-${q.id}`,
      source: 'question' as const,
      created_at: q.responded_at, // Use responded_at as the event timestamp
      user_id: q.user_id,
      question_text: q.daily_questions?.question_text || '',
      response: q.response_text,
      answered_at: q.responded_at,
      skipped: false,
      xp_earned: 10, // Default CP for answering
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as QuestionEvent[]
  } catch (err) {
    log.error('[UnifiedTimeline] Questions fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Fetch weekly summaries for timeline
 * Note: Uses period_start for ordering and filtering (matches actual DB column)
 */
async function fetchSummaryEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number
): Promise<SummaryEvent[]> {
  try {
    let query = supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('period_start', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      log.warn('[UnifiedTimeline] Summaries fetch error:', error.message)
      return []
    }

    const events = (data || []).map((s): SummaryEvent => ({
      id: `summary-${s.id}`,
      source: 'summary' as const,
      created_at: s.period_start, // Use period_start as event timestamp
      user_id: s.user_id,
      week_start: s.period_start,
      week_end: s.period_end,
      highlights: s.highlights || [],
      mood_average: s.mood_average,
      moments_count: s.moments_count,
      tasks_completed: s.tasks_completed,
      reflection: s.user_reflection,
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as SummaryEvent[]
  } catch (err) {
    log.error('[UnifiedTimeline] Summaries fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Fetch activities for timeline
 */
async function fetchActivityEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number
): Promise<ActivityEvent[]> {
  try {
    let query = supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      log.warn('[UnifiedTimeline] Activities fetch error:', error.message)
      return []
    }

    const events = (data || []).map((a): ActivityEvent => ({
      id: `activity-${a.id}`,
      source: 'activity' as const,
      created_at: a.created_at,
      user_id: a.user_id,
      activity_type: a.activity_type || a.type || 'general',
      description: a.description || '',
      metadata: a.metadata,
      xp_earned: a.xp_earned,
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as ActivityEvent[]
  } catch (err) {
    log.error('[UnifiedTimeline] Activities fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Main function to fetch unified timeline events
 */
export async function fetchUnifiedTimelineEvents(
  userId: string,
  filters: TimelineFilters = DEFAULT_TIMELINE_FILTERS,
  limit: number = 20,
  offset: number = 0
): Promise<{ events: UnifiedEvent[]; total: number }> {
  if (!userId) {
    return { events: [], total: 0 }
  }

  const dateFilter = getDateFilter(filters.dateRange)
  const perSourceLimit = Math.ceil(limit / filters.sources.length) + 5 // Extra to ensure enough after merge

  // Fetch from all enabled sources in parallel
  const fetchPromises: Promise<UnifiedEvent[]>[] = []

  if (filters.sources.includes('whatsapp')) {
    fetchPromises.push(fetchWhatsAppEvents(userId, dateFilter, perSourceLimit, 0, filters))
  }
  if (filters.sources.includes('moment')) {
    fetchPromises.push(fetchMomentEvents(userId, dateFilter, perSourceLimit, 0))
  }
  if (filters.sources.includes('task')) {
    fetchPromises.push(fetchTaskEvents(userId, dateFilter, perSourceLimit, 0))
  }
  if (filters.sources.includes('question')) {
    fetchPromises.push(fetchQuestionEvents(userId, dateFilter, perSourceLimit, 0))
  }
  if (filters.sources.includes('summary')) {
    fetchPromises.push(fetchSummaryEvents(userId, dateFilter, perSourceLimit, 0))
  }
  if (filters.sources.includes('activity')) {
    fetchPromises.push(fetchActivityEvents(userId, dateFilter, perSourceLimit, 0))
  }

  const results = await Promise.all(fetchPromises)

  // Merge and sort all events by created_at (descending)
  let allEvents = results.flat()

  // Apply search filter if present
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase()
    allEvents = allEvents.filter((event) => {
      const content = 'content' in event ? event.content : ''
      const title = 'title' in event ? event.title : ''
      const description = 'description' in event ? event.description : ''
      return (
        content?.toLowerCase().includes(searchLower) ||
        title?.toLowerCase().includes(searchLower) ||
        description?.toLowerCase().includes(searchLower)
      )
    })
  }

  // Apply sentiment filter if present
  if (filters.sentiments && filters.sentiments.length > 0) {
    allEvents = allEvents.filter((event) => {
      const sentiment = 'sentiment' in event ? event.sentiment : undefined
      return sentiment && filters.sentiments!.includes(sentiment)
    })
  }

  // Apply tag filter if present
  if (filters.tags && filters.tags.length > 0) {
    allEvents = allEvents.filter((event) => {
      const tags = 'tags' in event ? event.tags : undefined
      return tags && tags.some((tag) => filters.tags!.includes(tag))
    })
  }

  // Sort by date (newest first)
  allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply pagination
  const total = allEvents.length
  const paginatedEvents = allEvents.slice(offset, offset + limit)

  return { events: paginatedEvents, total }
}

/**
 * Fetch timeline statistics
 */
export async function fetchTimelineStats(
  userId: string,
  dateRange: TimelineFilters['dateRange'] = 'last30'
): Promise<TimelineStats> {
  if (!userId) {
    return {
      totalEvents: 0,
      eventsByType: {
        whatsapp: 0,
        moment: 0,
        task: 0,
        approval: 0,
        activity: 0,
        question: 0,
        summary: 0,
      },
    }
  }

  const { events } = await fetchUnifiedTimelineEvents(
    userId,
    { ...DEFAULT_TIMELINE_FILTERS, dateRange },
    1000, // Fetch more for accurate stats
    0
  )

  const eventsByType: Record<EventSource, number> = {
    whatsapp: 0,
    moment: 0,
    task: 0,
    approval: 0,
    activity: 0,
    question: 0,
    summary: 0,
  }

  events.forEach((event) => {
    eventsByType[event.source]++
  })

  // Calculate average sentiment
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
  events.forEach((event) => {
    if ('sentiment' in event && event.sentiment) {
      sentimentCounts[event.sentiment]++
    }
  })

  let averageSentiment: TimelineStats['averageSentiment']
  const maxSentiment = Math.max(...Object.values(sentimentCounts))
  if (maxSentiment > 0) {
    averageSentiment = Object.entries(sentimentCounts).find(
      ([, count]) => count === maxSentiment
    )?.[0] as TimelineStats['averageSentiment']
  }

  // Collect top tags
  const tagCounts = new Map<string, number>()
  events.forEach((event) => {
    if ('tags' in event && event.tags) {
      event.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    }
  })
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  return {
    totalEvents: events.length,
    eventsByType,
    averageSentiment,
    topTags,
  }
}
