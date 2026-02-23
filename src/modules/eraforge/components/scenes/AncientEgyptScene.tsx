/**
 * Ancient Egypt Scene — Pyramids, Nile, palm trees, sand dunes, sun with rays
 * Toca Boca style: vibrant, flat, cartoonish
 */

import React from 'react';
import { Sun, Cloud, Pyramid, Tree, Water, DesertGround, Character } from './SvgPrimitives';
import type { SceneChildProps } from './types';

export function AncientEgyptScene({ children, isAnimating }: SceneChildProps) {
  return (
    <g>
      {/* Sky */}
      <defs>
        <linearGradient id="sky-egypt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#sky-egypt)" />

      {/* Sun - larger, prominent */}
      <Sun cx={340} cy={32} r={24} color="#FBBF24" rayColor="#FDE68A" />

      {/* Clouds */}
      <Cloud x={50} y={18} scale={0.7} speed={35} />
      <Cloud x={180} y={28} scale={0.5} speed={40} />

      {/* Sand dunes background */}
      <ellipse cx={100} cy={145} rx={120} ry={20} fill="#FBBF24" opacity="0.5" />
      <ellipse cx={300} cy={140} rx={100} ry={18} fill="#EAB308" opacity="0.4" />

      {/* Pyramids */}
      <Pyramid x={80} y={148} width={110} height={80} color="#D97706" shadowColor="#92400E" />
      <Pyramid x={180} y={148} width={85} height={62} color="#EAB308" shadowColor="#A16207" />
      <Pyramid x={260} y={148} width={60} height={45} color="#D97706" shadowColor="#92400E" />

      {/* Sphinx silhouette */}
      <g aria-label="Esfinge" opacity="0.6">
        <ellipse cx={310} cy={142} rx={18} ry={8} fill="#A16207" />
        <rect x={295} y={132} width={12} height={12} rx="3" fill="#A16207" />
        <rect x={298} y={124} width={6} height={10} rx="2" fill="#A16207" />
      </g>

      {/* Nile river */}
      <Water y={148} height={14} color="#2563EB" waveColor="#60A5FA" />

      {/* Palm trees along Nile */}
      <Tree x={290} y={145} height={52} leafColor="#16A34A" trunkColor="#78716C" type="palm" />
      <Tree x={330} y={147} height={45} leafColor="#15803D" trunkColor="#92400E" type="palm" />
      <Tree x={370} y={146} height={48} leafColor="#16A34A" trunkColor="#78716C" type="palm" />

      {/* Desert ground */}
      <DesertGround y={155} />

      {/* Obelisk */}
      <g aria-label="Obelisco">
        <rect x={215} y={118} width="6" height="32" fill="#A8A29E" />
        <polygon points="215,118 218,108 221,118" fill="#A8A29E" />
        {/* Hieroglyphs - decorative lines */}
        {[122, 127, 132, 137].map((hy, i) => (
          <line key={i} x1={217} y1={hy} x2={219} y2={hy} stroke="#78716C" strokeWidth="0.8" />
        ))}
      </g>

      {/* Characters */}
      {children && children.length > 0 ? (
        children.slice(0, 4).map((child, i) => (
          <Character
            key={child.child_id}
            x={120 + i * 40}
            y={125}
            emoji={child.avatar_emoji || '🏺'}
            color={child.avatar_color || '#EAB308'}
            scale={0.85}
            name={child.child_id}
          />
        ))
      ) : (
        <>
          <Character x={135} y={115} emoji="🏺" color="#EAB308" scale={0.9} />
          <Character x={180} y={118} emoji="📜" color="#FBBF24" scale={0.8} />
        </>
      )}
    </g>
  );
}
