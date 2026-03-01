// src/telegram-mini-app/components/SummarySection.tsx
import type { ReactNode } from 'react'

interface SummarySectionProps {
  icon: string
  title: string
  children: ReactNode
  isLoading?: boolean
}

/**
 * Card wrapper for each dashboard section.
 * Uses Telegram theme colors.
 */
export function SummarySection({ icon, title, children, isLoading }: SummarySectionProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--tg-hint-color)' }}
        >
          {title}
        </h3>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--tg-hint-color)', opacity: 0.2 }} />
          <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: 'var(--tg-hint-color)', opacity: 0.2 }} />
        </div>
      ) : (
        children
      )}
    </div>
  )
}
