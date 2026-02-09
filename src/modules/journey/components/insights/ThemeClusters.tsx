/**
 * ThemeClusters Component
 * Tag pills ordered by frequency with Ceramic colors (Issue #208)
 */

import React from 'react'
import type { ThemeEntry } from '../../hooks/useJourneyPatterns'

interface ThemeClustersProps {
  themes: ThemeEntry[]
}

const PILL_COLORS = [
  { bg: 'bg-amber-100', text: 'text-amber-800' },
  { bg: 'bg-blue-100', text: 'text-blue-800' },
  { bg: 'bg-green-100', text: 'text-green-800' },
  { bg: 'bg-purple-100', text: 'text-purple-800' },
  { bg: 'bg-rose-100', text: 'text-rose-800' },
  { bg: 'bg-teal-100', text: 'text-teal-800' },
]

export function ThemeClusters({ themes }: ThemeClustersProps) {
  if (themes.length === 0) {
    return (
      <div className="ceramic-tile p-4 text-center">
        <p className="text-sm text-[#948D82]">
          Nenhum tema identificado ainda. Adicione tags aos seus momentos.
        </p>
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
