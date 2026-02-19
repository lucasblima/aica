/**
 * LevelBadge - Athlete level indicator
 *
 * Displays athlete progression level (Iniciante I/II/III, Intermediario I/II/III, Avancado).
 * Color-coded by level category with Ceramic styling.
 */

import React from 'react';
import type { LevelBadgeProps } from '../types';
import { LEVEL_LABELS } from '../types';
import { Award } from 'lucide-react';

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  // Color mapping by level category
  const getLevelColor = () => {
    if (level === 'iniciante') {
      return { bg: 'bg-ceramic-info/20', text: 'text-ceramic-info', icon: 'text-ceramic-info' };
    }
    if (level === 'intermediario') {
      return { bg: 'bg-ceramic-warning/20', text: 'text-ceramic-warning', icon: 'text-ceramic-warning' };
    }
    return { bg: 'bg-ceramic-accent/20', text: 'text-ceramic-accent', icon: 'text-ceramic-accent' };
  };

  const colors = getLevelColor();
  const label = LEVEL_LABELS[level];

  // Size variants
  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 gap-1',
      text: 'text-[10px]',
      icon: 'w-3 h-3',
    },
    md: {
      container: 'px-2.5 py-1 gap-1.5',
      text: 'text-xs',
      icon: 'w-3.5 h-3.5',
    },
    lg: {
      container: 'px-3 py-1.5 gap-2',
      text: 'text-sm',
      icon: 'w-4 h-4',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={`
        inline-flex items-center rounded-lg font-bold uppercase tracking-wider
        ${colors.bg} ${colors.text} ${sizes.container}
      `}
    >
      <Award className={`${colors.icon} ${sizes.icon}`} />
      <span className={sizes.text}>{label}</span>
    </div>
  );
}
