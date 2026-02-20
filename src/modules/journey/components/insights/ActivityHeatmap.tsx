/**
 * ActivityHeatmap Component
 * GitHub-style contribution grid for journey activity (Issue #208)
 * 7 rows (days of week) x 13 columns (weeks)
 */

import React, { useMemo } from 'react'
import type { ActivityDay } from '../../hooks/useJourneyPatterns'

interface ActivityHeatmapProps {
  data: ActivityDay[]
  days?: number
}

const DAY_LABELS = ['Seg', '', 'Qua', '', 'Sex', '', 'Dom']

function getIntensityColor(count: number, maxCount: number): string {
  if (count === 0) return '#E0DDD5'
  const ratio = count / Math.max(maxCount, 1)
  if (ratio > 0.75) return '#92400e' // amber-800
  if (ratio > 0.5) return '#b45309'  // amber-700
  if (ratio > 0.25) return '#d97706' // amber-600
  return '#fbbf24'                    // amber-400
}

export function ActivityHeatmap({ data, days = 90 }: ActivityHeatmapProps) {
  const { grid, maxCount, totalMoments, activeDays } = useMemo(() => {
    // Build lookup map
    const lookup: Record<string, number> = {}
    let max = 0
    let total = 0
    let active = 0
    for (const d of data) {
      lookup[d.date] = d.count
      if (d.count > max) max = d.count
      total += d.count
      if (d.count > 0) active++
    }

    // Generate grid: 13 weeks x 7 days, starting from today going back
    const today = new Date()
    const weeks = Math.ceil(days / 7)
    const cells: { date: string; count: number; col: number; row: number }[] = []

    // Fill grid backwards: iterate from last week (w = weeks-1) to first (w = 0).
    // For each week, iterate from Monday (d = 0) to Sunday (d = 6).
    // The offset (6 - d) places Sunday closest to today.
    for (let w = weeks - 1; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(today)
        date.setDate(today.getDate() - (w * 7 + (6 - d)))
        const dateStr = date.toISOString().split('T')[0]
        cells.push({
          date: dateStr,
          count: lookup[dateStr] || 0,
          col: weeks - 1 - w,
          row: d,
        })
      }
    }

    return { grid: cells, maxCount: max, totalMoments: total, activeDays: active }
  }, [data, days])

  const weeks = Math.ceil(days / 7)
  const cellSize = 14
  const gap = 2
  const labelWidth = 28
  const svgW = labelWidth + weeks * (cellSize + gap)
  const svgH = 7 * (cellSize + gap)

  return (
    <div className="ceramic-tile p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[#5C554B]">Atividade</h4>
        <span className="text-xs text-[#948D82]">
          {totalMoments === 0
            ? `Ultimos ${days} dias`
            : `${totalMoments} momentos em ${activeDays} dias`}
        </span>
      </div>

      <svg width={svgW} height={svgH} className="w-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
        {/* Day labels */}
        {DAY_LABELS.map((label, i) => (
          label ? (
            <text
              key={`day-${i}`}
              x={0}
              y={i * (cellSize + gap) + cellSize - 2}
              className="text-[11px]"
              fill="#948D82"
            >
              {label}
            </text>
          ) : null
        ))}

        {/* Cells */}
        {grid.map((cell, i) => (
          <rect
            key={i}
            x={labelWidth + cell.col * (cellSize + gap)}
            y={cell.row * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={getIntensityColor(cell.count, maxCount)}
          >
            <title>{cell.date}: {cell.count} momento{cell.count !== 1 ? 's' : ''}</title>
          </rect>
        ))}
      </svg>

      {/* Intensity legend */}
      <div className="flex items-center gap-1 mt-3 justify-end">
        <span className="text-xs text-[#948D82] mr-1">Menos</span>
        {['#E0DDD5', '#fbbf24', '#d97706', '#b45309', '#92400e'].map((color, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span className="text-xs text-[#948D82] ml-1">Mais</span>
      </div>
    </div>
  )
}
