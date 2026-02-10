/**
 * EmotionTrendChart Component
 * SVG sparkline showing emotional trend across weeks (Issue #208)
 * Follows EfficiencyTrendChart pattern — no external charting lib
 */

import React from 'react'
import type { EmotionTrendPoint } from '../../hooks/useJourneyPatterns'

const TREND_VALUES: Record<string, number> = {
  ascending: 4,
  stable: 3,
  neutral: 2,
  descending: 1,
  volatile: 2.5,
}

const TREND_COLORS: Record<string, string> = {
  ascending: '#10b981',
  stable: '#3b82f6',
  neutral: '#9ca3af',
  descending: '#f97316',
  volatile: '#a855f7',
}

const TREND_LABELS: Record<string, string> = {
  ascending: 'Ascendente',
  stable: 'Estável',
  neutral: 'Neutro',
  descending: 'Descendente',
  volatile: 'Volátil',
}

interface EmotionTrendChartProps {
  data: EmotionTrendPoint[]
}

export function EmotionTrendChart({ data }: EmotionTrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="ceramic-tile p-4">
        <h4 className="text-sm font-semibold text-[#5C554B] mb-3">Tendencia Emocional</h4>
        <p className="text-xs text-[#948D82] text-center py-3">
          {data.length === 0
            ? 'Seus resumos semanais alimentam este grafico. O primeiro sera gerado ao final da semana.'
            : 'Uma semana a mais de dados e este grafico ganha vida.'}
        </p>
      </div>
    )
  }

  const width = 320
  const height = 120
  const padding = { top: 16, right: 16, bottom: 24, left: 16 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const minVal = 0.5
  const maxVal = 4.5
  const yRange = maxVal - minVal

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
    const val = TREND_VALUES[d.trend] ?? 2
    const y = padding.top + chartH - ((val - minVal) / yRange) * chartH
    return { x, y, trend: d.trend, week: d.weekNumber, emotions: d.dominantEmotions }
  })

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Gradient fill area
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  return (
    <div className="ceramic-tile p-4">
      <h4 className="text-sm font-semibold text-[#5C554B] mb-3">Tendência Emocional</h4>
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Gradient definition */}
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[1, 2, 3, 4].map((val) => {
          const y = padding.top + chartH - ((val - minVal) / yRange) * chartH
          return (
            <line
              key={val}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartW}
              y2={y}
              stroke="#E0DDD5"
              strokeDasharray="4"
            />
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#trendGradient)" />

        {/* Line */}
        <path d={pathData} stroke="#D97706" strokeWidth="2" fill="none" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={TREND_COLORS[p.trend] || '#9ca3af'}
            stroke="#fff"
            strokeWidth="1.5"
          />
        ))}

        {/* Week labels */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            className="text-[9px]"
            fill="#948D82"
          >
            S{p.week}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(TREND_COLORS).filter(([k]) => k !== 'neutral').map(([key, color]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-[#948D82] capitalize">{TREND_LABELS[key] ?? key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
