/**
 * EF_StatsBar - Animated child stats progress bars
 *
 * Shows 3 progress bars for knowledge, cooperation, and courage
 * with Framer Motion spring animations on bar width and number pop.
 */

import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface EF_StatsBarProps {
  knowledge: number;
  cooperation: number;
  courage: number;
  max?: number;
}

const STATS_CONFIG = [
  { key: 'knowledge',   label: 'Conhecimento', emoji: '📚', color: 'bg-ceramic-info' },
  { key: 'cooperation', label: 'Cooperacao',   emoji: '🤝', color: 'bg-ceramic-success' },
  { key: 'courage',     label: 'Coragem',      emoji: '⚔️', color: 'bg-ceramic-warning' },
] as const;

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 300, damping: 30 });
  const display = useTransform(spring, (v) => Math.round(v));
  const prevRef = useRef(value);
  const isChanging = prevRef.current !== value;

  useEffect(() => {
    spring.set(value);
    prevRef.current = value;
  }, [value, spring]);

  return (
    <motion.span
      className="text-xs text-ceramic-text-secondary w-6 text-right font-medium tabular-nums"
      animate={isChanging ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {display}
    </motion.span>
  );
}

export function EF_StatsBar({ knowledge, cooperation, courage, max = 100 }: EF_StatsBarProps) {
  const values: Record<string, number> = {
    knowledge: knowledge ?? 0,
    cooperation: cooperation ?? 0,
    courage: courage ?? 0,
  };

  return (
    <div className="flex-1 space-y-1.5">
      {STATS_CONFIG.map(stat => {
        const value = values[stat.key];
        const pct = Math.min(100, Math.max(0, (value / max) * 100));

        return (
          <div key={stat.key} className="flex items-center gap-2">
            <span className="text-xs w-4 text-center">{stat.emoji}</span>
            <div className="flex-1 h-2 bg-ceramic-cool shadow-ceramic-inset rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${stat.color}`}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>
            <AnimatedNumber value={value} />
          </div>
        );
      })}
    </div>
  );
}
