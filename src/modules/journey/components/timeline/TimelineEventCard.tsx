/**
 * TimelineEventCard Component
 * Polymorphic event card that displays different UI based on event type
 * Uses Digital Ceramic design system
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import {
  UnifiedEvent,
  isWhatsAppEvent,
  isMomentEvent,
  isTaskEvent,
  isActivityEvent,
  isQuestionEvent,
  isSummaryEvent,
} from '../../types/unifiedEvent'

export interface TimelineEventCardProps {
  event: UnifiedEvent
  onClick?: (event: UnifiedEvent) => void
  compact?: boolean
}

/**
 * Get sentiment badge emoji and color
 */
function getSentimentDisplay(
  sentiment?: string,
  sentimentScore?: number
): { emoji: string; color: string; label: string } | null {
  if (!sentiment) return null

  const scoreNum = sentimentScore || 0

  if (sentiment === 'positive' || scoreNum > 0.3) {
    return { emoji: '😊', color: '#10b981', label: 'Positivo' }
  }
  if (sentiment === 'negative' || scoreNum < -0.3) {
    return { emoji: '😞', color: '#ef4444', label: 'Negativo' }
  }
  return { emoji: '😐', color: '#94a3b8', label: 'Neutro' }
}

/**
 * Format timestamp with relative time
 */
function formatEventTime(timestamp: string): { relative: string; absolute: string } {
  const date = new Date(timestamp)

  let relative: string
  if (isToday(date)) {
    relative = `Hoje às ${format(date, 'HH:mm')}`
  } else if (isYesterday(date)) {
    relative = `Ontem às ${format(date, 'HH:mm')}`
  } else {
    relative = formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
  }

  const absolute = format(date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })

  return { relative, absolute }
}

export function TimelineEventCard({ event, onClick, compact = false }: TimelineEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const { relative, absolute } = formatEventTime(event.created_at)
  // Access sentiment from event if it has it
  const eventSentiment = 'sentiment' in event ? event.sentiment : undefined
  const sentiment = getSentimentDisplay(eventSentiment, undefined)

  const handleClick = () => {
    if (onClick) {
      onClick(event)
    } else {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        ceramic-tile
        ${compact ? 'p-3' : 'p-4'}
        transition-all
        duration-300
        cursor-pointer
        ${isHovered ? 'shadow-lg scale-[1.01]' : 'shadow-md'}
      `}
      onClick={handleClick}
    >
      {/* Header: Icon, Title, Time */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <motion.span
            className={`${compact ? 'text-xl' : 'text-2xl'} flex-shrink-0`}
            style={{ color: event.displayData.color }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            {event.displayData.icon}
          </motion.span>

          {/* Title and Label */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[#5C554B] truncate">
              {event.displayData.title}
            </h4>
            <p className="text-xs text-[#948D82]">{event.displayData.label}</p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#948D82]" title={absolute}>
            {relative}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="text-[#948D82] hover:text-[#5C554B] transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content Preview */}
      {event.displayData.preview && !isExpanded && (
        <div className="mb-3">
          <p className="text-sm text-[#5C554B] line-clamp-2 leading-relaxed">
            {event.displayData.preview}
          </p>
        </div>
      )}

      {/* Badges: Sentiment + Tags */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Sentiment Badge */}
        {sentiment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ceramic-inset-shallow px-2 py-1 rounded-full flex items-center gap-1"
            style={{ borderColor: sentiment.color }}
          >
            <span className="text-sm">{sentiment.emoji}</span>
            <span className="text-xs text-[#5C554B]">{sentiment.label}</span>
          </motion.div>
        )}

        {/* Emotion */}
        {'emotion' in event && event.emotion && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xl"
            title="Emoção"
          >
            {event.emotion}
          </motion.span>
        )}

        {/* Tags */}
        {'tags' in event &&
          event.tags &&
          event.tags.slice(0, compact ? 2 : 3).map((tag, index) => (
            <motion.span
              key={`${tag}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="ceramic-inset-shallow px-2 py-1 text-xs text-[#5C554B] rounded-full"
            >
              {tag}
            </motion.span>
          ))}

        {/* More tags indicator */}
        {'tags' in event && event.tags && event.tags.length > (compact ? 2 : 3) && (
          <span className="text-xs text-[#948D82]">
            +{event.tags.length - (compact ? 2 : 3)} mais
          </span>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-[#E0DDD5]"
          >
            {renderExpandedContent(event)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Render expanded content based on event type
 */
function renderExpandedContent(event: UnifiedEvent): React.ReactNode {
  // WhatsApp Message with Intent (Issue #91, #185)
  if (isWhatsAppEvent(event)) {
    const urgencyColors: Record<number, string> = {
      5: '#ef4444', // Red
      4: '#f97316', // Orange
      3: '#eab308', // Yellow
      2: '#84cc16', // Lime
      1: '#94a3b8', // Gray
    }
    const urgency = event.intent_urgency || 1
    const urgencyColor = urgencyColors[urgency] || urgencyColors[1]

    return (
      <div className="space-y-3">
        {/* Intent Summary */}
        {event.content && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-1">Resumo:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed">
              {event.content}
            </p>
          </div>
        )}

        {/* Intent Metadata */}
        <div className="flex flex-wrap gap-2">
          {/* Category */}
          {event.intent_category && (
            <span className="ceramic-inset-shallow px-2 py-1 text-xs text-[#5C554B] rounded-full capitalize">
              {event.intent_category}
            </span>
          )}

          {/* Urgency */}
          {event.intent_urgency && event.intent_urgency > 1 && (
            <span
              className="px-2 py-1 text-xs text-white rounded-full"
              style={{ backgroundColor: urgencyColor }}
            >
              Urgência: {event.intent_urgency}/5
            </span>
          )}

          {/* Action Required */}
          {event.intent_action_required && (
            <span className="px-2 py-1 text-xs text-white bg-blue-500 rounded-full">
              📋 Ação necessária
            </span>
          )}

          {/* Mentioned Date/Time */}
          {event.intent_mentioned_date && (
            <span className="ceramic-inset-shallow px-2 py-1 text-xs text-[#5C554B] rounded-full">
              📅 {event.intent_mentioned_date}
              {event.intent_mentioned_time && ` às ${event.intent_mentioned_time}`}
            </span>
          )}
        </div>

        {/* Contact & Direction */}
        <div className="flex flex-wrap gap-3 text-xs text-[#948D82]">
          {event.contact_name && (
            <span>
              Contato: <span className="font-medium text-[#5C554B]">{event.contact_name}</span>
            </span>
          )}
          <span>
            {event.direction === 'incoming' ? '📥 Recebida' : '📤 Enviada'}
          </span>
          {event.processing_status === 'pending' && (
            <span className="text-amber-600">⏳ Processando intent...</span>
          )}
        </div>
      </div>
    )
  }

  // Moment
  if (isMomentEvent(event)) {
    return (
      <div className="space-y-3">
        {event.content && (
          <div>
            <p className="text-sm text-[#5C554B] leading-relaxed whitespace-pre-wrap">
              {event.content}
            </p>
          </div>
        )}

        {event.tags && event.tags.length > 3 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.slice(3).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="ceramic-inset-shallow px-2 py-1 text-xs text-[#5C554B] rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Task
  if (isTaskEvent(event)) {
    return (
      <div className="space-y-3">
        {event.description && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-1">Descrição:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs">
          {event.priority && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Prioridade:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.priority}</span>
            </div>
          )}

          {event.status && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Status:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.status}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Activity
  if (isActivityEvent(event)) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[#5C554B]">{event.displayData.preview}</p>
        {event.metadata && (
          <div className="text-xs text-[#948D82]">
            <pre className="font-mono bg-[#F5F4F0] p-2 rounded overflow-x-auto">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // Daily Question
  if (isQuestionEvent(event)) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-[#5C554B] mb-1">Pergunta:</p>
          <p className="text-sm text-[#5C554B] leading-relaxed">
            {event.question_text}
          </p>
        </div>

        {event.response && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-1">Sua Resposta:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed whitespace-pre-wrap">
              {event.response}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Weekly Summary
  if (isSummaryEvent(event)) {
    return (
      <div className="space-y-3">
        {event.highlights && event.highlights.length > 0 && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-2">Destaques:</p>
            <ul className="space-y-1">
              {event.highlights.map((highlight, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#5C554B]">
                  <span className="text-[#C4A574]">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {event.reflection && (
          <div className="pt-3 border-t border-[#E0DDD5]">
            <p className="text-sm font-medium text-[#5C554B] mb-1">Reflexão:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed whitespace-pre-wrap">
              {event.reflection}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs">
          {event.moments_count !== undefined && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Momentos:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.moments_count}</span>
            </div>
          )}

          {event.tasks_completed !== undefined && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Tarefas concluídas:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.tasks_completed}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Generic fallback
  return (
    <div>
      <p className="text-sm text-[#5C554B]">{event.displayData.preview || 'Sem detalhes adicionais'}</p>
    </div>
  )
}
