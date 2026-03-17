/**
 * JourneyHeroCard Component — v2
 *
 * CTA card for Journey module on VidaPage.
 * v2 changes:
 * - Inline daily question input (answer directly without navigating)
 * - Removed mini stats grid (duplicated Quick Stats above)
 * - Added streak nudge when streak > 0 but no moment today
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, ChevronRight, MessageCircleQuestion,
  Send, CheckCircle2, Loader2, Flame, Mic, Square,
} from 'lucide-react'
import { useUnansweredQuestions } from '../hooks/useDailyQuestion'
import { answerQuestion } from '../services/questionService'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { useAuth } from '@/hooks/useAuth'
import type { UserConsciousnessStats } from '../types/consciousnessPoints'

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
  const { user } = useAuth()
  const resolvedStats = statsProp ?? null
  const isLoading = statsProp === undefined

  const { questions } = useUnansweredQuestions(5)

  const [activeIndex, setActiveIndex] = useState(0)
  const [answerText, setAnswerText] = useState('')
  const [answered, setAnswered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const speech = useVoiceRecorder({
    onResult: (transcript) => setAnswerText(prev => prev ? `${prev} ${transcript}` : transcript),
  })

  const waveformBars = useMemo(() => {
    const bars = 6
    return Array.from({ length: bars }, (_, i) => {
      const variance = Math.sin((Date.now() / 200) + i) * 0.3 + 0.7
      return Math.max(3, (speech.audioLevel / 100) * 18 * variance)
    })
  }, [speech.audioLevel])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleAnswerSubmit = async () => {
    const activeQuestion = questions[activeIndex]
    if (!answerText.trim() || isSubmitting || !activeQuestion || !user?.id) return
    try {
      setIsSubmitting(true)
      await answerQuestion(user.id, {
        question_id: activeQuestion.id,
        response_text: answerText.trim(),
      })
      setAnswered(true)
      setAnswerText('')
    } catch {
      // error handled by service
    } finally {
      setIsSubmitting(false)
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
      {/* Header - clickable, with inline streak badge */}
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
          {resolvedStats && (resolvedStats.current_streak || 0) > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-ceramic-warning/10 border border-ceramic-warning/20">
              <Flame className="h-3.5 w-3.5 text-ceramic-warning" />
              <span className="text-xs font-bold text-ceramic-warning">
                {resolvedStats.current_streak} dias
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-[#948D82] group-hover:text-[#5C554B] transition-colors" />
      </motion.div>

      {/* Daily Questions — carousel */}
      <AnimatePresence>
        {questions.length > 0 && !answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Scrollable question cards */}
            <div
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setActiveIndex(i)}
                  className={`snap-start shrink-0 w-[85%] p-3 rounded-2xl border text-left transition-all ${
                    activeIndex === i
                      ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300'
                      : 'bg-ceramic-cool border-ceramic-border hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageCircleQuestion className={`h-4 w-4 mt-0.5 shrink-0 ${
                      activeIndex === i ? 'text-amber-600' : 'text-ceramic-text-secondary'
                    }`} />
                    <p className={`text-sm font-medium line-clamp-2 ${
                      activeIndex === i ? 'text-[#5C554B]' : 'text-ceramic-text-secondary'
                    }`}>
                      {q.question_text}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Recording waveform / transcribing strip */}
            <AnimatePresence>
              {speech.isListening && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 rounded-xl bg-ceramic-error/5 border border-ceramic-error/20 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <div className="flex items-center gap-0.5 h-5">
                      {waveformBars.map((h, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-ceramic-error rounded-full transition-all duration-75"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-ceramic-error">{formatTime(speech.recordSeconds)}</span>
                    <div className="w-1.5 h-1.5 bg-ceramic-error rounded-full animate-pulse" />
                    <span className="text-[10px] text-ceramic-text-secondary">Gravando...</span>
                  </div>
                </motion.div>
              )}
              {speech.isTranscribing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 rounded-xl bg-amber-50 border border-amber-200 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                    <span className="text-[10px] text-amber-700">Transcrevendo...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Answer input for active question */}
            <div className="flex items-center gap-2 mt-2">
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
                placeholder={speech.isListening ? 'Gravando...' : 'Sua resposta...'}
                disabled={isSubmitting || speech.isListening}
                className="flex-1 bg-ceramic-cool rounded-xl px-3 py-2 text-sm text-[#5C554B] placeholder:text-ceramic-text-secondary/40 outline-none focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
              />
              {speech.isSupported && (
                <button
                  onClick={speech.toggle}
                  disabled={isSubmitting || speech.isTranscribing}
                  className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    speech.isListening
                      ? 'bg-ceramic-error text-white animate-pulse'
                      : speech.isTranscribing
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-ceramic-cool text-amber-600 hover:bg-amber-100'
                  } disabled:opacity-40`}
                  aria-label={speech.isListening ? 'Parar gravação' : speech.isTranscribing ? 'Transcrevendo...' : 'Ditar resposta'}
                >
                  {speech.isTranscribing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : speech.isListening ? (
                    <Square className="w-3 h-3" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
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
