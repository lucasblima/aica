/**
 * ContextualCTACarousel — Swipeable contextual CTA cards
 *
 * Uses CSS scroll-snap for smooth native-feel swiping (same pattern as DailyQuestionsCarousel).
 * NO auto-advance — CTAs are actionable, user controls navigation.
 * Click dispatches based on action type (navigate, chat, input).
 */

import { useRef, useState, useCallback } from 'react'
import {
  CheckSquare,
  DollarSign,
  Sparkles,
  Calendar,
  HelpCircle,
  Search,
} from 'lucide-react'
import type { ContextualCTA } from '@/hooks/useContextualCTAs'

const ICON_MAP: Record<string, typeof CheckSquare> = {
  CheckSquare,
  DollarSign,
  Sparkles,
  Calendar,
  HelpCircle,
  Search,
}

interface ContextualCTACarouselProps {
  ctas: ContextualCTA[]
  isLoading: boolean
  onNavigate: (path: string) => void
  onChatAction: (text: string) => void
  onInputAction: (text: string) => void
}

export function ContextualCTACarousel({
  ctas,
  isLoading,
  onNavigate,
  onChatAction,
  onInputAction,
}: ContextualCTACarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollLeft = el.scrollLeft
    const itemWidth = el.offsetWidth
    if (itemWidth === 0) return
    const index = Math.round(scrollLeft / itemWidth)
    setActiveIndex(Math.min(index, ctas.length - 1))
  }, [ctas.length])

  const handleDotClick = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({
      left: index * el.offsetWidth,
      behavior: 'smooth',
    })
  }, [])

  const handleCtaClick = useCallback((cta: ContextualCTA) => {
    switch (cta.action) {
      case 'navigate':
        onNavigate(cta.actionPayload)
        break
      case 'chat':
        onChatAction(cta.actionPayload)
        break
      case 'input':
        onInputAction(cta.actionPayload)
        break
    }
  }, [onNavigate, onChatAction, onInputAction])

  if (isLoading) {
    return (
      <div className="h-8 flex items-center justify-center">
        <div className="w-32 h-3 bg-ceramic-cool rounded-full animate-pulse" />
      </div>
    )
  }

  if (ctas.length === 0) return null

  return (
    <div className="relative">
      {/* Scrollable carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {ctas.map((cta, i) => {
          const Icon = ICON_MAP[cta.icon] || HelpCircle
          return (
            <button
              key={cta.id}
              onClick={() => handleCtaClick(cta)}
              className="w-full shrink-0 snap-center px-1 text-left group"
              aria-label={cta.label}
            >
              <div
                className={`flex items-center gap-2 py-1 transition-opacity duration-300 ${
                  i === activeIndex ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${cta.color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <p className="text-xs text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors line-clamp-1">
                  {cta.label}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Dot indicators */}
      {ctas.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {ctas.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              aria-label={`CTA ${i + 1}`}
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
