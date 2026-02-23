/**
 * Medieval Scene — Castle, village, fields, forest edge, bridge
 * Toca Boca style: vibrant, flat, cartoonish
 */

import React from 'react';
import { Sun, Cloud, Castle, Tree, Grass, Water, Character } from './SvgPrimitives';
import type { SceneChildProps } from './types';

export function MedievalScene({ children, isAnimating }: SceneChildProps) {
  return (
    <g>
      {/* Sky */}
      <defs>
        <linearGradient id="sky-medieval" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#sky-medieval)" />

      {/* Sun */}
      <Sun cx={350} cy={28} r={16} />

      {/* Clouds */}
      <Cloud x={60} y={15} scale={0.9} speed={22} />
      <Cloud x={200} y={30} scale={0.6} speed={30} />
      <Cloud x={310} y={20} scale={0.7} speed={26} />

      {/* Hills background */}
      <ellipse cx={60} cy={140} rx={80} ry={25} fill="#86EFAC" opacity="0.6" />
      <ellipse cx={200} cy={135} rx={100} ry={30} fill="#4ADE80" opacity="0.5" />
      <ellipse cx={350} cy={138} rx={70} ry={22} fill="#86EFAC" opacity="0.6" />

      {/* Castle — enlarged */}
      <Castle x={70} y={138} width={90} height={75} color="#A8A29E" roofColor="#991B1B" />

      {/* Forest edge */}
      <Tree x={170} y={140} height={50} leafColor="#15803D" type="pine" />
      <Tree x={195} y={142} height={45} leafColor="#16A34A" type="round" />
      <Tree x={215} y={140} height={52} leafColor="#15803D" type="pine" />

      {/* Village houses */}
      <g aria-label="Vila">
        {/* House 1 */}
        <rect x={255} y={118} width={28} height={22} fill="#D6D3D1" rx="2" />
        <polygon points="252,118 269,102 286,118" fill="#92400E" />
        <rect x={264} y={126} width={8} height={14} fill="#78716C" rx="1" />
        <rect x={257} y={122} width={6} height={6} fill="#93C5FD" rx="1" />
        {/* Chimney + smoke */}
        <rect x={275} y={105} width="5" height="13" fill="#78716C" />
        <circle cx={277} cy={100} r="3" fill="#D6D3D1" opacity="0.5">
          <animate attributeName="cy" values="100;88;100" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={279} cy={96} r="2.5" fill="#D6D3D1" opacity="0.4">
          <animate attributeName="cy" values="96;82;96" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="3.5s" repeatCount="indefinite" />
        </circle>

        {/* House 2 */}
        <rect x={300} y={122} width={24} height={18} fill="#E7E5E4" rx="2" />
        <polygon points="298,122 312,110 326,122" fill="#78716C" />
        <rect x={308} y={128} width={7} height={12} fill="#57534E" rx="1" />
      </g>

      {/* Bridge over stream */}
      <g aria-label="Ponte">
        <path
          d="M230,152 Q245,142 260,152"
          fill="none"
          stroke="#A8A29E"
          strokeWidth="4"
        />
        <line x1={235} y1={152} x2={235} y2={145} stroke="#A8A29E" strokeWidth="2" />
        <line x1={255} y1={152} x2={255} y2={145} stroke="#A8A29E" strokeWidth="2" />
      </g>

      {/* Stream */}
      <Water y={152} height={10} color="#3B82F6" waveColor="#93C5FD" />

      {/* Fields */}
      <g aria-label="Campos" opacity="0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={i}
            x1={340 + i * 8}
            y1={135}
            x2={340 + i * 8}
            y2={150}
            stroke="#A16207"
            strokeWidth="1.5"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`0 ${340 + i * 8} 150;3 ${340 + i * 8} 150;0 ${340 + i * 8} 150;-3 ${340 + i * 8} 150;0 ${340 + i * 8} 150`}
              dur={`${2 + (i % 3) * 0.3}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}
      </g>

      {/* Ground */}
      <Grass y={150} color="#22C55E" />

      {/* Characters */}
      {children && children.length > 0 ? (
        children.slice(0, 4).map((child, i) => (
          <Character
            key={child.child_id}
            x={140 + i * 40}
            y={125}
            emoji={child.avatar_emoji || '🏰'}
            color={child.avatar_color || '#A8A29E'}
            scale={0.85}
            name={child.child_id}
          />
        ))
      ) : (
        <>
          <Character x={145} y={115} emoji="🏰" color="#A8A29E" scale={0.9} />
          <Character x={240} y={118} emoji="⚔️" color="#D6D3D1" scale={0.8} />
        </>
      )}
    </g>
  );
}
