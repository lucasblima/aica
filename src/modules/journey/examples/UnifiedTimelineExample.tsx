/**
 * Unified Timeline Example Component
 * Phase 1 Demo - Shows how to use the unified timeline data layer
 *
 * This is an EXAMPLE file showing integration patterns.
 * NOT for production use - Phase 2 will have proper UI components.
 */

import React from 'react'
import {
  useUnifiedTimeline,
  useTimelineStats,
} from '../hooks/useUnifiedTimeline'
import {
  UnifiedEvent,
  isWhatsAppEvent,
  isMomentEvent,
  isTaskEvent,
  isActivityEvent,
  isQuestionEvent,
  isSummaryEvent,
} from '../types/unifiedEvent'

/**
 * Example 1: Basic Timeline Display
 */
export function BasicTimelineExample() {
  const { events, isLoading, error, hasMore, loadMore } = useUnifiedTimeline()

  if (isLoading) return <div>Carregando timeline...</div>
  if (error) return <div>Erro: {error.message}</div>

  return (
    <div className="timeline">
      <h2>Minha Linha do Tempo</h2>
      <div className="events">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          Carregar Mais
        </button>
      )}
    </div>
  )
}

/**
 * Example 2: Filtered Timeline with Stats
 */
export function FilteredTimelineExample() {
  const { events, filters, setFilters, stats, total } = useUnifiedTimeline(undefined, {
    sources: ['whatsapp', 'moment', 'task'],
    dateRange: 'last30',
  })

  return (
    <div className="filtered-timeline">
      <div className="stats">
        <h3>Estatísticas (últimos 30 dias)</h3>
        {stats && (
          <ul>
            <li>Total de eventos: {stats.totalEvents}</li>
            <li>WhatsApp: {stats.eventsByType.whatsapp}</li>
            <li>Momentos: {stats.eventsByType.moment}</li>
            <li>Tarefas: {stats.eventsByType.task}</li>
          </ul>
        )}
      </div>

      <div className="filters">
        <h3>Filtros</h3>

        {/* Date Range Filter */}
        <select
          value={filters.dateRange}
          onChange={(e) =>
            setFilters({ dateRange: e.target.value as any })
          }
        >
          <option value="last7">Últimos 7 dias</option>
          <option value="last30">Últimos 30 dias</option>
          <option value="last90">Últimos 90 dias</option>
          <option value="all">Todo o período</option>
        </select>

        {/* Source Filter */}
        <div className="source-filter">
          {(['whatsapp', 'moment', 'task', 'question', 'summary'] as const).map(
            (source) => (
              <label key={source}>
                <input
                  type="checkbox"
                  checked={filters.sources.includes(source)}
                  onChange={(e) => {
                    const newSources = e.target.checked
                      ? [...filters.sources, source]
                      : filters.sources.filter((s) => s !== source)
                    setFilters({ sources: newSources })
                  }}
                />
                {source}
              </label>
            )
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar..."
          value={filters.searchTerm || ''}
          onChange={(e) => setFilters({ searchTerm: e.target.value })}
        />
      </div>

      <div className="events">
        {events.length === 0 ? (
          <p>Nenhum evento encontrado</p>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}

/**
 * Example 3: Stats Dashboard Only
 */
export function StatsDashboardExample() {
  const { stats, isLoading, error } = useTimelineStats(undefined, 'last30')

  if (isLoading) return <div>Carregando estatísticas...</div>
  if (error) return <div>Erro: {error.message}</div>
  if (!stats) return null

  return (
    <div className="stats-dashboard">
      <h2>Dashboard de Atividades</h2>

      <div className="stat-card">
        <h3>Total de Eventos</h3>
        <p className="stat-value">{stats.totalEvents}</p>
      </div>

      <div className="stat-breakdown">
        <h3>Por Tipo</h3>
        <ul>
          {Object.entries(stats.eventsByType).map(([type, count]) => (
            <li key={type}>
              {type}: <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="date-range">
        <h3>Período</h3>
        <p>
          {new Date(stats.dateRange.earliest).toLocaleDateString()} -{' '}
          {new Date(stats.dateRange.latest).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

/**
 * Example Event Card - Polymorphic rendering based on event type
 */
function EventCard({ event }: { event: UnifiedEvent }) {
  // WhatsApp Message
  if (isWhatsAppEvent(event)) {
    return (
      <div className="event-card whatsapp">
        <div className="event-header">
          <span className="icon">{event.displayData.icon}</span>
          <span className="label">{event.displayData.label}</span>
          <time>{new Date(event.created_at).toLocaleString()}</time>
        </div>
        <div className="event-content">
          <h4>{event.displayData.title}</h4>
          <p>{event.whatsapp.content_text}</p>
          {event.whatsapp.media_url && (
            <div className="media">
              {event.whatsapp.message_type === 'image' && (
                <img src={event.whatsapp.media_url} alt="WhatsApp media" />
              )}
              {event.whatsapp.message_type === 'áudio' && (
                <audio src={event.whatsapp.media_url} controls />
              )}
            </div>
          )}
          {event.sentiment && (
            <span className="sentiment">{event.sentiment}</span>
          )}
        </div>
      </div>
    )
  }

  // Moment
  if (isMomentEvent(event)) {
    return (
      <div className="event-card moment">
        <div className="event-header">
          <span className="icon">{event.displayData.icon}</span>
          <span className="label">{event.displayData.label}</span>
          <time>{new Date(event.created_at).toLocaleString()}</time>
        </div>
        <div className="event-content">
          <h4>{event.displayData.title}</h4>
          {event.emotion && <div className="emotion">{event.emotion}</div>}
          <p>{event.moment.content}</p>
          {event.moment.audio_url && (
            <audio src={event.moment.audio_url} controls />
          )}
          {event.tags && (
            <div className="tags">
              {event.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Task Completion
  if (isTaskEvent(event)) {
    return (
      <div className="event-card task">
        <div className="event-header">
          <span className="icon">{event.displayData.icon}</span>
          <span className="label">{event.displayData.label}</span>
          <time>{new Date(event.created_at).toLocaleString()}</time>
        </div>
        <div className="event-content">
          <h4>{event.task.title}</h4>
          <p>{event.task.description}</p>
          <div className="task-meta">
            <span className="priority">{event.task.priority}</span>
            {event.task.category_name && (
              <span className="category">{event.task.category_name}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // System Activity
  if (isActivityEvent(event)) {
    return (
      <div className="event-card activity">
        <div className="event-header">
          <span className="icon">{event.displayData.icon}</span>
          <span className="label">{event.displayData.label}</span>
          <time>{new Date(event.created_at).toLocaleString()}</time>
        </div>
        <div className="event-content">
          <p>{event.displayData.title}</p>
        </div>
      </div>
    )
  }

  // Daily Question Response
  if (isQuestionEvent(event)) {
    return (
      <div className="event-card question">
        <div className="event-header">
          <span className="icon">{event.displayData.icon}</span>
          <span className="label">{event.displayData.label}</span>
          <time>{new Date(event.created_at).toLocaleString()}</time>
        </div>
        <div className="event-content">
          <h4>{event.question.question_text}</h4>
          <p>{event.question.response_text}</p>
          <div className="meta">
            <span className="source">{event.question.question_source}</span>
            {event.question.category && (
              <span className="category">{event.question.category}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Weekly Summary
  if (isSummaryEvent(event)) {
    return (
      <div className="event-card summary">
        <div className="event-header">
          <span className="icon">{event.displayData.icon}</span>
          <span className="label">{event.displayData.label}</span>
          <time>{new Date(event.created_at).toLocaleString()}</time>
        </div>
        <div className="event-content">
          <h4>{event.displayData.title}</h4>
          <div className="summary-data">
            {event.summary.summary_data.emotionalTrend && (
              <p>
                <strong>Tendência:</strong>{' '}
                {event.summary.summary_data.emotionalTrend}
              </p>
            )}
            {event.summary.summary_data.dominantEmotions && (
              <div className="emotions">
                {event.summary.summary_data.dominantEmotions.join(', ')}
              </div>
            )}
            {event.summary.summary_data.insights && (
              <ul>
                {event.summary.summary_data.insights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            )}
          </div>
          {event.summary.user_reflection && (
            <div className="reflection">
              <strong>Reflexão:</strong>
              <p>{event.summary.user_reflection}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Generic fallback (should not happen with discriminated union)
  return (
    <div className="event-card generic">
      <div className="event-header">
        <span className="icon">{event.displayData.icon}</span>
        <span className="label">{event.displayData.label}</span>
        <time>{new Date(event.created_at).toLocaleString()}</time>
      </div>
      <div className="event-content">
        <p>{event.displayData.title}</p>
      </div>
    </div>
  )
}

/**
 * Example 4: Direct Service Usage (without React)
 */
export async function directServiceExample(userId: string) {
  // Import service directly
  const {
    getUnifiedTimeline,
    getEventCount,
    getTimelineStats,
  } = await import('../services/unifiedTimelineService')

  // Get last 10 events
  const events = await getUnifiedTimeline(userId, { limit: 10 })
  console.log('Latest events:', events)

  // Get total count
  const total = await getEventCount(userId)
  console.log('Total events:', total)

  // Get stats for last 30 days
  const stats = await getTimelineStats(userId, {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  })
  console.log('Stats:', stats)
}
