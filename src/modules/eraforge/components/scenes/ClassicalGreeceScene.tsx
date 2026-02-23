/**
 * Classical Greece Scene — Columns/temple, olive trees, amphitheater, sea view
 */

import React from 'react';
import { Sun, Cloud, Tree, Water, Character } from './SvgPrimitives';
import type { SceneChildProps } from './types';

export function ClassicalGreeceScene({ children }: SceneChildProps) {
  return (
    <g>
      <defs>
        <linearGradient id="sky-greece" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#sky-greece)" />

      <Sun cx={340} cy={30} r={18} />
      <Cloud x={80} y={18} scale={0.7} speed={25} />
      <Cloud x={250} y={30} scale={0.5} speed={32} />

      {/* Sea background */}
      <Water y={130} height={50} color="#2563EB" waveColor="#60A5FA" />

      {/* Island/hill */}
      <ellipse cx={200} cy={130} rx={180} ry={40} fill="#86EFAC" />

      {/* Temple / Parthenon — enlarged */}
      <g aria-label="Templo">
        {/* Base */}
        <rect x={100} y={82} width={110} height={8} fill="#E7E5E4" rx="1" />
        <rect x={105} y={90} width={100} height={40} fill="#D6D3D1" />
        {/* Pediment */}
        <polygon points="96,82 155,56 214,82" fill="#E7E5E4" />
        {/* Columns */}
        {[110, 128, 146, 164, 182, 198].map((cx, i) => (
          <rect key={i} x={cx} y={82} width={6} height={48} fill="#F5F5F4" rx="2" />
        ))}
      </g>

      {/* Amphitheater */}
      <g aria-label="Anfiteatro" opacity="0.7">
        <path d="M280,128 Q310,105 340,128" fill="none" stroke="#A8A29E" strokeWidth="2" />
        <path d="M285,128 Q310,110 335,128" fill="none" stroke="#A8A29E" strokeWidth="1.5" />
        <path d="M290,128 Q310,115 330,128" fill="none" stroke="#A8A29E" strokeWidth="1" />
      </g>

      {/* Olive trees */}
      <Tree x={55} y={128} height={42} leafColor="#84CC16" type="round" />
      <Tree x={350} y={128} height={38} leafColor="#84CC16" type="round" />

      {/* Ground */}
      <rect x="0" y={130} width={400} height={50} fill="#22C55E" opacity="0.3" />

      {/* Characters */}
      {children && children.length > 0 ? (
        children.slice(0, 4).map((child, i) => (
          <Character
            key={child.child_id}
            x={140 + i * 35}
            y={108}
            emoji={child.avatar_emoji || '🏛️'}
            color={child.avatar_color || '#3B82F6'}
            scale={0.85}
            name={child.child_id}
          />
        ))
      ) : (
        <Character x={230} y={100} emoji="🏛️" color="#60A5FA" scale={0.9} />
      )}
    </g>
  );
}
