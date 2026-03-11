/**
 * WeeklyBlocks — Week-at-a-glance workout overview
 *
 * Displays a horizontal row of day blocks, each showing modality and color.
 * Clicking a block expands it to show exercises inline.
 * Designed to match the landing page FluxDemo style.
 *
 * Used by: Flux AthleteDetailView ("Semana Atual" section)
 */

import React, { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface WeeklyExercise {
  name: string;
  sets: number;
  reps: string;
}

export interface WeeklyDay {
  /** Short day abbreviation: 'seg', 'ter', etc. */
  day: string;
  /** Full day name in Portuguese: 'Segunda', 'Terca', etc. */
  label: string;
  /** Workout modality label: 'Forca', 'Cardio', 'Mobilidade', etc. */
  modality: string;
  /** Hex color for this modality/day block */
  color: string;
  /** List of exercises for this day */
  exercises: WeeklyExercise[];
}

export interface WeeklyBlocksProps {
  days: WeeklyDay[];
  /** If true, all days start expanded. Default: false */
  expandedByDefault?: boolean;
  /** Optional title override. Default: "Semana Atual" */
  title?: string;
  className?: string;
}

// ============================================================================
// COLOR MAP — hex → Tailwind classes (Ceramic-friendly)
// ============================================================================

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  '#ef4444': { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-400' },
  '#3b82f6': { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-400' },
  '#f59e0b': { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-400' },
  '#8b5cf6': { bg: 'bg-purple-100',  text: 'text-purple-700',  ring: 'ring-purple-400' },
  '#10b981': { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  '#6b7280': { bg: 'bg-ceramic-cool',    text: 'text-ceramic-text-secondary',    ring: 'ring-ceramic-border' },
  '#06b6d4': { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-400' },
  '#f97316': { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-400' },
  '#84cc16': { bg: 'bg-lime-100',    text: 'text-lime-700',    ring: 'ring-lime-400' },
  '#ec4899': { bg: 'bg-pink-100',    text: 'text-pink-700',    ring: 'ring-pink-400' },
};

const DEFAULT_COLORS = { bg: 'bg-ceramic-cool', text: 'text-ceramic-text-secondary', ring: 'ring-ceramic-border' };

function getColorClasses(hex: string) {
  return COLOR_MAP[hex.toLowerCase()] ?? DEFAULT_COLORS;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WeeklyBlocks({
  days,
  expandedByDefault = false,
  title = 'Semana Atual',
  className = '',
}: WeeklyBlocksProps) {
  // Track which days are expanded. Start all expanded if expandedByDefault.
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    () => new Set(expandedByDefault ? days.map((_, i) => i) : [])
  );

  const toggleDay = (idx: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  if (days.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Section header */}
      {title && (
        <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
          {title}
        </h3>
      )}

      {/* Day blocks row */}
      <div className="flex flex-wrap gap-1.5 pb-1">
        {days.map((block, idx) => {
          const { bg, text, ring } = getColorClasses(block.color);
          const isExpanded = expandedDays.has(idx);
          return (
            <button
              key={`${block.day}-${idx}`}
              type="button"
              onClick={() => toggleDay(idx)}
              className={`rounded-xl p-3 min-w-[80px] flex-shrink-0 transition-all cursor-pointer ${bg} ${
                isExpanded
                  ? `ring-2 ${ring} scale-[1.03]`
                  : 'hover:scale-[1.02] hover:brightness-95'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase ${text}`}>
                {block.day}
              </p>
              <p className={`text-xs font-medium mt-1 ${text}`}>
                {block.modality}
              </p>
              {block.exercises.length > 0 && (
                <p className={`text-[9px] mt-1 opacity-60 ${text}`}>
                  {block.exercises.length} ex.
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded exercise details */}
      {days.map((block, idx) => {
        if (!expandedDays.has(idx) || block.exercises.length === 0) return null;
        const { bg: headerBg, text } = getColorClasses(block.color);
        return (
          <div
            key={`detail-${block.day}-${idx}`}
            className="rounded-xl overflow-hidden border border-ceramic-text-secondary/10"
          >
            {/* Day header */}
            <div className={`px-3 py-2 ${headerBg}`}>
              <p className={`text-sm font-semibold ${text}`}>
                {block.label} — {block.modality}
              </p>
            </div>
            {/* Exercise list */}
            <div className="bg-white/60 divide-y divide-ceramic-text-secondary/5">
              {block.exercises.map((ex, exIdx) => (
                <div
                  key={`${ex.name}-${exIdx}`}
                  className="flex items-center justify-between px-3 py-2 text-xs min-w-0"
                >
                  <span className="text-ceramic-text-primary truncate min-w-0">{ex.name}</span>
                  <span className="text-ceramic-text-secondary shrink-0 ml-2 font-medium">
                    {ex.sets}x{ex.reps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WeeklyBlocks;
