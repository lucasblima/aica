/**
 * EmotionTrendChart Component
 * SVG sparkline showing emotional trend across weeks (Issue #208)
 * Follows EfficiencyTrendChart pattern — no external charting lib
 * Enhanced: smooth bezier curves, dynamic gradient, animated path, responsive
 */

import React, { useId, useMemo } from 'react'
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
  volatile: '#8B5CF6',
}

const TREND_LABELS: Record<string, string> = {
  ascending: 'Ascendente',
  stable: 'Estavel',
  neutral: 'Neutro',
  descending: 'Descendente',
  volatile: 'Volatil',
}

/** Gradient base colors per trend */
const TREND_GRADIENT_COLORS: Record<string, string> = {
  ascending: '#10b981',
  stable: '#3b82f6',
  neutral: '#9ca3af',
  descending: '#f97316',
  volatile: '#8B5CF6',
}

interface Point {
  x: number
  y: number
  trend: string
  week: number
  emotions: string[]
}

/**
 * Convert a sequence of points to a smooth SVG cubic bezier path
 * using Catmull-Rom to Bezier conversion
 */
function smoothPath(points: Point[], tension = 0.3): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    // Catmull-Rom to cubic bezier control points
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return d
}

/** Build the closed area path from a smooth line path */
function smoothAreaPath(
  points: Point[],
  tension: number,
  bottomY: number
): string {
  const linePath = smoothPath(points, tension)
  if (!linePath) return ''
  const lastPt = points[points.length - 1]
  const firstPt = points[0]
  return `${linePath} L ${lastPt.x} ${bottomY} L ${firstPt.x} ${bottomY} Z`
}

/* keyframes injected once via <style> in the SVG */
const ANIM_STYLE = `
@keyframes drawLine {
  from { stroke-dashoffset: var(--path-length); }
  to   { stroke-dashoffset: 0; }
}
@keyframes fadeInArea {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes popIn {
  0%   { r: 0; opacity: 0; }
  60%  { r: 6; opacity: 1; }
  100% { r: 5; opacity: 1; }
}
`

interface EmotionTrendChartProps {
  data: EmotionTrendPoint[]
}

export function EmotionTrendChart({ data }: EmotionTrendChartProps) {
  const uid = useId().replace(/:/g, '')

  const width = 400
  const height = 160
  const padding = { top: 20, right: 20, bottom: 28, left: 20 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const minVal = 0.5
  const maxVal = 4.5
  const yRange = maxVal - minVal

  const points: Point[] = useMemo(
    () =>
      data.map((d, i) => {
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
        const val = TREND_VALUES[d.trend] ?? 2
        const y = padding.top + chartH - ((val - minVal) / yRange) * chartH
        return { x, y, trend: d.trend, week: d.weekNumber, emotions: d.dominantEmotions }
      }),
    [data, chartW, chartH]
  )

  // Estimate path length for stroke-dasharray animation
  const estimatedLength = useMemo(() => {
    let len = 0
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      len += Math.sqrt(dx * dx + dy * dy)
    }
    return Math.ceil(len * 1.4) // extra for curves
  }, [points])

  if (data.length < 2) {
    return (
      <div className="ceramic-tile p-4">
        <h4 className="text-sm font-semibold text-[#5C554B] mb-3">Tendencia Emocional</h4>
        <div className="flex flex-col items-center py-4 gap-2">
          {/* Placeholder dashed sparkline */}
          <svg
            viewBox="0 0 200 60"
            className="w-full max-w-[200px] h-auto opacity-30"
            aria-hidden="true"
          >
            <path
              d="M 10 40 Q 50 10, 100 30 T 190 20"
              fill="none"
              stroke="#C4BFB6"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <circle cx="10" cy="40" r="3" fill="#C4BFB6" />
            <circle cx="100" cy="30" r="3" fill="#C4BFB6" />
            <circle cx="190" cy="20" r="3" fill="#C4BFB6" />
          </svg>
          <p className="text-xs text-[#948D82] text-center max-w-[260px]">
            {data.length === 0
              ? 'Seus resumos semanais alimentam este grafico. O primeiro sera gerado ao final da semana.'
              : 'Uma semana a mais de dados e este grafico ganha vida.'}
          </p>
        </div>
      </div>
    )
  }

  // Determine gradient color from the last data point's trend
  const lastTrend = points[points.length - 1].trend
  const gradientColor = TREND_GRADIENT_COLORS[lastTrend] ?? '#9ca3af'
  const lineColor = TREND_COLORS[lastTrend] ?? '#9ca3af'

  const tension = 0.3
  const linePath = smoothPath(points, tension)
  const areaPath = smoothAreaPath(points, tension, padding.top + chartH)

  const gradId = `trendGrad-${uid}`
  const areaGradId = `areaGrad-${uid}`

  return (
    <div className="ceramic-tile p-4">
      <h4 className="text-sm font-semibold text-[#5C554B] mb-3">Tendencia Emocional</h4>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Grafico de tendencia emocional semanal"
      >
        <style>{ANIM_STYLE}</style>

        <defs>
          {/* Dynamic line gradient */}
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={gradientColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={gradientColor} stopOpacity="1" />
          </linearGradient>

          {/* Dynamic area fill gradient */}
          <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={gradientColor} stopOpacity="0.02" />
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

        {/* Animated area fill */}
        <path
          d={areaPath}
          fill={`url(#${areaGradId})`}
          style={{ animation: 'fadeInArea 0.8s ease-out forwards' }}
        />

        {/* Animated smooth line */}
        <path
          d={linePath}
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: estimatedLength,
            strokeDashoffset: estimatedLength,
            animation: `drawLine 1.2s ease-out forwards`,
            ['--path-length' as string]: estimatedLength,
          } as React.CSSProperties}
        />

        {/* Data points with outer glow ring */}
        {points.map((p, i) => {
          const color = TREND_COLORS[p.trend] || '#9ca3af'
          const delay = `${0.3 + i * 0.1}s`
          return (
            <g key={i}>
              {/* Outer transparent ring */}
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill={color}
                fillOpacity="0.1"
                style={{
                  opacity: 0,
                  animation: `fadeInArea 0.4s ease-out ${delay} forwards`,
                }}
              />
              {/* Main data point */}
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
                style={{
                  r: 0,
                  opacity: 0,
                  animation: `popIn 0.5s ease-out ${delay} forwards`,
                } as React.CSSProperties}
              />
            </g>
          )
        })}

        {/* Week labels */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            className="text-[11px]"
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
            <span className="text-xs text-[#948D82] capitalize">{TREND_LABELS[key] ?? key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
