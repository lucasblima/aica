/**
 * WeeklySummaryCard Component
 * Displays AI-generated weekly summary with insights
 */

import React, { useState } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { WeeklySummary } from '../../types/weeklySummary'

const log = createNamespacedLogger('WeeklySummaryCard')
import {
  EMOTIONAL_TREND_COLORS,
  EMOTIONAL_TREND_DESCRIPTIONS,
} from '../../types/weeklySummary'
import {
  SparklesIcon,
  LightBulbIcon,
  HeartIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WeeklySummaryCardProps {
  summary: WeeklySummary
  onAddReflection?: (summaryId: string, reflection: string) => Promise<void>
}

export function WeeklySummaryCard({ summary, onAddReflection }: WeeklySummaryCardProps) {
  const [reflectionText, setReflectionText] = useState(summary.user_reflection || '')
  const [isAddingReflection, setIsAddingReflection] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trendColor = EMOTIONAL_TREND_COLORS[summary.summary_data.emotionalTrend]
  const trendDescription =
    EMOTIONAL_TREND_DESCRIPTIONS[summary.summary_data.emotionalTrend]

  const periodStart = new Date(summary.period_start)
  const periodEnd = new Date(summary.period_end)

  const handleAddReflection = async () => {
    if (!reflectionText.trim() || !onAddReflection) return

    try {
      setIsSubmitting(true)
      await onAddReflection(summary.id, reflectionText.trim())
      setIsAddingReflection(false)
    } catch (error) {
      log.error('Error adding reflection:', error)
      alert('Erro ao salvar reflexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <SparklesIcon className="h-6 w-6" />
          <h3 className="text-xl font-bold">Resumo Semanal</h3>
        </div>

        <p className="text-sm opacity-90">
          {format(periodStart, "d 'de' MMMM", { locale: ptBR })} -{' '}
          {format(periodEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Emotional trend */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="h-5 w-5" style={{ color: trendColor }} />
            <h4 className="font-semibold text-gray-900">Tendência Emocional</h4>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-lg font-medium text-white"
              style={{ backgroundColor: trendColor }}
            >
              {summary.summary_data.emotionalTrend}
            </div>
            <p className="text-sm text-gray-600">{trendDescription}</p>
          </div>
        </div>

        {/* Dominant emotions */}
        {summary.summary_data.dominantEmotions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HeartIcon className="h-5 w-5 text-pink-500" />
              <h4 className="font-semibold text-gray-900">Emoções Dominantes</h4>
            </div>

            <div className="flex flex-wrap gap-2">
              {summary.summary_data.dominantEmotions.map(emotion => (
                <span
                  key={emotion}
                  className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium"
                >
                  {emotion}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key moments */}
        {summary.summary_data.keyMoments.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Momentos-Chave</h4>

            <div className="space-y-2">
              {summary.summary_data.keyMoments.map(moment => (
                <div
                  key={moment.id}
                  className="p-3 bg-gray-50 rounded-lg border-l-4"
                  style={{
                    borderLeftColor:
                      moment.sentiment === 'positive'
                        ? '#10b981'
                        : moment.sentiment === 'negative'
                        ? '#ef4444'
                        : '#94a3b8',
                  }}
                >
                  <p className="text-sm text-gray-700">{moment.preview}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(moment.created_at), "d 'de' MMMM", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {summary.summary_data.insights.length > 0 && (
          <div data-tour="growth-insights">
            <div className="flex items-center gap-2 mb-3">
              <LightBulbIcon className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold text-gray-900">Insights</h4>
            </div>

            <ul className="space-y-2">
              {summary.summary_data.insights.map((insight, index) => (
                <li key={index} className="flex gap-3">
                  <span className="text-yellow-500 font-bold">•</span>
                  <p className="text-sm text-gray-700">{insight}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested focus */}
        {summary.summary_data.suggestedFocus && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Foco Sugerido para a Próxima Semana:
            </p>
            <p className="text-blue-800">{summary.summary_data.suggestedFocus}</p>
          </div>
        )}

        {/* User reflection */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Sua Reflexão</h4>

          {!isAddingReflection && !summary.user_reflection ? (
            <button
              onClick={() => setIsAddingReflection(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-all"
            >
              + Adicionar reflexão pessoal (+20 CP)
            </button>
          ) : (
            <div>
              <textarea
                value={reflectionText}
                onChange={e => setReflectionText(e.target.value)}
                placeholder="O que você aprendeu esta semana? Como se sente sobre isso?"
                rows={4}
                disabled={!!summary.user_reflection}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none disabled:bg-gray-50"
              />

              {!summary.user_reflection && (
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={handleAddReflection}
                    disabled={isSubmitting || !reflectionText.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Reflexão'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingReflection(false)
                      setReflectionText('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
