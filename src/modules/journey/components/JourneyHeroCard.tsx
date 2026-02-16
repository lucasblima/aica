/**
 * JourneyHeroCard Component
 * CTA card for Journey module — daily question, last moment, mini stats
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Hero section (avatar, level, progress) moved to HeaderGlobal.
 * This card now focuses on Journey content and quick actions.
 * Layer 2 (Elevated) - The "physical card" on the ceramic table
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ChevronRight, MessageCircleQuestion } from 'lucide-react'
import { useConsciousnessPoints } from '../hooks/useConsciousnessPoints'
import { useMoments } from '../hooks/useMoments'
import { useDailyQuestion } from '../hooks/useDailyQuestion'
import type { UserConsciousnessStats } from '../types/consciousnessPoints'
import { getEmotionDisplay } from '../types/emotionHelper'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface JourneyHeroCardProps {
  onOpenJourney?: () => void
  stats?: UserConsciousnessStats | null
  className?: string
}

export function JourneyHeroCard({
  onOpenJourney,
  stats: statsProp,
  className = '',
}: JourneyHeroCardProps) {
  const internalCP = useConsciousnessPoints()
  const resolvedStats = statsProp !== undefined ? statsProp : internalCP.stats
  const isLoading = statsProp !== undefined ? false : internalCP.isLoading

  const { moments } = useMoments({ limit: 1, autoFetch: true })
  const { question } = useDailyQuestion()

  const lastMoment = moments[0]
  const hasUnansweredQuestion = question && !question.user_response

  if (isLoading) {
    return (
      <div
        className={`ceramic-passport ${className}`}
        data-testid="journey-hero-card"
      >
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-6 bg-ceramic-text-secondary/10 rounded w-40" />
          <div className="h-24 bg-ceramic-text-secondary/10 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2 pt-4">
            <div className="h-12 bg-ceramic-text-secondary/10 rounded" />
            <div className="h-12 bg-ceramic-text-secondary/10 rounded" />
            <div className="h-12 bg-ceramic-text-secondary/10 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={`ceramic-passport ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      data-testid="journey-hero-card"
    >
      {/* Header - clickable */}
      <motion.div
        className="flex items-center justify-between mb-4 cursor-pointer group"
        onClick={onOpenJourney}
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 300 }}
        role="button"
        aria-label="Abrir Minha Jornada"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-amber-600" />
          <h3 className="text-xl font-bold text-etched">Minha Jornada</h3>
        </div>
        <ChevronRight className="h-5 w-5 text-[#948D82] group-hover:text-[#5C554B] transition-colors" />
      </motion.div>

      {/* Last moment preview */}
      {lastMoment && (
        <motion.div
          className="mb-4 p-3 ceramic-inset-shallow rounded-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#948D82]">Ultimo momento</span>
            <span className="text-xs text-[#948D82]">
              {format(new Date(lastMoment.created_at), 'HH:mm', {
                locale: ptBR,
              })}
            </span>
          </div>

          <div className="flex items-start gap-2">
            {lastMoment.emotion && (
              <span className="text-xl">{getEmotionDisplay(lastMoment.emotion).emoji}</span>
            )}
            <p className="text-sm text-[#5C554B] line-clamp-2">
              {lastMoment.content || 'Audio gravado'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Daily Question CTA */}
      {hasUnansweredQuestion && (
        <motion.div
          className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200/50 cursor-pointer group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onOpenJourney}
          whileHover={{ scale: 1.01 }}
          role="button"
          aria-label="Responder pergunta do dia"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 flex-shrink-0">
              <MessageCircleQuestion className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-700 mb-1">
                Pergunta do dia
              </p>
              <p className="text-sm font-medium text-[#5C554B] line-clamp-2 group-hover:text-[#3D3830] transition-colors">
                "{question.question_text}"
              </p>
              <p className="text-xs text-amber-600 mt-2 font-medium group-hover:text-amber-700 transition-colors">
                Toque para responder →
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mini stats grid */}
      {resolvedStats && (
        <motion.div
          className="grid grid-cols-3 gap-2 pt-4 border-t border-[#A39E91]/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center">
            <div className="text-lg font-bold text-[#5C554B]">
              {resolvedStats.total_moments}
            </div>
            <div className="text-xs text-[#948D82]">Momentos</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-[#5C554B]">
              {resolvedStats.total_questions_answered}
            </div>
            <div className="text-xs text-[#948D82]">Perguntas</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-[#5C554B]">
              {resolvedStats.longest_streak}
            </div>
            <div className="text-xs text-[#948D82]">Recorde</div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default JourneyHeroCard
