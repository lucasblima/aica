/**
 * ContextualCTACarousel — Horizontal scrollable CTA chips
 *
 * Shows compact, actionable chips that are all partially visible.
 * Click dispatches based on action type (navigate, chat, input).
 */

import { useCallback } from 'react'
import {
  CheckSquare,
  DollarSign,
  Sparkles,
  Calendar,
  HelpCircle,
  Search,
  MessageCircle,
} from 'lucide-react'
import type { ContextualCTA } from '@/hooks/useContextualCTAs'

const ICON_MAP: Record<string, typeof CheckSquare> = {
  CheckSquare,
  DollarSign,
  Sparkles,
  Calendar,
  HelpCircle,
  Search,
  MessageCircle,
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
      <div className="flex items-center gap-2 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-7 w-28 bg-ceramic-cool rounded-full animate-pulse shrink-0" />
        ))}
      </div>
    )
  }

  if (ctas.length === 0) return null

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {ctas.map((cta) => {
        const Icon = ICON_MAP[cta.icon] || HelpCircle
        return (
          <button
            key={cta.id}
            onClick={() => handleCtaClick(cta)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-[1.03] active:scale-95 ${cta.color} hover:shadow-sm`}
            aria-label={cta.label}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{cta.label}</span>
          </button>
        )
      })}
    </div>
  )
}
