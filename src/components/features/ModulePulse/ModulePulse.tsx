/**
 * ModulePulse - Compact status overview of active modules.
 *
 * Shows single-line pulse items for modules with recent activity.
 * Each item: emoji + status text. Click navigates to module.
 */

import { useNavigate } from 'react-router-dom'
import { useModulePulseData } from './useModulePulseData'

export function ModulePulse() {
  const navigate = useNavigate()
  const { pulses, isLoading } = useModulePulseData()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-8 bg-ceramic-cool/50 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (pulses.length === 0) return null

  return (
    <div className="space-y-1.5">
      {pulses.map((pulse) => (
        <button
          key={pulse.key}
          onClick={() => navigate(pulse.route)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-ceramic-cool/60 transition-colors text-left group"
        >
          <span className="text-base" role="img" aria-hidden="true">
            {pulse.emoji}
          </span>
          <span className="flex-1 text-sm text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors">
            {pulse.label}
          </span>
        </button>
      ))}
    </div>
  )
}
