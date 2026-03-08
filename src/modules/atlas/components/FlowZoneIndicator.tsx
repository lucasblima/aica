/**
 * FlowZoneIndicator — Shows current flow state as a pill/badge with animation.
 * Ceramic design, Portuguese labels, mobile-first.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Battery, BatteryLow, Clock } from 'lucide-react'
import type { EnergyLevel, TaskComplexity } from '../services/atlasScoring'

interface FlowZoneIndicatorProps {
  flowProbability: number // 0-1
  currentEnergy: EnergyLevel
  optimalTaskTypes: TaskComplexity[]
  nextFlowWindow?: { start: number; end: number } | null
}

const ENERGY_CONFIG: Record<EnergyLevel, {
  label: string
  icon: React.ReactNode
  bgClass: string
  textClass: string
}> = {
  peak: {
    label: 'Em Flow',
    icon: <Zap className="w-4 h-4" />,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
  },
  sustain: {
    label: 'Zona Ótima',
    icon: <Battery className="w-4 h-4" />,
    bgClass: 'bg-ceramic-cool',
    textClass: 'text-ceramic-text-primary',
  },
  rest: {
    label: 'Energia Baixa',
    icon: <BatteryLow className="w-4 h-4" />,
    bgClass: 'bg-ceramic-cool',
    textClass: 'text-ceramic-text-secondary',
  },
}

const COMPLEXITY_LABELS: Record<TaskComplexity, string> = {
  high: 'complexas',
  medium: 'moderadas',
  low: 'simples',
}

export const FlowZoneIndicator: React.FC<FlowZoneIndicatorProps> = ({
  flowProbability,
  currentEnergy,
  optimalTaskTypes,
  nextFlowWindow,
}) => {
  const config = ENERGY_CONFIG[currentEnergy]
  const isInFlow = flowProbability > 0.6
  const percentage = Math.round(flowProbability * 100)

  return (
    <div className="bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss">
      <div className="flex items-center gap-3">
        {/* Animated pill */}
        <motion.div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bgClass} ${config.textClass}`}
          animate={isInFlow ? { scale: [1, 1.05, 1] } : undefined}
          transition={isInFlow ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          {config.icon}
          <span className="text-sm font-medium">{config.label}</span>
        </motion.div>

        {/* Flow probability */}
        <span className="text-xs text-ceramic-text-secondary">
          {percentage}% flow
        </span>
      </div>

      {/* Optimal task types */}
      <p className="mt-2 text-xs text-ceramic-text-secondary">
        Ideal para tarefas{' '}
        {optimalTaskTypes.map(t => COMPLEXITY_LABELS[t]).join(' e ')}
      </p>

      {/* Next flow window (when not in peak) */}
      {nextFlowWindow && currentEnergy !== 'peak' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-ceramic-text-secondary">
          <Clock className="w-3 h-3" />
          <span>
            Proximo flow: {formatHour(nextFlowWindow.start % 24)}h -
            {formatHour(nextFlowWindow.end % 24)}h
          </span>
        </div>
      )}
    </div>
  )
}

function formatHour(hour: number): string {
  return String(Math.floor(hour)).padStart(2, '0')
}
