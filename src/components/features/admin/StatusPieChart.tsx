/**
 * StatusPieChart Component
 *
 * Donut chart showing instance status breakdown.
 * Click segments to filter the instance table.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 */

import { motion } from 'framer-motion'
import type { WhatsAppSessionStatus } from '@/types/whatsappSession'
import { STATUS_COLORS, STATUS_LABELS } from '@/types/adminWhatsApp'

interface StatusPieChartProps {
  byStatus: Partial<Record<WhatsAppSessionStatus, number>>
  total: number
  onStatusClick?: (status: WhatsAppSessionStatus | null) => void
  selectedStatus?: WhatsAppSessionStatus | null
  className?: string
}

const STATUS_ORDER: WhatsAppSessionStatus[] = [
  'connected',
  'connecting',
  'pending',
  'disconnected',
  'error',
  'banned',
]

// Pie chart colors
const PIE_COLORS: Record<WhatsAppSessionStatus, string> = {
  connected: '#22C55E',
  connecting: '#F59E0B',
  pending: '#9CA3AF',
  disconnected: '#6B7280',
  error: '#EF4444',
  banned: '#991B1B',
}

export function StatusPieChart({
  byStatus,
  total,
  onStatusClick,
  selectedStatus,
  className = '',
}: StatusPieChartProps) {
  // Calculate segments
  const segments: Array<{
    status: WhatsAppSessionStatus
    count: number
    percentage: number
    startAngle: number
    endAngle: number
  }> = []

  let currentAngle = 0
  STATUS_ORDER.forEach((status) => {
    const count = byStatus[status] ?? 0
    if (count > 0) {
      const percentage = (count / total) * 100
      const angle = (count / total) * 360
      segments.push({
        status,
        count,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      })
      currentAngle += angle
    }
  })

  // Convert angle to SVG arc path
  const getArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (endAngle - 90) * (Math.PI / 180)

    const x1 = 80 + radius * Math.cos(startRad)
    const y1 = 80 + radius * Math.sin(startRad)
    const x2 = 80 + radius * Math.cos(endRad)
    const y2 = 80 + radius * Math.sin(endRad)

    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return `M 80 80 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  if (total === 0) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="w-48 h-48 flex items-center justify-center">
          <div className="text-center text-ceramic-400">
            <p className="text-lg">Sem dados</p>
            <p className="text-sm">Nenhuma instância encontrada</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Pie Chart */}
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 160 160" className="w-full h-full">
          {segments.map((segment, index) => {
            const isSelected = selectedStatus === segment.status
            const isOtherSelected = selectedStatus !== null && !isSelected

            return (
              <motion.path
                key={segment.status}
                d={getArcPath(segment.startAngle, segment.endAngle, 70)}
                fill={PIE_COLORS[segment.status]}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: isOtherSelected ? 0.3 : 1,
                  scale: isSelected ? 1.05 : 1,
                }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onStatusClick?.(isSelected ? null : segment.status)}
                style={{ transformOrigin: '80px 80px' }}
              />
            )
          })}
          {/* Center hole */}
          <circle cx="80" cy="80" r="40" fill="white" />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-ceramic-900">{total}</span>
          <span className="text-xs text-ceramic-500">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {segments.map((segment) => {
          const colors = STATUS_COLORS[segment.status]
          const isSelected = selectedStatus === segment.status

          return (
            <button
              key={segment.status}
              onClick={() => onStatusClick?.(isSelected ? null : segment.status)}
              className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
                isSelected ? colors.bg : 'hover:bg-gray-50'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PIE_COLORS[segment.status] }}
              />
              <span className="text-sm text-ceramic-700">
                {STATUS_LABELS[segment.status]}
              </span>
              <span className="text-sm font-medium text-ceramic-900">
                {segment.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Clear filter button */}
      {selectedStatus && (
        <button
          onClick={() => onStatusClick?.(null)}
          className="mt-2 text-xs text-ceramic-500 hover:text-ceramic-700"
        >
          Limpar filtro
        </button>
      )}
    </div>
  )
}

export default StatusPieChart
