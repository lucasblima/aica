import React from 'react'

interface MetricRowProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray'
}

const colorMap = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
  gray: 'text-gray-400',
}

export function MetricRow({ icon: Icon, label, value, color = 'gray' }: MetricRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="ceramic-inset p-1.5 rounded-lg">
        <Icon className={`w-3.5 h-3.5 ${colorMap[color]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-[#948D82] block">
          {label}
        </span>
        <span className="text-sm font-bold text-[#5C554B]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
    </div>
  )
}
