/**
 * CapacityGauge Component
 *
 * Circular gauge showing current instance capacity vs maximum.
 * Visual thresholds at 75% (warning) and 90% (critical).
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 */

import { motion } from 'framer-motion'

interface CapacityGaugeProps {
  current: number
  max?: number
  percentage: number
  warningThreshold?: number
  criticalThreshold?: number
  className?: string
}

export function CapacityGauge({
  current,
  max = 40,
  percentage,
  warningThreshold = 75,
  criticalThreshold = 90,
  className = '',
}: CapacityGaugeProps) {
  // Determine color based on thresholds
  const getColor = () => {
    if (percentage >= criticalThreshold) return { stroke: '#9B4D3A', bg: 'bg-ceramic-error/10', text: 'text-ceramic-error' }
    if (percentage >= warningThreshold) return { stroke: '#C4883A', bg: 'bg-ceramic-warning/10', text: 'text-ceramic-warning' }
    return { stroke: '#6B7B5C', bg: 'bg-ceramic-success/10', text: 'text-ceramic-success' }
  }

  const colors = getColor()
  const circumference = 2 * Math.PI * 70 // radius = 70
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative w-48 h-48">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#E5E3DC"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ strokeDasharray, strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ strokeDasharray }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-4xl font-bold ${colors.text}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {percentage}%
          </motion.span>
          <span className="text-sm text-ceramic-text-secondary mt-1">Capacidade</span>
        </div>
      </div>

      {/* Stats below gauge */}
      <div className={`mt-4 px-4 py-2 rounded-lg ${colors.bg}`}>
        <p className={`text-center font-medium ${colors.text}`}>
          {current} / {max} instâncias
        </p>
      </div>

      {/* Threshold indicators */}
      <div className="flex gap-4 mt-3 text-xs text-ceramic-text-secondary">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-ceramic-success" />
          <span>&lt; {warningThreshold}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-ceramic-warning" />
          <span>{warningThreshold}-{criticalThreshold}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-ceramic-error" />
          <span>&gt; {criticalThreshold}%</span>
        </div>
      </div>
    </div>
  )
}

export default CapacityGauge
