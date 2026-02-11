/**
 * IntentTimeline
 * Chronological AI-processed view of WhatsApp messages.
 *
 * Shows intent_summaries grouped by day with direction indicators,
 * category badges, sentiment colors, and urgency dots.
 * Privacy-first: only displays AI-extracted intents, never raw text.
 */

import React, { useMemo } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IntentEntry } from '../../hooks/useIntentTimeline'

interface IntentTimelineProps {
  intents: IntentEntry[]
  totalCount: number
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  className?: string
}

// Group intents by date
interface DayGroup {
  date: string
  label: string
  entries: IntentEntry[]
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive': return 'text-ceramic-success'
    case 'negative': return 'text-ceramic-error'
    case 'mixed': return 'text-amber-600'
    default: return 'text-ceramic-text-secondary'
  }
}

function getCategoryBadgeColor(category: string | null): string {
  if (!category) return 'bg-ceramic-cool text-ceramic-text-tertiary'

  const map: Record<string, string> = {
    scheduling: 'bg-blue-100 text-blue-700',
    request: 'bg-amber-100 text-amber-700',
    question: 'bg-purple-100 text-purple-700',
    response: 'bg-ceramic-cool text-ceramic-text-secondary',
    update: 'bg-emerald-100 text-emerald-700',
    greeting: 'bg-ceramic-cool text-ceramic-text-tertiary',
    farewell: 'bg-ceramic-cool text-ceramic-text-tertiary',
    decision: 'bg-orange-100 text-orange-700',
    task: 'bg-rose-100 text-rose-700',
    financial: 'bg-teal-100 text-teal-700',
  }

  const key = category.toLowerCase().split('/')[0]
  return map[key] || 'bg-ceramic-cool text-ceramic-text-tertiary'
}

export const IntentTimeline: React.FC<IntentTimelineProps> = ({
  intents,
  totalCount,
  isLoading,
  hasMore,
  onLoadMore,
  className,
}) => {
  // Group by day
  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups = new Map<string, IntentEntry[]>()

    for (const intent of intents) {
      const dateKey = new Date(intent.message_timestamp).toDateString()
      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
      }
      groups.get(dateKey)!.push(intent)
    }

    return Array.from(groups.entries()).map(([dateKey, entries]) => ({
      date: dateKey,
      label: formatDayLabel(entries[0].message_timestamp),
      entries,
    }))
  }, [intents])

  if (intents.length === 0 && !isLoading) return null

  return (
    <div className={cn('space-y-1', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-ceramic-text-tertiary" />
          <h3 className="text-sm font-semibold text-ceramic-text-primary">
            Conversa Inteligente
          </h3>
          <span className="text-[10px] text-ceramic-text-tertiary">visão IA</span>
        </div>
        {totalCount > 0 && (
          <span className="text-[10px] text-ceramic-text-tertiary bg-ceramic-cool px-2 py-0.5 rounded-full">
            {totalCount} msgs
          </span>
        )}
      </div>

      {/* Day groups */}
      {dayGroups.map(group => (
        <div key={group.date}>
          {/* Day separator */}
          <div className="flex items-center gap-2 py-2">
            <div className="flex-1 h-px bg-ceramic-border" />
            <span className="text-[10px] font-medium text-ceramic-text-tertiary px-2">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-ceramic-border" />
          </div>

          {/* Intent entries */}
          <div className="space-y-1">
            {group.entries.map(intent => (
              <div
                key={intent.id}
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-ceramic-cool/30 transition-colors"
              >
                {/* Direction arrow */}
                <div className="flex-shrink-0 mt-0.5">
                  {intent.direction === 'incoming' ? (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-ceramic-info" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-ceramic-text-tertiary" />
                  )}
                </div>

                {/* Category badge */}
                {intent.intent_category && (
                  <span
                    className={cn(
                      'flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-0.5',
                      getCategoryBadgeColor(intent.intent_category)
                    )}
                  >
                    {intent.intent_category.split('/')[0]}
                  </span>
                )}

                {/* Intent summary */}
                <p
                  className={cn(
                    'flex-1 text-xs leading-relaxed',
                    getSentimentColor(intent.intent_sentiment)
                  )}
                >
                  "{intent.intent_summary}"
                </p>

                {/* Right: urgency + time */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {intent.intent_urgency != null && intent.intent_urgency >= 4 && (
                    <AlertCircle className="w-3 h-3 text-ceramic-error" />
                  )}
                  <span className="text-[10px] text-ceramic-text-tertiary tabular-nums">
                    {formatTime(intent.message_timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-ceramic-text-tertiary animate-spin" />
        </div>
      )}

      {/* Load more */}
      {hasMore && !isLoading && (
        <button
          onClick={onLoadMore}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-ceramic-text-tertiary hover:text-ceramic-text-secondary transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Carregar mais
        </button>
      )}
    </div>
  )
}

export default IntentTimeline
