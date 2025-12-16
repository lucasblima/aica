/**
 * EfficiencyFlowCard Component
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Displays efficiency trends as a "device" card with smooth Bezier curves
 * Layer 2 (Elevated) - Monitor/dashboard style card
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Calendar } from 'lucide-react'
import {
  getEfficiencyTrends,
  getProductivityColor,
  EfficiencyTrend,
} from '@/services/efficiencyService'
import EmptyState from '@/components/EmptyState'

interface EfficiencyFlowCardProps {
  userId: string
  days?: number
  className?: string
}

interface ChartDataPoint {
  date: string
  score: number
  level: string
}

const CeramicRangeSelector: React.FC<{
  value: 7 | 14 | 30
  onChange: (value: 7 | 14 | 30) => void
}> = ({ value, onChange }) => (
  <div className="ceramic-trough flex p-1 gap-1">
    {([7, 14, 30] as const).map((range) => (
      <motion.button
        key={range}
        onClick={() => onChange(range)}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
          value === range
            ? 'bg-white text-ceramic-text-primary shadow-sm'
            : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        {range}d
      </motion.button>
    ))}
  </div>
)

const SmoothLineChart: React.FC<{ data: ChartDataPoint[]; width: number; height: number }> = ({
  data,
  width = 500,
  height = 200,
}) => {
  if (data.length === 0) return null

  const padding = { top: 20, right: 20, bottom: 30, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const scores = data.map((d) => d.score)
  const maxScore = Math.max(...scores, 100)
  const minScore = Math.min(...scores, 0)

  const xStep = chartWidth / Math.max(data.length - 1, 1)
  const yRange = maxScore - minScore || 100
  const yScale = chartHeight / yRange

  // Create points for the line
  const points = data.map((d, i) => {
    const x = padding.left + i * xStep
    const y = padding.top + chartHeight - (d.score - minScore) * yScale
    return { x, y, data: d }
  })

  // Create smooth Bezier curve path
  const createSmoothPath = (pts: typeof points) => {
    if (pts.length < 2) return ''

    let path = `M ${pts[0].x} ${pts[0].y}`

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[Math.min(i + 2, pts.length - 1)]

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return path
  }

  // Create gradient area path
  const createAreaPath = (pts: typeof points) => {
    const linePath = createSmoothPath(pts)
    const lastPoint = pts[pts.length - 1]
    const firstPoint = pts[0]
    return `${linePath} L ${lastPoint.x} ${height - padding.bottom} L ${firstPoint.x} ${height - padding.bottom} Z`
  }

  const pathData = createSmoothPath(points)
  const areaPath = createAreaPath(points)

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient definition */}
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D97706" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <motion.path
        d={areaPath}
        fill="url(#areaGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Smooth line */}
      <motion.path
        d={pathData}
        stroke="url(#lineGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill={getProductivityColor(p.data.level as any)}
          stroke="white"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 200 }}
        />
      ))}

      {/* X-axis labels (sparse) */}
      {data.map((d, i) => {
        if (i % Math.ceil(data.length / 5) === 0 || i === data.length - 1) {
          const x = padding.left + i * xStep
          return (
            <text
              key={`x-label-${i}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#8B8178"
              fontWeight="500"
            >
              {d.date}
            </text>
          )
        }
        return null
      })}
    </svg>
  )
}

export function EfficiencyFlowCard({
  userId,
  days = 30,
  className = '',
}: EfficiencyFlowCardProps) {
  const [trends, setTrends] = useState<EfficiencyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<7 | 14 | 30>(30)

  useEffect(() => {
    loadTrends()
  }, [userId, selectedRange])

  const loadTrends = async () => {
    try {
      setLoading(true)
      const data = await getEfficiencyTrends(userId, selectedRange)
      setTrends(data)
    } catch (error) {
      console.error('Error loading efficiency trends:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (trends.length === 0) return null
    const avgScore = Math.round(trends.reduce((sum, t) => sum + t.score, 0) / trends.length)
    const maxScore = Math.max(...trends.map((t) => t.score))
    const excellentDays = trends.filter((t) => t.productivityLevel === 'excellent').length
    return { avgScore, maxScore, excellentDays }
  }, [trends])

  // Format data for chart
  const chartData = useMemo(() => {
    return trends.map((t) => ({
      date: new Date(t.date).toLocaleDateString('pt-BR', {
        month: 'short',
        day: 'numeric',
      }),
      score: t.score,
      level: t.productivityLevel,
    }))
  }, [trends])

  if (loading) {
    return (
      <div className={`ceramic-device pt-8 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-ceramic-text-secondary/10 rounded w-1/3 mb-4" />
          <div className="h-48 bg-ceramic-text-secondary/10 rounded" />
        </div>
      </div>
    )
  }

  if (trends.length === 0) {
    return (
      <div className={`ceramic-device pt-8 ${className}`}>
        <EmptyState
          type="insufficient_data"
          customTitle="Dados em Preparacao"
          customMessage="Continue registrando seus momentos para visualizar tendencias."
        />
      </div>
    )
  }

  return (
    <motion.div
      className={`ceramic-device pt-8 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="efficiency-flow-card"
      role="region"
      aria-label="Gráfico de eficiência"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-ceramic-text-primary">Fluxo de Eficiencia</h3>
            <p className="text-xs text-ceramic-text-secondary">Ultimos {selectedRange} dias</p>
          </div>
        </div>
        <CeramicRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <span className="text-2xl font-black text-ceramic-text-primary">{stats.avgScore}%</span>
            <p className="text-xs text-ceramic-text-secondary">Media</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-black text-ceramic-text-primary">{stats.maxScore}%</span>
            <p className="text-xs text-ceramic-text-secondary">Maximo</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-black text-amber-600">{stats.excellentDays}</span>
            <p className="text-xs text-ceramic-text-secondary">Excelentes</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full overflow-hidden">
        <SmoothLineChart data={chartData} width={500} height={180} />
      </div>
    </motion.div>
  )
}

export default EfficiencyFlowCard
