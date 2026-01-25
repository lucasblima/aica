/**
 * UnifiedTimelineView Component
 * Main container for unified timeline display
 * Orchestrates filtering, grouping, and event rendering
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useUnifiedTimeline, useTimelineStats } from '../../hooks/useUnifiedTimeline'
import { TimelineEventCard } from './TimelineEventCard'
import { TimelineFilter } from './TimelineFilter'
import { UnifiedEvent } from '../../types/unifiedEvent'
import {
  ClockIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

export interface UnifiedTimelineViewProps {
  userId?: string
  onEventClick?: (event: UnifiedEvent) => void
}

/**
 * Group events by day for timeline organization
 */
interface DayGroup {
  date: string
  label: string
  events: UnifiedEvent[]
}

function groupEventsByDay(events: UnifiedEvent[]): DayGroup[] {
  const groups = new Map<string, UnifiedEvent[]>()

  events.forEach((event) => {
    const date = new Date(event.created_at)
    const dateKey = format(date, 'yyyy-MM-dd')

    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(event)
  })

  const dayGroups: DayGroup[] = []
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))

  sortedDates.forEach((dateKey) => {
    const date = new Date(dateKey)
    let label: string

    if (isToday(date)) {
      label = 'Hoje'
    } else if (isYesterday(date)) {
      label = 'Ontem'
    } else {
      const daysAgo = differenceInDays(new Date(), date)
      if (daysAgo <= 7) {
        label = `${daysAgo} dias atrás`
      } else {
        label = format(date, "d 'de' MMMM", { locale: ptBR })
      }
    }

    dayGroups.push({
      date: dateKey,
      label,
      events: groups.get(dateKey)!,
    })
  })

  return dayGroups
}

/**
 * Loading skeleton for timeline
 */
function TimelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="h-6 w-32 bg-[#E0DDD5] rounded mb-3" />
          <div className="space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="ceramic-tile p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-8 w-8 bg-[#E0DDD5] rounded" />
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-[#E0DDD5] rounded mb-2" />
                    <div className="h-3 w-32 bg-[#E0DDD5] rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-[#E0DDD5] rounded mb-2" />
                <div className="h-3 w-3/4 bg-[#E0DDD5] rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state when no events match filters
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ceramic-tile p-12 text-center"
    >
      <SparklesIcon className="h-16 w-16 text-[#C4A574] mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-[#5C554B] mb-2">
        {hasFilters ? 'Nenhum evento encontrado' : 'Sua timeline está vazia'}
      </h3>
      <p className="text-sm text-[#948D82] max-w-md mx-auto">
        {hasFilters
          ? 'Tente ajustar os filtros para ver mais eventos.'
          : 'Comece a registrar momentos, completar tarefas e interagir para ver sua linha do tempo crescer.'}
      </p>
    </motion.div>
  )
}

/**
 * Error state with retry button
 */
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ceramic-tile p-12 text-center border-2 border-red-200"
    >
      <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-[#5C554B] mb-2">
        Erro ao carregar timeline
      </h3>
      <p className="text-sm text-[#948D82] mb-4">{error.message}</p>
      <button
        onClick={onRetry}
        className="ceramic-tile px-6 py-2 text-sm font-medium text-[#5C554B] hover:shadow-lg transition-all rounded-full"
      >
        Tentar Novamente
      </button>
    </motion.div>
  )
}

export function UnifiedTimelineView({ userId, onEventClick }: UnifiedTimelineViewProps) {
  const {
    events,
    isLoading,
    error,
    hasMore,
    total,
    filters,
    setFilters,
    loadMore,
    refresh,
  } = useUnifiedTimeline(userId)

  const { stats } = useTimelineStats(userId, filters.dateRange)

  const dayGroups = React.useMemo(() => groupEventsByDay(events), [events])

  const hasActiveFilters =
    filters.sources.length < 7 ||
    filters.dateRange !== 'last30' ||
    filters.searchTerm ||
    (filters.sentiments && filters.sentiments.length > 0) ||
    (filters.tags && filters.tags.length > 0)

  // Loading state (initial load)
  if (isLoading && events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <TimelineFilter filters={filters} onFilterChange={setFilters} stats={stats?.eventsByType} />
        <TimelineSkeleton />
      </div>
    )
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <TimelineFilter filters={filters} onFilterChange={setFilters} stats={stats?.eventsByType} />
        <ErrorState error={error} onRetry={refresh} />
      </div>
    )
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <TimelineFilter filters={filters} onFilterChange={setFilters} stats={stats?.eventsByType} />
        <EmptyState hasFilters={hasActiveFilters} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" data-tour="moments-timeline">
      {/* Filter Bar */}
      <TimelineFilter filters={filters} onFilterChange={setFilters} stats={stats?.eventsByType} />

      {/* Stats Summary */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ceramic-inset-shallow px-4 py-3 rounded-lg mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-[#948D82]" />
            <span className="text-sm text-[#5C554B]">
              <strong>{stats.totalEvents}</strong> eventos
            </span>
          </div>
          <button
            onClick={refresh}
            className="text-xs text-[#948D82] hover:text-[#5C554B] transition-colors flex items-center gap-1"
            disabled={isLoading}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </motion.div>
      )}

      {/* Timeline Events Grouped by Day */}
      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {dayGroups.map((dayGroup, dayIndex) => (
            <motion.div
              key={dayGroup.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: dayIndex * 0.05 }}
            >
              {/* Day Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E0DDD5] to-transparent" />
                <h3 className="text-sm font-semibold text-[#5C554B] uppercase tracking-wide">
                  {dayGroup.label}
                </h3>
                <span className="ceramic-inset-shallow px-2 py-1 text-xs text-[#948D82] rounded-full">
                  {dayGroup.events.length}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-[#E0DDD5] via-[#E0DDD5] to-transparent" />
              </div>

              {/* Events for this day */}
              <div className="space-y-3 relative">
                {/* Timeline vertical line (optional decorative element) */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C4A574] via-[#E0DDD5] to-transparent opacity-30" />

                <div className="pl-6 space-y-3">
                  <AnimatePresence mode="popLayout">
                    {dayGroup.events.map((event, eventIndex) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: eventIndex * 0.03 }}
                      >
                        <TimelineEventCard event={event} onClick={onEventClick} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center"
        >
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="ceramic-tile px-8 py-3 text-sm font-medium text-[#5C554B] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Carregando...
              </span>
            ) : (
              <span>
                Carregar Mais ({events.length}/{total || '?'})
              </span>
            )}
          </button>
        </motion.div>
      )}

      {/* End of timeline indicator */}
      {!hasMore && events.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 ceramic-inset-shallow px-4 py-2 rounded-full">
            <SparklesIcon className="h-4 w-4 text-[#C4A574]" />
            <span className="text-xs text-[#948D82]">
              Você chegou ao início da sua jornada
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
