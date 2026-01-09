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

export function TimelineEventCard({ event, onClick }: TimelineEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const { relative, absolute } = formatEventTime(event.created_at)
  const sentiment = getSentimentDisplay(event.sentiment, event.sentiment_score)

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
        p-4
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
            className="text-2xl flex-shrink-0"
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
        {event.emotion && (
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
        {event.tags &&
          event.tags.slice(0, 3).map((tag, index) => (
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
        {event.tags && event.tags.length > 3 && (
          <span className="text-xs text-[#948D82]">
            +{event.tags.length - 3} mais
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
  // WhatsApp Message
  if (isWhatsAppEvent(event)) {
    return (
      <div className="space-y-3">
        {event.whatsapp.content_text && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-1">Mensagem:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed whitespace-pre-wrap">
              {event.whatsapp.content_text}
            </p>
          </div>
        )}

        {event.whatsapp.media_url && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-2">Mídia:</p>
            {event.whatsapp.message_type === 'image' && (
              <img
                src={event.whatsapp.media_url}
                alt="WhatsApp media"
                className="rounded-lg max-w-full h-auto"
              />
            )}
            {event.whatsapp.message_type === 'audio' && (
              <audio src={event.whatsapp.media_url} controls className="w-full" />
            )}
            {event.whatsapp.message_type === 'video' && (
              <video src={event.whatsapp.media_url} controls className="w-full rounded-lg" />
            )}
          </div>
        )}

        {event.whatsapp.contact_name && (
          <div className="text-xs text-[#948D82]">
            Contato: <span className="font-medium">{event.whatsapp.contact_name}</span>
          </div>
        )}
      </div>
    )
  }

  // Moment
  if (isMomentEvent(event)) {
    return (
      <div className="space-y-3">
        {event.moment.content && (
          <div>
            <p className="text-sm text-[#5C554B] leading-relaxed whitespace-pre-wrap">
              {event.moment.content}
            </p>
          </div>
        )}

        {event.moment.audio_url && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-2">Áudio:</p>
            <audio src={event.moment.audio_url} controls className="w-full" />
          </div>
        )}

        {event.moment.location && (
          <div className="text-xs text-[#948D82]">
            Local: <span className="font-medium">{event.moment.location}</span>
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
        {event.task.description && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-1">Descrição:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed">
              {event.task.description}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs">
          {event.task.priority && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Prioridade:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.task.priority}</span>
            </div>
          )}

          {event.task.category_name && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Categoria:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.task.category_name}</span>
            </div>
          )}

          {event.task.status && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Status:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.task.status}</span>
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
        {event.activity.metadata && (
          <div className="text-xs text-[#948D82]">
            <pre className="font-mono bg-[#F5F4F0] p-2 rounded overflow-x-auto">
              {JSON.stringify(event.activity.metadata, null, 2)}
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
            {event.question.question_text}
          </p>
        </div>

        {event.question.response_text && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-1">Sua Resposta:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed whitespace-pre-wrap">
              {event.question.response_text}
            </p>
          </div>
        )}

        <div className="flex gap-3 text-xs">
          {event.question.question_source && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Fonte:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.question.question_source}</span>
            </div>
          )}

          {event.question.category && (
            <div className="ceramic-inset-shallow px-3 py-1 rounded-full">
              <span className="text-[#948D82]">Categoria:</span>{' '}
              <span className="font-medium text-[#5C554B]">{event.question.category}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Weekly Summary
  if (isSummaryEvent(event)) {
    return (
      <div className="space-y-3">
        {event.summary.summary_data.emotionalTrend && (
          <div>
            <p className="text-sm font-medium text-[#5C554B] mb-1">Tendência Emocional:</p>
            <div className="ceramic-inset-shallow px-3 py-2 rounded-lg">
              <span className="font-medium text-[#5C554B]">
                {event.summary.summary_data.emotionalTrend}
              </span>
            </div>
          </div>
        )}

        {event.summary.summary_data.dominantEmotions &&
          event.summary.summary_data.dominantEmotions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[#5C554B] mb-2">Emoções Dominantes:</p>
              <div className="flex flex-wrap gap-2">
                {event.summary.summary_data.dominantEmotions.map((emotion, i) => (
                  <span
                    key={i}
                    className="ceramic-inset-shallow px-3 py-1 text-xs text-[#5C554B] rounded-full"
                  >
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
          )}

        {event.summary.summary_data.insights &&
          event.summary.summary_data.insights.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[#5C554B] mb-2">Insights:</p>
              <ul className="space-y-1">
                {event.summary.summary_data.insights.map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#5C554B]">
                    <span className="text-[#C4A574]">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {event.summary.user_reflection && (
          <div className="pt-3 border-t border-[#E0DDD5]">
            <p className="text-sm font-medium text-[#5C554B] mb-1">Sua Reflexão:</p>
            <p className="text-sm text-[#5C554B] leading-relaxed whitespace-pre-wrap">
              {event.summary.user_reflection}
            </p>
          </div>
        )}
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
