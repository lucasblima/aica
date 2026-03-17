/**
 * ThemeClusters Component
 * Tag pills ordered by frequency with Ceramic colors (Issue #208)
 */

import React from 'react'
import { TagIcon } from '@heroicons/react/24/outline'
import type { ThemeEntry } from '../../hooks/useJourneyPatterns'

interface ThemeClustersProps {
  themes: ThemeEntry[]
  isBackfilling?: boolean
}

const PILL_COLORS = [
  { bg: 'bg-amber-100', text: 'text-amber-800' },
  { bg: 'bg-ceramic-info/10', text: 'text-ceramic-info' },
  { bg: 'bg-ceramic-success/10', text: 'text-ceramic-success' },
  { bg: 'bg-ceramic-accent/10', text: 'text-ceramic-accent' },
  { bg: 'bg-ceramic-error/10', text: 'text-ceramic-error' },
  { bg: 'bg-teal-100', text: 'text-teal-800' },
]

export function ThemeClusters({ themes, isBackfilling }: ThemeClustersProps) {
  if (themes.length === 0) {
    return (
      <div className="ceramic-tile p-4">
        <h4 className="text-sm font-semibold text-[#5C554B] mb-3">Temas Frequentes</h4>
        <div className="flex flex-col items-center py-3">
          {isBackfilling ? (
            <>
              <div className="h-5 w-5 border-2 border-ceramic-accent border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-[#948D82] text-center">
                Analisando seus momentos com IA para identificar temas...
              </p>
            </>
          ) : (
            <>
              <TagIcon className="h-6 w-6 text-[#C4A574] mb-2" />
              <p className="text-xs text-[#948D82] text-center">
                Temas serao identificados automaticamente conforme você registra momentos.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ceramic-tile p-4">
      <h4 className="text-sm font-semibold text-[#5C554B] mb-3">Temas Frequentes</h4>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme, i) => {
          const color = PILL_COLORS[i % PILL_COLORS.length]
          return (
            <span
              key={theme.tag}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${color.bg} ${color.text}`}
            >
              #{theme.tag}
              <span className="opacity-60">({theme.count})</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
