/**
 * EF_SceneRenderer - SVG scene placeholder
 *
 * Renders a visual scene with era-based gradient background.
 * Placeholder for future animated SVG scenes.
 */

import React from 'react';
import { ERA_CONFIG } from '../types/eraforge.types';
import type { Era } from '../types/eraforge.types';

interface EF_SceneRendererProps {
  era: Era;
}

const ERA_GRADIENTS: Record<Era, { from: string; to: string }> = {
  stone_age:             { from: '#d97706', to: '#92400e' },
  ancient_egypt:         { from: '#eab308', to: '#a16207' },
  classical_greece:      { from: '#3b82f6', to: '#1e40af' },
  roman_empire:          { from: '#ef4444', to: '#991b1b' },
  medieval:              { from: '#78716c', to: '#44403c' },
  renaissance:           { from: '#a855f7', to: '#6b21a8' },
  industrial_revolution: { from: '#6b7280', to: '#374151' },
  modern:                { from: '#22c55e', to: '#15803d' },
  future:                { from: '#06b6d4', to: '#0e7490' },
};

export function EF_SceneRenderer({ era }: EF_SceneRendererProps) {
  const gradient = ERA_GRADIENTS[era];
  const config = ERA_CONFIG[era];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-ceramic-emboss" style={{ height: 180 }}>
      <svg
        viewBox="0 0 400 180"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`era-grad-${era}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#era-grad-${era})`} />
        <text
          x="200"
          y="80"
          textAnchor="middle"
          fill="white"
          fontSize="40"
          opacity="0.4"
        >
          {config.label}
        </text>
        <text
          x="200"
          y="120"
          textAnchor="middle"
          fill="white"
          fontSize="14"
          opacity="0.6"
        >
          {config.period}
        </text>
      </svg>
    </div>
  );
}
