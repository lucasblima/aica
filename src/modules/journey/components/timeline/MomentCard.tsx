/**
 * MomentCard Component
 * Displays a single moment in the timeline
 */

import React, { useState } from 'react'
import { Moment } from '../../types/moment'
import { getSentimentColor } from '../../types/sentiment'
import {
  ClockIcon,
  MapPinIcon,
  SpeakerWaveIcon,
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
      className="bg-white rounded-lg shadow-md p-4 border-l-4 transition-all hover:shadow-lg"
      style={{ borderLeftColor: sentimentColor }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          {/* Emotion + Time */}
          <div className="flex items-center gap-2 mb-1">
            {moment.emotion && (
              <span className="text-2xl">
                {moment.emotion}
              </span>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <ClockIcon className="h-4 w-4" />
              <span className="capitalize">{relativeTime}</span>
            </div>
          </div>

          {/* Absolute time */}
          <p className="text-xs text-gray-400 capitalize">{absoluteTime}</p>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
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
        {moment.type === 'audio' && moment.audio_url && !isExpanded && (
          <div className="flex items-center gap-2 text-gray-600">
            <SpeakerWaveIcon className="h-5 w-5" />
            <span className="text-sm">Áudio gravado</span>
          </div>
        )}

        {moment.content && (
          <p className="text-gray-700 leading-relaxed">
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
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {/* Audio player */}
          {moment.audio_url && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Áudio:</p>
              <audio controls className="w-full">
                <source src={moment.audio_url} type="audio/webm" />
                Seu navegador não suporta reprodução de áudio.
              </audio>
            </div>
          )}

          {/* Location */}
          {moment.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4" />
              <span>{moment.location}</span>
            </div>
          )}

          {/* Sentiment analysis */}
          {moment.sentiment_data && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Análise de Sentimento:
              </p>

              <div className="space-y-2">
                {/* Sentiment */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sentimento:</span>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: sentimentColor }}
                  >
                    {moment.sentiment_data.sentiment}
                  </span>
                </div>

                {/* Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Score:</span>
                  <span className="text-sm font-medium">
                    {moment.sentiment_data.sentimentScore.toFixed(2)}
                  </span>
                </div>

                {/* Energy level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Energia:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
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
                    <span className="text-sm text-gray-600 block mb-1">
                      Emoções:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {moment.sentiment_data.emotions.map(emotion => (
                        <span
                          key={emotion}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
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
                    <span className="text-sm text-gray-600 block mb-1">
                      Gatilhos:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {moment.sentiment_data.triggers.map(trigger => (
                        <span
                          key={trigger}
                          className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
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
                className="text-sm text-red-600 hover:text-red-700 transition-colors"
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
