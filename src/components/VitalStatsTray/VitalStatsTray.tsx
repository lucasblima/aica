/**
 * VitalStatsTray Component
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Displays vital statistics in a ceramic tray with heavy typography
 * Layer 1 (Inset) - The "recessed" tray where data lives
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Flame, Sparkles, BookOpen } from 'lucide-react'

interface VitalStatsTrayProps {
  streak: number
  moments: number
  reflections: number
  isLoading?: boolean
  className?: string
}

interface StatItemProps {
  value: number
  label: string
  icon: React.ReactNode
  delay: number
}

const StatItem: React.FC<StatItemProps> = ({ value, label, icon, delay }) => (
  <motion.div
    className="flex flex-col items-center text-center"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
  >
    <div className="flex items-center gap-2 mb-2">
      <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <motion.span
      className="ceramic-stat-counter"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
    >
      {value}
    </motion.span>
    <span className="ceramic-stat-label">{label}</span>
  </motion.div>
)

export function VitalStatsTray({
  streak,
  moments,
  reflections,
  isLoading = false,
  className = '',
}: VitalStatsTrayProps) {
  if (isLoading) {
    return (
      <div className={`ceramic-stats-tray ${className}`}>
        <div className="grid grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center animate-pulse">
              <div className="w-10 h-10 bg-ceramic-text-secondary/10 rounded-full mb-2" />
              <div className="w-16 h-10 bg-ceramic-text-secondary/10 rounded mb-2" />
              <div className="w-20 h-4 bg-ceramic-text-secondary/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={`ceramic-stats-tray ${className}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      data-testid="vital-stats-tray"
      role="region"
      aria-label="Estatísticas vitais"
    >
      <div className="grid grid-cols-3 gap-8">
        <StatItem
          value={streak}
          label="Sequencia"
          icon={<Flame className="w-5 h-5 text-ceramic-warning" />}
          delay={0}
        />
        <StatItem
          value={moments}
          label="Momentos"
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
          delay={0.1}
        />
        <StatItem
          value={reflections}
          label="Reflexoes"
          icon={<BookOpen className="w-5 h-5 text-ceramic-info" />}
          delay={0.2}
        />
      </div>
    </motion.div>
  )
}

export default VitalStatsTray
