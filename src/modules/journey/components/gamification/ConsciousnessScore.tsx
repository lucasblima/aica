/**
 * ConsciousnessScore Component
 * Displays CP score, level, and progress
 */

import React from 'react'
import { UserConsciousnessStats } from '../../types/consciousnessPoints'
import { getProgressToNextLevel, LEVEL_COLORS } from '../../types/consciousnessPoints'
import { SparklesIcon, FireIcon } from '@heroicons/react/24/solid'

interface ConsciousnessScoreProps {
  stats: UserConsciousnessStats
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

export function ConsciousnessScore({
  stats,
  size = 'md',
  showDetails = true,
}: ConsciousnessScoreProps) {
  const progress = getProgressToNextLevel(stats.total_points)
  const levelColor = LEVEL_COLORS[stats.level]

  const sizeClasses = {
    sm: {
      container: 'p-3',
      title: 'text-xs',
      points: 'text-2xl',
      level: 'text-sm',
      badge: 'w-12 h-12 text-xl',
    },
    md: {
      container: 'p-4',
      title: 'text-sm',
      points: 'text-4xl',
      level: 'text-base',
      badge: 'w-16 h-16 text-2xl',
    },
    lg: {
      container: 'p-6',
      title: 'text-base',
      points: 'text-6xl',
      level: 'text-lg',
      badge: 'w-24 h-24 text-4xl',
    },
  }

  const classes = sizeClasses[size]

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl ${classes.container}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-500" />
          <span className={`font-medium text-gray-700 ${classes.title}`}>
            Pontos de Consciência
          </span>
        </div>

        {/* Streak indicator */}
        {stats.current_streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
            <FireIcon className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-bold text-orange-700">
              {stats.current_streak}
            </span>
          </div>
        )}
      </div>

      {/* Main display */}
      <div className="flex items-center gap-4">
        {/* Level badge */}
        <div
          className={`flex items-center justify-center rounded-full font-bold text-white shadow-lg ${classes.badge}`}
          style={{ backgroundColor: levelColor }}
        >
          {stats.level}
        </div>

        {/* Points and level name */}
        <div className="flex-1">
          <div className={`font-bold text-gray-900 ${classes.points}`}>
            {stats.total_points.toLocaleString()}
          </div>
          <div className={`font-medium ${classes.level}`} style={{ color: levelColor }}>
            {stats.level_name}
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {showDetails && progress.next_level && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progresso para Nível {progress.next_level}</span>
            <span className="font-medium">
              {progress.points_to_next} CP restantes
            </span>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>

          <div className="text-xs text-gray-500 mt-1 text-right">
            {progress.progress_percentage.toFixed(0)}%
          </div>
        </div>
      )}

      {/* Stats */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {stats.total_moments}
            </div>
            <div className="text-xs text-gray-600">Momentos</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {stats.total_questions_answered}
            </div>
            <div className="text-xs text-gray-600">Perguntas</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {stats.longest_streak}
            </div>
            <div className="text-xs text-gray-600">Recorde</div>
          </div>
        </div>
      )}
    </div>
  )
}
