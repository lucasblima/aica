import React from 'react'

interface CeramicBadgeProps {
  label: string
  icon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  color?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple'
  variant?: 'solid' | 'outline'
  onClick?: () => void
}

const solidColors = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
}

const outlineColors = {
  gray: 'border border-gray-300 text-gray-700',
  blue: 'border border-blue-300 text-blue-700',
  green: 'border border-green-300 text-green-700',
  amber: 'border border-amber-300 text-amber-700',
  red: 'border border-red-300 text-red-700',
  purple: 'border border-purple-300 text-purple-700',
}

const sizeMap = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
}

export function CeramicBadge({
  label,
  icon,
  size = 'md',
  color = 'gray',
  variant = 'solid',
  onClick,
}: CeramicBadgeProps) {
  const colorClass = variant === 'solid' ? solidColors[color] : outlineColors[color]

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeMap[size]}
        ${colorClass}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </span>
  )
}
