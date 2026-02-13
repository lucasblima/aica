/**
 * MomentCard Component
 * Displays a single moment in the timeline
 */

import React, { useState } from 'react'
import { Moment } from '../../types/moment'
import { getSentimentColor } from '../../types/sentiment'
import { getEmotionDisplay } from '../../types/emotionHelper'
import {
  ClockIcon,
  MapPinIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MomentCardProps {
  moment: Moment
  onDelete?: (momentId: string) => void
}

export function MomentCard({ moment, onDelete }: MomentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const sentimentColor = moment.sentiment_data
    ? getSentimentColor(moment.sentiment_data.sentiment)
    : '#94a3b8'
  const emotionDisplay = getEmotionDisplay(moment.emotion)

  const createdAt = new Date(moment.created_at)
  const relativeTime = formatDistanceToNow(createdAt, {
    addSuffix: true,
    locale: ptBR,
  })
  const absoluteTime = format(createdAt, "EEEE, d 'de' MMMM 'às' HH:mm", {
    locale: ptBR,
  })

  return (
    <div
      className="bg-ceramic-base rounded-lg shadow-md p-4 border-l-4 transition-all hover:shadow-lg"
      style={{ borderLeftColor: sentimentColor }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          {/* Emotion + Time */}
          <div className="flex items-center gap-2 mb-1">
            {moment.emotion && (
              <span className="text-2xl" title={emotionDisplay.label}>
                {emotionDisplay.emoji}
              </span>
            )}
            <div className="flex items-center gap-1 text-sm text-ceramic-text-secondary">
              <ClockIcon className="h-4 w-4" />
              <span className="capitalize">{relativeTime}</span>
            </div>
          </div>

          {/* Absolute time */}
          <p className="text-xs text-ceramic-text-tertiary capitalize">{absoluteTime}</p>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-ceramic-text-tertiary hover:text-ceramic-text-primary transition-colors"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Content preview */}
      <div className="mb-3">
        {moment.content && (
          <p className="text-ceramic-text-primary leading-relaxed">
            {isExpanded
              ? moment.content
              : moment.content.length > 150
              ? moment.content.substring(0, 150) + '...'
              : moment.content}
          </p>
        )}
      </div>

      {/* Tags */}
      {moment.tags && moment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {moment.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-ceramic-cool text-ceramic-text-secondary text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-ceramic-text-secondary/10 space-y-3">
          {/* Location */}
          {moment.location && (
            <div className="flex items-center gap-2 text-sm text-ceramic-text-secondary">
              <MapPinIcon className="h-4 w-4" />
              <span>{moment.location}</span>
            </div>
          )}

          {/* Sentiment analysis */}
          {moment.sentiment_data && (
            <div className="p-3 bg-ceramic-base rounded-lg">
              <p className="text-sm font-medium text-ceramic-text-primary mb-2">
                Análise de Sentimento:
              </p>

              <div className="space-y-2">
                {/* Sentiment */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ceramic-text-secondary">Sentimento:</span>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: sentimentColor }}
                  >
                    {moment.sentiment_data.sentiment}
                  </span>
                </div>

                {/* Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ceramic-text-secondary">Score:</span>
                  <span className="text-sm font-medium">
                    {moment.sentiment_data.sentimentScore.toFixed(2)}
                  </span>
                </div>

                {/* Energy level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ceramic-text-secondary">Energia:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-ceramic-highlight rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ceramic-info rounded-full transition-all"
                        style={{
                          width: `${moment.sentiment_data.energyLevel}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {moment.sentiment_data.energyLevel}%
                    </span>
                  </div>
                </div>

                {/* Emotions */}
                {moment.sentiment_data.emotions.length > 0 && (
                  <div>
                    <span className="text-sm text-ceramic-text-secondary block mb-1">
                      Emoções:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {moment.sentiment_data.emotions.map(emotion => (
                        <span
                          key={emotion}
                          className="px-2 py-1 bg-ceramic-info/10 text-ceramic-info text-xs rounded"
                        >
                          {emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Triggers */}
                {moment.sentiment_data.triggers.length > 0 && (
                  <div>
                    <span className="text-sm text-ceramic-text-secondary block mb-1">
                      Gatilhos:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {moment.sentiment_data.triggers.map(trigger => (
                        <span
                          key={trigger}
                          className="px-2 py-1 bg-ceramic-accent/10 text-ceramic-accent text-xs rounded"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {onDelete && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja deletar este momento?')) {
                    onDelete(moment.id)
                  }
                }}
                className="text-sm text-ceramic-error hover:text-ceramic-error/80 transition-colors"
              >
                Deletar momento
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
