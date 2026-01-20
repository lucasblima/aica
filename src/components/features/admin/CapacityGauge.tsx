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
    if (percentage >= criticalThreshold) return { stroke: '#EF4444', bg: 'bg-red-50', text: 'text-red-600' }
    if (percentage >= warningThreshold) return { stroke: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-600' }
    return { stroke: '#22C55E', bg: 'bg-green-50', text: 'text-green-600' }
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
            stroke="#E5E7EB"
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
          <span className="text-sm text-ceramic-500 mt-1">Capacidade</span>
        </div>
      </div>

      {/* Stats below gauge */}
      <div className={`mt-4 px-4 py-2 rounded-lg ${colors.bg}`}>
        <p className={`text-center font-medium ${colors.text}`}>
          {current} / {max} instâncias
        </p>
      </div>

      {/* Threshold indicators */}
      <div className="flex gap-4 mt-3 text-xs text-ceramic-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>&lt; {warningThreshold}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{warningThreshold}-{criticalThreshold}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>&gt; {criticalThreshold}%</span>
        </div>
      </div>
    </div>
  )
}

export default CapacityGauge
