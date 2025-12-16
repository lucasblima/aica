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
      className="ceramic-card p-6 cursor-pointer hover:ceramic-elevated transition-all group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-6 w-6 text-amber-600" />
          <h3 className="text-xl font-bold text-etched">Minha Jornada</h3>
        </div>

        <ChevronRightIcon className="h-5 w-5 text-[#948D82] group-hover:text-[#5C554B] transition-colors" />
      </div>

      {/* CP Score */}
      {stats && (
        <div className="flex items-center gap-4 mb-4">
          {/* Level badge */}
          <div
            className="ceramic-concave w-16 h-16 flex items-center justify-center text-2xl font-bold"
            style={{ color: levelColor }}
          >
            {stats.level}
          </div>

          {/* Points and level */}
          <div className="flex-1">
            <div className="text-3xl font-bold text-[#5C554B]">
              {stats.total_points.toLocaleString()}
            </div>
            <div className="text-sm font-medium" style={{ color: levelColor }}>
              {stats.level_name}
            </div>

            {/* Streak */}
            {stats.current_streak > 0 && (
              <div className="text-xs text-[#948D82] mt-1">
                {stats.current_streak} dias de sequência
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last moment preview */}
      {lastMoment && (
        <div className="mb-4 p-3 ceramic-inset-shallow rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#948D82]">Último momento</span>
            <span className="text-xs text-[#948D82]">
              {format(new Date(lastMoment.created_at), 'HH:mm', { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-start gap-2">
            {lastMoment.emotion && (
              <span className="text-xl">{lastMoment.emotion}</span>
            )}
            <p className="text-sm text-[#5C554B] line-clamp-2">
              {lastMoment.content || 'Áudio gravado'}
            </p>
          </div>
        </div>
      )}

      {/* Unanswered question indicator */}
      {hasUnansweredQuestion && (
        <div className="flex items-center gap-2 p-3 ceramic-inset-shallow rounded-2xl notification-pulse">
          <BellAlertIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-medium text-[#5C554B]">
            Você tem uma pergunta do dia pendente!
          </p>
        </div>
      )}

      {/* Mini stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#A39E91]/20">
          <div className="text-center">
            <div className="text-lg font-bold text-[#5C554B]">
              {stats.total_moments}
            </div>
            <div className="text-xs text-[#948D82]">Momentos</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-[#5C554B]">
              {stats.total_questions_answered}
            </div>
            <div className="text-xs text-[#948D82]">Perguntas</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-[#5C554B]">
              {stats.total_summaries_reflected}
            </div>
            <div className="text-xs text-[#948D82]">Reflexões</div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-4 text-center text-sm text-amber-700 font-medium">
        Expandir →
      </div>
    </div>
  )
}
