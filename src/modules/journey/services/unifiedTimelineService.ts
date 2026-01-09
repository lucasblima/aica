/**
 * Unified Timeline Service
 * Aggregates events from multiple sources into a single timeline
 * Sources: WhatsApp messages, moments, tasks, approvals, activities, questions, summaries
 */

import { supabase } from '@/services/supabaseClient'
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
  DEFAULT_TIMELINE_FILTERS,
} from '../types/unifiedEvent'

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
      displayData = {
        icon: whatsapp.direction === 'incoming' ? '💬' : '📤',
        title: whatsapp.contact_name || whatsapp.contact_number || 'WhatsApp',
        label: whatsapp.direction === 'incoming' ? 'Mensagem recebida' : 'Mensagem enviada',
        color: whatsapp.direction === 'incoming' ? '#25D366' : '#128C7E',
        preview: whatsapp.content.slice(0, 120) + (whatsapp.content.length > 120 ? '...' : ''),
      }
      break
    }

    case 'moment': {
      const moment = event as MomentEvent
      displayData = {
        icon: moment.emotion || '📝',
        title: moment.title || 'Momento',
        label: moment.has_audio ? 'Momento de áudio' : 'Momento',
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
 */
async function fetchWhatsAppEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number
): Promise<WhatsAppEvent[]> {
  try {
    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[UnifiedTimeline] WhatsApp fetch error:', error.message)
      return []
    }

    const events = (data || []).map((msg): WhatsAppEvent => ({
      id: `whatsapp-${msg.id}`,
      source: 'whatsapp' as const,
      created_at: msg.created_at,
      user_id: msg.user_id,
      content: msg.content || msg.message || '',
      contact_name: msg.contact_name,
      contact_number: msg.contact_number || msg.remote_jid,
      message_type: msg.message_type || 'text',
      direction: msg.direction || 'incoming',
      sentiment: msg.sentiment,
      tags: msg.tags || [],
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as WhatsAppEvent[]
  } catch (err) {
    console.error('[UnifiedTimeline] WhatsApp fetch failed:', err)
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
      console.warn('[UnifiedTimeline] Moments fetch error:', error.message)
      return []
    }

    const events = (data || []).map((moment): MomentEvent => ({
      id: `moment-${moment.id}`,
      source: 'moment' as const,
      created_at: moment.created_at,
      user_id: moment.user_id,
      content: moment.content || '',
      title: moment.title,
      emotion: moment.emotion,
      energy_level: moment.energy_level,
      tags: moment.tags || [],
      sentiment: moment.sentiment,
      has_audio: !!moment.audio_url,
      audio_duration_seconds: moment.audio_duration,
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as MomentEvent[]
  } catch (err) {
    console.error('[UnifiedTimeline] Moments fetch failed:', err)
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
      console.warn('[UnifiedTimeline] Tasks fetch error:', error.message)
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
    console.error('[UnifiedTimeline] Tasks fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Fetch daily questions for timeline
 */
async function fetchQuestionEvents(
  userId: string,
  dateFilter: string | null,
  limit: number,
  offset: number
): Promise<QuestionEvent[]> {
  try {
    let query = supabase
      .from('daily_questions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[UnifiedTimeline] Questions fetch error:', error.message)
      return []
    }

    const events = (data || []).map((q): QuestionEvent => ({
      id: `question-${q.id}`,
      source: 'question' as const,
      created_at: q.created_at,
      user_id: q.user_id,
      question_text: q.question || q.question_text || '',
      response: q.response || q.answer,
      answered_at: q.answered_at,
      skipped: q.skipped,
      xp_earned: q.xp_earned,
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as QuestionEvent[]
  } catch (err) {
    console.error('[UnifiedTimeline] Questions fetch failed:', err)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(err)
    }
    return []
  }
}

/**
 * Fetch weekly summaries for timeline
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[UnifiedTimeline] Summaries fetch error:', error.message)
      return []
    }

    const events = (data || []).map((s): SummaryEvent => ({
      id: `summary-${s.id}`,
      source: 'summary' as const,
      created_at: s.created_at,
      user_id: s.user_id,
      week_start: s.week_start,
      week_end: s.week_end,
      highlights: s.highlights || [],
      mood_average: s.mood_average,
      moments_count: s.moments_count,
      tasks_completed: s.tasks_completed,
      reflection: s.reflection,
      displayData: { icon: '', title: '', label: '', color: '', preview: '' }, // Placeholder
    }))

    return events.map(enrichEventWithDisplayData) as SummaryEvent[]
  } catch (err) {
    console.error('[UnifiedTimeline] Summaries fetch failed:', err)
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
      console.warn('[UnifiedTimeline] Activities fetch error:', error.message)
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
    console.error('[UnifiedTimeline] Activities fetch failed:', err)
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
    fetchPromises.push(fetchWhatsAppEvents(userId, dateFilter, perSourceLimit, 0))
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
