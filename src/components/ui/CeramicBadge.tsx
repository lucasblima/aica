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
  gray: 'bg-ceramic-cool text-ceramic-text-primary',
  blue: 'bg-ceramic-info/10 text-ceramic-info',
  green: 'bg-ceramic-success/10 text-ceramic-success',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-ceramic-error/10 text-ceramic-error',
  purple: 'bg-ceramic-accent/10 text-ceramic-accent',
}

const outlineColors = {
  gray: 'border border-ceramic-border text-ceramic-text-primary',
  blue: 'border border-ceramic-info/30 text-ceramic-info',
  green: 'border border-ceramic-success/30 text-ceramic-success',
  amber: 'border border-amber-300 text-amber-700',
  red: 'border border-ceramic-error/30 text-ceramic-error',
  purple: 'border border-ceramic-accent/30 text-ceramic-accent',
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
