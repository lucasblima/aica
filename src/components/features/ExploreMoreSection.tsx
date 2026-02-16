/**
 * ExploreMoreSection Component
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Horizontal scroll of pills for inactive modules the user hasn't configured yet.
 */

import React from 'react'

interface ExploreModule {
  id: string
  icon: string
  label: string
}

interface ExploreMoreSectionProps {
  modules: ExploreModule[]
  onConfigure: (id: string) => void
}

export function ExploreMoreSection({ modules, onConfigure }: ExploreMoreSectionProps) {
  if (modules.length === 0) return null

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-ceramic-text-secondary uppercase tracking-wider mb-3 px-1">
        Explorar mais
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className="ceramic-inset rounded-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0 min-w-[180px]"
          >
            <span className="text-xl" role="img" aria-label={mod.label}>
              {mod.icon}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ceramic-text-primary whitespace-nowrap">
                {mod.label}
              </span>
              <button
                onClick={() => onConfigure(mod.id)}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors text-left"
              >
                Configurar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
