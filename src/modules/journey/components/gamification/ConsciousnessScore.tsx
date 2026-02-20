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
      points: 'text-xl',
      level: 'text-xs',
      badge: 'w-10 h-10 text-lg',
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
    <div className={`bg-gradient-to-br from-ceramic-info/10 to-ceramic-accent/10 rounded-xl ${classes.container}`} data-tour="consciousness-score">
      {/* Header */}
      <div className={`flex items-center justify-between ${size === 'sm' ? 'mb-2' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-ceramic-info" />
          <span className={`font-medium text-ceramic-text-primary ${classes.title}`}>
            Pontos de Consciência
          </span>
        </div>

        {/* Streak indicator */}
        {stats.current_streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-ceramic-warning/10 rounded-full">
            <FireIcon className="h-4 w-4 text-ceramic-warning" />
            <span className="text-xs font-bold text-ceramic-warning">
              {stats.current_streak}
            </span>
          </div>
        )}
      </div>

      {/* Main display */}
      <div className={`flex items-center ${size === 'sm' ? 'gap-3' : 'gap-4'}`}>
        {/* Level badge */}
        <div
          className={`flex items-center justify-center rounded-full font-bold text-white shadow-lg ${classes.badge}`}
          style={{ backgroundColor: levelColor }}
        >
          {stats.level}
        </div>

        {/* Points and level name */}
        <div className="flex-1">
          <div className={`font-bold text-ceramic-text-primary ${classes.points}`}>
            {stats.total_points.toLocaleString()}
          </div>
          <div className={`font-medium ${classes.level}`} style={{ color: levelColor }}>
            {stats.level_name}
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {showDetails && progress.next_level && (
        <div className={size === 'sm' ? 'mt-2' : 'mt-4'}>
          <div className={`flex items-center justify-between ${size === 'sm' ? 'text-xs' : 'text-xs'} text-ceramic-text-secondary mb-1`}>
            <span>Nível {progress.next_level}</span>
            <span className="font-medium">
              {progress.points_to_next} CP
            </span>
          </div>

          <div className={`w-full ${size === 'sm' ? 'h-1.5' : 'h-2'} bg-ceramic-highlight rounded-full overflow-hidden`}>
            <div
              className="h-full bg-gradient-to-r from-ceramic-info to-ceramic-accent rounded-full transition-all duration-500"
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      {showDetails && (
        <div className={`grid grid-cols-3 ${size === 'sm' ? 'gap-1 mt-2 pt-2' : 'gap-2 mt-4 pt-4'} border-t border-ceramic-text-secondary/10`}>
          <div className="text-center">
            <div className={`${size === 'sm' ? 'text-sm' : 'text-lg'} font-bold text-ceramic-text-primary`}>
              {stats.total_moments}
            </div>
            <div className={`${size === 'sm' ? 'text-xs' : 'text-xs'} text-ceramic-text-secondary`}>Momentos</div>
          </div>

          <div className="text-center">
            <div className={`${size === 'sm' ? 'text-sm' : 'text-lg'} font-bold text-ceramic-text-primary`}>
              {stats.total_questions_answered}
            </div>
            <div className={`${size === 'sm' ? 'text-xs' : 'text-xs'} text-ceramic-text-secondary`}>Perguntas</div>
          </div>

          <div className="text-center">
            <div className={`${size === 'sm' ? 'text-sm' : 'text-lg'} font-bold text-ceramic-text-primary`}>
              {stats.longest_streak}
            </div>
            <div className={`${size === 'sm' ? 'text-xs' : 'text-xs'} text-ceramic-text-secondary`}>Recorde</div>
          </div>
        </div>
      )}
    </div>
  )
}
