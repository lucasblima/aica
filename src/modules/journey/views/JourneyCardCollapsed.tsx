/**
 * JourneyCardCollapsed Component
 * Collapsed state of Minha Jornada card for dashboard
 */

import React from 'react'
import { useConsciousnessPoints } from '../hooks/useConsciousnessPoints'
import { useMoments } from '../hooks/useMoments'
import { useDailyQuestion } from '../hooks/useDailyQuestion'
import {
  SparklesIcon,
  ChevronRightIcon,
  BellAlertIcon,
} from '@heroicons/react/24/solid'
import { LEVEL_COLORS } from '../types/consciousnessPoints'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface JourneyCardCollapsedProps {
  onClick?: () => void
}

export function JourneyCardCollapsed({ onClick }: JourneyCardCollapsedProps) {
  const { stats } = useConsciousnessPoints()
  const { moments } = useMoments({ limit: 1, autoFetch: true })
  const { question } = useDailyQuestion()

  const lastMoment = moments[0]
  const hasUnansweredQuestion = question && !question.user_response
  const levelColor = stats ? LEVEL_COLORS[stats.level] : '#94a3b8'

  return (
    <div
      onClick={onClick}
      className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-6 w-6 text-blue-500" />
          <h3 className="text-xl font-bold text-gray-900">Minha Jornada</h3>
        </div>

        <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>

      {/* CP Score */}
      {stats && (
        <div className="flex items-center gap-4 mb-4">
          {/* Level badge */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{ backgroundColor: levelColor }}
          >
            {stats.level}
          </div>

          {/* Points and level */}
          <div className="flex-1">
            <div className="text-3xl font-bold text-gray-900">
              {stats.total_points.toLocaleString()}
            </div>
            <div className="text-sm font-medium" style={{ color: levelColor }}>
              {stats.level_name}
            </div>

            {/* Streak */}
            {stats.current_streak > 0 && (
              <div className="text-xs text-gray-600 mt-1">
                🔥 {stats.current_streak} dias de sequência
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last moment preview */}
      {lastMoment && (
        <div className="mb-4 p-3 bg-white rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Último momento</span>
            <span className="text-xs text-gray-400">
              {format(new Date(lastMoment.created_at), 'HH:mm', { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-start gap-2">
            {lastMoment.emotion && (
              <span className="text-xl">{lastMoment.emotion}</span>
            )}
            <p className="text-sm text-gray-700 line-clamp-2">
              {lastMoment.content || 'Áudio gravado'}
            </p>
          </div>
        </div>
      )}

      {/* Unanswered question indicator */}
      {hasUnansweredQuestion && (
        <div className="flex items-center gap-2 p-3 bg-yellow-100 rounded-lg animate-pulse">
          <BellAlertIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm font-medium text-yellow-900">
            Você tem uma pergunta do dia pendente!
          </p>
        </div>
      )}

      {/* Mini stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {stats.total_moments}
            </div>
            <div className="text-xs text-gray-600">Momentos</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {stats.total_questions_answered}
            </div>
            <div className="text-xs text-gray-600">Perguntas</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {stats.total_summaries_reflected}
            </div>
            <div className="text-xs text-gray-600">Reflexões</div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-4 text-center text-sm text-blue-600 font-medium">
        Expandir →
      </div>
    </div>
  )
}
