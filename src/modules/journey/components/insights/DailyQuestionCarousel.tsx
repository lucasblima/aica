/**
 * DailyQuestionCarousel Component
 * Displays 3-5 daily questions in a swipeable carousel for better engagement.
 * Replaces the single-question display with a more interactive experience.
 */

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createNamespacedLogger } from '@/lib/logger'
import { QuestionWithResponse } from '../../types/dailyQuestion'
import {
  QUESTION_CATEGORY_COLORS,
  QUESTION_CATEGORY_ICONS,
} from '../../types/dailyQuestion'
import { AudioRecorder } from '../capture/AudioRecorder'
import { transcribeAudio } from '../../services/momentPersistenceService'
import {
  SparklesIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid'

const log = createNamespacedLogger('DailyQuestionCarousel')

interface DailyQuestionCarouselProps {
  questions: QuestionWithResponse[]
  onAnswer: (questionIndex: number, responseText: string) => Promise<void>
  isSubmitting?: boolean
}

export function DailyQuestionCarousel({
  questions,
  onAnswer,
  isSubmitting: externalSubmitting,
}: DailyQuestionCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [responseTexts, setResponseTexts] = useState<Record<number, string>>({})
  const [submittingIndex, setSubmittingIndex] = useState<number | null>(null)
  const [answeredIndices, setAnsweredIndices] = useState<Set<number>>(new Set())
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [direction, setDirection] = useState(0) // -1 = left, 1 = right
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentQuestion = questions[activeIndex]
  if (!currentQuestion) return null

  const isCurrentAnswered = answeredIndices.has(activeIndex) || !!currentQuestion.user_response
  const isCurrentSubmitting = submittingIndex === activeIndex || externalSubmitting

  const goTo = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
  }, [activeIndex])

  const goNext = useCallback(() => {
    if (activeIndex < questions.length - 1) {
      setDirection(1)
      setActiveIndex(prev => prev + 1)
    }
  }, [activeIndex, questions.length])

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      setDirection(-1)
      setActiveIndex(prev => prev - 1)
    }
  }, [activeIndex])

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    try {
      setIsTranscribing(true)
      const text = await transcribeAudio(blob)
      if (text) {
        setResponseTexts(prev => ({
          ...prev,
          [activeIndex]: prev[activeIndex] ? `${prev[activeIndex]}\n${text}` : text,
        }))
      }
    } catch (err) {
      log.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }, [activeIndex])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = responseTexts[activeIndex]?.trim()
    if (!text) return

    try {
      setSubmittingIndex(activeIndex)
      await onAnswer(activeIndex, text)
      setAnsweredIndices(prev => new Set(prev).add(activeIndex))
      setResponseTexts(prev => ({ ...prev, [activeIndex]: '' }))

      // Auto-advance to next unanswered question after a brief delay
      setTimeout(() => {
        const nextUnanswered = questions.findIndex(
          (q, i) => i > activeIndex && !answeredIndices.has(i) && !q.user_response
        )
        if (nextUnanswered !== -1) {
          setDirection(1)
          setActiveIndex(nextUnanswered)
        }
      }, 1500)
    } catch (error) {
      log.error('Error answering question:', error)
    } finally {
      setSubmittingIndex(null)
    }
  }

  const categoryColor = QUESTION_CATEGORY_COLORS[currentQuestion.category]
  const categoryIcon = QUESTION_CATEGORY_ICONS[currentQuestion.category]

  const answeredCount = questions.filter(
    (q, i) => answeredIndices.has(i) || q.user_response
  ).length

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
    }),
  }

  return (
    <div className="space-y-3">
      {/* Carousel Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-ceramic-info" />
          <span className="text-sm font-semibold text-ceramic-text-primary">
            Perguntas do Dia
          </span>
          <span className="text-xs text-ceramic-text-secondary">
            {answeredCount}/{questions.length} respondidas
          </span>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="p-1.5 rounded-full hover:bg-ceramic-cool disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Pergunta anterior"
          >
            <ChevronLeftIcon className="h-4 w-4 text-ceramic-text-secondary" />
          </button>
          <button
            onClick={goNext}
            disabled={activeIndex === questions.length - 1}
            className="p-1.5 rounded-full hover:bg-ceramic-cool disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Proxima pergunta"
          >
            <ChevronRightIcon className="h-4 w-4 text-ceramic-text-secondary" />
          </button>
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-2">
        {questions.map((q, i) => {
          const isAnswered = answeredIndices.has(i) || !!q.user_response
          const isActive = i === activeIndex
          return (
            <button
              key={q.id}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive
                  ? 'w-6 bg-ceramic-info'
                  : isAnswered
                    ? 'w-2 bg-ceramic-success'
                    : 'w-2 bg-ceramic-cool hover:bg-ceramic-text-secondary/30'
              }`}
              aria-label={`Pergunta ${i + 1}${isAnswered ? ' (respondida)' : ''}`}
            />
          )
        })}
      </div>

      {/* Question Card with Slide Animation */}
      <div className="relative overflow-hidden min-h-[280px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={activeIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {isCurrentAnswered ? (
              /* Answered State */
              <div className="bg-ceramic-success/10 border-2 border-ceramic-success/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircleIcon className="h-5 w-5 text-ceramic-success" />
                  <h3 className="text-base font-semibold text-ceramic-text-primary">
                    Respondida!
                  </h3>
                </div>
                <p className="text-sm text-ceramic-text-primary mb-3">
                  {currentQuestion.question_text}
                </p>
                <div className="p-3 bg-ceramic-base rounded-lg">
                  <p className="text-xs text-ceramic-text-secondary mb-1">Sua resposta:</p>
                  <p className="text-sm text-ceramic-text-primary">
                    {currentQuestion.user_response?.response_text || responseTexts[activeIndex] || ''}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-ceramic-success">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  <span>CP ganhos com base na qualidade!</span>
                </div>
              </div>
            ) : (
              /* Unanswered State — Input Form */
              <form
                onSubmit={handleSubmit}
                className="bg-gradient-to-br from-ceramic-base to-ceramic-info/10 border-2 border-ceramic-info/30 rounded-xl p-5"
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: categoryColor + '20' }}
                  >
                    {categoryIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: categoryColor }}
                    >
                      {currentQuestion.category}
                    </p>
                  </div>
                  <div className="px-2.5 py-0.5 bg-ceramic-warning/15 text-ceramic-warning text-xs font-bold rounded-full shrink-0">
                    2-20 CP
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-base font-medium text-ceramic-text-primary mb-3">
                  {currentQuestion.question_text}
                </p>

                {/* Answer Input */}
                <div className="mb-3">
                  <textarea
                    ref={textareaRef}
                    value={responseTexts[activeIndex] || ''}
                    onChange={e =>
                      setResponseTexts(prev => ({ ...prev, [activeIndex]: e.target.value }))
                    }
                    placeholder={
                      isTranscribing ? 'Transcrevendo...' : 'Digite ou grave sua resposta...'
                    }
                    rows={3}
                    disabled={isTranscribing}
                    className="w-full px-3 py-2.5 text-sm border border-ceramic-text-secondary/20 rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:outline-none resize-none disabled:bg-ceramic-base bg-ceramic-base"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-ceramic-text-secondary">
                      {isTranscribing
                        ? 'Transcrevendo...'
                        : `${(responseTexts[activeIndex] || '').length} caracteres`}
                    </p>
                    <AudioRecorder
                      onRecordingComplete={handleRecordingComplete}
                      disabled={!!isCurrentSubmitting || isTranscribing}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!!isCurrentSubmitting || !(responseTexts[activeIndex] || '').trim()}
                  className="w-full px-4 py-2 bg-ceramic-info text-white rounded-lg text-sm font-medium hover:bg-ceramic-info/80 disabled:bg-ceramic-neutral disabled:cursor-not-allowed transition-all"
                >
                  {isCurrentSubmitting ? 'Salvando...' : 'Responder'}
                </button>

                <p className="mt-2 text-center text-xs text-ceramic-text-secondary">
                  Responda quando se sentir confortavel. Nao e obrigatorio!
                </p>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
