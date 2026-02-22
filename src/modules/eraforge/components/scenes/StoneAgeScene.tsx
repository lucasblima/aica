/**
 * Stone Age Scene — Cave, campfire, river, trees, mountains
 * Toca Boca style: vibrant, flat, cartoonish
 */

import React from 'react';
import { Sun, Cloud, Mountain, Tree, Fire, Water, StoneGround, Character } from './SvgPrimitives';
import type { SceneChildProps } from './types';

export function StoneAgeScene({ children, isAnimating }: SceneChildProps) {
  return (
    <g>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky-stone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="60%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#sky-stone)" />

      {/* Background mountains */}
      <Mountain x={60} y={150} width={100} height={70} color="#A8A29E" snowColor="#D6D3D1" />
      <Mountain x={160} y={150} width={130} height={90} color="#78716C" snowColor="#E7E5E4" />
      <Mountain x={320} y={150} width={90} height={55} color="#A8A29E" snowColor="#D6D3D1" />

      {/* Sun */}
      <Sun cx={350} cy={30} r={18} />

      {/* Clouds */}
      <Cloud x={70} y={20} scale={0.8} speed={20} />
      <Cloud x={220} y={35} scale={0.6} speed={28} />

      {/* Cave */}
      <g aria-label="Caverna">
        <path
          d="M10,150 Q10,85 50,80 Q90,75 120,90 Q140,100 140,150"
          fill="#57534E"
        />
        <path
          d="M25,150 Q25,100 55,95 Q85,90 110,100 Q125,110 125,150"
          fill="#292524"
        />
        {/* Cave mouth shine */}
        <ellipse cx={75} cy={130} rx={20} ry={4} fill="#44403C" opacity="0.5" />
      </g>

      {/* Trees */}
      <Tree x={200} y={148} height={45} leafColor="#15803D" type="round" />
      <Tree x={270} y={150} height={35} leafColor="#16A34A" type="pine" />
      <Tree x={340} y={148} height={40} leafColor="#15803D" type="round" />

      {/* Campfire */}
      <Fire x={175} y={142} scale={0.9} />

      {/* Ground */}
      <StoneGround y={150} />

      {/* River at bottom */}
      <Water y={160} height={20} color="#2563EB" waveColor="#60A5FA" />

      {/* Characters */}
      {children && children.length > 0 ? (
        children.slice(0, 4).map((child, i) => (
          <Character
            key={child.child_id}
            x={100 + i * 50}
            y={125}
            emoji={child.avatar_emoji || '🦴'}
            color={child.avatar_color || '#FBBF24'}
            scale={0.7}
            name={child.child_id}
          />
        ))
      ) : (
        <>
          <Character x={110} y={125} emoji="🦴" color="#FBBF24" scale={0.65} />
          <Character x={155} y={128} emoji="🪨" color="#F97316" scale={0.55} />
        </>
      )}
    </g>
  );
}
