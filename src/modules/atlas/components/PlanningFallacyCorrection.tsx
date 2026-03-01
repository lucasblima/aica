/**
 * PlanningFallacyCorrection — Shows estimated vs corrected duration.
 * Displays the planning fallacy multiplier and allows accepting the correction.
 * Ceramic design, Portuguese labels.
 */

import React from 'react'
import { Clock, TrendingUp, Info } from 'lucide-react'

interface PlanningFallacyCorrectionProps {
  estimatedMinutes: number
  multiplier: number
  onAcceptCorrection?: (correctedMinutes: number) => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`
}

export const PlanningFallacyCorrection: React.FC<PlanningFallacyCorrectionProps> = ({
  estimatedMinutes,
  multiplier,
  onAcceptCorrection,
}) => {
  const correctedMinutes = Math.round(estimatedMinutes * Math.max(1, multiplier))
  const hasCorrection = multiplier > 1.05 // Only show if >5% correction
  const multiplierDisplay = multiplier.toFixed(1)

  if (!hasCorrection) {
    return null
  }

  return (
    <div className="bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <TrendingUp className="w-4 h-4 text-amber-700" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Duration comparison */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ceramic-text-secondary line-through">
              {formatDuration(estimatedMinutes)}
            </span>
            <span className="text-ceramic-text-primary">→</span>
            <span className="font-medium text-ceramic-text-primary">
              {formatDuration(correctedMinutes)}
            </span>
          </div>

          {/* Explanation */}
          <p className="mt-1 text-xs text-ceramic-text-secondary">
            <Clock className="w-3 h-3 inline mr-1" />
            Voce estimou {formatDuration(estimatedMinutes)} → Correcao:{' '}
            {formatDuration(correctedMinutes)} (historico: {multiplierDisplay}x)
          </p>

          {/* Citation */}
          <p className="mt-1 flex items-center gap-1 text-xs text-ceramic-text-secondary opacity-70">
            <Info className="w-3 h-3" />
            Buehler et al. 1994 — Planning Fallacy
          </p>
        </div>
      </div>

      {/* Accept correction button */}
      {onAcceptCorrection && (
        <button
          onClick={() => onAcceptCorrection(correctedMinutes)}
          className="mt-3 w-full text-center text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg py-2 transition-colors"
        >
          Aceitar correcao ({formatDuration(correctedMinutes)})
        </button>
      )}
    </div>
  )
}
