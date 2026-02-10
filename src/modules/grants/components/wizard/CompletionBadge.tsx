/**
 * CompletionBadge Component
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Visual badge showing organization profile completion level.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Star, Crown } from 'lucide-react';
import type { CompletionLevelConfig } from '../../types/wizard';
import { COMPLETION_LEVELS } from '../../types/wizard';

interface CompletionBadgeProps {
  level: CompletionLevelConfig;
  percentage: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const sizeClasses = {
  sm: {
    container: 'w-16 h-16',
    icon: 'text-2xl',
    text: 'text-xs',
  },
  md: {
    container: 'w-24 h-24',
    icon: 'text-4xl',
    text: 'text-sm',
  },
  lg: {
    container: 'w-32 h-32',
    icon: 'text-5xl',
    text: 'text-base',
  },
};

export function CompletionBadge({
  level,
  percentage,
  showProgress = true,
  size = 'md',
  animate = true,
}: CompletionBadgeProps) {
  const sizes = sizeClasses[size];

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={animate ? { scale: 0.8, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Badge Circle */}
      <div
        className={`
          relative ${sizes.container} rounded-full flex items-center justify-center
          shadow-lg overflow-hidden
        `}
        style={{ backgroundColor: level.bgColor }}
      >
        {/* Progress Ring */}
        {showProgress && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={level.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 45 * (1 - percentage / 100),
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
        )}

        {/* Icon */}
        <motion.span
          className={sizes.icon}
          animate={animate ? { scale: [1, 1.1, 1] } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {level.icon}
        </motion.span>
      </div>

      {/* Level Name */}
      <span
        className={`font-bold ${sizes.text}`}
        style={{ color: level.color }}
      >
        {level.name}
      </span>

      {/* Percentage */}
      {showProgress && (
        <span className="text-xs text-ceramic-text-secondary">
          {percentage}% completo
        </span>
      )}
    </motion.div>
  );
}

/**
 * Level Progress Card
 * Shows current level and progress to next level
 */
interface LevelProgressCardProps {
  currentLevel: CompletionLevelConfig;
  nextLevel: CompletionLevelConfig | null;
  percentage: number;
  percentageToNext: number;
}

export function LevelProgressCard({
  currentLevel,
  nextLevel,
  percentage,
  percentageToNext,
}: LevelProgressCardProps) {
  return (
    <motion.div
      className="p-4 bg-ceramic-base rounded-2xl shadow-sm border border-ceramic-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Current Level */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: currentLevel.bgColor }}
        >
          {currentLevel.icon}
        </div>
        <div>
          <p className="font-semibold text-ceramic-text-primary">{currentLevel.name}</p>
          <p className="text-sm text-ceramic-text-secondary">{currentLevel.description}</p>
        </div>
      </div>

      {/* Progress to Next Level */}
      {nextLevel && (
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-ceramic-text-secondary">Proximo nivel</span>
            <span className="font-medium" style={{ color: nextLevel.color }}>
              {nextLevel.name} {nextLevel.icon}
            </span>
          </div>

          <div className="relative h-2 bg-ceramic-base rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${currentLevel.color}, ${nextLevel.color})`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${percentageToNext}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <p className="mt-2 text-xs text-ceramic-text-secondary text-center">
            {nextLevel.minPercentage - percentage}% restante para {nextLevel.name}
          </p>
        </div>
      )}

      {/* Max Level Reached */}
      {!nextLevel && (
        <div className="text-center py-2">
          <span className="text-2xl">🎉</span>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Nivel maximo alcancado!
          </p>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Level Badges Overview
 * Shows all available levels with current progress
 */
interface LevelBadgesOverviewProps {
  currentPercentage: number;
}

export function LevelBadgesOverview({ currentPercentage }: LevelBadgesOverviewProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {COMPLETION_LEVELS.map((level) => {
        const isUnlocked = currentPercentage >= level.minPercentage;
        const isCurrent =
          currentPercentage >= level.minPercentage &&
          currentPercentage <= level.maxPercentage;

        return (
          <motion.div
            key={level.level}
            className={`
              flex flex-col items-center p-3 rounded-xl transition-all
              ${isCurrent ? 'bg-amber-50 ring-2 ring-amber-200' : ''}
              ${!isUnlocked ? 'opacity-40 grayscale' : ''}
            `}
            whileHover={isUnlocked ? { scale: 1.05 } : undefined}
          >
            <span className="text-3xl mb-1">{level.icon}</span>
            <span
              className="text-xs font-medium"
              style={{ color: isUnlocked ? level.color : '#9ca3af' }}
            >
              {level.name}
            </span>
            <span className="text-xs text-ceramic-text-secondary">
              {level.minPercentage}%+
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default CompletionBadge;
