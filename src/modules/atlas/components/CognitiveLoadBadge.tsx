/**
 * CognitiveLoadBadge — Small badge showing cognitive load level on task cards.
 * Colors: green (<0.3), amber (0.3-0.7), red (>0.7).
 * Ceramic design, Portuguese tooltip.
 */

import React, { useState } from 'react'
import { Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CognitiveLoadBadgeProps {
  cognitiveLoad: number // 0-1
  size?: 'sm' | 'md'
}

function getLoadConfig(load: number) {
  if (load < 0.3) {
    return {
      label: 'Baixa',
      bgClass: 'bg-green-100',
      textClass: 'text-green-700',
      dotClass: 'bg-green-500',
    }
  }
  if (load <= 0.7) {
    return {
      label: 'Média',
      bgClass: 'bg-amber-100',
      textClass: 'text-amber-700',
      dotClass: 'bg-amber-500',
    }
  }
  return {
    label: 'Alta',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  }
}

export const CognitiveLoadBadge: React.FC<CognitiveLoadBadgeProps> = ({
  cognitiveLoad,
  size = 'sm',
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const config = getLoadConfig(cognitiveLoad)
  const displayValue = Math.round(cognitiveLoad * 10)

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs gap-1'
    : 'px-2 py-1 text-sm gap-1.5'

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center rounded-full font-medium ${config.bgClass} ${config.textClass} ${sizeClasses}`}
      >
        <Brain className={iconSize} />
        <span>{displayValue}</span>
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-ceramic-50 rounded-lg shadow-lg text-xs text-ceramic-text-primary whitespace-nowrap z-50"
          >
            <p className="font-medium">
              Carga Cognitiva: {displayValue}/10 — {config.label}
            </p>
            <p className="text-ceramic-text-secondary mt-0.5">
              Sweller 1988
            </p>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-ceramic-50" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
