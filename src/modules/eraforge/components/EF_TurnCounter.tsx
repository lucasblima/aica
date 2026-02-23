/**
 * EF_TurnCounter - SVG progress ring turn counter
 *
 * Shows remaining turns as an animated SVG ring with Framer Motion.
 * Pulses when turns are low (<= 2).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { springElevation, pulseVariants } from '@/lib/animations/ceramic-motion';

interface EF_TurnCounterProps {
  turnsRemaining: number;
  maxTurns?: number;
}

const RING_SIZE = 48;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function EF_TurnCounter({ turnsRemaining, maxTurns = 10 }: EF_TurnCounterProps) {
  const pct = Math.min(1, turnsRemaining / maxTurns);
  const offset = CIRCUMFERENCE * (1 - pct);
  const isLow = turnsRemaining <= 2;

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      variants={isLow ? pulseVariants : undefined}
      initial="initial"
      animate={isLow ? 'pulse' : 'initial'}
    >
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        {/* Background ring */}
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            className="text-ceramic-border"
          />
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: offset }}
            transition={springElevation}
            className={isLow ? 'text-ceramic-error' : 'text-amber-500'}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-lg font-bold font-fredoka ${isLow ? 'text-ceramic-error' : 'text-ceramic-text-primary'}`}
          >
            {turnsRemaining}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-ceramic-text-secondary font-medium">
        turnos
      </span>
    </motion.div>
  );
}
