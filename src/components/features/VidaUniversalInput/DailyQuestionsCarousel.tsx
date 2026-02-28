/**
 * DailyQuestionsCarousel — Swipeable question carousel for VidaPage
 *
 * Uses CSS scroll-snap for smooth native-feel swiping.
 * Auto-advances every 8 seconds. Dot indicators show position.
 * Tapping a question sends it to the chat input.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { useDailyQuestions, type DailyQuestionItem } from './useDailyQuestions'
import {
  QUESTION_CATEGORY_COLORS,
  type QuestionCategory,
} from '@/modules/journey/types/dailyQuestion'

const AUTO_ADVANCE_MS = 8000

interface DailyQuestionsCarouselProps {
  onSelectQuestion: (text: string) => void
}

export function DailyQuestionsCarousel({ onSelectQuestion }: DailyQuestionsCarouselProps) {
  const { questions, isLoading } = useDailyQuestions()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const userInteractedRef = useRef(false)

  // Track active index from scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollLeft = el.scrollLeft
    const itemWidth = el.offsetWidth
    if (itemWidth === 0) return
    const index = Math.round(scrollLeft / itemWidth)
    setActiveIndex(Math.min(index, questions.length - 1))
  }, [questions.length])

  // Scroll to a specific index
  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const targetIndex = index % questions.length
    el.scrollTo({
      left: targetIndex * el.offsetWidth,
      behavior: 'smooth',
    })
  }, [questions.length])

  // Auto-advance timer
  useEffect(() => {
    if (questions.length <= 1) return

    const startAutoAdvance = () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
      autoAdvanceRef.current = setInterval(() => {
        if (!userInteractedRef.current) {
          setActiveIndex(prev => {
            const next = (prev + 1) % questions.length
            scrollToIndex(next)
            return next
          })
        }
      }, AUTO_ADVANCE_MS)
    }

    startAutoAdvance()

    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
    }
  }, [questions.length, scrollToIndex])

  // Pause auto-advance on user interaction, resume after 15s
  const handleUserInteraction = useCallback(() => {
    userInteractedRef.current = true
    const timeout = setTimeout(() => {
      userInteractedRef.current = false
    }, 15000)
    return () => clearTimeout(timeout)
  }, [])

  // Handle touch/pointer events
  const handleTouchStart = useCallback(() => {
    handleUserInteraction()
  }, [handleUserInteraction])

  // Dot click handler
  const handleDotClick = useCallback((index: number) => {
    handleUserInteraction()
    scrollToIndex(index)
  }, [handleUserInteraction, scrollToIndex])

  if (isLoading) {
    return (
      <div className="h-8 flex items-center justify-center">
        <div className="w-32 h-3 bg-ceramic-cool rounded-full animate-pulse" />
      </div>
    )
  }

  if (questions.length === 0) return null

  return (
    <div className="relative">
      {/* Scrollable carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onMouseDown={handleTouchStart}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {questions.map((q, i) => (
          <CarouselItem
            key={q.id}
            question={q}
            isActive={i === activeIndex}
            onSelect={() => onSelectQuestion(q.text)}
          />
        ))}
      </div>

      {/* Dot indicators */}
      {questions.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              aria-label={`Pergunta ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-4 h-1.5 bg-amber-500'
                  : 'w-1.5 h-1.5 bg-ceramic-border hover:bg-ceramic-text-secondary/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Individual carousel item */
function CarouselItem({
  question,
  isActive,
  onSelect,
}: {
  question: DailyQuestionItem
  isActive: boolean
  onSelect: () => void
}) {
  const categoryColor = QUESTION_CATEGORY_COLORS[question.category as QuestionCategory] || '#f59e0b'

  return (
    <button
      onClick={onSelect}
      className="w-full shrink-0 snap-center px-1 text-left group"
      aria-label={question.text}
    >
      <div
        className={`flex items-center gap-2 py-1 transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-60'
        }`}
      >
        <div
          className="w-1 h-4 rounded-full shrink-0 transition-transform duration-300"
          style={{ backgroundColor: categoryColor }}
        />
        <p className="text-xs text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors line-clamp-1">
          {question.text}
        </p>
      </div>
    </button>
  )
}
