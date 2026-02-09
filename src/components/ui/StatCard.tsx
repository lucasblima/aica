import React from 'react'

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  trend?: { value: number; direction: 'up' | 'down' }
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  onClick?: () => void
  className?: string
}

const colorMap = {
  blue: { icon: 'text-blue-500', trend: 'text-blue-600' },
  green: { icon: 'text-green-500', trend: 'text-green-600' },
  amber: { icon: 'text-amber-500', trend: 'text-amber-600' },
  red: { icon: 'text-red-500', trend: 'text-red-600' },
  purple: { icon: 'text-purple-500', trend: 'text-purple-600' },
}

const sizeMap = {
  sm: { container: 'p-3', value: 'text-xl', icon: 'w-3.5 h-3.5', iconBox: 'p-1.5' },
  md: { container: 'p-4', value: 'text-2xl', icon: 'w-4 h-4', iconBox: 'p-2' },
  lg: { container: 'p-6', value: 'text-4xl', icon: 'w-5 h-5', iconBox: 'p-2.5' },
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  size = 'md',
  color = 'blue',
  onClick,
  className = '',
}: StatCardProps) {
  const s = sizeMap[size]
  const c = colorMap[color]

  return (
    <div
      onClick={onClick}
      className={`ceramic-card ${s.container} ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-all duration-300' : ''} ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`ceramic-inset ${s.iconBox} rounded-lg`}>
          <Icon className={`${s.icon} ${c.icon}`} />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[#948D82] font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className={`${s.value} font-bold text-[#5C554B]`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span className={`text-xs font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-500'}`}>
            {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  )
}
