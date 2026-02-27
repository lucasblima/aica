/**
 * WeeklySummaryCard Component
 * Displays AI-generated weekly summary with insights
 */

import React, { useState, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { WeeklySummary } from '../../types/weeklySummary'
import { AudioRecorder } from '../capture/AudioRecorder'
import { transcribeAudio } from '../../services/momentPersistenceService'

const log = createNamespacedLogger('WeeklySummaryCard')
import {
  EMOTIONAL_TREND_COLORS,
  EMOTIONAL_TREND_DESCRIPTIONS,
  EMOTIONAL_TREND_LABELS,
} from '../../types/weeklySummary'
import {
  SparklesIcon,
  LightBulbIcon,
  HeartIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WeeklySummaryCardProps {
  summary: WeeklySummary & {
    /** Number of active days in the week (0-7). If undefined, activity gate is skipped. */
    active_days?: number
    /** CP earned this week */
    cp_earned_week?: number
    /** CP earned previous week (for comparison) */
    cp_earned_prev_week?: number
    /** Moment count previous week (for comparison) */
    moments_prev_week?: number
  }
  onAddReflection?: (summaryId: string, reflection: string) => Promise<void>
}

export function WeeklySummaryCard({ summary, onAddReflection }: WeeklySummaryCardProps) {
  const [reflectionText, setReflectionText] = useState(summary.user_reflection || '')
  const [isAddingReflection, setIsAddingReflection] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    try {
      setIsTranscribing(true)
      const text = await transcribeAudio(blob)
      if (text) {
        setReflectionText(prev => prev ? `${prev}\n${text}` : text)
      }
    } catch (err) {
      log.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }, [])

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
    <div className="bg-ceramic-base rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-ceramic-info to-ceramic-accent p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <SparklesIcon className="h-6 w-6" />
          <h3 className="text-xl font-bold">Resumo Semanal</h3>
        </div>

        <p className="text-sm opacity-90">
          {format(periodStart, "d 'de' MMMM", { locale: ptBR })} -{' '}
          {format(periodEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Minimum activity gate */}
      {summary.active_days !== undefined && summary.active_days < 5 && (
        <div className="p-6 text-center space-y-3">
          <p className="text-sm text-ceramic-text-secondary">
            Continue registrando momentos para ver seu resumo semanal!
            Voce precisa de pelo menos 5 dias de atividade.
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            Atividade esta semana: <strong>{summary.active_days}/7 dias</strong>
          </p>
        </div>
      )}

      {/* Content — only show full summary when activity gate passes */}
      {(summary.active_days === undefined || summary.active_days >= 5) && (
      <div className="p-6 space-y-6">
        {/* Achievement badge: first complete week (7/7) */}
        {summary.active_days === 7 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200/50">
            <TrophyIcon className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              Primeira semana completa!
            </p>
          </div>
        )}

        {/* CP earned this week + week-over-week comparison */}
        {(summary.cp_earned_week !== undefined || summary.moments_prev_week !== undefined) && (
          <div className="flex flex-wrap gap-4">
            {summary.cp_earned_week !== undefined && (
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-semibold text-ceramic-text-primary">
                  {summary.cp_earned_week} CP esta semana
                </span>
                {/* TODO: cp_earned_prev_week comparison — needs backend to return previous week CP */}
                {summary.cp_earned_prev_week !== undefined && summary.cp_earned_prev_week > 0 && (
                  <span className="flex items-center text-xs font-medium">
                    {summary.cp_earned_week >= summary.cp_earned_prev_week ? (
                      <ArrowUpIcon className="h-3 w-3 text-ceramic-success mr-0.5" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 text-ceramic-error mr-0.5" />
                    )}
                    <span className={summary.cp_earned_week >= summary.cp_earned_prev_week ? 'text-ceramic-success' : 'text-ceramic-error'}>
                      vs semana anterior
                    </span>
                  </span>
                )}
              </div>
            )}
            {summary.moments_prev_week !== undefined && summary.summary_data.keyMoments.length > 0 && (
              <div className="flex items-center gap-1 text-xs font-medium">
                <span className="text-ceramic-text-secondary">
                  {summary.summary_data.keyMoments.length} momentos
                </span>
                {summary.moments_prev_week > 0 && (
                  <span className="flex items-center">
                    {summary.summary_data.keyMoments.length >= summary.moments_prev_week ? (
                      <ArrowUpIcon className="h-3 w-3 text-ceramic-success mr-0.5" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 text-ceramic-error mr-0.5" />
                    )}
                    <span className={summary.summary_data.keyMoments.length >= summary.moments_prev_week ? 'text-ceramic-success' : 'text-ceramic-error'}>
                      vs {summary.moments_prev_week}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Emotional trend */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="h-5 w-5" style={{ color: trendColor }} />
            <h4 className="font-semibold text-ceramic-text-primary">Tendência Emocional</h4>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-lg font-medium text-white"
              style={{ backgroundColor: trendColor }}
            >
              {EMOTIONAL_TREND_LABELS[summary.summary_data.emotionalTrend] || summary.summary_data.emotionalTrend}
            </div>
            <p className="text-sm text-ceramic-text-secondary">{trendDescription}</p>
          </div>

          {/* Trend justification — explains WHY the trend is what it is */}
          {summary.summary_data.trendJustification && (
            <p className="mt-2 text-sm text-ceramic-text-secondary italic">
              {summary.summary_data.trendJustification}
            </p>
          )}
        </div>

        {/* Dominant emotions */}
        {summary.summary_data.dominantEmotions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HeartIcon className="h-5 w-5 text-ceramic-error" />
              <h4 className="font-semibold text-ceramic-text-primary">Emoções Dominantes</h4>
            </div>

            <div className="flex flex-wrap gap-2">
              {summary.summary_data.dominantEmotions.map(emotion => (
                <span
                  key={emotion}
                  className="px-3 py-1 bg-ceramic-error/10 text-ceramic-error rounded-full text-sm font-medium"
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
            <h4 className="font-semibold text-ceramic-text-primary mb-3">Momentos-Chave</h4>

            <div className="space-y-2">
              {summary.summary_data.keyMoments.map(moment => (
                <div
                  key={moment.id}
                  className="p-3 bg-ceramic-base rounded-lg border-l-4"
                  style={{
                    borderLeftColor:
                      moment.sentiment === 'positive'
                        ? '#10b981'
                        : moment.sentiment === 'negative'
                        ? '#ef4444'
                        : '#94a3b8',
                  }}
                >
                  <p className="text-sm text-ceramic-text-primary">{moment.preview}</p>
                  <p className="text-xs text-ceramic-text-secondary mt-1">
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
              <LightBulbIcon className="h-5 w-5 text-ceramic-warning" />
              <h4 className="font-semibold text-ceramic-text-primary">Insights</h4>
            </div>

            <ul className="space-y-2">
              {summary.summary_data.insights.map((insight, index) => (
                <li key={index} className="flex gap-3">
                  <span className="text-ceramic-warning font-bold">•</span>
                  <p className="text-sm text-ceramic-text-primary">{insight}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested focus */}
        {summary.summary_data.suggestedFocus && (
          <div className="p-4 bg-ceramic-info/10 border-2 border-ceramic-info/30 rounded-lg">
            <p className="text-sm font-medium text-ceramic-text-primary mb-1">
              Foco Sugerido para a Próxima Semana:
            </p>
            <p className="text-ceramic-info">{summary.summary_data.suggestedFocus}</p>
          </div>
        )}

        {/* User reflection */}
        <div className="pt-4 border-t border-ceramic-text-secondary/10">
          <h4 className="font-semibold text-ceramic-text-primary mb-3">Sua Reflexão</h4>

          {!isAddingReflection && !summary.user_reflection ? (
            <button
              onClick={() => setIsAddingReflection(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-ceramic-text-secondary/20 rounded-lg text-ceramic-text-secondary hover:border-ceramic-info hover:text-ceramic-info transition-all"
            >
              + Adicionar reflexão pessoal (até 20 CP)
            </button>
          ) : (
            <div>
              <textarea
                value={reflectionText}
                onChange={e => setReflectionText(e.target.value)}
                placeholder={isTranscribing ? 'Transcrevendo áudio...' : 'O que você aprendeu esta semana? Como se sente sobre isso?'}
                rows={4}
                disabled={!!summary.user_reflection || isTranscribing}
                className="w-full px-4 py-3 border border-ceramic-text-secondary/20 rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:outline-none resize-none disabled:bg-ceramic-base"
              />
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-ceramic-text-secondary">
                  {isTranscribing ? 'Transcrevendo...' : `${reflectionText.length} caracteres`}
                </p>
                {!summary.user_reflection && (
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    disabled={isSubmitting || isTranscribing}
                  />
                )}
              </div>

              {!summary.user_reflection && (
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={handleAddReflection}
                    disabled={isSubmitting || isTranscribing || !reflectionText.trim()}
                    className="flex-1 px-4 py-2 bg-ceramic-info text-white rounded-lg font-medium hover:bg-ceramic-info/80 disabled:bg-ceramic-neutral disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Reflexão'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingReflection(false)
                      setReflectionText('')
                    }}
                    className="px-4 py-2 bg-ceramic-highlight text-ceramic-text-primary rounded-lg font-medium hover:bg-ceramic-highlight transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
