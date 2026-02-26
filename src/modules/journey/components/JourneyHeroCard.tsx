/**
 * JourneyHeroCard Component — v2
 *
 * CTA card for Journey module on VidaPage.
 * v2 changes:
 * - Inline daily question input (answer directly without navigating)
 * - Removed mini stats grid (duplicated Quick Stats above)
 * - Added streak nudge when streak > 0 but no moment today
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, ChevronRight, MessageCircleQuestion,
  Send, CheckCircle2, Loader2, Flame,
} from 'lucide-react'
import { useConsciousnessPoints } from '../hooks/useConsciousnessPoints'
import { useMoments } from '../hooks/useMoments'
import { useDailyQuestion } from '../hooks/useDailyQuestion'
import type { UserConsciousnessStats } from '../types/consciousnessPoints'
import { getEmotionDisplay } from '../types/emotionHelper'
import { format, isToday } from 'date-fns'
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
  const { question, answer, isSubmitting } = useDailyQuestion()

  const [answerText, setAnswerText] = useState('')
  const [answered, setAnswered] = useState(false)

  const lastMoment = moments[0]
  const hasUnansweredQuestion = question && !question.user_response && !answered
  const hasMomentToday = lastMoment && isToday(new Date(lastMoment.created_at))
  const showStreakNudge = resolvedStats
    && (resolvedStats.current_streak || 0) > 0
    && !hasMomentToday

  const handleAnswerSubmit = async () => {
    if (!answerText.trim() || isSubmitting) return
    try {
      await answer(answerText.trim())
      setAnswered(true)
      setAnswerText('')
    } catch {
      // error is handled by useDailyQuestion
    }
  }

  if (isLoading) {
    return (
      <div
        className={`ceramic-passport ${className}`}
        data-testid="journey-hero-card"
      >
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-6 bg-ceramic-text-secondary/10 rounded w-40" />
          <div className="h-24 bg-ceramic-text-secondary/10 rounded-2xl" />
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

      {/* Streak nudge — when streak active but no moment today */}
      {showStreakNudge && (
        <motion.div
          className="mb-4 p-3 rounded-2xl bg-ceramic-warning/10 border border-ceramic-warning/20 cursor-pointer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={onOpenJourney}
        >
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-ceramic-warning" />
            <p className="text-xs font-medium text-ceramic-warning">
              Streak de {resolvedStats!.current_streak} dias! Registre um momento para manter.
            </p>
          </div>
        </motion.div>
      )}

      {/* Daily Question — inline input (v2) */}
      <AnimatePresence>
        {hasUnansweredQuestion && (
          <motion.div
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-100 flex-shrink-0">
                <MessageCircleQuestion className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  Pergunta do dia
                </p>
                <p className="text-sm font-medium text-[#5C554B]">
                  "{question.question_text}"
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAnswerSubmit()
                  }
                }}
                placeholder="Sua resposta..."
                disabled={isSubmitting}
                className="flex-1 bg-white/60 rounded-xl px-3 py-2 text-sm text-[#5C554B] placeholder:text-amber-400/60 outline-none focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
              />
              <button
                onClick={handleAnswerSubmit}
                disabled={!answerText.trim() || isSubmitting}
                className="shrink-0 w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-amber-600 transition-colors"
                aria-label="Enviar resposta"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Success after answering */}
        {answered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-2xl bg-ceramic-success/10 border border-ceramic-success/20 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-ceramic-success" />
            <p className="text-xs font-medium text-ceramic-success">Resposta registrada!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default JourneyHeroCard
