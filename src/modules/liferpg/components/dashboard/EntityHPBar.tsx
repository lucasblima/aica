/**
 * EntityHPBar — HP bar with gradient colors and smooth animation.
 * 100-70 green, 69-40 yellow, 39-0 red.
 */

import React from 'react';

interface EntityHPBarProps {
  hp: number;
  maxHP?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getHPColor(hp: number): string {
  if (hp >= 70) return 'bg-emerald-500';
  if (hp >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getHPGradient(hp: number): string {
  if (hp >= 70) return 'from-emerald-400 to-emerald-600';
  if (hp >= 40) return 'from-amber-400 to-amber-600';
  return 'from-red-400 to-red-600';
}

const sizeClasses = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

export const EntityHPBar: React.FC<EntityHPBarProps> = ({
  hp,
  maxHP = 100,
  size = 'md',
  showLabel = true,
}) => {
  const percentage = Math.max(0, Math.min(100, (hp / maxHP) * 100));

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-ceramic-text-secondary">HP</span>
          <span className={`text-xs font-bold ${hp < 30 ? 'text-ceramic-error' : 'text-ceramic-text-primary'}`}>
            {hp}/{maxHP}
          </span>
        </div>
      )}
      <div className={`w-full ${sizeClasses[size]} bg-ceramic-cool rounded-full overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} bg-gradient-to-r ${getHPGradient(hp)} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
