/**
 * Shared SVG Primitives for EraForge Scenes
 *
 * Reusable animated elements: sun, clouds, water, trees, fire, characters.
 * Toca Boca style: vibrant colors, simple shapes, big rounded elements.
 */

import React from 'react';

// ============================================
// SKY ELEMENTS
// ============================================

interface SunProps {
  cx?: number;
  cy?: number;
  r?: number;
  color?: string;
  rayColor?: string;
}

export function Sun({ cx = 340, cy = 35, r = 22, color = '#FBBF24', rayColor = '#FDE68A' }: SunProps) {
  const id = `sun-${cx}-${cy}`;
  return (
    <g aria-label="Sol">
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos((angle * Math.PI) / 180) * (r + 14)}
          y2={cy + Math.sin((angle * Math.PI) / 180) * (r + 14)}
          stroke={rayColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        >
          <animate
            attributeName="opacity"
            values="0.5;0.9;0.5"
            dur="3s"
            repeatCount="indefinite"
            begin={`${angle * 0.02}s`}
          />
        </line>
      ))}
      {/* Sun body */}
      <circle cx={cx} cy={cy} r={r} fill={color}>
        <animate attributeName="r" values={`${r};${r + 1.5};${r}`} dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Face */}
      <circle cx={cx - 6} cy={cy - 3} r="2.5" fill="#92400E" />
      <circle cx={cx + 6} cy={cy - 3} r="2.5" fill="#92400E" />
      <path
        d={`M${cx - 5} ${cy + 5} Q${cx} ${cy + 10} ${cx + 5} ${cy + 5}`}
        fill="none"
        stroke="#92400E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  );
}

interface MoonProps {
  cx?: number;
  cy?: number;
  r?: number;
}

export function Moon({ cx = 340, cy = 35, r = 18 }: MoonProps) {
  return (
    <g aria-label="Lua">
      <circle cx={cx} cy={cy} r={r} fill="#E5E7EB" />
      <circle cx={cx + 6} cy={cy - 4} r={r * 0.85} fill="#1E293B" />
      {/* Stars */}
      {[
        [cx - 50, cy - 10],
        [cx - 30, cy + 15],
        [cx + 30, cy - 5],
        [cx - 70, cy + 5],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#FDE68A">
          <animate
            attributeName="opacity"
            values="0.3;1;0.3"
            dur={`${2 + i * 0.5}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  );
}

interface CloudProps {
  x?: number;
  y?: number;
  scale?: number;
  speed?: number;
  color?: string;
}

export function Cloud({ x = 60, y = 25, scale = 1, speed = 25, color = 'white' }: CloudProps) {
  return (
    <g opacity="0.85" aria-label="Nuvem">
      <animateTransform
        attributeName="transform"
        type="translate"
        values={`0,0;${30 * scale},0;0,0`}
        dur={`${speed}s`}
        repeatCount="indefinite"
      />
      <ellipse cx={x} cy={y} rx={20 * scale} ry={10 * scale} fill={color} />
      <ellipse cx={x - 14 * scale} cy={y + 3 * scale} rx={14 * scale} ry={8 * scale} fill={color} />
      <ellipse cx={x + 16 * scale} cy={y + 2 * scale} rx={16 * scale} ry={9 * scale} fill={color} />
    </g>
  );
}

// ============================================
// NATURE ELEMENTS
// ============================================

interface TreeProps {
  x?: number;
  y?: number;
  height?: number;
  trunkColor?: string;
  leafColor?: string;
  type?: 'round' | 'pine' | 'palm';
}

export function Tree({ x = 50, y = 140, height = 40, trunkColor = '#92400E', leafColor = '#16A34A', type = 'round' }: TreeProps) {
  const swayId = `tree-sway-${x}-${y}`;
  return (
    <g aria-label="Arvore">
      <animateTransform
        attributeName="transform"
        type="rotate"
        values={`0 ${x} ${y};2 ${x} ${y};0 ${x} ${y};-2 ${x} ${y};0 ${x} ${y}`}
        dur="5s"
        repeatCount="indefinite"
      />
      {/* Trunk */}
      <rect
        x={x - 4}
        y={y - height * 0.5}
        width="8"
        height={height * 0.5}
        rx="3"
        fill={trunkColor}
      />
      {type === 'round' && (
        <>
          <circle cx={x} cy={y - height * 0.65} r={height * 0.35} fill={leafColor} />
          <circle cx={x - height * 0.2} cy={y - height * 0.5} r={height * 0.25} fill={leafColor} />
          <circle cx={x + height * 0.2} cy={y - height * 0.5} r={height * 0.25} fill={leafColor} />
        </>
      )}
      {type === 'pine' && (
        <>
          <polygon
            points={`${x},${y - height} ${x - height * 0.35},${y - height * 0.35} ${x + height * 0.35},${y - height * 0.35}`}
            fill={leafColor}
          />
          <polygon
            points={`${x},${y - height * 0.75} ${x - height * 0.4},${y - height * 0.15} ${x + height * 0.4},${y - height * 0.15}`}
            fill={leafColor}
            opacity="0.85"
          />
        </>
      )}
      {type === 'palm' && (
        <>
          {/* Palm fronds */}
          {[-35, -15, 15, 35].map((angle, i) => (
            <ellipse
              key={i}
              cx={x + Math.sin((angle * Math.PI) / 180) * height * 0.35}
              cy={y - height * 0.85 + Math.abs(angle) * 0.15}
              rx={height * 0.35}
              ry={height * 0.1}
              fill={leafColor}
              transform={`rotate(${angle} ${x} ${y - height * 0.7})`}
            />
          ))}
          {/* Coconuts */}
          <circle cx={x - 3} cy={y - height * 0.65} r="3" fill="#92400E" />
          <circle cx={x + 4} cy={y - height * 0.62} r="2.5" fill="#78716C" />
        </>
      )}
    </g>
  );
}

interface WaterProps {
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  waveColor?: string;
}

export function Water({ y = 145, width = 400, height = 35, color = '#3B82F6', waveColor = '#60A5FA' }: WaterProps) {
  return (
    <g aria-label="Agua">
      <rect x="0" y={y} width={width} height={height} fill={color} opacity="0.7" />
      {/* Animated waves */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${-20 + i * 140},${y + 5 + i * 6} Q${20 + i * 140},${y - 2 + i * 6} ${60 + i * 140},${y + 5 + i * 6} T${140 + i * 140},${y + 5 + i * 6}`}
          fill="none"
          stroke={waveColor}
          strokeWidth="2"
          opacity="0.5"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0,0;${15},0;0,0`}
            dur={`${3 + i}s`}
            repeatCount="indefinite"
          />
        </path>
      ))}
    </g>
  );
}

interface GrassProps {
  y?: number;
  width?: number;
  color?: string;
}

export function Grass({ y = 150, width = 400, color = '#22C55E' }: GrassProps) {
  return (
    <g aria-label="Grama">
      <rect x="0" y={y} width={width} height={30} fill={color} />
      {/* Grass blades */}
      {Array.from({ length: 12 }).map((_, i) => {
        const bx = 10 + i * (width / 12);
        return (
          <line
            key={i}
            x1={bx}
            y1={y}
            x2={bx + 3}
            y2={y - 6}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`0 ${bx} ${y};5 ${bx} ${y};0 ${bx} ${y};-5 ${bx} ${y};0 ${bx} ${y}`}
              dur={`${2 + (i % 3) * 0.5}s`}
              repeatCount="indefinite"
            />
          </line>
        );
      })}
    </g>
  );
}

// ============================================
// FIRE
// ============================================

interface FireProps {
  x?: number;
  y?: number;
  scale?: number;
}

export function Fire({ x = 200, y = 140, scale = 1 }: FireProps) {
  return (
    <g aria-label="Fogueira" transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Log base */}
      <ellipse cx="0" cy="5" rx="14" ry="4" fill="#78716C" />
      <rect x="-10" y="0" width="20" height="6" rx="3" fill="#92400E" transform="rotate(-15)" />
      <rect x="-8" y="1" width="18" height="5" rx="2" fill="#78716C" transform="rotate(12)" />
      {/* Flames */}
      <ellipse cx="0" cy="-8" rx="8" ry="14" fill="#F97316" opacity="0.9">
        <animate attributeName="ry" values="14;16;12;14" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.7;0.9" dur="0.4s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="-3" cy="-10" rx="5" ry="10" fill="#FBBF24" opacity="0.85">
        <animate attributeName="ry" values="10;12;8;10" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="2" cy="-12" rx="3" ry="7" fill="#FDE68A" opacity="0.8">
        <animate attributeName="ry" values="7;9;5;7" dur="0.35s" repeatCount="indefinite" />
      </ellipse>
      {/* Sparks */}
      {[[-6, -20], [4, -22], [0, -25]].map(([sx, sy], i) => (
        <circle key={i} cx={sx} cy={sy} r="1.5" fill="#FDE68A">
          <animate
            attributeName="cy"
            values={`${sy};${sy - 8};${sy}`}
            dur={`${0.8 + i * 0.3}s`}
            repeatCount="indefinite"
          />
          <animate attributeName="opacity" values="1;0;1" dur={`${0.8 + i * 0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

// ============================================
// CHARACTERS
// ============================================

interface CharacterProps {
  x?: number;
  y?: number;
  emoji?: string;
  color?: string;
  scale?: number;
  name?: string;
}

export function Character({ x = 100, y = 130, emoji = '👤', color = '#FBBF24', scale = 1, name }: CharacterProps) {
  return (
    <g
      aria-label={name ? `Personagem ${name}` : 'Personagem'}
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      {/* Bounce animation */}
      <animateTransform
        attributeName="transform"
        type="translate"
        values={`${x},${y};${x},${y - 3};${x},${y}`}
        dur="2s"
        repeatCount="indefinite"
        additive="replace"
      />
      <g transform={`scale(${scale})`}>
        {/* Body */}
        <ellipse cx="0" cy="6" rx="10" ry="12" fill={color} />
        {/* Head */}
        <circle cx="0" cy="-12" r="10" fill={color} />
        {/* Eyes */}
        <circle cx="-4" cy="-14" r="2.5" fill="white" />
        <circle cx="4" cy="-14" r="2.5" fill="white" />
        <circle cx="-3.5" cy="-14" r="1.2" fill="#1E293B" />
        <circle cx="4.5" cy="-14" r="1.2" fill="#1E293B" />
        {/* Smile */}
        <path
          d="M-3,-9 Q0,-6 3,-9"
          fill="none"
          stroke="#1E293B"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Emoji badge */}
        <text x="0" y="-24" textAnchor="middle" fontSize="12">{emoji}</text>
        {/* Arms */}
        <line x1="-10" y1="0" x2="-16" y2="8" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <line x1="10" y1="0" x2="16" y2="8" stroke={color} strokeWidth="4" strokeLinecap="round" />
        {/* Legs */}
        <line x1="-5" y1="16" x2="-7" y2="24" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <line x1="5" y1="16" x2="7" y2="24" stroke={color} strokeWidth="4" strokeLinecap="round" />
        {/* Feet */}
        <ellipse cx="-8" cy="25" rx="5" ry="2.5" fill={color} opacity="0.8" />
        <ellipse cx="8" cy="25" rx="5" ry="2.5" fill={color} opacity="0.8" />
      </g>
    </g>
  );
}

// ============================================
// BUILDINGS
// ============================================

interface MountainProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  snowColor?: string;
}

export function Mountain({ x = 200, y = 150, width = 120, height = 80, color = '#78716C', snowColor = '#E5E7EB' }: MountainProps) {
  return (
    <g aria-label="Montanha">
      <polygon
        points={`${x - width / 2},${y} ${x},${y - height} ${x + width / 2},${y}`}
        fill={color}
      />
      {/* Snow cap */}
      <polygon
        points={`${x - width * 0.12},${y - height * 0.7} ${x},${y - height} ${x + width * 0.12},${y - height * 0.7}`}
        fill={snowColor}
      />
    </g>
  );
}

interface PyramidProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  shadowColor?: string;
}

export function Pyramid({ x = 200, y = 150, width = 80, height = 60, color = '#D97706', shadowColor = '#92400E' }: PyramidProps) {
  return (
    <g aria-label="Piramide">
      {/* Main face */}
      <polygon
        points={`${x - width / 2},${y} ${x},${y - height} ${x + width / 2},${y}`}
        fill={color}
      />
      {/* Shadow side */}
      <polygon
        points={`${x},${y - height} ${x + width / 2},${y} ${x},${y}`}
        fill={shadowColor}
        opacity="0.5"
      />
      {/* Lines for blocks */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const ly = y - height * (1 - t);
        const lw = (width / 2) * t;
        return (
          <line
            key={i}
            x1={x - lw}
            y1={ly}
            x2={x + lw}
            y2={ly}
            stroke={shadowColor}
            strokeWidth="0.5"
            opacity="0.3"
          />
        );
      })}
    </g>
  );
}

interface CastleProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  roofColor?: string;
}

export function Castle({ x = 200, y = 150, width = 80, height = 70, color = '#A8A29E', roofColor = '#991B1B' }: CastleProps) {
  const wallLeft = x - width / 2;
  const wallTop = y - height;
  const towerW = width * 0.2;
  const battlementH = height * 0.12;

  return (
    <g aria-label="Castelo">
      {/* Main wall */}
      <rect x={wallLeft} y={wallTop} width={width} height={height} fill={color} rx="2" />
      {/* Battlements */}
      {Array.from({ length: 5 }).map((_, i) => (
        <rect
          key={i}
          x={wallLeft + i * (width / 5)}
          y={wallTop - battlementH}
          width={width / 7}
          height={battlementH}
          fill={color}
        />
      ))}
      {/* Left tower */}
      <rect x={wallLeft - towerW * 0.3} y={wallTop - height * 0.3} width={towerW} height={height * 1.3} fill={color} />
      <polygon
        points={`${wallLeft - towerW * 0.3 - 3},${wallTop - height * 0.3} ${wallLeft - towerW * 0.3 + towerW / 2},${wallTop - height * 0.55} ${wallLeft - towerW * 0.3 + towerW + 3},${wallTop - height * 0.3}`}
        fill={roofColor}
      />
      {/* Right tower */}
      <rect x={x + width / 2 - towerW * 0.7} y={wallTop - height * 0.3} width={towerW} height={height * 1.3} fill={color} />
      <polygon
        points={`${x + width / 2 - towerW * 0.7 - 3},${wallTop - height * 0.3} ${x + width / 2 - towerW * 0.7 + towerW / 2},${wallTop - height * 0.55} ${x + width / 2 - towerW * 0.7 + towerW + 3},${wallTop - height * 0.3}`}
        fill={roofColor}
      />
      {/* Gate */}
      <path
        d={`M${x - 8},${y} L${x - 8},${y - height * 0.35} A8,10 0 0,1 ${x + 8},${y - height * 0.35} L${x + 8},${y}`}
        fill="#44403C"
      />
      {/* Window */}
      <rect x={x - 3} y={wallTop + height * 0.15} width="6" height="8" rx="3" fill="#44403C" />
      {/* Flag */}
      <line x1={x} y1={wallTop - height * 0.55} x2={x} y2={wallTop - height * 0.85} stroke="#44403C" strokeWidth="1.5" />
      <polygon
        points={`${x},${wallTop - height * 0.85} ${x + 12},${wallTop - height * 0.78} ${x},${wallTop - height * 0.7}`}
        fill={roofColor}
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`0 ${x} ${wallTop - height * 0.78};2 ${x} ${wallTop - height * 0.78};0 ${x} ${wallTop - height * 0.78};-1 ${x} ${wallTop - height * 0.78};0 ${x} ${wallTop - height * 0.78}`}
          dur="3s"
          repeatCount="indefinite"
        />
      </polygon>
    </g>
  );
}

// ============================================
// PARTICLES / EFFECTS
// ============================================

interface SmokeProps {
  x?: number;
  y?: number;
  count?: number;
}

export function Smoke({ x = 200, y = 80, count = 4 }: SmokeProps) {
  return (
    <g aria-label="Fumaca" opacity="0.4">
      {Array.from({ length: count }).map((_, i) => (
        <circle
          key={i}
          cx={x + (i - count / 2) * 6}
          cy={y}
          r={4 + i * 1.5}
          fill="#9CA3AF"
        >
          <animate
            attributeName="cy"
            values={`${y};${y - 20 - i * 5};${y}`}
            dur={`${2.5 + i * 0.5}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.4;0;0.4"
            dur={`${2.5 + i * 0.5}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values={`${4 + i * 1.5};${8 + i * 2};${4 + i * 1.5}`}
            dur={`${2.5 + i * 0.5}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  );
}

// ============================================
// GROUND VARIANTS
// ============================================

interface DesertGroundProps {
  y?: number;
  width?: number;
}

export function DesertGround({ y = 145, width = 400 }: DesertGroundProps) {
  return (
    <g aria-label="Deserto">
      <rect x="0" y={y} width={width} height={35} fill="#D97706" />
      {/* Sand dunes */}
      <ellipse cx={80} cy={y + 2} rx={60} ry={6} fill="#FBBF24" opacity="0.4" />
      <ellipse cx={250} cy={y + 4} rx={70} ry={5} fill="#FBBF24" opacity="0.3" />
      <ellipse cx={370} cy={y + 3} rx={40} ry={4} fill="#FBBF24" opacity="0.35" />
    </g>
  );
}

interface StoneGroundProps {
  y?: number;
  width?: number;
}

export function StoneGround({ y = 150, width = 400 }: StoneGroundProps) {
  return (
    <g aria-label="Chao de pedra">
      <rect x="0" y={y} width={width} height={30} fill="#78716C" />
      {/* Rocks */}
      {[30, 90, 160, 250, 330].map((rx, i) => (
        <ellipse
          key={i}
          cx={rx}
          cy={y + 4}
          rx={8 + (i % 3) * 3}
          ry={3 + (i % 2) * 2}
          fill="#A8A29E"
          opacity="0.6"
        />
      ))}
    </g>
  );
}
