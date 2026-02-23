/**
 * EF_SceneRenderer - Era-specific illustrated SVG scenes
 *
 * Renders animated SVG scenes per era using dedicated scene components.
 * Falls back to gradient + SvgPrimitives for eras without dedicated scenes.
 * Wrapped in Framer Motion for page transition animations.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { pageTransitionVariants } from '@/lib/animations/ceramic-motion';
import { ERA_CONFIG } from '../types/eraforge.types';
import type { Era } from '../types/eraforge.types';
import { StoneAgeScene } from './scenes/StoneAgeScene';
import { AncientEgyptScene } from './scenes/AncientEgyptScene';
import { ClassicalGreeceScene } from './scenes/ClassicalGreeceScene';
import { MedievalScene } from './scenes/MedievalScene';
import { Sun, Cloud, Mountain } from './scenes/SvgPrimitives';

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

const SCENE_COMPONENTS: Partial<Record<Era, React.FC>> = {
  stone_age: StoneAgeScene,
  ancient_egypt: AncientEgyptScene,
  classical_greece: ClassicalGreeceScene,
  medieval: MedievalScene,
};

export function EF_SceneRenderer({ era }: EF_SceneRendererProps) {
  const gradient = ERA_GRADIENTS[era];
  const config = ERA_CONFIG[era];
  const SceneComponent = SCENE_COMPONENTS[era];

  return (
    <motion.div
      className="relative rounded-xl overflow-hidden shadow-ceramic-emboss"
      style={{ height: 180 }}
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
    >
      {SceneComponent ? (
        <SceneComponent />
      ) : (
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
          <Sun cx={340} cy={40} r={20} />
          <Cloud cx={80} cy={35} />
          <Cloud cx={220} cy={50} />
          <Mountain x={0} y={120} width={160} height={60} fill={gradient.to} />
          <Mountain x={120} y={120} width={200} height={60} fill={gradient.from} opacity={0.6} />
        </svg>
      )}

      {/* Frosted glass era label */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-white/30 backdrop-blur-sm">
        <p className="text-white text-sm font-bold font-fredoka drop-shadow-sm">
          {config.label}
        </p>
        <p className="text-white/80 text-[10px] drop-shadow-sm">
          {config.period}
        </p>
      </div>
    </motion.div>
  );
}
