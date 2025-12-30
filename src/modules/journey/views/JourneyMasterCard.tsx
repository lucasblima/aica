/**
 * JourneyMasterCard Component
 * Unified master card displaying Consciousness Points and Journey progress
 * Combines JourneyCardCollapsed + ConsciousnessScore into a single "Swiss watch" design
 */

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useConsciousnessPoints } from '../hooks/useConsciousnessPoints'
import {
  LEVEL_COLORS,
  getProgressToNextLevel,
  LEVEL_DESCRIPTIONS,
  CP_LEVELS,
  CPLevel,
} from '../types/consciousnessPoints'
import { cardElevationVariants, springElevation, pulseVariants } from '../../../lib/animations/ceramic-motion'
import { FireIcon, SparklesIcon } from '@heroicons/react/24/solid'

interface JourneyMasterCardProps {
  userId?: string
  showNotification?: boolean
  onNotificationClick?: () => void
  className?: string
}

/**
 * Get the next level milestone name for context
 */
function getNextMilestoneName(currentLevel: CPLevel): string {
  const nextLevelData = CP_LEVELS.find(l => l.level === currentLevel + 1)
  if (!nextLevelData) {
    return 'Maestria Alcançada'
  }
  return nextLevelData.name
}

export function JourneyMasterCard({
  userId,
  showNotification = false,
  onNotificationClick,
  className = '',
}: JourneyMasterCardProps) {
  const navigate = useNavigate()
  const { stats, progress, isLoading } = useConsciousnessPoints()

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!progress) return 0
    return progress.progress_percentage || 0
  }, [progress])

  // Get color for current level
  const levelColor = useMemo(() => {
    if (!stats) return LEVEL_COLORS[1]
    return LEVEL_COLORS[stats.level]
  }, [stats])

  // Get next milestone name
  const nextMilestoneName = useMemo(() => {
    if (!stats) return 'Desperto'
    return getNextMilestoneName(stats.level)
  }, [stats])

  // Get level description
  const levelDescription = useMemo(() => {
    if (!stats) return LEVEL_DESCRIPTIONS['Observador']
    return LEVEL_DESCRIPTIONS[stats.level_name]
  }, [stats])

  if (isLoading) {
    return (
      <motion.div
        className={`ceramic-card p-6 ${className}`}
        variants={cardElevationVariants}
        initial="rest"
        whileHover="hover"
        layout
      >
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin">
            <SparklesIcon className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </motion.div>
    )
  }

  if (!stats || !progress) {
    return (
      <motion.div
        className={`ceramic-card p-6 ${className}`}
        variants={cardElevationVariants}
        initial="rest"
        whileHover="hover"
        layout
      >
        <div className="flex items-center justify-center h-48 text-ceramic-text-secondary">
          Carregando...
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`ceramic-card p-6 ${className}`}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      layout
    >
      {/* Header with level badge and info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4 flex-1">
          {/* Level Badge - Circular with color */}
          <motion.div
            className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg"
            style={{ backgroundColor: levelColor }}
            whileHover={{ scale: 1.05 }}
            transition={springElevation}
          >
            {stats.level}
          </motion.div>

          {/* Level Name and Description */}
          <div className="flex-1 pt-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold text-ceramic-text-primary">
                Nível {stats.level}
              </h3>
              <span
                className="text-sm font-semibold"
                style={{ color: levelColor }}
              >
                {stats.level_name}
              </span>
            </div>
            <p className="text-xs text-ceramic-text-secondary mt-1">
              {levelDescription}
            </p>
          </div>
        </div>

        {/* Notification Indicator */}
        {showNotification && (
          <motion.button
            onClick={onNotificationClick}
            className="notification-pulse flex-shrink-0 w-3 h-3 rounded-full"
            style={{ backgroundColor: '#d97706' }} // amber-600
            variants={pulseVariants}
            initial="initial"
            animate="pulse"
            whileHover={{ scale: 1.2 }}
            title="Você tem uma notificação pendente"
            aria-label="Notificação pendente"
          />
        )}
      </div>

      {/* CP Score and Progress to Next Level */}
      <div className="mb-6">
        {/* Current CP / Next Level CP */}
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-ceramic-text-secondary">
            Pontos de Consciência
          </span>
          <span className="text-sm font-semibold text-ceramic-text-primary">
            {stats.total_points.toLocaleString()} / {progress.next_level ? `${(CP_LEVELS[progress.next_level - 1].min_points).toLocaleString()} CP` : 'Máximo'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {/* Progress Percentage */}
        <div className="flex justify-end mt-1">
          <span className="text-xs font-medium text-ceramic-text-secondary">
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Next Milestone */}
      <div className="ceramic-inset flex items-center justify-between p-3">
        <div>
          <p className="text-xs text-ceramic-text-secondary">Próximo Marco</p>
          <p className="text-sm font-semibold text-ceramic-text-primary">
            {nextMilestoneName}
          </p>
        </div>
        {progress.points_to_next > 0 && (
          <span className="text-xs font-medium px-2 py-1 bg-ceramic-accent-dark text-white rounded-full">
            {progress.points_to_next} CP
          </span>
        )}
      </div>

      {/* Stats Footer */}
      {(stats.current_streak > 0 || stats.total_moments > 0) && (
        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-gray-200">
          {/* Streak */}
          {stats.current_streak > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FireIcon className="h-4 w-4 text-orange-500" />
                <span className="text-lg font-bold text-ceramic-text-primary">
                  {stats.current_streak}
                </span>
              </div>
              <div className="text-xs text-ceramic-text-secondary">
                Sequência
              </div>
            </div>
          )}

          {/* Moments */}
          <div className="text-center">
            <div className="text-lg font-bold text-ceramic-text-primary">
              {stats.total_moments}
            </div>
            <div className="text-xs text-ceramic-text-secondary">Momentos</div>
          </div>

          {/* Questions */}
          <div className="text-center">
            <div className="text-lg font-bold text-ceramic-text-primary">
              {stats.total_questions_answered}
            </div>
            <div className="text-xs text-ceramic-text-secondary">Perguntas</div>
          </div>

          {/* Reflections - only show if has streak or moments */}
          {stats.total_moments > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-ceramic-text-primary">
                {stats.total_summaries_reflected}
              </div>
              <div className="text-xs text-ceramic-text-secondary">Reflexões</div>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no activity */}
      {stats.total_moments === 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-center space-y-4">
          {/* Icon in ceramic circle */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-ceramic-warm flex items-center justify-center ceramic-inset">
              <Compass className="w-8 h-8 text-ceramic-accent" />
            </div>
          </div>

          {/* Heading + Message */}
          <div>
            <h4 className="font-bold text-ceramic-text-primary mb-2">
              Sua jornada começa aqui
            </h4>
            <p className="text-xs text-ceramic-text-secondary">
              Registre sua primeira reflexão e comece a evoluir
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/journey')}
            className="ceramic-btn-primary text-sm px-6 py-2"
          >
            Fazer primeira reflexão
          </button>
        </div>
      )}
    </motion.div>
  )
}
